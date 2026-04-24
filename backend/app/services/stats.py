"""
app/services/stats_service.py
------------------------------
Servicio para obtener estadísticas del sistema (admin dashboard).
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from app.db.supabase import get_supabase_admin_client


def _client():
    """Retorna el cliente admin de Supabase."""
    return get_supabase_admin_client()


# ──────────────────────────────────────────────────────────────────────────────
# Estadísticas generales
# ──────────────────────────────────────────────────────────────────────────────

def get_general_stats() -> dict:
    """
    Obtiene estadísticas generales del sistema.
    
    Returns:
        Diccionario con totales de usuarios, cursos, ventas, ingresos
    """
    # Total usuarios
    users_result = _client().table("users").select("id", count="exact").execute()
    total_users = users_result.count
    
    # Usuarios activos
    active_users_result = _client().table("users").select("id", count="exact").eq("is_active", True).execute()
    active_users = active_users_result.count
    
    # Total cursos
    courses_result = _client().table("courses").select("id", count="exact").execute()
    total_courses = courses_result.count
    
    # Cursos publicados
    published_courses_result = _client().table("courses").select("id", count="exact").eq("is_published", True).execute()
    published_courses = published_courses_result.count
    
    # Total matrículas
    enrollments_result = _client().table("enrollments").select("id", count="exact").execute()
    total_enrollments = enrollments_result.count
    
    # Matrículas activas
    active_enrollments_result = _client().table("enrollments").select("id", count="exact").eq("is_active", True).execute()
    active_enrollments = active_enrollments_result.count
    
    # Total pagos
    payments_result = _client().table("payments").select("id", count="exact").execute()
    total_payments = payments_result.count
    
    # Pagos aprobados
    approved_payments_result = _client().table("payments").select("id", count="exact").eq("status", "approved").execute()
    approved_payments = approved_payments_result.count
    
    # Ingresos totales (solo pagos aprobados)
    revenue_result = _client().table("payments").select("amount").eq("status", "approved").execute()
    total_revenue = sum(float(p["amount"]) for p in revenue_result.data) if revenue_result.data else 0
    
    return {
        "users": {
            "total": total_users,
            "active": active_users,
            "inactive": total_users - active_users,
        },
        "courses": {
            "total": total_courses,
            "published": published_courses,
            "draft": total_courses - published_courses,
        },
        "enrollments": {
            "total": total_enrollments,
            "active": active_enrollments,
            "expired": total_enrollments - active_enrollments,
        },
        "payments": {
            "total": total_payments,
            "approved": approved_payments,
            "pending": total_payments - approved_payments,
        },
        "revenue": {
            "total": total_revenue,
            "currency": "ARS",
        },
    }


# ──────────────────────────────────────────────────────────────────────────────
# Cursos más vendidos
# ──────────────────────────────────────────────────────────────────────────────

def get_top_courses(limit: int = 10) -> list[dict]:
    """
    Obtiene los cursos más vendidos (con más matrículas tipo 'purchase').
    
    Args:
        limit: Cantidad de cursos a retornar
        
    Returns:
        Lista de cursos con cantidad de ventas
    """
    # Obtener matrículas tipo purchase agrupadas por curso
    result = _client().table("enrollments").select(
        "course_id, courses(id, title, price)"
    ).eq("enrollment_type", "purchase").execute()
    
    # Contar ventas por curso
    course_sales = {}
    for enrollment in result.data:
        if enrollment.get("courses"):
            course_id = enrollment["courses"]["id"]
            if course_id not in course_sales:
                course_sales[course_id] = {
                    "course_id": course_id,
                    "title": enrollment["courses"]["title"],
                    "price": float(enrollment["courses"]["price"]) if enrollment["courses"]["price"] else 0,
                    "sales_count": 0,
                    "revenue": 0,
                }
            course_sales[course_id]["sales_count"] += 1
            course_sales[course_id]["revenue"] += course_sales[course_id]["price"]
    
    # Ordenar por cantidad de ventas y limitar
    top_courses = sorted(
        course_sales.values(),
        key=lambda x: x["sales_count"],
        reverse=True
    )[:limit]
    
    return top_courses


# ──────────────────────────────────────────────────────────────────────────────
# Ingresos por período
# ──────────────────────────────────────────────────────────────────────────────

def get_revenue_by_period(days: int = 30) -> dict:
    """
    Obtiene ingresos agrupados por día en los últimos N días.
    
    Args:
        days: Cantidad de días hacia atrás
        
    Returns:
        Diccionario con ingresos por fecha
    """
    # Calcular fecha límite
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # Obtener pagos aprobados en el período
    result = _client().table("payments").select(
        "amount, paid_at"
    ).eq("status", "approved").gte("paid_at", start_date).order("paid_at").execute()
    
    # Agrupar por fecha
    revenue_by_date = {}
    for payment in result.data:
        if payment["paid_at"]:
            # Extraer solo la fecha (sin hora)
            date = payment["paid_at"][:10]
            if date not in revenue_by_date:
                revenue_by_date[date] = 0
            revenue_by_date[date] += float(payment["amount"])
    
    return {
        "period_days": days,
        "start_date": start_date[:10],
        "end_date": datetime.now(timezone.utc).isoformat()[:10],
        "data": revenue_by_date,
        "total": sum(revenue_by_date.values()),
    }


# ──────────────────────────────────────────────────────────────────────────────
# Nuevos usuarios por período
# ──────────────────────────────────────────────────────────────────────────────

def get_new_users_by_period(days: int = 30) -> dict:
    """
    Obtiene usuarios nuevos agrupados por día en los últimos N días.
    
    Args:
        days: Cantidad de días hacia atrás
        
    Returns:
        Diccionario con usuarios nuevos por fecha
    """
    # Calcular fecha límite
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # Obtener usuarios creados en el período
    result = _client().table("users").select(
        "id, created_at"
    ).gte("created_at", start_date).order("created_at").execute()
    
    # Agrupar por fecha
    users_by_date = {}
    for user in result.data:
        # Extraer solo la fecha
        date = user["created_at"][:10]
        if date not in users_by_date:
            users_by_date[date] = 0
        users_by_date[date] += 1
    
    return {
        "period_days": days,
        "start_date": start_date[:10],
        "end_date": datetime.now(timezone.utc).isoformat()[:10],
        "data": users_by_date,
        "total": sum(users_by_date.values()),
    }


# ──────────────────────────────────────────────────────────────────────────────
# Actividad reciente
# ──────────────────────────────────────────────────────────────────────────────

def get_recent_activity(limit: int = 20) -> dict:
    """
    Obtiene actividad reciente del sistema.
    
    Args:
        limit: Cantidad de eventos a retornar
        
    Returns:
        Diccionario con eventos recientes
    """
    # Últimos pagos
    recent_payments = _client().table("payments").select(
        "id, user_id, amount, status, created_at, users(full_name, email)"
    ).order("created_at", desc=True).limit(limit).execute()
    
    # Últimas matrículas
    recent_enrollments = _client().table("enrollments").select(
        "id, user_id, course_id, created_at, users(full_name, email), courses(title)"
    ).order("created_at", desc=True).limit(limit).execute()
    
    # Últimos usuarios registrados
    recent_users = _client().table("users").select(
        "id, full_name, email, created_at"
    ).order("created_at", desc=True).limit(limit).execute()
    
    # Formatear eventos
    payments = []
    for p in recent_payments.data:
        user_name = p.get("users", {}).get("full_name", "Usuario") if p.get("users") else "Usuario"
        payments.append({
            "type": "payment",
            "id": p["id"],
            "description": f"{user_name} - ${p['amount']} ({p['status']})",
            "timestamp": p["created_at"],
        })
    
    enrollments = []
    for e in recent_enrollments.data:
        user_name = e.get("users", {}).get("full_name", "Usuario") if e.get("users") else "Usuario"
        course_title = e.get("courses", {}).get("title", "Curso") if e.get("courses") else "Curso"
        enrollments.append({
            "type": "enrollment",
            "id": e["id"],
            "description": f"{user_name} se matriculó en {course_title}",
            "timestamp": e["created_at"],
        })
    
    users = []
    for u in recent_users.data:
        users.append({
            "type": "user",
            "id": u["id"],
            "description": f"Nuevo usuario: {u['full_name']}",
            "timestamp": u["created_at"],
        })
    
    # Combinar todos los eventos y ordenar por fecha
    all_events = payments + enrollments + users
    all_events.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return {
        "events": all_events[:limit],
        "total": len(all_events[:limit]),
    }