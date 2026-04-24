"""
app/api/admin.py
----------------
Endpoints administrativos (cron jobs manuales, estadísticas, etc.)
"""

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import require_admin
from app.services import scheduler as scheduler_service
from app.services import stats as stats_service

router = APIRouter(prefix="/admin", tags=["Admin"])


# ──────────────────────────────────────────────────────────────────────────────
# Estadísticas / Dashboard
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/stats/general")
def get_general_stats(current_user: dict = Depends(require_admin)):
    """
    Obtiene estadísticas generales del sistema.
    
    Retorna:
    - Total de usuarios (activos/inactivos)
    - Total de cursos (publicados/draft)
    - Total de matrículas (activas/expiradas)
    - Total de pagos (aprobados/pending)
    - Ingresos totales
    
    Requiere: JWT válido + role=1 (admin).
    """
    stats = stats_service.get_general_stats()
    
    return {
        "status": "success",
        "data": stats
    }


@router.get("/stats/top-courses")
def get_top_courses(
    limit: int = Query(default=10, ge=1, le=50),
    current_user: dict = Depends(require_admin),
):
    """
    Obtiene los cursos más vendidos.
    
    Query params:
    - limit: Cantidad de cursos a retornar (1-50, default: 10)
    
    Requiere: JWT válido + role=1 (admin).
    """
    top_courses = stats_service.get_top_courses(limit=limit)
    
    return {
        "status": "success",
        "data": top_courses
    }


@router.get("/stats/revenue")
def get_revenue_by_period(
    days: int = Query(default=30, ge=1, le=365),
    current_user: dict = Depends(require_admin),
):
    """
    Obtiene ingresos agrupados por día en los últimos N días.
    
    Query params:
    - days: Cantidad de días hacia atrás (1-365, default: 30)
    
    Requiere: JWT válido + role=1 (admin).
    """
    revenue = stats_service.get_revenue_by_period(days=days)
    
    return {
        "status": "success",
        "data": revenue
    }


@router.get("/stats/new-users")
def get_new_users_by_period(
    days: int = Query(default=30, ge=1, le=365),
    current_user: dict = Depends(require_admin),
):
    """
    Obtiene usuarios nuevos agrupados por día en los últimos N días.
    
    Query params:
    - days: Cantidad de días hacia atrás (1-365, default: 30)
    
    Requiere: JWT válido + role=1 (admin).
    """
    new_users = stats_service.get_new_users_by_period(days=days)
    
    return {
        "status": "success",
        "data": new_users
    }


@router.get("/stats/recent-activity")
def get_recent_activity(
    limit: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(require_admin),
):
    """
    Obtiene actividad reciente del sistema.
    
    Incluye:
    - Pagos recientes
    - Matrículas recientes
    - Usuarios registrados recientemente
    
    Query params:
    - limit: Cantidad de eventos a retornar (1-100, default: 20)
    
    Requiere: JWT válido + role=1 (admin).
    """
    activity = stats_service.get_recent_activity(limit=limit)
    
    return {
        "status": "success",
        "data": activity
    }


# ──────────────────────────────────────────────────────────────────────────────
# Cron Jobs
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/cron/cleanup-payments")
def run_cleanup_payments(current_user: dict = Depends(require_admin)):
    """
    Ejecuta la limpieza de pagos pending expirados manualmente.
    
    Requiere: JWT válido + role=1 (admin).
    """
    deleted_count = scheduler_service.cleanup_expired_payments()
    
    return {
        "status": "success",
        "message": f"Eliminados {deleted_count} pagos pending expirados"
    }


@router.post("/cron/deactivate-enrollments")
def run_deactivate_enrollments(current_user: dict = Depends(require_admin)):
    """
    Ejecuta la desactivación de matrículas expiradas manualmente.
    
    Requiere: JWT válido + role=1 (admin).
    """
    deactivated_count = scheduler_service.deactivate_expired_enrollments()
    
    return {
        "status": "success",
        "message": f"Desactivadas {deactivated_count} matrículas expiradas"
    }


@router.post("/cron/mark-inactive-users")
def run_mark_inactive_users(current_user: dict = Depends(require_admin)):
    """
    Ejecuta el marcado de usuarios inactivos manualmente.
    
    Requiere: JWT válido + role=1 (admin).
    """
    marked_count = scheduler_service.mark_inactive_users()
    
    return {
        "status": "success",
        "message": f"Marcados {marked_count} usuarios como inactivos"
    }


@router.get("/cron/jobs")
def list_scheduled_jobs(current_user: dict = Depends(require_admin)):
    """
    Lista todas las tareas programadas.
    
    Requiere: JWT válido + role=1 (admin).
    """
    jobs = []
    
    for job in scheduler_service.scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger),
        })
    
    return {
        "status": "success",
        "jobs": jobs
    }