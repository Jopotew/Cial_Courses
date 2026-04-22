"""
app/main.py
-----------
Punto de entrada de la aplicación AulaCAL.
"""


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, users, categories, courses, videos, video_progress
app = FastAPI(
    title="AulaCAL",
    version="1.0.0",
    description="Backend de AulaCAL — Plataforma de cursos online de CIAL.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(courses.router, prefix="/api/v1")
app.include_router(videos.router, prefix="/api/v1")
app.include_router(video_progress.router, prefix="/api/v1")

@app.get("/")
def root():
    return {"app": "AulaCAL", "version": "1.0.0", "status": "running"}


@app.get("/health")
def health_check():
    """Verifica la conexión con Supabase."""
    try:
        from app.db.supabase import get_supabase_admin_client
        client = get_supabase_admin_client()
        client.table("users").select("id").limit(1).execute()
        return {"status": "ok", "database": "ok"}
    except Exception as e:
        return {"status": "error", "database": "error", "detail": str(e)}