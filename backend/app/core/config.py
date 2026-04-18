"""
app/core/config.py
------------------
Configuración central de AulaCAL.

Por ahora solo contiene las variables de Supabase.
Se irán agregando las demás secciones a medida que avance el proyecto.
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Clase principal de configuración.
    Lee las variables de entorno desde el archivo .env.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ──────────────────────────────────────────────────────────────────────
    # BASE DE DATOS — SUPABASE
    # ──────────────────────────────────────────────────────────────────────

    SUPABASE_DB_URL: str = Field(
        ...,
        description="URL de conexión a PostgreSQL de Supabase.",
    )
    SUPABASE_URL: str = Field(
        ...,
        description="URL pública del proyecto Supabase.",
    )
    SUPABASE_ANON_KEY: str = Field(
        ...,
        description="Clave anónima de Supabase.",
    )
    SUPABASE_SERVICE_ROLE_KEY: str = Field(
        ...,
        description="Clave de servicio de Supabase. Solo usar en backend.",
    )


@lru_cache
def get_settings() -> Settings:
    """
    Retorna la instancia única de Settings.
    Lee el .env una sola vez y cachea el resultado.
    """
    return Settings() # type: ignore


settings: Settings = get_settings()