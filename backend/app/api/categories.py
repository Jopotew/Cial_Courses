"""
app/api/categories.py
---------------------
Endpoints del módulo de categorías.

Rutas públicas:
    GET /categories     → listar todas
    GET /categories/:id → ver una categoría

Rutas de admin:
    POST   /categories     → crear
    PATCH  /categories/:id → editar
    DELETE /categories/:id → eliminar
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import require_admin
from app.schemas.category import (
    CategoryCreateRequest,
    CategoryDeleteResponse,
    CategoryResponse,
    CategoryUpdateRequest,
)
from app.services import category as category_service

router = APIRouter(prefix="/categories", tags=["Categorías"])


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints públicos
# ──────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[CategoryResponse])
def list_categories():
    """
    Lista todas las categorías ordenadas por nombre.
    Endpoint público — no requiere autenticación.
    """
    categories = category_service.get_all_categories()
    return [CategoryResponse.model_validate(c) for c in categories]


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(category_id: UUID):
    """
    Obtiene el detalle de una categoría específica.
    Endpoint público — no requiere autenticación.
    """
    category = category_service.get_category_by_id(category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada.",
        )
    return CategoryResponse.model_validate(category)


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints de admin
# ──────────────────────────────────────────────────────────────────────────────

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreateRequest,
    current_user: dict = Depends(require_admin),
):
    """
    Crea una nueva categoría.
    Requiere: JWT válido + role=1 (admin).
    """
    # Verificar que el nombre no esté en uso
    existing = category_service.get_category_by_name(data.name)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una categoría con ese nombre.",
        )

    new_category = category_service.create_category(data)
    return CategoryResponse.model_validate(new_category)


@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: UUID,
    data: CategoryUpdateRequest,
    current_user: dict = Depends(require_admin),
):
    """
    Actualiza una categoría existente.
    Requiere: JWT válido + role=1 (admin).
    """
    # Verificar que existe
    category = category_service.get_category_by_id(category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada.",
        )

    # Si se cambia el nombre, verificar que no esté en uso
    if data.name is not None:
        existing = category_service.get_category_by_name(data.name)
        if existing and existing["id"] != str(category_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una categoría con ese nombre.",
            )

    updated = category_service.update_category(category_id, data)
    return CategoryResponse.model_validate(updated)


@router.delete("/{category_id}", response_model=CategoryDeleteResponse)
def delete_category(
    category_id: UUID,
    current_user: dict = Depends(require_admin),
):
    """
    Elimina una categoría.

    Falla si hay cursos asociados a esta categoría.
    Requiere: JWT válido + role=1 (admin).
    """
    # Verificar que existe
    category = category_service.get_category_by_id(category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada.",
        )

    try:
        category_service.delete_category(category_id)
        return CategoryDeleteResponse(
            message=f"Categoría '{category['name']}' eliminada correctamente."
        )
    except Exception as e:
        # Si falla por foreign key (hay cursos asociados)
        error_msg = str(e)
        if "foreign key" in error_msg.lower() or "violates" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede eliminar la categoría porque tiene cursos asociados.",
            )
        # Otro tipo de error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar la categoría.",
        )