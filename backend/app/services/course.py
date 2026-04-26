"""
app/services/course.py
----------------------
Lógica de negocio del módulo de cursos.
ACTUALIZADO: Soporte para subtitle, level, instructor_title, original_price, featured
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
import unicodedata

from app.db.supabase import get_supabase_admin_client
from app.schemas.course import CourseCreateRequest, CourseUpdateRequest


def _client():
    """Retorna el cliente admin de Supabase."""
    return get_supabase_admin_client()


def _remove_accents(text: str) -> str:
    """Remueve tildes y acentos de un texto."""
    return ''.join(
        c for c in unicodedata.normalize('NFD', text)
        if unicodedata.category(c) != 'Mn'
    )


# ──────────────────────────────────────────────────────────────────────────────
# Búsquedas
# ──────────────────────────────────────────────────────────────────────────────

def get_course_by_id(course_id: UUID, include_unpublished: bool = False) -> Optional[dict]:
    """
    Busca un curso por su UUID.

    Args:
        course_id: UUID del curso.
        include_unpublished: Si es True, retorna el curso aunque no esté publicado.

    Returns:
        Diccionario con los datos del curso, o None si no existe o no está publicado.
    """
    query = _client().table("courses").select("*, categories(name)").eq("id", str(course_id))

    if not include_unpublished:
        query = query.eq("is_published", True)

    result = query.execute()

    if not result.data:
        return None

    # Aplanar la estructura de la categoría
    course = result.data[0]
    if course.get("categories"):
        course["category_name"] = course["categories"]["name"]
        del course["categories"]

    return course


def get_all_courses(
    category_id: Optional[UUID] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    include_unpublished: bool = False,
) -> tuple[list[dict], int]:
    """
    Lista cursos con filtros y paginación.

    Args:
        category_id: Filtrar por categoría (opcional).
        search: Buscar en título y descripción (opcional).
        page: Número de página (empieza en 1).
        page_size: Cantidad de cursos por página.
        include_unpublished: Si es True, incluye cursos no publicados (admin).

    Returns:
        Tupla con (lista de cursos, total de cursos).
    """
    page_size = min(page_size, 100)
    offset = (page - 1) * page_size

    # Query base con JOIN a categorías
    query = _client().table("courses").select("*, categories(name)", count="exact")

    # Filtro de publicación
    if not include_unpublished:
        query = query.eq("is_published", True)

    # Filtro por categoría
    if category_id is not None:
        query = query.eq("category_id", str(category_id))

    # Orden y paginación
    query = query.order("created_at", desc=True).range(offset, offset + page_size - 1)

    result = query.execute()

    # Aplanar categorías
    courses = []
    for course in result.data:
        if course.get("categories"):
            course["category_name"] = course["categories"]["name"]
            del course["categories"]
        courses.append(course)

    # Filtrar por búsqueda en memoria (para evitar problemas con tildes)
    if search:
        search_normalized = _remove_accents(search.lower())
        filtered_courses = []
        
        for course in courses:
            title_normalized = _remove_accents(course.get("title", "").lower())
            desc_normalized = _remove_accents(course.get("description", "").lower())
            
            if search_normalized in title_normalized or search_normalized in desc_normalized:
                filtered_courses.append(course)
        
        courses = filtered_courses
        total = len(courses)
    else:
        total = result.count or 0

    return courses, total


def get_featured_courses(limit: int = 3) -> list[dict]:
    """
    Obtiene cursos destacados (featured=true).
    
    Si no hay cursos destacados, retorna los últimos N cursos publicados.
    
    Args:
        limit: Cantidad de cursos a retornar
        
    Returns:
        Lista de cursos destacados
    """
    # Intentar obtener cursos marcados como featured
    result = _client().table("courses").select(
        "*, categories(name)"
    ).eq("is_published", True).eq("featured", True).order("created_at", desc=True).limit(limit).execute()
    
    courses = result.data
    
    # Si no hay suficientes cursos featured, completar con los más recientes
    if len(courses) < limit:
        remaining = limit - len(courses)
        recent = _client().table("courses").select(
            "*, categories(name)"
        ).eq("is_published", True).eq("featured", False).order("created_at", desc=True).limit(remaining).execute()
        
        courses.extend(recent.data)
    
    # Aplanar categorías
    for course in courses:
        if course.get("categories"):
            course["category_name"] = course["categories"]["name"]
            del course["categories"]
    
    return courses


# ──────────────────────────────────────────────────────────────────────────────
# Creación
# ──────────────────────────────────────────────────────────────────────────────

def create_course(data: CourseCreateRequest) -> dict:
    """
    Crea un nuevo curso.

    El curso se crea con is_published=False por defecto.
    Debe publicarse explícitamente con publish_course().

    Args:
        data: Datos validados del request.

    Returns:
        Diccionario con los datos del curso creado.
    """
    result = _client().table("courses").insert({
        "title": data.title,
        "subtitle": data.subtitle,
        "description": data.description,
        "category_id": str(data.category_id),
        "instructor_name": data.instructor_name,
        "instructor_title": data.instructor_title,
        "price": str(data.price),
        "original_price": str(data.original_price) if data.original_price else None,
        "level": data.level,
        "thumbnail_url": data.thumbnail_url,
        "featured": data.featured,
        "is_published": False,
    }).execute()

    return result.data[0]


# ──────────────────────────────────────────────────────────────────────────────
# Actualización
# ──────────────────────────────────────────────────────────────────────────────

def update_course(course_id: UUID, data: CourseUpdateRequest) -> dict:
    """
    Actualiza un curso existente.

    Solo modifica los campos que vienen en el request.

    Args:
        course_id: UUID del curso a actualizar.
        data: Datos validados del request.

    Returns:
        Diccionario con los datos del curso actualizado.
    """
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}

    if data.title is not None:
        updates["title"] = data.title
    if data.subtitle is not None:
        updates["subtitle"] = data.subtitle
    if data.description is not None:
        updates["description"] = data.description
    if data.category_id is not None:
        updates["category_id"] = str(data.category_id)
    if data.instructor_name is not None:
        updates["instructor_name"] = data.instructor_name
    if data.instructor_title is not None:
        updates["instructor_title"] = data.instructor_title
    if data.price is not None:
        updates["price"] = str(data.price)
    if data.original_price is not None:
        updates["original_price"] = str(data.original_price)
    if data.level is not None:
        updates["level"] = data.level
    if data.thumbnail_url is not None:
        updates["thumbnail_url"] = data.thumbnail_url
    if data.featured is not None:
        updates["featured"] = data.featured

    result = _client().table("courses").update(updates).eq("id", str(course_id)).execute()
    return result.data[0]


def publish_course(course_id: UUID, is_published: bool) -> dict:
    """
    Publica o despublica un curso.

    Args:
        course_id: UUID del curso.
        is_published: True para publicar, False para despublicar.

    Returns:
        Diccionario con los datos del curso actualizado.
    """
    result = _client().table("courses").update({
        "is_published": is_published,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(course_id)).execute()

    return result.data[0]


# ──────────────────────────────────────────────────────────────────────────────
# Eliminación
# ──────────────────────────────────────────────────────────────────────────────

def delete_course(course_id: UUID) -> None:
    """
    Elimina un curso de la base de datos.

    Nota: Esto fallará si hay videos o matrículas asociadas
    debido a las foreign key constraints.

    Args:
        course_id: UUID del curso a eliminar.
    """
    _client().table("courses").delete().eq("id", str(course_id)).execute()