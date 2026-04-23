"""
app/api/enrollments.py
-----------------------
Endpoints del módulo de matrículas.

Rutas de usuario:
    GET /enrollments/my-courses  → mis cursos matriculados

Rutas de admin:
    POST   /enrollments          → matricular usuario
    GET    /enrollments          → listar todas
    GET    /enrollments/{id}     → ver una matrícula
    PATCH  /enrollments/{id}     → actualizar
    DELETE /enrollments/{id}     → eliminar
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import get_current_user, require_admin
from app.schemas.enrollment import (
    EnrollmentCreateRequest,
    EnrollmentDeleteResponse,
    EnrollmentResponse,
    EnrollmentUpdateRequest,
    EnrollmentWithCourseResponse,
)

from app.services import course as course_service
from app.services import enrollment as enrollment_service
from app.services import user as user_service


router = APIRouter(prefix="/enrollments", tags=["Matrículas"])


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints de usuario
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/my-courses", response_model=list[EnrollmentWithCourseResponse])
def get_my_courses(
    active_only: bool = Query(default=True, description="Solo cursos activos"),
    current_user: dict = Depends(get_current_user),
):
    """
    Lista todos los cursos en los que el usuario actual está matriculado.
    
    Incluye información del curso (título, descripción, thumbnail).
    """
    user_id = UUID(current_user["id"])
    enrollments = enrollment_service.get_user_enrollments(user_id, active_only=active_only)
    
    return [EnrollmentWithCourseResponse.model_validate(e) for e in enrollments]


@router.get("/check/{course_id}", response_model=dict)
def check_enrollment(
    course_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """
    Verifica si el usuario actual está matriculado en un curso.
    
    Útil para el frontend para mostrar/ocultar botones de compra.
    """
    user_id = UUID(current_user["id"])
    is_enrolled = enrollment_service.is_user_enrolled(user_id, course_id)
    
    enrollment = None
    if is_enrolled:
        enrollment = enrollment_service.get_enrollment(user_id, course_id)
    
    return {
        "is_enrolled": is_enrolled,
        "enrollment": EnrollmentResponse.model_validate(enrollment) if enrollment else None,
    }


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints de admin
# ──────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=EnrollmentResponse, status_code=status.HTTP_201_CREATED)
def create_enrollment(
    data: EnrollmentCreateRequest,
    current_user: dict = Depends(require_admin),
):
    """
    Matricula un usuario en un curso (solo admin).
    
    Si ya existe una matrícula activa, retorna la existente.
    Si existe pero está inactiva, la reactiva.
    
    Requiere: JWT válido + role=1 (admin).
    """
    # Verificar que el usuario existe
    user = user_service.get_user_by_id(data.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado.",
        )
    
    # Verificar que el curso existe
    course = course_service.get_course_by_id(data.course_id, include_unpublished=True)
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado.",
        )
    
    enrollment = enrollment_service.create_enrollment(data)
    return EnrollmentResponse.model_validate(enrollment)


@router.get("", response_model=list[EnrollmentResponse])
def list_enrollments(
    user_id: UUID | None = Query(default=None, description="Filtrar por usuario"),
    course_id: UUID | None = Query(default=None, description="Filtrar por curso"),
    active_only: bool = Query(default=True, description="Solo matrículas activas"),
    current_user: dict = Depends(require_admin),
):
    """
    Lista todas las matrículas con filtros opcionales (solo admin).
    
    Requiere: JWT válido + role=1 (admin).
    """
    if user_id:
        enrollments = enrollment_service.get_user_enrollments(user_id, active_only=active_only)
    elif course_id:
        enrollments = enrollment_service.get_course_enrollments(course_id, active_only=active_only)
    else:
        # Listar todas (sin filtro)
        query = _client().table("enrollments").select("*")
        if active_only:
            query = query.eq("is_active", True)
        result = query.order("enrolled_at", desc=True).execute()
        enrollments = result.data
    
    return [EnrollmentResponse.model_validate(e) for e in enrollments]


@router.get("/{enrollment_id}", response_model=EnrollmentResponse)
def get_enrollment(
    enrollment_id: UUID,
    current_user: dict = Depends(require_admin),
):
    """
    Obtiene el detalle de una matrícula (solo admin).
    
    Requiere: JWT válido + role=1 (admin).
    """
    enrollment = enrollment_service.get_enrollment_by_id(enrollment_id)
    if enrollment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Matrícula no encontrada.",
        )
    
    return EnrollmentResponse.model_validate(enrollment)


@router.patch("/{enrollment_id}", response_model=EnrollmentResponse)
def update_enrollment(
    enrollment_id: UUID,
    data: EnrollmentUpdateRequest,
    current_user: dict = Depends(require_admin),
):
    """
    Actualiza una matrícula (solo admin).
    
    Útil para activar/desactivar o cambiar fecha de vencimiento.
    Requiere: JWT válido + role=1 (admin).
    """
    enrollment = enrollment_service.get_enrollment_by_id(enrollment_id)
    if enrollment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Matrícula no encontrada.",
        )
    
    updated = enrollment_service.update_enrollment(enrollment_id, data)
    return EnrollmentResponse.model_validate(updated)


@router.delete("/{enrollment_id}", response_model=EnrollmentDeleteResponse)
def delete_enrollment(
    enrollment_id: UUID,
    soft_delete: bool = Query(
        default=True,
        description="True = desactivar, False = eliminar permanentemente"
    ),
    current_user: dict = Depends(require_admin),
):
    """
    Elimina o desactiva una matrícula (solo admin).
    
    - soft_delete=true (default): Desactiva la matrícula (se mantiene historial)
    - soft_delete=false: Elimina permanentemente (también elimina progreso de videos)
    
    Requiere: JWT válido + role=1 (admin).
    """
    enrollment = enrollment_service.get_enrollment_by_id(enrollment_id)
    if enrollment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Matrícula no encontrada.",
        )
    
    if soft_delete:
        enrollment_service.deactivate_enrollment(enrollment_id)
        return EnrollmentDeleteResponse(
            message="Matrícula desactivada correctamente. El usuario perdió acceso al curso."
        )
    else:
        enrollment_service.delete_enrollment(enrollment_id)
        return EnrollmentDeleteResponse(
            message="Matrícula eliminada permanentemente (incluye progreso de videos)."
        )


# Helper para listar todas sin filtro
def _client():
    from app.db.supabase import get_supabase_admin_client
    return get_supabase_admin_client()