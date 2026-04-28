"""
app/services/payment_service.py
--------------------------------
Lógica de negocio del módulo de pagos con MercadoPago.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import mercadopago

from app.core.config import get_settings
from app.db.supabase import get_supabase_admin_client
from app.schemas.payment import PaymentCreateRequest


def _client():
    """Retorna el cliente admin de Supabase."""
    return get_supabase_admin_client()


def _mp_sdk():
    """Retorna el SDK de MercadoPago configurado."""
    settings = get_settings()
    return mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)


# ──────────────────────────────────────────────────────────────────────────────
# Consultas
# ──────────────────────────────────────────────────────────────────────────────

def get_payment_by_id(payment_id: UUID) -> Optional[dict]:
    """
    Busca un pago por su UUID.
    
    Args:
        payment_id: UUID del pago
        
    Returns:
        Diccionario con el pago, o None si no existe
    """
    result = _client().table("payments").select("*").eq("id", str(payment_id)).execute()
    return result.data[0] if result.data else None


def get_payment_by_preference_id(preference_id: str) -> Optional[dict]:
    """
    Busca un pago por su preference_id de MercadoPago.
    
    Args:
        preference_id: ID de la preferencia en MercadoPago
        
    Returns:
        Diccionario con el pago, o None si no existe
    """
    result = _client().table("payments").select("*").eq("preference_id", preference_id).execute()
    return result.data[0] if result.data else None


def get_payment_by_mp_payment_id(mp_payment_id: str) -> Optional[dict]:
    """
    Busca un pago por su payment_id de MercadoPago.
    
    Args:
        mp_payment_id: ID del pago en MercadoPago
        
    Returns:
        Diccionario con el pago, o None si no existe
    """
    result = _client().table("payments").select("*").eq("payment_id", mp_payment_id).execute()
    return result.data[0] if result.data else None


def get_user_payments(user_id: UUID, status: Optional[str] = None) -> list[dict]:
    """
    Obtiene todos los pagos de un usuario.
    
    Args:
        user_id: UUID del usuario
        status: Filtrar por estado (opcional)
        
    Returns:
        Lista de pagos con información del curso
    """
    query = _client().table("payments").select(
        "*, courses(id, title)"
    ).eq("user_id", str(user_id))
    
    if status:
        query = query.eq("status", status)
    
    result = query.order("created_at", desc=True).execute()
    
    # Aplanar la estructura del curso
    payments = []
    for payment in result.data:
        if payment.get("courses"):
            payment["course_title"] = payment["courses"]["title"]
            del payment["courses"]
        payments.append(payment)
    
    return payments


# ──────────────────────────────────────────────────────────────────────────────
# Creación de pagos
# ──────────────────────────────────────────────────────────────────────────────

def create_payment_preference(
    user_id: UUID,
    data: PaymentCreateRequest,
    course_title: str,
    course_price: float,
) -> dict:
    """
    Crea una preferencia de pago en MercadoPago y guarda el pago en la DB.
    
    Args:
        user_id: UUID del usuario que va a pagar
        data: Datos del pago
        course_title: Título del curso
        course_price: Precio del curso
        
    Returns:
        Diccionario con payment_id, preference_id, init_point
    """
    settings = get_settings()
    sdk = _mp_sdk()
    
    # MEDIDA DE SEGURIDAD: Limitar pagos pending a 5 por usuario
    pending_count = _client().table("payments").select(
        "id", count="exact"
    ).eq("user_id", str(user_id)).eq("status", "pending").execute()
    
    if pending_count.count >= 5:
        raise ValueError(
            "Tenés 5 pagos pendientes sin completar. "
            "Por favor completá o cancelá los pagos pendientes antes de crear uno nuevo."
        )
    
    import logging as _logging
    _log = _logging.getLogger("aulacal")

    # Strip whitespace and trailing slash — Render sometimes adds invisible chars
    frontend_url = settings.FRONTEND_URL.strip().rstrip("/")
    backend_url = settings.BACKEND_URL.strip().rstrip("/")

    success_url = f"{frontend_url}/payment/success"
    failure_url = f"{frontend_url}/payment/failure"
    pending_url = f"{frontend_url}/payment/pending"
    webhook_url = f"{backend_url}/api/v1/webhooks/mercadopago"

    _log.info(
        "MP preference build | token_prefix=%s | success=%s | webhook=%s",
        settings.MERCADOPAGO_ACCESS_TOKEN[:12] + "...",
        success_url,
        webhook_url,
    )

    # Crear preferencia en MercadoPago
    preference_data = {
        "items": [
            {
                "title": course_title,
                "quantity": 1,
                "unit_price": float(course_price),
                "currency_id": "ARS",
            }
        ],
        "back_urls": {
            "success": success_url,
            "failure": failure_url,
            "pending": pending_url,
        },
        "auto_return": "approved",
        "notification_url": webhook_url,
        "external_reference": str(user_id),
    }

    # Crear preferencia
    preference = sdk.preference().create(preference_data)
    mp_status = preference.get("status")
    mp_response = preference.get("response", {})

    if mp_status not in (200, 201) or "id" not in mp_response:
        _log.error(
            "MercadoPago preference creation failed | status=%s | response=%s",
            mp_status,
            mp_response,
        )
        raise ValueError(
            f"Error al crear preferencia en MercadoPago (status {mp_status}): "
            f"{mp_response.get('message') or mp_response}"
        )

    preference_id = mp_response["id"]
    init_point = mp_response["init_point"]
    sandbox_init_point = mp_response.get("sandbox_init_point", mp_response["init_point"])
    
    # Guardar pago en DB
    result = _client().table("payments").insert({
        "user_id": str(user_id),
        "course_id": str(data.course_id),
        "amount": course_price,
        "currency": "ARS",
        "preference_id": preference_id,
        "status": "pending",
        "payment_type": data.payment_type,
        "mercadopago_data": mp_response,
    }).execute()
    
    payment = result.data[0]
    
    return {
        "payment_id": payment["id"],
        "preference_id": preference_id,
        "init_point": init_point,
        "sandbox_init_point": sandbox_init_point,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Procesamiento de webhooks
# ──────────────────────────────────────────────────────────────────────────────

def process_payment_webhook(mp_payment_id: str) -> dict:
    """
    Procesa un webhook de MercadoPago cuando se confirma un pago.
    
    Args:
        mp_payment_id: ID del pago en MercadoPago
        
    Returns:
        Diccionario con el resultado del procesamiento
    """
    sdk = _mp_sdk()
    
    # Obtener información del pago desde MercadoPago
    payment_info = sdk.payment().get(mp_payment_id)
    payment_data = payment_info["response"]
    
    print(f"Datos del pago desde MercadoPago: {payment_data}")
    
    status = payment_data["status"]
    payment_method = payment_data.get("payment_method_id")
    user_id = payment_data.get("external_reference")  # Esto es el user_id
    transaction_amount = payment_data.get("transaction_amount")
    
    print(f"Status: {status}, User ID: {user_id}, Amount: {transaction_amount}")
    
    # Buscar el pago en nuestra DB por user_id + amount + status pending
    # (el pago más reciente que coincida)
    if user_id and transaction_amount:
        result = _client().table("payments").select("*").eq(
            "user_id", user_id
        ).eq(
            "amount", transaction_amount
        ).eq(
            "status", "pending"
        ).order("created_at", desc=True).limit(1).execute()
        
        our_payment = result.data[0] if result.data else None
    else:
        our_payment = None
    
    if not our_payment:
        # Intentar buscar por payment_id si ya fue procesado antes
        our_payment = get_payment_by_mp_payment_id(str(mp_payment_id))
    
    if not our_payment:
        print(f"ERROR: No se encontró el pago en la DB para user_id={user_id}, amount={transaction_amount}")
        return {
            "status": "error",
            "message": "Pago no encontrado en la DB",
        }
    
    print(f"Pago encontrado en DB: {our_payment['id']}")
    
    # Actualizar el pago en nuestra DB
    updates = {
        "payment_id": str(mp_payment_id),
        "status": status,
        "payment_method": payment_method,
        "mercadopago_data": payment_data,
    }
    
    _client().table("payments").update(updates).eq("id", our_payment["id"]).execute()
    print(f"Pago actualizado a status: {status}")
    
    # Si el pago fue aprobado, crear la matrícula
    if status == "approved":
        from app.services import enrollment as enrollment_service
        from app.schemas.enrollment import EnrollmentCreateRequest
        
        print(f"Pago aprobado, creando matrícula para user_id={our_payment['user_id']}, course_id={our_payment['course_id']}")
        
        # Crear matrícula
        enrollment_data = EnrollmentCreateRequest(
            user_id=UUID(our_payment["user_id"]),
            course_id=UUID(our_payment["course_id"]),
            enrollment_type="purchase",
            expires_at=None,  # Sin vencimiento para compras individuales
        )
        
        enrollment_service.create_enrollment(enrollment_data)
        print("Matrícula creada exitosamente")
        
        return {
            "status": "success",
            "message": "Pago aprobado y matrícula creada",
            "payment_id": our_payment["id"],
        }
    
    print(f"Pago en estado {status}, no se crea matrícula")
    return {
        "status": "pending",
        "message": f"Pago en estado: {status}",
        "payment_id": our_payment["id"],
    }


# ──────────────────────────────────────────────────────────────────────────────
# Utilidades
# ──────────────────────────────────────────────────────────────────────────────

def update_payment_status(payment_id: UUID, status: str) -> dict:
    """
    Actualiza el estado de un pago.
    
    Args:
        payment_id: UUID del pago
        status: Nuevo estado
        
    Returns:
        Diccionario con el pago actualizado
    """
    result = _client().table("payments").update({
        "status": status,
    }).eq("id", str(payment_id)).execute()
    
    return result.data[0]