"""
app/core/config.py
------------------
Configuración central de AulaCAL.

Lee todas las variables de entorno desde el archivo .env y las expone
como atributos tipados y validados por Pydantic Settings.

Si alguna variable marcada como requerida (sin valor default) no está
definida en el .env, la aplicación NO arranca y lanza un error claro
indicando exactamente cuál variable falta.

Uso en cualquier parte del proyecto:
    from app.core.config import settings

    print(settings.APP_NAME)
    print(settings.JWT_SECRET_KEY)
"""

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Clase principal de configuración.

    Cada atributo mapea a una variable de entorno del mismo nombre.
    Pydantic valida el tipo automáticamente al iniciar la app.

    Los campos sin 'default' son OBLIGATORIOS: si no están en el .env,
    la app lanzará un ValidationError al arrancar con el nombre del campo faltante.
    """

    # Indica a Pydantic dónde leer las variables y cómo comportarse.
    model_config = SettingsConfigDict(
        env_file=".env",            # Archivo a leer
        env_file_encoding="utf-8",
        case_sensitive=True,        # APP_NAME ≠ app_name
        extra="ignore",             # Variables extra en .env no causan error
    )

    # ──────────────────────────────────────────────────────────────────────
    # ENTORNO DE EJECUCIÓN
    # ──────────────────────────────────────────────────────────────────────

    APP_ENV: str = Field(
        default="development",
        description="Entorno de ejecución: development | staging | production.",
    )
    APP_NAME: str = Field(
        default="AulaCAL",
        description="Nombre de la aplicación.",
    )
    APP_VERSION: str = Field(
        default="1.0.0",
        description="Versión actual de la API.",
    )
    APP_BASE_URL: str = Field(
        default="http://localhost:8000",
        description="URL base del backend, sin barra final.",
    )
    FRONTEND_URL: str = Field(
        default="http://localhost:3000",
        description="URL base del frontend. Se usa en emails y CORS.",
    )

    @field_validator("APP_ENV")
    @classmethod
    def validate_app_env(cls, value: str) -> str:
        """Garantiza que APP_ENV tenga un valor conocido y previene typos."""
        valid = {"development", "staging", "production"}
        if value not in valid:
            raise ValueError(
                f"APP_ENV inválido: '{value}'. Opciones válidas: {valid}"
            )
        return value

    # ──────────────────────────────────────────────────────────────────────
    # SEGURIDAD — JWT
    # ──────────────────────────────────────────────────────────────────────

    JWT_SECRET_KEY: str = Field(
        ...,  # Sin default → OBLIGATORIO
        min_length=32,
        description=(
            "Clave secreta para firmar JWT. "
            "Generá una con: openssl rand -hex 32"
        ),
    )
    JWT_ALGORITHM: str = Field(
        default="HS256",
        description="Algoritmo de firma del JWT.",
    )
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=15,
        gt=0,
        description="Tiempo de vida del Access Token en minutos.",
    )
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7,
        gt=0,
        description="Tiempo de vida del Refresh Token en días.",
    )
    TWO_FACTOR_CODE_EXPIRE_DAYS: int = Field(
        default=30,
        gt=0,
        description="Cada cuántos días se requiere código 2FA por email.",
    )
    EMAIL_CODE_EXPIRE_MINUTES: int = Field(
        default=15,
        gt=0,
        description="Tiempo de vida de códigos de verificación de email.",
    )

    # ──────────────────────────────────────────────────────────────────────
    # BASE DE DATOS — SUPABASE
    # ──────────────────────────────────────────────────────────────────────

    SUPABASE_DB_URL: str = Field(
        ...,
        description="URL de conexión directa a PostgreSQL de Supabase.",
    )
    SUPABASE_URL: str = Field(
        ...,
        description="URL pública del proyecto Supabase.",
    )
    SUPABASE_ANON_KEY: str = Field(
        ...,
        description="Clave anónima de Supabase (safe para frontend).",
    )
    SUPABASE_SERVICE_ROLE_KEY: str = Field(
        ...,
        description=(
            "Clave de servicio de Supabase con privilegios totales. "
            "SOLO usar en el backend, nunca exponer."
        ),
    )

    # ──────────────────────────────────────────────────────────────────────
    # EMAIL — SMTP
    # ──────────────────────────────────────────────────────────────────────

    SMTP_HOST: str = Field(
        ...,
        description="Host del servidor SMTP.",
    )
    SMTP_PORT: int = Field(
        default=587,
        gt=0,
        lt=65536,
        description="Puerto del servidor SMTP.",
    )
    SMTP_USER: str = Field(
        ...,
        description="Usuario del servidor SMTP.",
    )
    SMTP_PASSWORD: str = Field(
        ...,
        description="Contraseña del servidor SMTP.",
    )
    EMAIL_FROM_NAME: str = Field(
        default="AulaCAL",
        description="Nombre visible del remitente en los emails.",
    )
    EMAIL_FROM_ADDRESS: str = Field(
        ...,
        description="Dirección email del remitente.",
    )
    SMTP_USE_TLS: bool = Field(
        default=True,
        description="Usar TLS para la conexión SMTP.",
    )

    # ──────────────────────────────────────────────────────────────────────
    # CLOUDFLARE STREAM
    # ──────────────────────────────────────────────────────────────────────

    CLOUDFLARE_ACCOUNT_ID: str = Field(
        ...,
        description="Account ID de Cloudflare.",
    )
    CLOUDFLARE_API_TOKEN: str = Field(
        ...,
        description="API Token de Cloudflare con permisos de Stream.",
    )
    CLOUDFLARE_STREAM_SIGNING_KEY: str = Field(
        ...,
        description="Clave para firmar URLs de video privadas.",
    )
    CLOUDFLARE_STREAM_TOKEN_EXPIRE_SECONDS: int = Field(
        default=3600,
        gt=0,
        description="Duración de los tokens de streaming firmados en segundos.",
    )

    # ──────────────────────────────────────────────────────────────────────
    # MERCADOPAGO
    # ──────────────────────────────────────────────────────────────────────

    MERCADOPAGO_ACCESS_TOKEN: str = Field(
        ...,
        description="Access Token de MercadoPago (TEST-... o APP_USR-...).",
    )
    MERCADOPAGO_PUBLIC_KEY: str = Field(
        ...,
        description="Public Key de MercadoPago.",
    )
    MERCADOPAGO_WEBHOOK_URL: str = Field(
        ...,
        description="URL pública donde MercadoPago envía notificaciones.",
    )
    MERCADOPAGO_WEBHOOK_SECRET: str = Field(
        ...,
        description="Secret para validar la firma de webhooks de MercadoPago.",
    )

    # ──────────────────────────────────────────────────────────────────────
    # PAYPAL
    # ──────────────────────────────────────────────────────────────────────

    PAYPAL_ENV: str = Field(
        default="sandbox",
        description="Entorno de PayPal: sandbox | live.",
    )
    PAYPAL_CLIENT_ID: str = Field(
        ...,
        description="Client ID de la app de PayPal.",
    )
    PAYPAL_CLIENT_SECRET: str = Field(
        ...,
        description="Client Secret de la app de PayPal.",
    )
    PAYPAL_WEBHOOK_URL: str = Field(
        ...,
        description="URL pública donde PayPal envía notificaciones.",
    )
    PAYPAL_WEBHOOK_ID: str = Field(
        ...,
        description="ID del webhook registrado en PayPal.",
    )

    @field_validator("PAYPAL_ENV")
    @classmethod
    def validate_paypal_env(cls, value: str) -> str:
        """Garantiza que el entorno de PayPal sea sandbox o live."""
        valid = {"sandbox", "live"}
        if value not in valid:
            raise ValueError(
                f"PAYPAL_ENV inválido: '{value}'. Opciones válidas: {valid}"
            )
        return value

    # ──────────────────────────────────────────────────────────────────────
    # RATE LIMITING
    # ──────────────────────────────────────────────────────────────────────

    RATE_LIMIT_MAX_REQUESTS: int = Field(
        default=10,
        gt=0,
        description="Máximo de requests por IP en la ventana de tiempo.",
    )
    RATE_LIMIT_WINDOW_SECONDS: int = Field(
        default=60,
        gt=0,
        description="Ventana de tiempo en segundos para el rate limiting.",
    )

    # ──────────────────────────────────────────────────────────────────────
    # CORS
    # ──────────────────────────────────────────────────────────────────────

    CORS_ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000",
        description="Orígenes permitidos separados por coma.",
    )

    # ──────────────────────────────────────────────────────────────────────
    # Propiedades derivadas (calculadas, no vienen del .env)
    # ──────────────────────────────────────────────────────────────────────

    @property
    def cors_origins_list(self) -> List[str]:
        """
        Convierte el string de CORS_ALLOWED_ORIGINS separado por comas
        en una lista de strings limpia, lista para usar en el middleware.

        Ejemplo:
            "http://localhost:3000, https://aulacal.com"
            → ["http://localhost:3000", "https://aulacal.com"]
        """
        return [origin.strip() for origin in self.CORS_ALLOWED_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        """Retorna True si la app está corriendo en producción."""
        return self.APP_ENV == "production"

    @property
    def is_development(self) -> bool:
        """Retorna True si la app está corriendo en modo desarrollo."""
        return self.APP_ENV == "development"

    @property
    def paypal_base_url(self) -> str:
        """
        Retorna la URL base de la API de PayPal según el entorno configurado.
        sandbox → API de pruebas (no mueve dinero real).
        live    → API de producción.
        """
        if self.PAYPAL_ENV == "live":
            return "https://api-m.paypal.com"
        return "https://api-m.sandbox.paypal.com"


@lru_cache
def get_settings() -> Settings:
    """
    Retorna la instancia única de Settings (patrón Singleton via lru_cache).

    Al usar @lru_cache, Pydantic lee y valida el .env UNA SOLA VEZ
    cuando se importa por primera vez, y luego reutiliza el mismo objeto.
    Esto evita leer el disco en cada request.

    Uso recomendado en endpoints de FastAPI:
        from app.core.config import get_settings
        from fastapi import Depends

        def mi_endpoint(settings = Depends(get_settings)):
            ...

    Uso directo (fuera de endpoints):
        from app.core.config import settings
    """
    return Settings()


# Instancia global para importación directa.
# Equivalente a llamar get_settings() pero más cómodo para imports simples.
settings: Settings = get_settings()
