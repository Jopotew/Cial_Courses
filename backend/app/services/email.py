"""
app/services/email_service.py
------------------------------
Servicio de email de AulaCAL.

Responsabilidades:
    1. Guardar códigos de verificación en la tabla email_codes (2FA, reset password, etc.)
    2. Validar códigos ingresados por el usuario
    3. Enviar emails de notificaciones (bienvenida, compra, etc.)
"""

import logging
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from uuid import UUID

from app.core.config import settings, get_settings
from app.core.security import generate_numeric_code
from app.db.supabase import get_supabase_admin_client

logger = logging.getLogger("aulacal")


def _client():
    """Retorna el cliente admin de Supabase."""
    return get_supabase_admin_client()


# ══════════════════════════════════════════════════════════════════════════════
# PARTE 1: CÓDIGOS DE VERIFICACIÓN (2FA, Reset Password, etc.)
# ══════════════════════════════════════════════════════════════════════════════

def create_code(user_email: str, code_type: str) -> str:
    """
    Genera un código de 6 dígitos, lo guarda en la DB y lo retorna.

    Tipos: 'register', 'login_2fa', 'reset_password'
    """
    _client().table("email_codes").update({
        "used": True,
    }).eq("user_email", user_email.lower()).eq("type", code_type).eq("used", False).execute()

    code = generate_numeric_code()
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.EMAIL_CODE_EXPIRE_MINUTES
    )

    _client().table("email_codes").insert({
        "user_email": user_email.lower(),
        "code": code,
        "type": code_type,
        "expires_at": expires_at.isoformat(),
        "used": False,
    }).execute()

    return code


