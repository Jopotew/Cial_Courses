"""
app/schemas/video_progress.py
------------------------------
Schemas para el módulo de progreso de videos.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ──────────────────────────────────────────────────────────────────────────────
# REQUEST schemas
# ──────────────────────────────────────────────────────────────────────────────

class VideoProgressUpdateRequest(BaseModel):
    """
    Body esperado en POST/PATCH /videos/{video_id}/progress
    """

    current_time_seconds: int = Field(
        ...,
        ge=0,
        description="Segundo actual del video donde quedó el usuario",
        examples=[120],
    )
    is_completed: bool = Field(
        default=False,
        description="Si el usuario marcó el video como completado manualmente",
    )


class VideoProgressMarkCompletedRequest(BaseModel):
    """
    Body esperado en POST /videos/{video_id}/progress/complete
    """

    is_completed: bool = Field(
        default=True,
        description="Marcar como completado (true) o no completado (false)",
    )


# ──────────────────────────────────────────────────────────────────────────────
# RESPONSE schemas
# ──────────────────────────────────────────────────────────────────────────────

class VideoProgressResponse(BaseModel):
    """Respuesta de progreso de un video"""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    id: UUID
    user_id: UUID
    video_id: UUID
    current_time_seconds: int
    is_completed: bool
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None


class CourseProgressResponse(BaseModel):
    """Respuesta de progreso de un curso completo"""

    course_id: UUID
    total_videos: int = Field(description="Total de videos en el curso")
    completed_videos: int = Field(description="Videos completados por el usuario")
    progress_percentage: float = Field(
        description="Porcentaje de progreso (0-100)",
        examples=[75.5],
    )
    videos_progress: list[VideoProgressResponse] = Field(
        description="Progreso individual de cada video"
    )