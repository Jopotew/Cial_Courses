"""
app/services/supabase_video_storage.py
---------------------------------------
Implementación del VideoStorageInterface para Supabase Storage.

Esta clase encapsula toda la lógica específica de Supabase.
Cuando migremos a otro proveedor, solo creamos otra implementación.
"""


from typing import BinaryIO
from uuid import UUID

from app.core.config import settings
from app.db.supabase import get_supabase_admin_client
from app.services.video_storage import (
    UploadedThumbnail,
    UploadedVideo,
    VideoStorageInterface,
)


class SupabaseVideoStorage(VideoStorageInterface):
    """
    Implementación de video storage usando Supabase Storage.
    """
    
    def __init__(self):
        self.client = get_supabase_admin_client()
        self.video_bucket = "course-videos"
        self.thumbnail_bucket = "course-thumbnails"
    
    def upload_video(
        self,
        file: BinaryIO,
        course_id: UUID,
        video_id: UUID,
        filename: str,
    ) -> UploadedVideo:
        """
        Sube video a Supabase Storage.
        Path: course-videos/{course_id}/{video_id}.mp4
        """
        # Construir path
        extension = filename.split(".")[-1] if "." in filename else "mp4"
        file_path = f"{course_id}/{video_id}.{extension}"
        
        # Leer contenido del archivo
        file.seek(0)
        file_content = file.read()
        file_size = len(file_content)
        
        # Subir archivo
        result = self.client.storage.from_(self.video_bucket).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": "video/mp4"}
        )
        
        return UploadedVideo(
            file_id=file_path,
            file_size=file_size,
            duration=None,  # Supabase no calcula duración automáticamente
        )
        
    def upload_thumbnail(
        self,
        file: BinaryIO,
        video_id: UUID,
        filename: str,
    ) -> UploadedThumbnail:
        """
        Sube miniatura a Supabase Storage.
        Path: course-thumbnails/videos/{video_id}.jpg
        """
        extension = filename.split(".")[-1] if "." in filename else "jpg"
        file_path = f"videos/{video_id}.{extension}"
        
        # Leer contenido del archivo
        file.seek(0)
        file_content = file.read()
        
        # Subir archivo
        self.client.storage.from_(self.thumbnail_bucket).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": f"image/{extension}"}
        )
        
        # Generar URL pública (el bucket es público)
        public_url = self.client.storage.from_(self.thumbnail_bucket).get_public_url(file_path)
        
        return UploadedThumbnail(
            file_id=file_path,
            public_url=public_url,
        )
    
    def get_video_url(self, file_id: str, expires_in: int = 3600) -> str:
        """
        Genera URL firmada para el video (válida por expires_in segundos).
        """
        signed_url = self.client.storage.from_(self.video_bucket).create_signed_url(
            path=file_id,
            expires_in=expires_in,
        )
        
        # create_signed_url retorna un dict con 'signedURL'
        if isinstance(signed_url, dict):
            return signed_url.get("signedURL", "")
        return signed_url
    
    def get_thumbnail_url(self, file_id: str) -> str:
        """
        Retorna URL pública de la miniatura.
        """
        return self.client.storage.from_(self.thumbnail_bucket).get_public_url(file_id)
    
    def delete_video(self, file_id: str) -> None:
        """
        Elimina video de Supabase Storage.
        """
        self.client.storage.from_(self.video_bucket).remove([file_id])
    
    def delete_thumbnail(self, file_id: str) -> None:
        """
        Elimina miniatura de Supabase Storage.
        """
        self.client.storage.from_(self.thumbnail_bucket).remove([file_id])