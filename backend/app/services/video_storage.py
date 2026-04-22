"""
app/services/video_storage.py
------------------------------
Interfaz abstracta para proveedores de almacenamiento de video.

Esta abstracción permite cambiar de proveedor (Supabase → Bunny → Cloudflare)
sin tocar el código de lógica de negocio.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import BinaryIO, Optional
from uuid import UUID


@dataclass
class UploadedVideo:
    """
    Resultado de subir un video.
    Agnóstico del proveedor.
    """
    file_id: str           # Identificador del archivo en el proveedor
    file_size: int         # Tamaño en bytes
    duration: int | None   # Duración en segundos (si está disponible)


@dataclass
class UploadedThumbnail:
    """
    Resultado de subir una miniatura.
    Agnóstico del proveedor.
    """
    file_id: str           # Identificador del archivo
    public_url: str | None # URL pública (si el bucket es público)


class VideoStorageInterface(ABC):
    """
    Interfaz que deben implementar todos los proveedores de video storage.
    
    Los métodos trabajan con identificadores abstractos, no URLs completas.
    Las URLs se generan bajo demanda según el proveedor.
    """
    
    @abstractmethod
    def upload_video(
        self,
        file: BinaryIO,
        course_id: UUID,
        video_id: UUID,
        filename: str,
    ) -> UploadedVideo:
        """
        Sube un archivo de video al storage.
        
        Args:
            file: Archivo binario del video
            course_id: UUID del curso (para organizar en carpetas)
            video_id: UUID del video
            filename: Nombre original del archivo
            
        Returns:
            UploadedVideo con el file_id y metadata
        """
        pass
    
    @abstractmethod
    def upload_thumbnail(
        self,
        file: BinaryIO,
        video_id: UUID,
        filename: str,
    ) -> UploadedThumbnail:
        """
        Sube una miniatura al storage.
        
        Args:
            file: Archivo binario de la imagen
            video_id: UUID del video
            filename: Nombre original del archivo
            
        Returns:
            UploadedThumbnail con file_id y URL pública
        """
        pass
    
    @abstractmethod
    def get_video_url(
        self,
        file_id: str,
        expires_in: int = 3600,
    ) -> str:
        """
        Genera una URL para reproducir el video.
        
        Args:
            file_id: Identificador del archivo devuelto por upload_video
            expires_in: Segundos hasta que expire la URL (para providers con signed URLs)
            
        Returns:
            URL del video (puede ser firmada o pública según proveedor)
        """
        pass
    
    @abstractmethod
    def get_thumbnail_url(self, file_id: str) -> str:
        """
        Genera una URL para la miniatura.
        
        Args:
            file_id: Identificador del archivo devuelto por upload_thumbnail
            
        Returns:
            URL de la miniatura
        """
        pass
    
    @abstractmethod
    def delete_video(self, file_id: str) -> None:
        """
        Elimina un video del storage.
        
        Args:
            file_id: Identificador del archivo a eliminar
        """
        pass
    
    @abstractmethod
    def delete_thumbnail(self, file_id: str) -> None:
        """
        Elimina una miniatura del storage.
        
        Args:
            file_id: Identificador del archivo a eliminar
        """
        pass