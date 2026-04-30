"""
app/api/modules.py
------------------
Endpoints para módulos de cursos.

Todas las rutas son de admin.

    GET    /modules/courses/{course_id}/modules  → listar módulos con sus videos
    POST   /modules/courses/{course_id}/modules  → crear módulo
    PATCH  /modules/{module_id}                  → actualizar módulo
    DELETE /modules/{module_id}                  → eliminar módulo
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import require_admin, get_current_user
from app.schemas.module import (
    ModuleCreateRequest,
    ModuleDeleteResponse,
    ModuleResponse,
    ModuleUpdateRequest,
)
from app.services import course as course_service
from app.services import module as module_service

router = APIRouter(prefix="/modules", tags=["Módulos"])


@router.get("/courses/{course_id}/modules", response_model=list[ModuleResponse])
def list_modules(
    course_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """
    Lista módulos del curso con sus videos.
    - Admin: ve todos los módulos y videos (incluidos borradores).
    - Usuario autenticado: ve solo videos publicados.
    """
    is_admin = current_user.get("role", 0) == 1
    course = course_service.get_course_by_id(course_id, include_unpublished=is_admin)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado.")
    return module_service.get_modules_by_course(course_id, include_unpublished_videos=is_admin)


@router.post(
    "/courses/{course_id}/modules",
    response_model=ModuleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_module(
    course_id: UUID,
    data: ModuleCreateRequest,
    current_user: dict = Depends(require_admin),
):
    """Crea un nuevo módulo en el curso. Requiere admin."""
    course = course_service.get_course_by_id(course_id, include_unpublished=True)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado.")
    return module_service.create_module(course_id, data)


@router.patch("/{module_id}", response_model=ModuleResponse)
def update_module(
    module_id: UUID,
    data: ModuleUpdateRequest,
    current_user: dict = Depends(require_admin),
):
    """Actualiza el título / descripción / orden de un módulo. Requiere admin."""
    module = module_service.get_module_by_id(module_id)
    if module is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Módulo no encontrado.")
    return module_service.update_module(module_id, data)


@router.delete("/{module_id}", response_model=ModuleDeleteResponse)
def delete_module(
    module_id: UUID,
    current_user: dict = Depends(require_admin),
):
    """
    Elimina un módulo.
    Los videos del módulo quedan con module_id = NULL (no se eliminan).
    Requiere admin.
    """
    module = module_service.get_module_by_id(module_id)
    if module is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Módulo no encontrado.")
    module_service.delete_module(module_id)
    return ModuleDeleteResponse(message=f"Módulo '{module['title']}' eliminado.")
