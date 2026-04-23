"""
app/api/video_progress.py
--------------------------
Endpoints del módulo de progreso de videos.

AHORA CON VALIDACIÓN DE MATRÍCULA:
- Solo usuarios matriculados pueden guardar progreso
- Admins tienen acceso a todo

Todos los endpoints requieren autenticación + matrícula.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_current_user
from app.schemas.video_progress import (
    CourseProgressResponse,
    VideoProgressMarkCompletedRequest,
    VideoProgressResponse,
    VideoProgressUpdateRequest,
)
from app.services import course as course_service
from app.services import enrollment as enrollment_service
from app.services import video as video_service
from app.services import video_progress as video_progress_service

router = APIRouter(prefix="/progress", tags=["Progreso de Videos"])


# ──────────────────────────────────────────────────────────────────────────────
# Helper para validar matrícula
# ──────────────────────────────────────────────────────────────────────────────

def _check_enrollment(user_id: UUID, course_id: UUID, user_role: int):
    """
    Valida que el usuario esté matriculado en el curso.
    Los admins (role=1) tienen acceso automático.
    """
    # Admins tienen acceso a todo
    if user_role == 1:
        return
    
    # Verificar matrícula
    if not enrollment_service.is_user_enrolled(user_id, course_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No estás matriculado en este curso. Debes comprarlo primero para acceder al progreso.",
        )


# ──────────────────────────────────────────────────────────────────────────────
# Progreso individual de video
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/videos/{video_id}", response_model=VideoProgressResponse | None)
def get_video_progress(
    video_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """
    Obtiene el progreso del usuario actual en un video específico.
    
    Retorna null si el usuario nunca vio el video.
    ✅ Requiere: JWT válido + matrícula activa (o ser admin).
    """
    user_id = UUID(current_user["id"])
    
    # Verificar que el video existe y está publicado
    video = video_service.get_video_by_id(video_id, include_unpublished=False)
    if video is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video no encontrado o no está publicado.",
        )
    
    # ✅ VALIDAR MATRÍCULA
    course_id = UUID(video["course_id"])
    _check_enrollment(user_id, course_id, current_user.get("role", 0))
    
    progress = video_progress_service.get_video_progress(user_id, video_id)
    
    if progress is None:
        return None
    
    return VideoProgressResponse.model_validate(progress)


@router.post("/videos/{video_id}", response_model=VideoProgressResponse, status_code=status.HTTP_200_OK)
def update_video_progress(
    video_id: UUID,
    data: VideoProgressUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Actualiza el progreso del usuario en un video.
    
    - Guarda en qué segundo quedó
    - Si llega al 95% de duración, se marca automáticamente como completado
    - El usuario puede marcar manualmente como completado con is_completed=true
    
    ✅ Requiere: JWT válido + matrícula activa (o ser admin).
    """
    user_id = UUID(current_user["id"])
    
    # Verificar que el video existe y está publicado
    video = video_service.get_video_by_id(video_id, include_unpublished=False)
    if video is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video no encontrado o no está publicado.",
        )
    
    # ✅ VALIDAR MATRÍCULA
    course_id = UUID(video["course_id"])
    _check_enrollment(user_id, course_id, current_user.get("role", 0))
    
    progress = video_progress_service.update_video_progress(
        user_id=user_id,
        video_id=video_id,
        data=data,
        video_duration=video.get("duration_seconds"),
    )
    
    return VideoProgressResponse.model_validate(progress)


@router.post("/videos/{video_id}/complete", response_model=VideoProgressResponse)
def mark_video_completed(
    video_id: UUID,
    data: VideoProgressMarkCompletedRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Marca un video como completado o no completado manualmente.
    
    Útil para cuando el usuario quiere marcar como visto sin ver el 95%.
    O para desmarcar un video que marcó por error.
    
    ✅ Requiere: JWT válido + matrícula activa (o ser admin).
    """
    user_id = UUID(current_user["id"])
    
    # Verificar que el video existe y está publicado
    video = video_service.get_video_by_id(video_id, include_unpublished=False)
    if video is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video no encontrado o no está publicado.",
        )
    
    # ✅ VALIDAR MATRÍCULA
    course_id = UUID(video["course_id"])
    _check_enrollment(user_id, course_id, current_user.get("role", 0))
    
    progress = video_progress_service.mark_video_completed(
        user_id=user_id,
        video_id=video_id,
        is_completed=data.is_completed,
    )
    
    return VideoProgressResponse.model_validate(progress)


@router.delete("/videos/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
def reset_video_progress(
    video_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """
    Resetea el progreso de un video (lo elimina).
    
    El usuario puede volver a empezar desde 0.
    ✅ Requiere: JWT válido + matrícula activa (o ser admin).
    """
    user_id = UUID(current_user["id"])
    
    # Verificar que el video existe
    video = video_service.get_video_by_id(video_id, include_unpublished=False)
    if video is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video no encontrado o no está publicado.",
        )
    
    # ✅ VALIDAR MATRÍCULA
    course_id = UUID(video["course_id"])
    _check_enrollment(user_id, course_id, current_user.get("role", 0))
    
    video_progress_service.reset_video_progress(user_id, video_id)
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Progreso de curso completo
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/courses/{course_id}", response_model=CourseProgressResponse)
def get_course_progress(
    course_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """
    Obtiene el progreso completo del usuario en un curso.
    
    Incluye:
    - Total de videos en el curso
    - Videos completados
    - Porcentaje de progreso
    - Progreso individual de cada video
    
    ✅ Requiere: JWT válido + matrícula activa (o ser admin).
    """
    user_id = UUID(current_user["id"])
    
    # Verificar que el curso existe y está publicado
    course = course_service.get_course_by_id(course_id, include_unpublished=False)
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado o no está publicado.",
        )
    
    # ✅ VALIDAR MATRÍCULA
    _check_enrollment(user_id, course_id, current_user.get("role", 0))
    
    progress = video_progress_service.get_course_progress(user_id, course_id)
    
    return CourseProgressResponse.model_validate(progress)


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def reset_course_progress(
    course_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """
    Resetea el progreso completo de un curso.
    
    Elimina el progreso de todos los videos del curso.
    ✅ Requiere: JWT válido + matrícula activa (o ser admin).
    """
    user_id = UUID(current_user["id"])
    
    # Verificar que el curso existe
    course = course_service.get_course_by_id(course_id, include_unpublished=False)
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado o no está publicado.",
        )
    
    # ✅ VALIDAR MATRÍCULA
    _check_enrollment(user_id, course_id, current_user.get("role", 0))
    
    video_progress_service.reset_course_progress(user_id, course_id)
    return None