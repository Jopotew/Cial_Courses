"""
app/services/enrollment.py
---------------------------
Lógica de negocio del módulo de matrículas.
ACTUALIZADO: get_user_enrollments ahora trae TODOS los campos del curso con JOIN completo
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from app.db.supabase import get_supabase_admin_client
from app.schemas.enrollment import EnrollmentCreateRequest, EnrollmentUpdateRequest


def _client():
    """Retorna el cliente admin de Supabase."""
    return get_supabase_admin_client()


# ──────────────────────────────────────────────────────────────────────────────
# Validación de acceso (función más importante)
# ──────────────────────────────────────────────────────────────────────────────

def is_user_enrolled(user_id: UUID, course_id: UUID) -> bool:
    """
    Verifica si un usuario está matriculado y tiene acceso activo a un curso.
    
    Args:
        user_id: UUID del usuario
        course_id: UUID del curso
        
    Returns:
        True si el usuario tiene matrícula activa, False caso contrario
    """
    result = _client().table("enrollments").select("id").eq("user_id", str(user_id)).eq("course_id", str(course_id)).eq("is_active", True).execute()
    
    return len(result.data) > 0


def get_enrollment(user_id: UUID, course_id: UUID) -> Optional[dict]:
    """
    Obtiene la matrícula de un usuario en un curso.
    
    Args:
        user_id: UUID del usuario
        course_id: UUID del curso
        
    Returns:
        Diccionario con la matrícula, o None si no existe
    """
    result = _client().table("enrollments").select("*").eq("user_id", str(user_id)).eq("course_id", str(course_id)).execute()
    
    return result.data[0] if result.data else None


# ──────────────────────────────────────────────────────────────────────────────
# Consultas
# ──────────────────────────────────────────────────────────────────────────────

def get_enrollment_by_id(enrollment_id: UUID) -> Optional[dict]:
    """
    Busca una matrícula por su UUID.
    
    Args:
        enrollment_id: UUID de la matrícula
        
    Returns:
        Diccionario con la matrícula, o None si no existe
    """
    result = _client().table("enrollments").select("*").eq("id", str(enrollment_id)).execute()
    
    return result.data[0] if result.data else None


def get_user_enrollments(user_id: UUID, active_only: bool = True) -> list[dict]:
    """
    Obtiene todas las matrículas de un usuario con información COMPLETA del curso.
    
    ACTUALIZADO: Ahora trae TODOS los campos necesarios para el frontend:
    - Curso: title, subtitle, description, instructor, price, level, thumbnail
    - Categoría: id, name
    
    Args:
        user_id: UUID del usuario
        active_only: Si es True, solo retorna matrículas activas
        
    Returns:
        Lista de matrículas con información completa del curso
    """
    # ✅ SELECT completo con JOIN a courses y categories
    query = _client().table("enrollments").select(
        """
        *,
        courses(
            id,
            title,
            subtitle,
            description,
            instructor_name,
            instructor_title,
            price,
            original_price,
            level,
            thumbnail_url,
            category_id,
            categories(
                id,
                name
            )
        )
        """
    ).eq("user_id", str(user_id))
    
    if active_only:
        query = query.eq("is_active", True)
    
    result = query.order("enrolled_at", desc=True).execute()
    
    # Aplanar la estructura anidada para que coincida con el schema
    enrollments = []
    for enrollment in result.data:
        course = enrollment.get("courses")

        # Fallback: si el JOIN no trajo datos, buscar el curso por separado
        if not course and enrollment.get("course_id"):
            from app.services import course as course_svc
            course = course_svc.get_course_by_id(
                enrollment["course_id"], include_unpublished=True
            )

        if not course:
            # Sin datos del curso no se puede armar la respuesta — omitir
            continue

        enrollment["title"] = course.get("title", "")
        enrollment["subtitle"] = course.get("subtitle")
        enrollment["description"] = course.get("description", "")
        enrollment["instructor_name"] = course.get("instructor_name", "")
        enrollment["instructor_title"] = course.get("instructor_title")
        enrollment["price"] = course.get("price", 0)
        enrollment["original_price"] = course.get("original_price")
        enrollment["level"] = course.get("level", "basico")
        enrollment["thumbnail_url"] = course.get("thumbnail_url")
        enrollment["category_id"] = course.get("category_id")

        # Categoría: puede venir como dict (JOIN), lista, o ya aplanada (fallback get_course_by_id)
        cats = course.get("categories")
        if isinstance(cats, dict):
            enrollment["category_name"] = cats.get("name", "Sin categoría")
        elif isinstance(cats, list) and cats:
            enrollment["category_name"] = cats[0].get("name", "Sin categoría")
        elif course.get("category_name"):
            enrollment["category_name"] = course["category_name"]
        else:
            enrollment["category_name"] = "Sin categoría"

        enrollment.pop("courses", None)
        enrollments.append(enrollment)

    return enrollments


def get_course_enrollments(course_id: UUID, active_only: bool = True) -> list[dict]:
    """
    Obtiene todas las matrículas de un curso.
    
    Args:
        course_id: UUID del curso
        active_only: Si es True, solo retorna matrículas activas
        
    Returns:
        Lista de matrículas
    """
    query = _client().table("enrollments").select("*").eq("course_id", str(course_id))
    
    if active_only:
        query = query.eq("is_active", True)
    
    result = query.order("enrolled_at", desc=True).execute()
    return result.data


# ──────────────────────────────────────────────────────────────────────────────
# Creación
# ──────────────────────────────────────────────────────────────────────────────

def create_enrollment(data: EnrollmentCreateRequest) -> dict:
    """
    Crea una nueva matrícula.
    
    Si ya existe una matrícula inactiva, la reactiva.
    Si ya existe una activa, retorna la existente.
    
    Args:
        data: Datos de la matrícula
        
    Returns:
        Diccionario con la matrícula creada o existente
    """
    # Verificar si ya existe una matrícula
    existing = get_enrollment(data.user_id, data.course_id)
    
    if existing:
        if existing["is_active"]:
            # Ya está matriculado
            return existing
        else:
            # Reactivar matrícula existente
            result = _client().table("enrollments").update({
                "is_active": True,
                "enrolled_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": data.expires_at.isoformat() if data.expires_at else None,
                "enrollment_type": data.enrollment_type,
            }).eq("id", existing["id"]).execute()
            return result.data[0]
    
    # Crear nueva matrícula
    result = _client().table("enrollments").insert({
        "user_id": str(data.user_id),
        "course_id": str(data.course_id),
        "enrollment_type": data.enrollment_type,
        "expires_at": data.expires_at.isoformat() if data.expires_at else None,
        "is_active": True,
    }).execute()
    
    return result.data[0]


# ──────────────────────────────────────────────────────────────────────────────
# Actualización
# ──────────────────────────────────────────────────────────────────────────────

def update_enrollment(enrollment_id: UUID, data: EnrollmentUpdateRequest) -> dict:
    """
    Actualiza una matrícula.
    
    Args:
        enrollment_id: UUID de la matrícula
        data: Datos a actualizar
        
    Returns:
        Diccionario con la matrícula actualizada
    """
    updates = {}
    
    if data.is_active is not None:
        updates["is_active"] = data.is_active
    
    if data.expires_at is not None:
        updates["expires_at"] = data.expires_at.isoformat()
    
    result = _client().table("enrollments").update(updates).eq("id", str(enrollment_id)).execute()
    return result.data[0]


# ──────────────────────────────────────────────────────────────────────────────
# Eliminación
# ──────────────────────────────────────────────────────────────────────────────

def delete_enrollment(enrollment_id: UUID) -> None:
    """
    Elimina una matrícula (hard delete).
    
    Nota: También eliminará el progreso de videos asociado por CASCADE.
    
    Args:
        enrollment_id: UUID de la matrícula a eliminar
    """
    _client().table("enrollments").delete().eq("id", str(enrollment_id)).execute()


def deactivate_enrollment(enrollment_id: UUID) -> dict:
    """
    Desactiva una matrícula (soft delete).
    
    El usuario pierde acceso pero se mantiene el historial.
    
    Args:
        enrollment_id: UUID de la matrícula
        
    Returns:
        Diccionario con la matrícula desactivada
    """
    result = _client().table("enrollments").update({
        "is_active": False,
    }).eq("id", str(enrollment_id)).execute()
    
    return result.data[0]


# ──────────────────────────────────────────────────────────────────────────────
# Utilidades
# ──────────────────────────────────────────────────────────────────────────────

def deactivate_expired_enrollments() -> int:
    """
    Desactiva todas las matrículas que hayan expirado.
    
    Esta función se debe ejecutar diariamente con un cron job.
    
    Returns:
        Cantidad de matrículas desactivadas
    """
    result = _client().table("enrollments").update({
        "is_active": False,
    }).lt("expires_at", datetime.now(timezone.utc).isoformat()).eq("is_active", True).execute()
    
    return len(result.data)