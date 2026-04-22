"""
app/services/video_service.py
------------------------------
Lógica de negocio del módulo de videos.
"""

from datetime import datetime, timezone
from typing import BinaryIO, Optional
from uuid import UUID

from app.db.supabase import get_supabase_admin_client
from app.schemas.video import VideoCreateRequest, VideoUpdateRequest
from app.services.video_storage_factory import get_video_storage
from app.services.video_utils import get_video_duration


def _client():
    """Retorna el cliente admin de Supabase."""
    return get_supabase_admin_client()


def _get_next_order(course_id: UUID) -> int:
    """
    Obtiene el siguiente número de orden disponible para un curso.
    
    Args:
        course_id: UUID del curso
        
    Returns:
        Siguiente número de orden (ej: si hay 3 videos, retorna 4)
    """
    result = _client().table("videos").select("order").eq("course_id", str(course_id)).order("order", desc=True).limit(1).execute()
    
    if result.data:
        return result.data[0]["order"] + 1
    return 1


# ──────────────────────────────────────────────────────────────────────────────
# Búsquedas
# ──────────────────────────────────────────────────────────────────────────────

def get_video_by_id(video_id: UUID, include_unpublished: bool = False) -> Optional[dict]:
    """
    Busca un video por su UUID.

    Args:
        video_id: UUID del video.
        include_unpublished: Si es True, retorna el video aunque no esté publicado.

    Returns:
        Diccionario con los datos del video, o None si no existe.
    """
    query = _client().table("videos").select("*").eq("id", str(video_id))

    if not include_unpublished:
        query = query.eq("is_published", True)

    result = query.execute()
    
    if not result.data:
        return None
    
    video = result.data[0]
    
    # Agregar thumbnail_url generada desde storage
    if video.get("thumbnail_file_id"):
        storage = get_video_storage()
        video["thumbnail_url"] = storage.get_thumbnail_url(video["thumbnail_file_id"])
    
    return video


def get_videos_by_course(
    course_id: UUID,
    include_unpublished: bool = False,
) -> list[dict]:
    """
    Lista todos los videos de un curso, ordenados por 'order'.

    Args:
        course_id: UUID del curso.
        include_unpublished: Si es True, incluye videos no publicados.

    Returns:
        Lista de videos del curso.
    """
    query = _client().table("videos").select("*").eq("course_id", str(course_id))

    if not include_unpublished:
        query = query.eq("is_published", True)

    result = query.order("order").execute()
    
    # Agregar thumbnail_url a cada video
    storage = get_video_storage()
    videos = []
    for video in result.data:
        if video.get("thumbnail_file_id"):
            video["thumbnail_url"] = storage.get_thumbnail_url(video["thumbnail_file_id"])
        videos.append(video)
    
    return videos


# ──────────────────────────────────────────────────────────────────────────────
# Creación
# ──────────────────────────────────────────────────────────────────────────────

