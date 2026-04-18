"""
app/db/session.py
-----------------
Configuración del motor async de SQLAlchemy y la sesión de base de datos.

¿Por qué async?
    FastAPI es async. Si usamos un driver sincrónico, cada query
    bloquea el event loop impidiendo atender otros requests en paralelo.
    Con asyncpg + SQLAlchemy async, la app puede atender otros requests
    mientras espera la respuesta de la base de datos.

Uso en endpoints:
    from fastapi import Depends
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.db.session import get_db

    @router.get("/ejemplo")
    async def mi_endpoint(db: AsyncSession = Depends(get_db)):
        result = await db.execute(select(User))
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings


# ──────────────────────────────────────────────────────────────────────────────
# Motor de base de datos
# ──────────────────────────────────────────────────────────────────────────────

# SQLAlchemy async necesita "postgresql+asyncpg://" en vez de "postgresql://"
# Lo reemplazamos automáticamente para no complicar el .env
_async_db_url = settings.SUPABASE_DB_URL.replace(
    "postgresql://",
    "postgresql+asyncpg://",
)

engine = create_async_engine(
    url=_async_db_url,

    # Muestra cada SQL ejecutado en consola. Solo en desarrollo.
    echo=True,

    # Conexiones simultáneas al pool.
    # Supabase Free Tier tiene límite de 15 (según vimos en pooler settings).
    pool_size=5,

    # Conexiones extra si el pool está lleno. Total máximo = 5 + 3 = 8.
    max_overflow=3,

    # Segundos a esperar por una conexión libre antes de lanzar error.
    pool_timeout=30,

    # Recicla conexiones inactivas cada 30 minutos para evitar conexiones muertas.
    pool_recycle=1800,
)


# ──────────────────────────────────────────────────────────────────────────────
# Fábrica de sesiones
# ──────────────────────────────────────────────────────────────────────────────

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,

    # Los objetos ORM siguen accesibles después del commit.
    # Necesario porque FastAPI serializa la respuesta después del commit.
    expire_on_commit=False,

    # No hace flush automático. Nos da control explícito.
    autoflush=False,
)


# ──────────────────────────────────────────────────────────────────────────────
# Dependencia de FastAPI
# ──────────────────────────────────────────────────────────────────────────────

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependencia de FastAPI que provee una sesión de base de datos
    por cada request y garantiza que se cierre al terminar.

    El bloque try/finally garantiza el cierre de la sesión
    tanto en éxito como en caso de error.

    Uso:
        @router.get("/ejemplo")
        async def mi_endpoint(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()