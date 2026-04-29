"""
app/schemas/module.py
---------------------
Schemas de Pydantic para el módulo de módulos de cursos.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ModuleCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None


class ModuleUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    order: int | None = Field(default=None, ge=0)


class VideoInModuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    title: str
    order: int
    duration_seconds: int | None = None
    is_published: bool
    module_id: UUID | None = None


class ModuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    course_id: UUID
    title: str
    description: str | None = None
    order: int
    created_at: datetime
    updated_at: datetime
    videos: list[VideoInModuleResponse] = []


class ModuleDeleteResponse(BaseModel):
    message: str