def create_video(
    course_id: UUID,
    data: VideoCreateRequest,
    video_file: BinaryIO,
    video_filename: str,
    thumbnail_file: BinaryIO,
    thumbnail_filename: str,
) -> dict:
    """
    Crea un nuevo video y sube los archivos al storage.

    Args:
        course_id: UUID del curso.
        data: Datos del video.
        video_file: Archivo binario del video.
        video_filename: Nombre original del archivo de video.
        thumbnail_file: Archivo binario de la miniatura.
        thumbnail_filename: Nombre original del archivo de miniatura.

    Returns:
        Diccionario con los datos del video creado.
    """
    storage = get_video_storage()
    
    # Determinar orden
    order = data.order if data.order is not None else _get_next_order(course_id)
    
    # Extraer duración del video
    duration = get_video_duration(video_file)
    
    # Crear registro en DB primero (para obtener el UUID)
    result = _client().table("videos").insert({
        "course_id": str(course_id),
        "title": data.title,
        "description": data.description,
        "order": order,
        "duration_seconds": duration,
        "storage_provider": "supabase",
        "storage_file_id": "pending",
        "is_published": False,
    }).execute()
    
    video = result.data[0]
    video_id = UUID(video["id"])
    
    # Subir video al storage
    uploaded_video = storage.upload_video(
        file=video_file,
        course_id=course_id,
        video_id=video_id,
        filename=video_filename,
    )
    
    # Subir thumbnail
    uploaded_thumb = storage.upload_thumbnail(
        file=thumbnail_file,
        video_id=video_id,
        filename=thumbnail_filename,
    )
    
    # Actualizar registro con metadata del storage
    updated = _client().table("videos").update({
        "storage_file_id": uploaded_video.file_id,
        "file_size_bytes": uploaded_video.file_size,
        "thumbnail_file_id": uploaded_thumb.file_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(video_id)).execute()
    
    return updated.data[0]


# ──────────────────────────────────────────────────────────────────────────────
# Actualización
# ──────────────────────────────────────────────────────────────────────────────

def update_video(
    video_id: UUID,
    data: VideoUpdateRequest,
    video_file: Optional[BinaryIO] = None,
    video_filename: Optional[str] = None,
    thumbnail_file: Optional[BinaryIO] = None,
    thumbnail_filename: Optional[str] = None,
) -> dict:
    """
    Actualiza metadata y/o archivos de un video.

    Args:
        video_id: UUID del video.
        data: Datos a actualizar.
        video_file: Archivo de video nuevo (opcional, reemplaza el existente).
        video_filename: Nombre del nuevo archivo de video.
        thumbnail_file: Archivo de thumbnail nuevo (opcional).
        thumbnail_filename: Nombre del nuevo archivo de thumbnail.

    Returns:
        Diccionario con los datos actualizados.
    """
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}

    # Actualizar metadata
    if data.title is not None:
        updates["title"] = data.title
    if data.description is not None:
        updates["description"] = data.description
    if data.order is not None:
        updates["order"] = data.order

    # Si se reemplaza el video
    if video_file and video_filename:
        video = get_video_by_id(video_id, include_unpublished=True)
        if not video:
            raise ValueError("Video no encontrado")
        
        storage = get_video_storage()
        
        # Eliminar video anterior del storage
        if video.get("storage_file_id") != "pending":
            storage.delete_video(video["storage_file_id"])
        
        # Subir nuevo video
        uploaded_video = storage.upload_video(
            file=video_file,
            course_id=UUID(video["course_id"]),
            video_id=video_id,
            filename=video_filename,
        )
        
        # Extraer duración del nuevo video
        duration = get_video_duration(video_file)
        
        updates["storage_file_id"] = uploaded_video.file_id
        updates["file_size_bytes"] = uploaded_video.file_size
        updates["duration_seconds"] = duration
    
    # Si se reemplaza el thumbnail
    if thumbnail_file and thumbnail_filename:
        video = get_video_by_id(video_id, include_unpublished=True)
        if not video:
            raise ValueError("Video no encontrado")
        
        storage = get_video_storage()
        
        # Eliminar thumbnail anterior
        if video.get("thumbnail_file_id"):
            storage.delete_thumbnail(video["thumbnail_file_id"])
        
        # Subir nuevo thumbnail
        uploaded_thumb = storage.upload_thumbnail(
            file=thumbnail_file,
            video_id=video_id,
            filename=thumbnail_filename,
        )
        
        updates["thumbnail_file_id"] = uploaded_thumb.file_id

    result = _client().table("videos").update(updates).eq("id", str(video_id)).execute()
    return result.data[0]


def publish_video(video_id: UUID, is_published: bool) -> dict:
    """
    Publica o despublica un video.

    Args:
        video_id: UUID del video.
        is_published: True para publicar, False para despublicar.

    Returns:
        Diccionario con los datos actualizados.
    """
    result = _client().table("videos").update({
        "is_published": is_published,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(video_id)).execute()

    return result.data[0]


# ──────────────────────────────────────────────────────────────────────────────
# Streaming
# ──────────────────────────────────────────────────────────────────────────────

def get_video_stream_url(video_id: UUID, expires_in: int = 3600) -> str:
    """
    Genera URL firmada para reproducir el video.

    Args:
        video_id: UUID del video.
        expires_in: Segundos hasta que expire la URL.

    Returns:
        URL firmada del video.
    """
    video = get_video_by_id(video_id, include_unpublished=True)
    if not video:
        raise ValueError("Video no encontrado")
    
    storage = get_video_storage()
    return storage.get_video_url(
        file_id=video["storage_file_id"],
        expires_in=expires_in,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Eliminación
# ──────────────────────────────────────────────────────────────────────────────

def delete_video(video_id: UUID) -> None:
    """
    Elimina un video de la DB y del storage.

    Args:
        video_id: UUID del video a eliminar.
    """
    # Obtener datos del video antes de eliminar
    video = get_video_by_id(video_id, include_unpublished=True)
    if not video:
        return
    
    storage = get_video_storage()
    
    # Eliminar archivos del storage
    if video.get("storage_file_id") != "pending":
        storage.delete_video(video["storage_file_id"])
    
    if video.get("thumbnail_file_id"):
        storage.delete_thumbnail(video["thumbnail_file_id"])
    
    # Eliminar registro de la DB
    _client().table("videos").delete().eq("id", str(video_id)).execute()