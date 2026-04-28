"""
app/api/payments.py
-------------------
Endpoints del módulo de pagos con MercadoPago.

Flujo:
1. Usuario llama POST /payments/create
2. Backend retorna init_point (link de MercadoPago)
3. Usuario abre el link en el navegador
4. Paga con tarjeta de prueba
5. MercadoPago envía webhook a POST /webhooks/mercadopago
6. Backend confirma y crea matrícula automáticamente
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.dependencies import get_current_user, require_admin
from app.schemas.payment import (
    PaymentCreateRequest,
    PaymentCreateResponse,
    PaymentListResponse,
    PaymentResponse,
)
from app.services import course as course_service
from app.services import payment as payment_service

router = APIRouter(prefix="/payments", tags=["Pagos"])


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints de usuario
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/create", response_model=PaymentCreateResponse, status_code=status.HTTP_201_CREATED)
def create_payment(
    data: PaymentCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Crea una preferencia de pago en MercadoPago.
    
    Retorna un link (init_point) que el usuario debe abrir en el navegador para pagar.
    
    **Testing en Swagger:**
    1. Ejecutá este endpoint
    2. Copiá el `sandbox_init_point` del response
    3. Pegalo en el navegador
    4. Pagá con la tarjeta de prueba:
       - Número: 4509 9535 6623 3704
       - CVV: 123
       - Vencimiento: 11/25
       - Nombre: APRO
    5. MercadoPago enviará un webhook automáticamente
    6. Verificá que se creó la matrícula en GET /enrollments/my-courses
    
    Requiere: JWT válido (cualquier usuario autenticado).
    """
    user_id = UUID(current_user["id"])
    
    # Verificar que el curso existe
    course = course_service.get_course_by_id(data.course_id, include_unpublished=False)
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado o no está publicado.",
        )
    
    # Verificar que el curso tiene precio
    if not course.get("price") or course["price"] <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este curso no tiene un precio configurado.",
        )
    
    # Verificar que el usuario NO esté ya matriculado
    from app.services import enrollment as enrollment_service
    
    if enrollment_service.is_user_enrolled(user_id, data.course_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya estás matriculado en este curso.",
        )
    
    # Crear preferencia de pago
    try:
        result = payment_service.create_payment_preference(
            user_id=user_id,
            data=data,
            course_title=course["title"],
            course_price=float(course["price"]),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    
    return PaymentCreateResponse(
        payment_id=UUID(result["payment_id"]),
        preference_id=result["preference_id"],
        init_point=result["init_point"],
        sandbox_init_point=result["sandbox_init_point"],
    )


@router.get("/my-payments", response_model=list[PaymentListResponse])
def get_my_payments(
    status_filter: str | None = None,
    current_user: dict = Depends(get_current_user),
):
    """
    Lista todos los pagos del usuario actual.
    
    Query params:
    - status_filter: Filtrar por estado (pending, approved, rejected, etc.)
    
    Requiere: JWT válido.
    """
    user_id = UUID(current_user["id"])
    payments = payment_service.get_user_payments(user_id, status=status_filter)
    
    return [PaymentListResponse.model_validate(p) for p in payments]


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """
    Obtiene el detalle de un pago.
    
    Solo el dueño del pago o un admin pueden verlo.
    
    Requiere: JWT válido.
    """
    user_id = UUID(current_user["id"])
    payment = payment_service.get_payment_by_id(payment_id)
    
    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pago no encontrado.",
        )
    
    # Verificar que sea el dueño del pago o admin
    if UUID(payment["user_id"]) != user_id and current_user.get("role") != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenés permiso para ver este pago.",
        )
    
    return PaymentResponse.model_validate(payment)


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints de admin
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/admin/all", response_model=list[PaymentListResponse])
def list_all_payments(
    status_filter: str | None = None,
    current_user: dict = Depends(require_admin),
):
    """
    Lista todos los pagos del sistema (solo admin).
    
    Query params:
    - status_filter: Filtrar por estado
    
    Requiere: JWT válido + role=1 (admin).
    """
    # Obtener todos los pagos con JOIN a cursos y usuarios
    query = _client().table("payments").select(
        "*, courses(id, title), users(id, full_name, email)"
    )

    if status_filter:
        query = query.eq("status", status_filter)

    result = query.order("created_at", desc=True).execute()

    # Aplanar estructura
    payments = []
    for payment in result.data:
        if payment.get("courses"):
            payment["course_title"] = payment["courses"]["title"]
        del payment["courses"]
        if payment.get("users"):
            payment["user_name"] = payment["users"].get("full_name")
            payment["user_email"] = payment["users"].get("email")
        del payment["users"]
        payments.append(payment)
    
    return [PaymentListResponse.model_validate(p) for p in payments]


@router.get("/admin/mp-diagnostics")
def mp_diagnostics(current_user: dict = Depends(require_admin)):
    """
    Diagnóstico de MercadoPago: verifica el token y los back_urls.
    Solo admin. No crea ningún pago real.
    """
    import mercadopago
    from app.core.config import get_settings

    settings = get_settings()
    token = settings.MERCADOPAGO_ACCESS_TOKEN
    frontend_url = settings.FRONTEND_URL.strip().rstrip("/")
    backend_url = settings.BACKEND_URL.strip().rstrip("/")

    sdk = mercadopago.SDK(token)

    # Preferencia mínima con URLs hardcodeadas para aislar el problema
    test_preference = {
        "items": [{"title": "Test", "quantity": 1, "unit_price": 1.0, "currency_id": "ARS"}],
        "back_urls": {
            "success": f"{frontend_url}/payment/success",
            "failure": f"{frontend_url}/payment/failure",
            "pending": f"{frontend_url}/payment/pending",
        },
        "external_reference": "diagnostics-test",
    }

    response = sdk.preference().create(test_preference)

    return {
        "token_prefix": token[:12] + "...",
        "token_type": "production" if token.startswith("APP_USR-") else "test",
        "frontend_url": frontend_url,
        "backend_url": backend_url,
        "back_urls_sent": test_preference["back_urls"],
        "mp_status": response.get("status"),
        "mp_response_keys": list(response.get("response", {}).keys()),
        "mp_error": response.get("response", {}).get("message") if response.get("status") not in (200, 201) else None,
    }


def _client():
    from app.db.supabase import get_supabase_admin_client
    return get_supabase_admin_client()