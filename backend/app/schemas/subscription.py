"""
app/schemas/subscription.py
----------------------------
Schemas para el módulo de suscripciones.
"""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ──────────────────────────────────────────────────────────────────────────────
# REQUEST schemas
# ──────────────────────────────────────────────────────────────────────────────

class SubscriptionCreateRequest(BaseModel):
    """
    Body esperado en POST /subscriptions/create
    """

    plan_type: str = Field(
        default="testing",
        description="Tipo de plan: testing (15 seg), monthly, annual",
        examples=["testing"],
    )


class SubscriptionCancelRequest(BaseModel):
    """
    Body esperado en POST /subscriptions/{id}/cancel
    """

    reason: str | None = Field(
        default=None,
        description="Razón de la cancelación (opcional)",
    )


# ──────────────────────────────────────────────────────────────────────────────
# RESPONSE schemas
# ──────────────────────────────────────────────────────────────────────────────

class SubscriptionCreateResponse(BaseModel):
    """
    Respuesta de POST /subscriptions/create
    """
    
    subscription_id: UUID = Field(
        description="UUID de la suscripción en nuestra DB"
    )
    preapproval_id: str = Field(
        description="ID de la suscripción en MercadoPago"
    )
    init_point: str = Field(
        description="URL para autorizar la suscripción en MercadoPago"
    )
    sandbox_init_point: str = Field(
        description="URL de sandbox (para testing)"
    )


class SubscriptionResponse(BaseModel):
    """Respuesta básica de suscripción"""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    id: UUID
    user_id: UUID
    preapproval_id: str | None = None
    payer_id: str | None = None
    status: str
    plan_type: str
    amount: Decimal
    currency: str
    start_date: datetime | None = None
    next_billing_date: datetime | None = None
    end_date: datetime | None = None
    created_at: datetime
    updated_at: datetime