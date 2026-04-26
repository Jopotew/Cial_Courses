"""
app/api/courses.py
------------------
Endpoints del módulo de cursos.

Rutas públicas:
    GET /courses          → listar publicados (con filtros)
    GET /courses/:id      → ver detalle de un curso publicado

Rutas de admin:
    GET    /courses/admin          → listar todos (incluye borradores)
    POST   /courses                → crear
    PATCH  /courses/:id            → editar
    PATCH  /courses/:id/publish    → publicar/despublicar
    DELETE /courses/:id            → eliminar
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import require_admin
from app.schemas.course import (
    CourseCreateRequest,
    CourseDeleteResponse,
    CourseDetailResponse,
    CoursePublishRequest,
    CourseResponse,
    CourseUpdateRequest,
)
from app.services import category as category_service
from app.services import course as course_service

router = APIRouter(prefix="/courses", tags=["Cursos"])


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints públicos
# ──────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=dict)
def list_courses(
    category_id: UUID | None = Query(default=None, description="Filtrar por categoría"),
    search: str | None = Query(default=None, description="Buscar en título y descripción"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """
    Lista cursos publicados con filtros y paginación.
    Endpoint público — no requiere autenticación.
    """
    courses, total = course_service.get_all_courses(
        category_id=category_id,
        search=search,
        page=page,
        page_size=page_size,
        include_unpublished=False,
    )

    pages = (total + page_size - 1) // page_size

    return {
        "items": [CourseDetailResponse.model_validate(c) for c in courses],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


@router.get("/featured", response_model=list[CourseDetailResponse])
def get_featured_courses(
    limit: int = Query(default=3, ge=1, le=10, description="Cantidad de cursos destacados"),
):
    """
    Obtiene cursos destacados para mostrar en la landing.
    
    Si hay cursos marcados como featured=true, retorna esos.
    Si no hay suficientes, completa con los más recientes.
    
    Query params:
    - limit: Cantidad de cursos (1-10, default: 3)
    
    Endpoint público — no requiere autenticación.
    """
    featured = course_service.get_featured_courses(limit=limit)

    return [CourseDetailResponse.model_validate(c) for c in featured]


@router.get("/{course_id}", response_model=CourseDetailResponse)
def get_course(course_id: UUID):
    """
    Obtiene el detalle de un curso publicado.
    Endpoint público — no requiere autenticación.
    """
    course = course_service.get_course_by_id(course_id, include_unpublished=False)
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado o no está publicado.",
        )
    return CourseDetailResponse.model_validate(course)


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints de admin
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/admin/all", response_model=dict)
def list_all_courses_admin(
    category_id: UUID | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(require_admin),
):
    """
    Lista todos los cursos, incluidos los no publicados.
    Requiere: JWT válido + role=1 (admin).
    """
    courses, total = course_service.get_all_courses(
        category_id=category_id,
        search=search,
        page=page,
        page_size=page_size,
        include_unpublished=True,
    )

    pages = (total + page_size - 1) // page_size

    return {
        "items": [CourseDetailResponse.model_validate(c) for c in courses],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(
    data: CourseCreateRequest,
    current_user: dict = Depends(require_admin),
):
    """
    Crea un nuevo curso (en estado borrador).
    Requiere: JWT válido + role=1 (admin).
    """
    # Verificar que la categoría existe
    category = category_service.get_category_by_id(data.category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La categoría especificada no existe.",
        )

    new_course = course_service.create_course(data)
    return CourseResponse.model_validate(new_course)


@router.patch("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: UUID,
    data: CourseUpdateRequest,
    current_user: dict = Depends(require_admin),
):
    """
    Actualiza un curso existente.
    Requiere: JWT válido + role=1 (admin).
    """
    # Verificar que el curso existe
    course = course_service.get_course_by_id(course_id, include_unpublished=True)
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado.",
        )

    # Si se cambia la categoría, verificar que existe
    if data.category_id is not None:
        category = category_service.get_category_by_id(data.category_id)
        if category is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La categoría especificada no existe.",
            )

    updated = course_service.update_course(course_id, data)
    return CourseResponse.model_validate(updated)


@router.patch("/{course_id}/publish", response_model=CourseResponse)
def publish_course(
    course_id: UUID,
    data: CoursePublishRequest,
    current_user: dict = Depends(require_admin),
):
    """
    Publica o despublica un curso.
    Requiere: JWT válido + role=1 (admin).
    """
    # Verificar que el curso existe
    course = course_service.get_course_by_id(course_id, include_unpublished=True)
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado.",
        )

    updated = course_service.publish_course(course_id, data.is_published)
    return CourseResponse.model_validate(updated)


@router.delete("/{course_id}", response_model=CourseDeleteResponse)
def delete_course(
    course_id: UUID,
    current_user: dict = Depends(require_admin),
):
    """
    Elimina un curso.

    Falla si hay videos o matrículas asociadas.
    Requiere: JWT válido + role=1 (admin).
    """
    # Verificar que el curso existe
    course = course_service.get_course_by_id(course_id, include_unpublished=True)
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado.",
        )

    try:
        course_service.delete_course(course_id)
        return CourseDeleteResponse(
            message=f"Curso '{course['title']}' eliminado correctamente."
        )
    except Exception as e:
        error_msg = str(e)
        if "foreign key" in error_msg.lower() or "violates" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede eliminar el curso porque tiene videos o matrículas asociadas.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar el curso.",
        )