def verify_code(user_email: str, code: str, code_type: str) -> bool:
    """
    Valida un código ingresado por el usuario.

    Verifica que exista, no esté usado y no esté expirado.
    """
    logger.info("verify_code | email=%s | code=%s | type=%s", user_email.lower(), code, code_type)

    result = (
        _client()
        .table("email_codes")
        .select("*")
        .eq("user_email", user_email.lower())
        .eq("code", code)
        .eq("type", code_type)
        .eq("used", False)
        .execute()
    )

    logger.info("verify_code | rows_found=%d", len(result.data) if result.data else 0)

    if not result.data:
        return False

    record = result.data[0]

    expires_at = datetime.fromisoformat(record["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        logger.info("verify_code | EXPIRED | expires_at=%s", expires_at)
        return False

    _client().table("email_codes").update({
        "used": True,
    }).eq("id", record["id"]).execute()

    return True


# ══════════════════════════════════════════════════════════════════════════════
# PARTE 2: ENVÍO DE EMAILS (SMTP)
# ══════════════════════════════════════════════════════════════════════════════

def _send_email_smtp(to_email: str, subject: str, html_body: str, text_body: str = None) -> bool:
    """
    Envía un email via SMTP.
    
    Soporta dos configuraciones:
    1. Vieja (EMAIL_FROM_ADDRESS, SMTP_USER, etc.)
    2. Nueva (SMTP_FROM_EMAIL, SMTP_USERNAME, etc.)
    """
    try:
        # Intentar configuración nueva primero
        try:
            smtp_settings = get_settings()
            config = {
                "host": smtp_settings.SMTP_HOST,
                "port": smtp_settings.SMTP_PORT,
                "username": smtp_settings.SMTP_USERNAME,
                "password": smtp_settings.SMTP_PASSWORD,
                "from_email": smtp_settings.SMTP_FROM_EMAIL,
                "from_name": smtp_settings.SMTP_FROM_NAME,
                "use_tls": True,
            }
        except:
            # Fallback a configuración vieja
            config = {
                "host": settings.SMTP_HOST,
                "port": settings.SMTP_PORT,
                "username": settings.SMTP_USER,
                "password": settings.SMTP_PASSWORD,
                "from_email": settings.EMAIL_FROM_ADDRESS,
                "from_name": settings.EMAIL_FROM_NAME,
                "use_tls": settings.SMTP_USE_TLS,
            }
        
        # Crear mensaje
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{config['from_name']} <{config['from_email']}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        
        # Agregar texto plano si existe
        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        
        # Agregar HTML
        msg.attach(MIMEText(html_body, "html"))
        
        # Enviar
        with smtplib.SMTP(config["host"], config["port"]) as server:
            if config["use_tls"]:
                server.starttls()
            server.login(config["username"], config["password"])
            server.sendmail(config["from_email"], to_email, msg.as_string())
        
        print(f"[EMAIL] Enviado a {to_email}: {subject}")
        return True
        
    except Exception as e:
        print(f"[EMAIL] Error enviando email a {to_email}: {e}")
        return False


# ══════════════════════════════════════════════════════════════════════════════
# PARTE 3: EMAILS DE VERIFICACIÓN (2FA)
# ══════════════════════════════════════════════════════════════════════════════

def send_verification_email(to_email: str, code: str) -> None:
    """Email de verificación de cuenta al registrarse."""
    subject = "AulaCAL — Verificá tu cuenta"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1E3A5F;">Bienvenido a AulaCAL</h2>
        <p>Gracias por registrarte. Usá este código para verificar tu cuenta:</p>
        <div style="background: #F0F4F8; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1E3A5F;">{code}</span>
        </div>
        <p style="color: #666;">El código expira en {settings.EMAIL_CODE_EXPIRE_MINUTES} minutos.</p>
    </div>
    """
    _send_email_smtp(to_email, subject, html)


def send_2fa_email(to_email: str, code: str) -> None:
    """Email de doble factor de autenticación."""
    subject = "AulaCAL — Código de verificación"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1E3A5F;">Verificación de seguridad</h2>
        <p>Se solicitó un código de verificación para tu cuenta.</p>
        <div style="background: #F0F4F8; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1E3A5F;">{code}</span>
        </div>
        <p style="color: #666;">El código expira en {settings.EMAIL_CODE_EXPIRE_MINUTES} minutos.</p>
    </div>
    """
    _send_email_smtp(to_email, subject, html)


def send_reset_password_email(to_email: str, code: str) -> None:
    """Email de recuperación de contraseña."""
    subject = "AulaCAL — Restablecer contraseña"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1E3A5F;">Restablecer contraseña</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <div style="background: #F0F4F8; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1E3A5F;">{code}</span>
        </div>
        <p style="color: #666;">El código expira en {settings.EMAIL_CODE_EXPIRE_MINUTES} minutos.</p>
    </div>
    """
    _send_email_smtp(to_email, subject, html)


# ══════════════════════════════════════════════════════════════════════════════
# PARTE 4: EMAILS DE NOTIFICACIONES
# ══════════════════════════════════════════════════════════════════════════════

def send_welcome_email(user_email: str, user_name: str):
    """Email de bienvenida al registrarse."""
    subject = "¡Bienvenido a AulaCAL! 🎓"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
    body{{font-family:Arial,sans-serif;line-height:1.6;color:#333}}
    .container{{max-width:600px;margin:0 auto;padding:20px}}
    .header{{background:#4F46E5;color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}}
    .content{{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}}
    .button{{display:inline-block;background:#4F46E5;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}}
    </style>
    </head>
    <body>
    <div class="container">
    <div class="header"><h1>¡Bienvenido a AulaCAL!</h1></div>
    <div class="content">
    <p>Hola <strong>{user_name}</strong>,</p>
    <p>¡Gracias por registrarte en AulaCAL!</p>
    <p style="text-align:center"><a href="http://localhost:3000/courses" class="button">Explorar Cursos</a></p>
    <p>Saludos,<br>El equipo de AulaCAL</p>
    </div>
    </div>
    </body>
    </html>
    """
    text = f"Hola {user_name}, ¡Bienvenido a AulaCAL!"
    return _send_email_smtp(user_email, subject, html, text)


def send_payment_confirmation_email(user_email: str, user_name: str, course_title: str, amount: float):
    """Email de confirmación de compra."""
    subject = "Confirmación de compra - AulaCAL"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
    body{{font-family:Arial,sans-serif;line-height:1.6;color:#333}}
    .container{{max-width:600px;margin:0 auto;padding:20px}}
    .header{{background:#10B981;color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}}
    .content{{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}}
    .button{{display:inline-block;background:#10B981;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}}
    </style>
    </head>
    <body>
    <div class="container">
    <div class="header"><h1>✅ ¡Compra Confirmada!</h1></div>
    <div class="content">
    <p>Hola <strong>{user_name}</strong>,</p>
    <p>Tu compra se procesó exitosamente.</p>
    <h3>Detalles:</h3>
    <p><strong>Curso:</strong> {course_title}<br><strong>Monto:</strong> ${amount:.2f} ARS</p>
    <p style="text-align:center"><a href="http://localhost:3000/my-courses" class="button">Ver Mis Cursos</a></p>
    <p>Saludos,<br>El equipo de AulaCAL</p>
    </div>
    </div>
    </body>
    </html>
    """
    text = f"Compra confirmada: {course_title} - ${amount:.2f}"
    return _send_email_smtp(user_email, subject, html, text)


def send_enrollment_welcome_email(user_email: str, user_name: str, course_title: str):
    """Email de bienvenida al matricularse."""
    subject = f"Bienvenido al curso: {course_title}"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
    body{{font-family:Arial,sans-serif;line-height:1.6;color:#333}}
    .container{{max-width:600px;margin:0 auto;padding:20px}}
    .header{{background:#8B5CF6;color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}}
    .content{{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}}
    .button{{display:inline-block;background:#8B5CF6;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}}
    </style>
    </head>
    <body>
    <div class="container">
    <div class="header"><h1>🎓 ¡Comenzá tu curso!</h1></div>
    <div class="content">
    <p>Hola <strong>{user_name}</strong>,</p>
    <p>Ya estás matriculado en: <strong>{course_title}</strong></p>
    <p style="text-align:center"><a href="http://localhost:3000/courses" class="button">Empezar Ahora</a></p>
    <p>Saludos,<br>El equipo de AulaCAL</p>
    </div>
    </div>
    </body>
    </html>
    """
    text = f"Comenzá tu curso: {course_title}"
    return _send_email_smtp(user_email, subject, html, text)


def send_new_course_notification(user_email: str, user_name: str, course_title: str, course_description: str):
    """Newsletter cuando se publica un curso nuevo."""
    subject = f"📢 Nuevo curso: {course_title}"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
    body{{font-family:Arial,sans-serif;line-height:1.6;color:#333}}
    .container{{max-width:600px;margin:0 auto;padding:20px}}
    .header{{background:#F59E0B;color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}}
    .content{{background:#f9fafb;padding:30px;border-radius:0 0 10px 10px}}
    .button{{display:inline-block;background:#F59E0B;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}}
    </style>
    </head>
    <body>
    <div class="container">
    <div class="header"><h1>📢 ¡Nuevo Curso!</h1></div>
    <div class="content">
    <p>Hola <strong>{user_name}</strong>,</p>
    <h2>{course_title}</h2>
    <p>{course_description}</p>
    <p style="text-align:center"><a href="http://localhost:3000/courses" class="button">Ver Curso</a></p>
    <p>Saludos,<br>El equipo de AulaCAL</p>
    </div>
    </div>
    </body>
    </html>
    """
    text = f"Nuevo curso: {course_title}"
    return _send_email_smtp(user_email, subject, html, text)