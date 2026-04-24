"""
app/services/scheduler_service.py
----------------------------------
Tareas programadas (cron jobs) con APScheduler.
"""

from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler

from app.db.supabase import get_supabase_admin_client


def _client():
    """Retorna el cliente admin de Supabase."""
    return get_supabase_admin_client()


# ──────────────────────────────────────────────────────────────────────────────
# Tareas de limpieza
# ──────────────────────────────────────────────────────────────────────────────

def cleanup_expired_payments():
    """
    Elimina pagos pending que tienen más de 24 horas sin completarse.
    
    Se ejecuta cada hora.
    """
    try:
        # Calcular fecha límite (24 horas atrás)
        limit_date = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        
        # Eliminar pagos pending viejos
        result = _client().table("payments").delete().eq("status", "pending").lt("created_at", limit_date).execute()
        
        deleted_count = len(result.data) if result.data else 0
        
        if deleted_count > 0:
            print(f"[CRON] Eliminados {deleted_count} pagos pending expirados")
        
        return deleted_count
        
    except Exception as e:
        print(f"[CRON] Error limpiando pagos expirados: {e}")
        return 0


def deactivate_expired_enrollments():
    """
    Desactiva matrículas que ya expiraron.
    
    Se ejecuta cada 12 horas.
    """
    try:
        now = datetime.now(timezone.utc).isoformat()
        
        # Buscar matrículas expiradas que aún están activas
        result = _client().table("enrollments").select("id").eq("is_active", True).not_.is_("expires_at", "null").lt("expires_at", now).execute()
        
        if not result.data:
            return 0
        
        # Desactivarlas
        ids = [row["id"] for row in result.data]
        
        for enrollment_id in ids:
            _client().table("enrollments").update({"is_active": False}).eq("id", enrollment_id).execute()
        
        print(f"[CRON] Desactivadas {len(ids)} matrículas expiradas")
        
        return len(ids)
        
    except Exception as e:
        print(f"[CRON] Error desactivando matrículas expiradas: {e}")
        return 0


def mark_inactive_users():
    """
    Marca como inactivos a usuarios que no han iniciado sesión en 6 meses.
    
    Se ejecuta una vez por día a las 3 AM.
    """
    try:
        # Calcular fecha límite (6 meses atrás)
        limit_date = (datetime.now(timezone.utc) - timedelta(days=180)).isoformat()
        
        # Buscar usuarios activos sin login en 6 meses
        result = _client().table("users").select("id").eq("is_active", True).lt("last_login", limit_date).execute()
        
        if not result.data:
            return 0
        
        # Marcarlos como inactivos
        ids = [row["id"] for row in result.data]
        
        for user_id in ids:
            _client().table("users").update({"is_active": False}).eq("id", user_id).execute()
        
        print(f"[CRON] Marcados {len(ids)} usuarios como inactivos")
        
        return len(ids)
        
    except Exception as e:
        print(f"[CRON] Error marcando usuarios inactivos: {e}")
        return 0


# ──────────────────────────────────────────────────────────────────────────────
# Scheduler
# ──────────────────────────────────────────────────────────────────────────────

scheduler = BackgroundScheduler()


def start_scheduler():
    """
    Inicia el scheduler con todas las tareas programadas.
    """
    if scheduler.running:
        print("[SCHEDULER] Ya está corriendo")
        return
    
    # Tarea 1: Limpiar pagos pending - cada hora
    scheduler.add_job(
        cleanup_expired_payments,
        "interval",
        hours=1,
        id="cleanup_expired_payments",
        name="Limpiar pagos pending expirados",
        replace_existing=True,
    )
    
    # Tarea 2: Desactivar matrículas expiradas - cada 12 horas
    scheduler.add_job(
        deactivate_expired_enrollments,
        "interval",
        hours=12,
        id="deactivate_expired_enrollments",
        name="Desactivar matrículas expiradas",
        replace_existing=True,
    )
    
    # Tarea 3: Marcar usuarios inactivos - diario a las 3 AM
    scheduler.add_job(
        mark_inactive_users,
        "cron",
        hour=3,
        minute=0,
        id="mark_inactive_users",
        name="Marcar usuarios inactivos",
        replace_existing=True,
    )
    
    scheduler.start()
    print("[SCHEDULER] Iniciado correctamente")
    print(f"[SCHEDULER] Tareas programadas: {len(scheduler.get_jobs())}")
    
    # Listar todas las tareas
    for job in scheduler.get_jobs():
        print(f"  - {job.name} (id: {job.id}, próxima ejecución: {job.next_run_time})")


def stop_scheduler():
    """
    Detiene el scheduler.
    """
    if scheduler.running:
        scheduler.shutdown()
        print("[SCHEDULER] Detenido")