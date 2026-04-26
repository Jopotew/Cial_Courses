"""
app/api/users.py
----------------
Endpoints del módulo de usuarios.
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.dependencies import get_current_user, require_admin #type: ignore
from app.schemas.user import (
    UserAdminResponse,
    UserDeleteResponse,
    UserProfileResponse,
    UserRoleUpdateRequest,
    UserUpdateRequest,
)
from app.services import user as user_service

router = APIRouter(prefix="/users", tags=["Usuarios"])


# ── Usuario autenticado ───────────────────────────────────────────────────────

@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(current_user: dict = Depends(get_current_user)): #type: ignore
    """Retorna el perfil del usuario autenticado."""
    return current_user #type: ignore


@router.patch("/me", response_model=UserProfileResponse)
def update_my_profile( #type: ignore
    data: UserUpdateRequest,
    current_user: dict = Depends(get_current_user),  #type: ignore
):
    """Actualiza el perfil del usuario autenticado."""
    if data.username is not None:
        existing = user_service.get_user_by_username(data.username) #type: ignore
        if existing and existing["id"] != current_user["id"]:
            raise HTTPException(status_code=409, detail="El username ya está en uso.")

    updated = user_service.update_user(UUID(current_user["id"]), data) #type: ignore
    return updated #type: ignore


@router.delete("/me", response_model=UserDeleteResponse)
def delete_my_account(current_user: dict = Depends(get_current_user)): #type: ignore
    """Desactiva la cuenta del usuario autenticado (soft delete)."""
    user_service.deactivate_user(UUID(current_user["id"])) #type: ignore
    return UserDeleteResponse(message="Tu cuenta fue desactivada correctamente.")


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=dict)
def list_users( #type: ignore
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: dict = Depends(require_admin), #type: ignore
):
    """Lista todos los usuarios con paginación. Solo admin."""
    users, total = user_service.get_all_users(page, page_size) #type: ignore
    pages = (total + page_size - 1) // page_size

    return {
        "items": [UserAdminResponse.model_validate(u) for u in users], #type: ignore
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": pages,
    }


@router.get("/{user_id}", response_model=UserAdminResponse)
def get_user( #type: ignore
    user_id: UUID,
    current_user: dict = Depends(require_admin), #type: ignore
):
    """Retorna el detalle de un usuario. Solo admin."""
    user = user_service.get_user_by_id(user_id) #type: ignore
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    return user #type: ignore


@router.patch("/{user_id}/role", response_model=UserAdminResponse)
def change_user_role( #type: ignore
    user_id: UUID,
    data: UserRoleUpdateRequest,
    current_user: dict = Depends(require_admin), #type: ignore
):
    """Cambia el rol de un usuario. Solo admin."""
    if str(user_id) == current_user["id"]:
        raise HTTPException(status_code=400, detail="No podés cambiar tu propio rol.")

    user = user_service.get_user_by_id(user_id) #type: ignore
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    return user_service.update_user_role(user_id, data.role) #type: ignore


@router.patch("/{user_id}/activate", response_model=UserAdminResponse)
def activate_user(
    user_id: UUID,
    current_user: dict = Depends(require_admin), #type: ignore
):
    """Reactiva un usuario desactivado. Solo admin."""
    if str(user_id) == current_user["id"]:
        raise HTTPException(status_code=400, detail="No podés modificar tu propio estado.")

    user = user_service.get_user_by_id(user_id) #type: ignore
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    return user_service.activate_user(user_id) #type: ignore


@router.delete("/{user_id}", response_model=UserDeleteResponse)
def deactivate_user(
    user_id: UUID,
    current_user: dict = Depends(require_admin), #type: ignore
):
    """Desactiva un usuario. Solo admin."""
    if str(user_id) == current_user["id"]:
        raise HTTPException(status_code=400, detail="No podés desactivarte a vos mismo.")

    user = user_service.get_user_by_id(user_id) #type: ignore
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    user_service.deactivate_user(user_id) #type: ignore
    return UserDeleteResponse(message="Usuario desactivado correctamente.")