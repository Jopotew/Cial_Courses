"""
app/main.py
-----------
Punto de entrada de la aplicación AulaCAL.
"""

import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import auth, users, categories, courses, videos, video_progress, enrollments, payments, webhooks, subscriptions, admin, emails

from contextlib import asynccontextmanager
from app.services import scheduler as scheduler_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ALLOWED_ORIGINS = [
    "https://cial-courses-87vd.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler_service.start_scheduler()
    yield
    scheduler_service.stop_scheduler()


app = FastAPI(
    title="AulaCAL API",
    description="API para plataforma de cursos online",
    version="1.0.0",
    lifespan=lifespan,
)

# ✅ PRIMERO: Middleware de CORS (esto procesa OPTIONS automáticamente)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# ✅ DESPUÉS: Middleware de logging (no interfiere con CORS)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    origin = request.headers.get("origin", "NO-ORIGIN")
    if request.method == "OPTIONS":
        logger.info(
            "PREFLIGHT | path=%s | origin=%s | origin_allowed=%s",
            request.url.path,
            origin,
            origin in ALLOWED_ORIGINS,
        )
    response = await call_next(request)
    if request.method == "OPTIONS":
        logger.info("PREFLIGHT response status=%s", response.status_code)
    return response

# ✅ Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(emails.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(courses.router, prefix="/api/v1")
app.include_router(videos.router, prefix="/api/v1")
app.include_router(video_progress.router, prefix="/api/v1")
app.include_router(enrollments.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(subscriptions.router, prefix="/api/v1")
app.include_router(webhooks.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "app": "AulaCAL",
        "version": "1.0.0",
        "status": "running",
        "cors_origins": ALLOWED_ORIGINS,
    }


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