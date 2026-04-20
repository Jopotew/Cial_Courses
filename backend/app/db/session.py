"""
app/db/session.py
-----------------
Configuración del motor async de SQLAlchemy para Supabase.

Supabase usa PgBouncer en modo transaction, que no soporta
prepared statements. La solución es usar NullPool y pasar
statement_cache_size=0 directamente via asyncpg.
"""

from collections.abc import AsyncGenerator

import asyncpg
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import settings

# Convertir URL a formato async
_async_db_url = settings.SUPABASE_DB_URL.replace(
    "postgresql://",
    "postgresql+asyncpg://",
)


async def _create_asyncpg_conn(url: str):
    """
    Crea una conexión asyncpg con statement_cache_size=0.
    Esto deshabilita los prepared statements, requerido por
    el pooler de Supabase (PgBouncer en modo transaction).
    """
    return await asyncpg.connect(url, statement_cache_size=0)


engine = create_async_engine(
    url=_async_db_url,
    echo=True,
    # NullPool: no reutiliza conexiones — cada request abre y cierra la suya.
    # Es la opción más segura con PgBouncer en modo transaction.
    poolclass=NullPool,
    connect_args={"statement_cache_size": 0},
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependencia de FastAPI que provee una sesión de DB por request.
    Garantiza el cierre de la sesión al terminar, con éxito o error.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()