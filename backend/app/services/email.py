"""
app/services/email_service.py
------------------------------
Servicio de email de AulaCAL.

Responsabilidades:
    1. Guardar códigos de verificación en la tabla email_codes.
    2. Validar códigos ingresados por el usuario.
    3. Enviar emails con los códigos via SMTP.

Tipos de código:
    - 'register'       → verificación de email al registrarse
    - 'login_2fa'      → doble factor cada 30 días
    - 'reset_password'  → recuperación de contraseña
"""

import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from uuid import UUID

from app.core.config import settings
from app.core.security import generate_numeric_code
from app.db.supabase import get_supabase_admin_client


def _client():
    """Retorna el cliente admin de Supabase."""
    return get_supabase_admin_client()


# ──────────────────────────────────────────────────────────────────────────────
# Gestión de códigos en la DB
# ──────────────────────────────────────────────────────────────────────────────

def create_code(user_id: UUID, code_type: str) -> str:
    """
    Genera un código de 6 dígitos, lo guarda en la DB y lo retorna.

    Antes de crear uno nuevo, invalida todos los códigos anteriores
    del mismo tipo para ese usuario (evita acumulación).

    Args:
        user_id:   UUID del usuario.
        code_type: 'register' | 'login_2fa' | 'reset_password'

    Returns:
        El código de 6 dígitos generado.
    """
    # Invalidar códigos anteriores del mismo tipo
    _client().table("email_codes").update({
        "used": True,
    }).eq("user_id", str(user_id)).eq("type", code_type).eq("used", False).execute()

    # Generar nuevo código
    code = generate_numeric_code()
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.EMAIL_CODE_EXPIRE_MINUTES
    )

    # Guardar en DB
    _client().table("email_codes").insert({
        "user_id": str(user_id),
        "code": code,
        "type": code_type,
        "expires_at": expires_at.isoformat(),
        "used": False,
    }).execute()

    return code


def verify_code(user_id: UUID, code: str, code_type: str) -> bool:
    """
    Valida un código ingresado por el usuario.

    Verifica que:
        - Exista un código con ese valor para ese usuario y tipo.
        - No esté usado.
        - No esté expirado.

    Si es válido, lo marca como usado para que no se pueda reutilizar.

    Args:
        user_id:   UUID del usuario.
        code:      Código de 6 dígitos ingresado.
        code_type: 'register' | 'login_2fa' | 'reset_password'

    Returns:
        True si el código es válido, False si no.
    """
    result = (
        _client()
        .table("email_codes")
        .select("*")
        .eq("user_id", str(user_id))
        .eq("code", code)
        .eq("type", code_type)
        .eq("used", False)
        .execute()
    )

    if not result.data:
        return False

    record = result.data[0]

    # Verificar expiración
    expires_at = datetime.fromisoformat(record["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        return False

    # Marcar como usado
    _client().table("email_codes").update({
        "used": True,
    }).eq("id", record["id"]).execute()

    return True


# ──────────────────────────────────────────────────────────────────────────────
# Envío de emails
# ──────────────────────────────────────────────────────────────────────────────

def _send_email(to_email: str, subject: str, html_body: str) -> None:
    """
    Envía un email via SMTP.

    Se conecta al servidor SMTP configurado en el .env,
    envía el email y cierra la conexión.

    Args:
        to_email:  Dirección del destinatario.
        subject:   Asunto del email.
        html_body: Contenido HTML del email.
    """
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
        if settings.SMTP_USE_TLS:
            server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(settings.EMAIL_FROM_ADDRESS, to_email, msg.as_string())


# ──────────────────────────────────────────────────────────────────────────────
# Emails específicos de la aplicación
# ──────────────────────────────────────────────────────────────────────────────

def send_verification_email(to_email: str, code: str) -> None:
    """
    Envía el email de verificación de cuenta al registrarse.

    Args:
        to_email: Email del usuario recién registrado.
        code:     Código de 6 dígitos a enviar.
    """
    subject = "AulaCAL — Verificá tu cuenta"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1E3A5F;">Bienvenido a AulaCAL</h2>
        <p>Gracias por registrarte. Usá este código para verificar tu cuenta:</p>
        <div style="background: #F0F4F8; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1E3A5F;">{code}</span>
        </div>
        <p style="color: #666;">El código expira en {settings.EMAIL_CODE_EXPIRE_MINUTES} minutos.</p>
        <p style="color: #999; font-size: 12px;">Si no creaste esta cuenta, ignorá este email.</p>
    </div>
    """
    _send_email(to_email, subject, html)


def send_2fa_email(to_email: str, code: str) -> None:
    """
    Envía el email de doble factor de autenticación.

    Args:
        to_email: Email del usuario que inicia sesión.
        code:     Código de 6 dígitos para 2FA.
    """
    subject = "AulaCAL — Código de verificación"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1E3A5F;">Verificación de seguridad</h2>
        <p>Se solicitó un código de verificación para tu cuenta de AulaCAL.</p>
        <div style="background: #F0F4F8; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1E3A5F;">{code}</span>
        </div>
        <p style="color: #666;">El código expira en {settings.EMAIL_CODE_EXPIRE_MINUTES} minutos.</p>
        <p style="color: #999; font-size: 12px;">Si no fuiste vos, cambiá tu contraseña inmediatamente.</p>
    </div>
    """
    _send_email(to_email, subject, html)


def send_reset_password_email(to_email: str, code: str) -> None:
    """
    Envía el email de recuperación de contraseña.

    Args:
        to_email: Email del usuario que pidió el reset.
        code:     Código de 6 dígitos para resetear la contraseña.
    """
    subject = "AulaCAL — Restablecer contraseña"
    html = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1E3A5F;">Restablecer contraseña</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña de AulaCAL.</p>
        <div style="background: #F0F4F8; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1E3A5F;">{code}</span>
        </div>
        <p style="color: #666;">El código expira en {settings.EMAIL_CODE_EXPIRE_MINUTES} minutos.</p>
        <p style="color: #999; font-size: 12px;">Si no pediste esto, ignorá este email. Tu contraseña no cambiará.</p>
    </div>
    """
    _send_email(to_email, subject, html)