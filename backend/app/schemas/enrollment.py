"""
app/schemas/enrollment.py
--------------------------
Schemas para el módulo de matrículas.
ACTUALIZADO: EnrollmentWithCourseResponse ahora incluye todos los campos del curso
"""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ──────────────────────────────────────────────────────────────────────────────
# REQUEST schemas
# ──────────────────────────────────────────────────────────────────────────────

class EnrollmentCreateRequest(BaseModel):
    """
    Body esperado en POST /enrollments (admin)
    """

    user_id: UUID = Field(
        ...,
        description="UUID del usuario a matricular",
    )
    course_id: UUID = Field(
        ...,
        description="UUID del curso",
    )
    enrollment_type: str = Field(
        default="admin",
        description="Tipo de matrícula: purchase, subscription, admin, free",
        examples=["admin"],
    )
    expires_at: datetime | None = Field(
        default=None,
        description="Fecha de vencimiento (NULL = sin vencimiento)",
    )


class EnrollmentUpdateRequest(BaseModel):
    """
    Body esperado en PATCH /enrollments/{id} (admin)
    """

    is_active: bool | None = Field(
        default=None,
        description="Activar o desactivar la matrícula",
    )
    expires_at: datetime | None = Field(
        default=None,
        description="Nueva fecha de vencimiento",
    )


# ──────────────────────────────────────────────────────────────────────────────
# RESPONSE schemas
# ──────────────────────────────────────────────────────────────────────────────

class EnrollmentResponse(BaseModel):
    """Respuesta básica de matrícula"""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    id: UUID
    user_id: UUID
    course_id: UUID
    enrolled_at: datetime
    expires_at: datetime | None = None
    is_active: bool
    enrollment_type: str
    created_at: datetime
    updated_at: datetime


class EnrollmentWithCourseResponse(BaseModel):
    """
    Respuesta de matrícula con información COMPLETA del curso.
    
    Incluye TODOS los campos que el frontend necesita para renderizar
    las cards de progreso en el dashboard.
    """

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    # Campos de la matrícula
    id: UUID
    user_id: UUID
    course_id: UUID
    enrolled_at: datetime
    expires_at: datetime | None = None
    is_active: bool
    enrollment_type: str
    created_at: datetime
    updated_at: datetime
    
    # ── Información COMPLETA del curso ──────────────────────────────────────
    
    # Básicos
    title: str
    subtitle: str | None = None
    description: str
    
    # Instructor
    instructor_name: str
    instructor_title: str | None = None
    
    # Precio
    price: Decimal
    original_price: Decimal | None = None
    
    # Categoría
    category_id: UUID
    category_name: str
    
    # Metadata
    level: str = "basico"
    thumbnail_url: str | None = None
    
    # ── Progreso (se puede agregar después) ─────────────────────────────────
    # progress_percentage: float | None = None
    # completed_lessons: int | None = None
    # total_lessons: int | None = None


class EnrollmentDeleteResponse(BaseModel):
    """Respuesta de DELETE /enrollments/{id}"""

    message: str