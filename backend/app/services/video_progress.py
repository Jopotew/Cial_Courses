"""
app/services/video_progress_service.py
---------------------------------------
Lógica de negocio del módulo de progreso de videos.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from app.db.supabase import get_supabase_admin_client
from app.schemas.video_progress import VideoProgressUpdateRequest


def _client():
    """Retorna el cliente admin de Supabase."""
    return get_supabase_admin_client()


# ──────────────────────────────────────────────────────────────────────────────
# Consultas
# ──────────────────────────────────────────────────────────────────────────────

def get_video_progress(user_id: UUID, video_id: UUID) -> Optional[dict]:
    """
    Obtiene el progreso de un usuario en un video específico.
    
    Args:
        user_id: UUID del usuario
        video_id: UUID del video
        
    Returns:
        Diccionario con el progreso, o None si no existe
    """
    result = _client().table("video_progress").select("*").eq("user_id", str(user_id)).eq("video_id", str(video_id)).execute()
    
    return result.data[0] if result.data else None


def get_course_progress(user_id: UUID, course_id: UUID) -> dict:
    """
    Obtiene el progreso completo de un usuario en un curso.
    
    Incluye:
    - Total de videos en el curso
    - Videos completados
    - Porcentaje de progreso
    - Progreso individual de cada video
    
    Args:
        user_id: UUID del usuario
        course_id: UUID del curso
        
    Returns:
        Diccionario con el progreso del curso
    """
    # Obtener todos los videos del curso (publicados)
    videos_result = _client().table("videos").select("id").eq("course_id", str(course_id)).eq("is_published", True).execute()
    
    video_ids = [v["id"] for v in videos_result.data]
    total_videos = len(video_ids)
    
    if total_videos == 0:
        return {
            "course_id": str(course_id),
            "total_videos": 0,
            "completed_videos": 0,
            "progress_percentage": 0.0,
            "videos_progress": [],
        }
    
    # Obtener progreso de todos los videos del curso para este usuario
    progress_result = _client().table("video_progress").select("*").eq("user_id", str(user_id)).in_("video_id", video_ids).execute()
    
    videos_progress = progress_result.data
    completed_videos = sum(1 for p in videos_progress if p["is_completed"])
    progress_percentage = (completed_videos / total_videos) * 100
    
    return {
        "course_id": str(course_id),
        "total_videos": total_videos,
        "completed_videos": completed_videos,
        "progress_percentage": round(progress_percentage, 2),
        "videos_progress": videos_progress,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Actualización
# ──────────────────────────────────────────────────────────────────────────────

def update_video_progress(
    user_id: UUID,
    video_id: UUID,
    data: VideoProgressUpdateRequest,
    video_duration: Optional[int] = None,
) -> dict:
    """
    Actualiza el progreso de un usuario en un video.
    
    Si el usuario llega al 95% del video, se marca automáticamente como completado.
    
    Args:
        user_id: UUID del usuario
        video_id: UUID del video
        data: Datos del progreso
        video_duration: Duración total del video en segundos (para auto-completar)
        
    Returns:
        Diccionario con el progreso actualizado
    """
    # Verificar si ya existe progreso
    existing = get_video_progress(user_id, video_id)
    
    # Auto-completar si llegó al 95% del video
    is_completed = data.is_completed
    if video_duration and data.current_time_seconds >= (video_duration * 0.95):
        is_completed = True
    
    if existing:
        # Actualizar existente
        result = _client().table("video_progress").update({
            "current_time_seconds": data.current_time_seconds,
            "is_completed": is_completed,
        }).eq("user_id", str(user_id)).eq("video_id", str(video_id)).execute()
    else:
        # Crear nuevo
        result = _client().table("video_progress").insert({
            "user_id": str(user_id),
            "video_id": str(video_id),
            "current_time_seconds": data.current_time_seconds,
            "is_completed": is_completed,
        }).execute()
    
    return result.data[0]


def mark_video_completed(user_id: UUID, video_id: UUID, is_completed: bool) -> dict:
    """
    Marca un video como completado o no completado.
    
    Args:
        user_id: UUID del usuario
        video_id: UUID del video
        is_completed: True para marcar como completado, False para desmarcar
        
    Returns:
        Diccionario con el progreso actualizado
    """
    existing = get_video_progress(user_id, video_id)
    
    if existing:
        # Actualizar existente
        result = _client().table("video_progress").update({
            "is_completed": is_completed,
        }).eq("user_id", str(user_id)).eq("video_id", str(video_id)).execute()
    else:
        # Crear nuevo marcado como completado
        result = _client().table("video_progress").insert({
            "user_id": str(user_id),
            "video_id": str(video_id),
            "current_time_seconds": 0,
            "is_completed": is_completed,
        }).execute()
    
    return result.data[0]


# ──────────────────────────────────────────────────────────────────────────────
# Eliminación
# ──────────────────────────────────────────────────────────────────────────────

def reset_video_progress(user_id: UUID, video_id: UUID) -> None:
    """
    Resetea el progreso de un video (elimina el registro).
    
    Args:
        user_id: UUID del usuario
        video_id: UUID del video
    """
    _client().table("video_progress").delete().eq("user_id", str(user_id)).eq("video_id", str(video_id)).execute()


def reset_course_progress(user_id: UUID, course_id: UUID) -> None:
    """
    Resetea el progreso completo de un curso para un usuario.
    
    Args:
        user_id: UUID del usuario
        course_id: UUID del curso
    """
    # Obtener todos los videos del curso
    videos_result = _client().table("videos").select("id").eq("course_id", str(course_id)).execute()
    
    video_ids = [v["id"] for v in videos_result.data]
    
    if video_ids:
        # Eliminar progreso de todos los videos del curso
        _client().table("video_progress").delete().eq("user_id", str(user_id)).in_("video_id", video_ids).execute()