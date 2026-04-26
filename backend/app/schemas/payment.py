"""
app/schemas/payment.py
-----------------------
Schemas para el módulo de pagos.
"""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ──────────────────────────────────────────────────────────────────────────────
# REQUEST schemas
# ──────────────────────────────────────────────────────────────────────────────

class PaymentCreateRequest(BaseModel):
    """
    Body esperado en POST /payments/create
    """

    course_id: UUID = Field(
        ...,
        description="UUID del curso a comprar",
    )
    payment_type: str = Field(
        default="one_time",
        description="Tipo de pago: one_time o subscription",
        examples=["one_time"],
    )


class WebhookMercadoPagoRequest(BaseModel):
    """
    Body que envía MercadoPago al webhook
    """
    
    action: str = Field(
        ...,
        description="Tipo de evento (payment.created, payment.updated, etc.)",
    )
    data: dict = Field(
        ...,
        description="Datos del evento",
    )


# ──────────────────────────────────────────────────────────────────────────────
# RESPONSE schemas
# ──────────────────────────────────────────────────────────────────────────────

class PaymentCreateResponse(BaseModel):
    """
    Respuesta de POST /payments/create
    """
    
    payment_id: UUID = Field(
        description="UUID del pago en nuestra DB"
    )
    preference_id: str = Field(
        description="ID de la preferencia en MercadoPago"
    )
    init_point: str = Field(
        description="URL para pagar en MercadoPago (abrir en el navegador)"
    )
    sandbox_init_point: str = Field(
        description="URL de sandbox (para testing)"
    )


class PaymentResponse(BaseModel):
    """Respuesta básica de pago"""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    id: UUID
    user_id: UUID
    course_id: UUID | None = None
    amount: Decimal
    currency: str
    payment_method: str | None = None
    preference_id: str | None = None
    payment_id: str | None = None
    status: str
    payment_type: str
    created_at: datetime
    updated_at: datetime
    paid_at: datetime | None = None


class PaymentListResponse(BaseModel):
    """Lista de pagos con información del curso y del usuario"""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    id: UUID
    user_id: UUID
    user_name: str | None = None
    user_email: str | None = None
    course_id: UUID | None = None
    course_title: str | None = None
    amount: Decimal
    currency: str
    status: str
    payment_type: str
    created_at: datetime
    paid_at: datetime | None = None