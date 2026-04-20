"""
app/core/config.py
------------------
Configuración central de AulaCAL.
Actualmente incluye: Supabase, JWT y Email.
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ── SUPABASE ──────────────────────────────────────────────────────────

    SUPABASE_DB_URL: str = Field(...)
    SUPABASE_URL: str = Field(...)
    SUPABASE_ANON_KEY: str = Field(...)
    SUPABASE_SERVICE_ROLE_KEY: str = Field(...)

    # ── JWT ───────────────────────────────────────────────────────────────

    JWT_SECRET_KEY: str = Field(..., min_length=32)
    JWT_ALGORITHM: str = Field(default="HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=15, gt=0)
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, gt=0)
    TWO_FACTOR_CODE_EXPIRE_DAYS: int = Field(default=30, gt=0)
    EMAIL_CODE_EXPIRE_MINUTES: int = Field(default=15, gt=0)

    # ── EMAIL — SMTP ─────────────────────────────────────────────────────

    SMTP_HOST: str = Field(...)
    SMTP_PORT: int = Field(default=587, gt=0)
    SMTP_USER: str = Field(...)
    SMTP_PASSWORD: str = Field(...)
    EMAIL_FROM_NAME: str = Field(default="AulaCAL")
    EMAIL_FROM_ADDRESS: str = Field(...)
    SMTP_USE_TLS: bool = Field(default=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore


settings: Settings = get_settings()