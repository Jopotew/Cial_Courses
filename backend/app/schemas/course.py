"""
app/schemas/course.py
---------------------
Schemas de Pydantic para el módulo de cursos.
"""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ──────────────────────────────────────────────────────────────────────────────
# REQUEST schemas
# ──────────────────────────────────────────────────────────────────────────────

class CourseCreateRequest(BaseModel):
    """Body esperado en POST /courses"""

    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Título del curso",
        examples=["Técnicas de Estimulación Temprana"],
    )
    description: str = Field(
        ...,
        min_length=1,
        description="Descripción completa del curso",
        examples=["Aprende las mejores técnicas para estimular el desarrollo..."],
    )
    category_id: UUID = Field(
        ...,
        description="UUID de la categoría a la que pertenece el curso",
    )
    instructor_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Nombre del instructor",
        examples=["Dra. María López"],
    )
    price: Decimal = Field(
        ...,
        ge=0,
        decimal_places=2,
        description="Precio del curso en la moneda local",
        examples=[4500.00],
    )
    thumbnail_url: str | None = Field(
        default=None,
        description="URL de la imagen de portada del curso",
    )


class CourseUpdateRequest(BaseModel):
    """Body esperado en PATCH /courses/{id}"""

    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )
    description: str | None = Field(
        default=None,
        min_length=1,
    )
    category_id: UUID | None = None
    instructor_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )
    price: Decimal | None = Field(
        default=None,
        ge=0,
        decimal_places=2,
    )
    thumbnail_url: str | None = None


class CoursePublishRequest(BaseModel):
    """Body esperado en PATCH /courses/{id}/publish"""

    is_published: bool = Field(
        ...,
        description="True para publicar, False para despublicar",
    )


# ──────────────────────────────────────────────────────────────────────────────
# RESPONSE schemas
# ──────────────────────────────────────────────────────────────────────────────

class CourseResponse(BaseModel):
    """Respuesta básica de curso (vista pública)"""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    id: UUID
    title: str
    description: str
    category_id: UUID
    instructor_name: str
    price: Decimal
    thumbnail_url: str | None = None
    is_published: bool
    created_at: datetime
    updated_at: datetime


class CourseDetailResponse(CourseResponse):
    """
    Respuesta detallada de curso.
    Incluye información de la categoría.
    """

    category_name: str | None = Field(
        default=None,
        description="Nombre de la categoría (cargado desde JOIN)",
    )


class CourseDeleteResponse(BaseModel):
    """Respuesta de DELETE /courses/{id}"""

    message: str