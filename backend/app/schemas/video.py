"""
app/schemas/video.py
--------------------
Schemas de Pydantic para el módulo de videos.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field


# ──────────────────────────────────────────────────────────────────────────────
# REQUEST schemas
# ──────────────────────────────────────────────────────────────────────────────

class VideoCreateRequest(BaseModel):
    """
    Body esperado en POST /courses/{course_id}/videos
    (sin el archivo, que se sube por separado)
    """

    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Título del video",
        examples=["Introducción al curso"],
    )
    description: str | None = Field(
        default=None,
        description="Descripción del video",
    )
    order: int | None = Field(
        default=None,
        ge=1,
        description="Orden del video dentro del curso (1, 2, 3...). Si no se especifica, se asigna automáticamente el siguiente disponible.",
        examples=[1],
    )


class VideoUpdateRequest(BaseModel):
    """Body esperado en PATCH /videos/{id}"""

    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )
    description: str | None = None
    order: int | None = Field(default=None, ge=1)


class VideoPublishRequest(BaseModel):
    """Body esperado en PATCH /videos/{id}/publish"""

    is_published: bool = Field(
        ...,
        description="True para publicar, False para despublicar",
    )


# ──────────────────────────────────────────────────────────────────────────────
# RESPONSE schemas
# ──────────────────────────────────────────────────────────────────────────────

class VideoResponse(BaseModel):
    """Respuesta básica de video"""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    id: UUID
    course_id: UUID
    title: str
    description: str | None = None
    order: int
    duration_seconds: int | None = None
    storage_provider: str
    thumbnail_url: str | None = None
    file_size_bytes: int | None = None
    is_published: bool
    created_at: datetime
    updated_at: datetime
    
    @computed_field
    @property
    def duration_formatted(self) -> str | None:
        """Auto-calcula duration_formatted desde duration_seconds"""
        if self.duration_seconds is None:
            return None
        
        seconds = self.duration_seconds
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{secs:02d}"
        else:
            return f"{minutes:02d}:{secs:02d}"


class VideoStreamResponse(BaseModel):
    """Respuesta de GET /videos/{id}/stream"""

    video_url: str = Field(
        description="URL firmada para reproducir el video (expira en 1 hora)"
    )
    expires_in: int = Field(
        description="Segundos hasta que expire la URL",
        examples=[3600],
    )
    duration_seconds: int | None = Field(
        default=None,
        description="Duración del video en segundos",
    )
    
    @computed_field
    @property
    def duration_formatted(self) -> str | None:
        """Auto-calcula duration_formatted desde duration_seconds"""
        if self.duration_seconds is None:
            return None
        
        seconds = self.duration_seconds
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{secs:02d}"
        else:
            return f"{minutes:02d}:{secs:02d}"


class VideoDeleteResponse(BaseModel):
    """Respuesta de DELETE /videos/{id}"""

    message: str