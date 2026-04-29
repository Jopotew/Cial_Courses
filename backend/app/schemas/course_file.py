"""
app/schemas/course_file.py
--------------------------
Schemas de Pydantic para archivos de curso (PDFs, DOCs, PPTs, etc.)
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CourseFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    course_id: UUID
    name: str
    file_url: str
    file_type: str
    file_size_bytes: int | None = None
    order: int
    created_at: datetime


class CourseFileDeleteResponse(BaseModel):
    message: str
