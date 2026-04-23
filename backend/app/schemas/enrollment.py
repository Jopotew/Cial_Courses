"""
app/schemas/enrollment.py
--------------------------
Schemas para el módulo de matrículas.
"""

from datetime import datetime
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
    """Respuesta de matrícula con información del curso"""

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
    
    # Información del curso
    course_title: str | None = None
    course_description: str | None = None
    course_thumbnail_url: str | None = None
    course_instructor: str | None = None


class EnrollmentDeleteResponse(BaseModel):
    """Respuesta de DELETE /enrollments/{id}"""

    message: str