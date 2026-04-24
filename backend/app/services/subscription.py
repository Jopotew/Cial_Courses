"""
app/services/subscription_service.py
-------------------------------------
Lógica de negocio del módulo de suscripciones con MercadoPago.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import mercadopago

from app.core.config import get_settings
from app.db.supabase import get_supabase_admin_client
from app.schemas.subscription import SubscriptionCreateRequest


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

def get_subscription_by_id(subscription_id: UUID) -> Optional[dict]:
    """
    Busca una suscripción por su UUID.
    
    Args:
        subscription_id: UUID de la suscripción
        
    Returns:
        Diccionario con la suscripción, o None si no existe
    """
    result = _client().table("subscriptions").select("*").eq("id", str(subscription_id)).execute()
    return result.data[0] if result.data else None


def get_subscription_by_preapproval_id(preapproval_id: str) -> Optional[dict]:
    """
    Busca una suscripción por su preapproval_id de MercadoPago.
    
    Args:
        preapproval_id: ID de la suscripción en MercadoPago
        
    Returns:
        Diccionario con la suscripción, o None si no existe
    """
    result = _client().table("subscriptions").select("*").eq("preapproval_id", preapproval_id).execute()
    return result.data[0] if result.data else None


def get_user_active_subscription(user_id: UUID) -> Optional[dict]:
    """
    Obtiene la suscripción activa de un usuario.
    
    Args:
        user_id: UUID del usuario
        
    Returns:
        Diccionario con la suscripción activa, o None si no tiene
    """
    result = _client().table("subscriptions").select("*").eq("user_id", str(user_id)).in_(
        "status", ["pending", "authorized"]
    ).execute()
    
    return result.data[0] if result.data else None


def get_user_subscriptions(user_id: UUID) -> list[dict]:
    """
    Obtiene todas las suscripciones de un usuario (activas e inactivas).
    
    Args:
        user_id: UUID del usuario
        
    Returns:
        Lista de suscripciones
    """
    result = _client().table("subscriptions").select("*").eq("user_id", str(user_id)).order("created_at", desc=True).execute()
    return result.data


# ──────────────────────────────────────────────────────────────────────────────
# Creación de suscripciones
# ──────────────────────────────────────────────────────────────────────────────

def create_subscription_plan(
    user_id: UUID,
    data: SubscriptionCreateRequest,
    user_email: str,
) -> dict:
    """
    Crea un plan de suscripción en MercadoPago.
    
    Args:
        user_id: UUID del usuario
        data: Datos de la suscripción
        user_email: Email del usuario
        
    Returns:
        Diccionario con subscription_id, preapproval_id, init_point
    """
    settings = get_settings()
    sdk = _mp_sdk()
    
    # Verificar que el usuario NO tenga ya una suscripción activa
    existing = get_user_active_subscription(user_id)
    if existing:
        raise ValueError("El usuario ya tiene una suscripción activa")
    
    # Configurar frecuencia según el plan
    if data.plan_type == "testing":
        # Plan de testing: mensual con precio reducido
        auto_recurring = {
            "frequency": 1,
            "frequency_type": "months",
            "transaction_amount": 100,  # $100/mes para testing
            "currency_id": "ARS",
        }
        amount = 100
    elif data.plan_type == "monthly":
        auto_recurring = {
            "frequency": 1,
            "frequency_type": "months",
            "transaction_amount": 10000,  # $10000/mes
            "currency_id": "ARS",
        }
        amount = 10000
    elif data.plan_type == "annual":
        auto_recurring = {
            "frequency": 1,
            "frequency_type": "years",
            "transaction_amount": 100000,  # $100000/año
            "currency_id": "ARS",
        }
        amount = 100000
    else:
        raise ValueError(f"Plan type no válido: {data.plan_type}")
    
    # Crear preapproval (suscripción) en MercadoPago
    preapproval_data = {
        "reason": f"Suscripción {data.plan_type} - AulaCAL",
        "auto_recurring": auto_recurring,
        "payer_email": user_email,
        "back_url": f"{settings.BACKEND_URL}/subscription/success",  # Usar backend URL (ngrok)
        "external_reference": str(user_id),
        "notification_url": f"{settings.BACKEND_URL}/api/v1/webhooks/mercadopago",
    }
    
    print(f"Creando preapproval en MercadoPago: {preapproval_data}")
    
    # Crear preapproval
    preapproval = sdk.preapproval().create(preapproval_data)
    
    print(f"Response de MercadoPago: {preapproval}")
    
    if preapproval.get("status") != 201:
        raise ValueError(f"Error creando suscripción en MercadoPago: {preapproval}")
    
    preapproval_id = preapproval["response"]["id"]
    init_point = preapproval["response"]["init_point"]
    sandbox_init_point = preapproval["response"].get("sandbox_init_point", init_point)
    
    # Guardar suscripción en DB
    result = _client().table("subscriptions").insert({
        "user_id": str(user_id),
        "preapproval_id": preapproval_id,
        "status": "pending",
        "plan_type": data.plan_type,
        "amount": amount,
        "currency": "ARS",
        "mercadopago_data": preapproval["response"],
    }).execute()
    
    subscription = result.data[0]
    
    return {
        "subscription_id": subscription["id"],
        "preapproval_id": preapproval_id,
        "init_point": init_point,
        "sandbox_init_point": sandbox_init_point,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Procesamiento de webhooks
# ──────────────────────────────────────────────────────────────────────────────

def process_subscription_webhook(preapproval_id: str) -> dict:
    """
    Procesa un webhook de MercadoPago de suscripción.
    
    Args:
        preapproval_id: ID de la suscripción en MercadoPago
        
    Returns:
        Diccionario con el resultado
    """
    sdk = _mp_sdk()
    
    # Obtener información de la suscripción desde MercadoPago
    preapproval_info = sdk.preapproval().get(preapproval_id)
    preapproval_data = preapproval_info["response"]
    
    print(f"Datos de suscripción desde MercadoPago: {preapproval_data}")
    
    status = preapproval_data["status"]
    payer_id = preapproval_data.get("payer_id")
    next_payment_date = preapproval_data.get("next_payment_date")
    
    # Buscar suscripción en DB
    our_subscription = get_subscription_by_preapproval_id(preapproval_id)
    
    if not our_subscription:
        print(f"ERROR: Suscripción {preapproval_id} no encontrada en DB")
        return {
            "status": "error",
            "message": "Suscripción no encontrada en DB"
        }
    
    # Actualizar suscripción
    updates = {
        "status": status,
        "payer_id": payer_id,
        "mercadopago_data": preapproval_data,
    }
    
    if status == "authorized":
        updates["start_date"] = datetime.now(timezone.utc).isoformat()
        if next_payment_date:
            updates["next_billing_date"] = next_payment_date
    
    if status in ["cancelled", "paused"]:
        updates["end_date"] = datetime.now(timezone.utc).isoformat()
    
    _client().table("subscriptions").update(updates).eq("id", our_subscription["id"]).execute()
    
    print(f"Suscripción actualizada a status: {status}")
    
    # El trigger de la DB se encarga de crear/desactivar matrículas automáticamente
    
    return {
        "status": "success",
        "message": f"Suscripción {status}",
        "subscription_id": our_subscription["id"],
    }


# ──────────────────────────────────────────────────────────────────────────────
# Cancelación
# ──────────────────────────────────────────────────────────────────────────────

def cancel_subscription(subscription_id: UUID) -> dict:
    """
    Cancela una suscripción.
    
    Args:
        subscription_id: UUID de la suscripción
        
    Returns:
        Diccionario con la suscripción cancelada
    """
    sdk = _mp_sdk()
    
    subscription = get_subscription_by_id(subscription_id)
    if not subscription:
        raise ValueError("Suscripción no encontrada")
    
    if subscription["status"] not in ["pending", "authorized"]:
        raise ValueError(f"No se puede cancelar una suscripción en estado {subscription['status']}")
    
    # Cancelar en MercadoPago
    preapproval_id = subscription["preapproval_id"]
    sdk.preapproval().update(preapproval_id, {"status": "cancelled"})
    
    # Actualizar en DB
    result = _client().table("subscriptions").update({
        "status": "cancelled",
        "end_date": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(subscription_id)).execute()
    
    return result.data[0]