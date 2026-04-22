"""
app/services/video_storage_factory.py
--------------------------------------
Factory para instanciar el proveedor de video storage correcto.

Para cambiar de proveedor, solo modificás la variable de entorno
VIDEO_STORAGE_PROVIDER en el .env
"""

from app.services.supabase_video_storage import SupabaseVideoStorage
from app.services.video_storage import VideoStorageInterface


def get_video_storage() -> VideoStorageInterface:
    """
    Retorna la implementación activa de video storage.
    
    Por ahora siempre retorna SupabaseVideoStorage.
    Cuando agregues Bunny o Cloudflare, agregá la lógica aquí:
    
    if settings.VIDEO_STORAGE_PROVIDER == "bunny":
        return BunnyVideoStorage()
    elif settings.VIDEO_STORAGE_PROVIDER == "cloudflare":
        return CloudflareVideoStorage()
    else:
        return SupabaseVideoStorage()
    """
    return SupabaseVideoStorage()