"""
app/api/emails.py
-----------------
Endpoints para testing de emails (solo admin).
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr

from app.core.dependencies import require_admin
from app.services import email as email_service

router = APIRouter(prefix="/emails", tags=["Emails"])


class SendTestEmailRequest(BaseModel):
    """Request para enviar email de prueba."""
    to_email: EmailStr
    email_type: str  # welcome, payment, enrollment, newsletter


@router.post("/test")
def send_test_email(
    data: SendTestEmailRequest,
    current_user: dict = Depends(require_admin),
):
    """
    Envía un email de prueba.
    
    Tipos disponibles:
    - welcome: Email de bienvenida
    - payment: Confirmación de compra
    - enrollment: Bienvenida a curso
    - newsletter: Notificación de curso nuevo
    
    Requiere: JWT válido + role=1 (admin).
    """
    success = False
    
    if data.email_type == "welcome":
        success = email_service.send_welcome_email(
            user_email=data.to_email,
            user_name="Usuario de Prueba",
        )
    
    elif data.email_type == "payment":
        success = email_service.send_payment_confirmation_email(
            user_email=data.to_email,
            user_name="Usuario de Prueba",
            course_title="Curso de Prueba",
            amount=5000.0,
        )
    
    elif data.email_type == "enrollment":
        success = email_service.send_enrollment_welcome_email(
            user_email=data.to_email,
            user_name="Usuario de Prueba",
            course_title="Curso de Prueba",
        )
    
    elif data.email_type == "newsletter":
        success = email_service.send_new_course_notification(
            user_email=data.to_email,
            user_name="Usuario de Prueba",
            course_title="Curso Nuevo de Prueba",
            course_description="Este es un curso increíble que no te podés perder.",
        )
    
    else:
        return {
            "status": "error",
            "message": f"Tipo de email no válido: {data.email_type}",
        }
    
    if success:
        return {
            "status": "success",
            "message": f"Email '{data.email_type}' enviado a {data.to_email}",
        }
    else:
        return {
            "status": "error",
            "message": "Error enviando email. Verificá la configuración SMTP.",
        }