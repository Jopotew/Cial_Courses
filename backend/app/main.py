"""
app/main.py
-----------
Punto de entrada de la aplicación AulaCAL.
"""

import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api import auth, users, categories, courses, videos, video_progress, enrollments, payments, webhooks, subscriptions, admin, emails

from contextlib import asynccontextmanager
from app.services import scheduler as scheduler_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("aulacal")


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

origins = [
    "https://cial-courses-87vd.vercel.app",
    "http://localhost:3000",
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info("→ %s %s | origin=%s", request.method, request.url.path, request.headers.get("origin", "-"))
    try:
        response = await call_next(request)
        logger.info("← %s %s | status=%s", request.method, request.url.path, response.status_code)
        response.headers["X-Deploy-Version"] = "cors-open-v3"
        return response
    except Exception as exc:
        logger.error("UNHANDLED ERROR %s %s | %s", request.method, request.url.path, traceback.format_exc())
        return JSONResponse(status_code=500, content={"detail": "Internal server error", "error": str(exc)})


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.error("HTTP %s | %s %s | detail=%s", exc.status_code, request.method, request.url.path, exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error("VALIDATION ERROR | %s %s | errors=%s", request.method, request.url.path, exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": "Error de validación", "errors": exc.errors()},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("EXCEPTION | %s %s | %s", request.method, request.url.path, traceback.format_exc())
    return JSONResponse(status_code=500, content={"detail": "Error interno", "error": str(exc)})

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