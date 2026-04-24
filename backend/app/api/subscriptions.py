"""
app/api/subscriptions.py
-------------------------
Endpoints del módulo de suscripciones.

Flujo:
1. Usuario llama POST /subscriptions/create
2. Backend retorna init_point (link de MercadoPago)
3. Usuario autoriza la suscripción
4. MercadoPago cobra automáticamente cada período
5. MercadoPago envía webhook en cada cobro
6. Backend actualiza estado y gestiona matrículas automáticamente
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user, require_admin
from app.schemas.subscription import (
    SubscriptionCancelRequest,
    SubscriptionCreateRequest,
    SubscriptionCreateResponse,
    SubscriptionResponse,
)
from app.services import subscription as subscription_service

router = APIRouter(prefix="/subscriptions", tags=["Suscripciones"])


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints de usuario
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/create", response_model=SubscriptionCreateResponse, status_code=status.HTTP_201_CREATED)
def create_subscription(
    data: SubscriptionCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Crea una suscripción en MercadoPago.
    
    Tipos de plan:
    - **testing**: Cobra cada 15 segundos ($100) - solo para testing
    - **monthly**: Cobra mensualmente ($10.000)
    - **annual**: Cobra anualmente ($100.000)
    
    La suscripción da acceso a **todos los cursos** mientras esté activa.
    
    **Testing en Swagger:**
    1. Ejecutá este endpoint con plan_type: "testing"
    2. Copiá el `sandbox_init_point`
    3. Abrí en ventana de incógnito
    4. Autorizá la suscripción con tarjeta de prueba
    5. MercadoPago cobrará cada 15 segundos automáticamente
    6. Verificá en GET /subscriptions/my que el status cambia a "authorized"
    7. Verificá en GET /enrollments/my-courses que tenés acceso a todos los cursos
    
    Requiere: JWT válido.
    """
    user_id = UUID(current_user["id"])
    user_email = current_user["email"]
    
    try:
        result = subscription_service.create_subscription_plan(
            user_id=user_id,
            data=data,
            user_email=user_email,
        )
        
        return SubscriptionCreateResponse(
            subscription_id=UUID(result["subscription_id"]),
            preapproval_id=result["preapproval_id"],
            init_point=result["init_point"],
            sandbox_init_point=result["sandbox_init_point"],
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/my", response_model=SubscriptionResponse | None)
def get_my_subscription(
    current_user: dict = Depends(get_current_user),
):
    """
    Obtiene la suscripción activa del usuario actual.
    
    Retorna null si no tiene suscripción activa.
    
    Requiere: JWT válido.
    """
    user_id = UUID(current_user["id"])
    subscription = subscription_service.get_user_active_subscription(user_id)
    
    if subscription is None:
        return None
    
    return SubscriptionResponse.model_validate(subscription)


@router.get("/my/history", response_model=list[SubscriptionResponse])
def get_my_subscription_history(
    current_user: dict = Depends(get_current_user),
):
    """
    Obtiene el historial completo de suscripciones del usuario.
    
    Incluye suscripciones activas, pausadas y canceladas.
    
    Requiere: JWT válido.
    """
    user_id = UUID(current_user["id"])
    subscriptions = subscription_service.get_user_subscriptions(user_id)
    
    return [SubscriptionResponse.model_validate(s) for s in subscriptions]


@router.post("/my/cancel", response_model=SubscriptionResponse)
def cancel_my_subscription(
    data: SubscriptionCancelRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Cancela la suscripción activa del usuario.
    
    Al cancelar:
    - Se desactivan todas las matrículas tipo "subscription"
    - El usuario pierde acceso a los cursos
    - No se cobra más
    
    Requiere: JWT válido.
    """
    user_id = UUID(current_user["id"])
    
    # Obtener suscripción activa
    subscription = subscription_service.get_user_active_subscription(user_id)
    
    if subscription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No tenés una suscripción activa.",
        )
    
    try:
        cancelled = subscription_service.cancel_subscription(UUID(subscription["id"]))
        return SubscriptionResponse.model_validate(cancelled)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints de admin
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/admin/all", response_model=list[SubscriptionResponse])
def list_all_subscriptions(
    status_filter: str | None = None,
    current_user: dict = Depends(require_admin),
):
    """
    Lista todas las suscripciones del sistema (solo admin).
    
    Query params:
    - status_filter: Filtrar por estado (pending, authorized, cancelled, paused)
    
    Requiere: JWT válido + role=1 (admin).
    """
    query = _client().table("subscriptions").select("*")
    
    if status_filter:
        query = query.eq("status", status_filter)
    
    result = query.order("created_at", desc=True).execute()
    
    return [SubscriptionResponse.model_validate(s) for s in result.data]


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def get_subscription(
    subscription_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """
    Obtiene el detalle de una suscripción.
    
    Solo el dueño o un admin pueden verla.
    
    Requiere: JWT válido.
    """
    user_id = UUID(current_user["id"])
    subscription = subscription_service.get_subscription_by_id(subscription_id)
    
    if subscription is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suscripción no encontrada.",
        )
    
    # Verificar que sea el dueño o admin
    if UUID(subscription["user_id"]) != user_id and current_user.get("role") != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenés permiso para ver esta suscripción.",
        )
    
    return SubscriptionResponse.model_validate(subscription)


@router.delete("/{subscription_id}/admin", response_model=SubscriptionResponse)
def cancel_subscription_admin(
    subscription_id: UUID,
    current_user: dict = Depends(require_admin),
):
    """
    Cancela una suscripción (solo admin).
    
    Requiere: JWT válido + role=1 (admin).
    """
    try:
        cancelled = subscription_service.cancel_subscription(subscription_id)
        return SubscriptionResponse.model_validate(cancelled)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


def _client():
    from app.db.supabase import get_supabase_admin_client
    return get_supabase_admin_client()