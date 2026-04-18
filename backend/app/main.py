"""
app/main.py
-----------
Punto de entrada de la aplicación AulaCAL.

Por ahora inicializa FastAPI con un health check
que verifica la conexión real con Supabase.

Los routers de cada módulo (auth, users, courses, payments)
se irán registrando aquí a medida que avance el proyecto.
"""

import sqlalchemy as sa
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.session import AsyncSessionLocal

# ──────────────────────────────────────────────────────────────────────────────
# Inicialización de FastAPI
# ──────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AulaCAL",
    version="1.0.0",
    description="Backend de AulaCAL — Plataforma de cursos online de CIAL.",
)

# ──────────────────────────────────────────────────────────────────────────────
# Middleware de CORS
# Permite que el frontend (React) haga requests al backend.
# ──────────────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints base
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    """Confirma que la app está corriendo."""
    return {
        "app": "AulaCAL",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """
    Verifica que la conexión con Supabase está activa
    ejecutando una query simple (SELECT 1).

    Retorna:
        status: ok | error
        database: ok | error
        detail: mensaje de error si falla
    """
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(sa.text("SELECT 1"))
        return {
            "status": "ok",
            "database": "ok",
        }
    except Exception as e:
        return {
            "status": "error",
            "database": "error",
            "detail": str(e),
        }