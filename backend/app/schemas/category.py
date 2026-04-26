"""
app/schemas/category.py
-----------------------
Schemas de Pydantic para el módulo de categorías.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ──────────────────────────────────────────────────────────────────────────────
# REQUEST schemas
# ──────────────────────────────────────────────────────────────────────────────

class CategoryCreateRequest(BaseModel):
    """Body esperado en POST /categories"""

    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Nombre de la categoría",
        examples=["Lenguaje"],
    )
    description: str | None = Field(
        default=None,
        description="Descripción opcional de la categoría",
        examples=["Cursos relacionados con el desarrollo del lenguaje"],
    )


class CategoryUpdateRequest(BaseModel):
    """Body esperado en PATCH /categories/{id}"""

    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
        description="Nuevo nombre de la categoría",
    )
    description: str | None = Field(
        default=None,
        description="Nueva descripción",
    )


# ──────────────────────────────────────────────────────────────────────────────
# RESPONSE schemas
# ──────────────────────────────────────────────────────────────────────────────

class CategoryResponse(BaseModel):
    """Respuesta de endpoints de categorías"""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    id: UUID
    name: str
    description: str | None = None
    courses_count: int = Field(
        default=0,
        description="Cantidad de cursos publicados en esta categoría",
    )
    created_at: datetime
    updated_at: datetime


class CategoryDeleteResponse(BaseModel):
    """Respuesta de DELETE /categories/{id}"""

    message: str