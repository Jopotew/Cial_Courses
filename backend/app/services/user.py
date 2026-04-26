"""
app/services/user_service.py
-----------------------------
Lógica de negocio del módulo de usuarios.

Usa el cliente de Supabase directamente en vez de SQLAlchemy ORM,
lo que evita el problema de prepared statements con PgBouncer.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from app.core.security import hash_password
from app.db.supabase import get_supabase_admin_client
from app.schemas.user import UserRegisterRequest, UserUpdateRequest


def _client():
    """Retorna el cliente admin de Supabase."""
    return get_supabase_admin_client()


# ──────────────────────────────────────────────────────────────────────────────
# Búsquedas
# ──────────────────────────────────────────────────────────────────────────────

def get_user_by_id(user_id: UUID) -> Optional[dict]:
    """
    Busca un usuario por su UUID.

    Returns:
        Diccionario con los datos del usuario, o None si no existe.
    """
    result = _client().table("users").select("*").eq("id", str(user_id)).execute()
    return result.data[0] if result.data else None


def get_user_by_email(email: str) -> Optional[dict]:
    """
    Busca un usuario por su email.

    Returns:
        Diccionario con los datos del usuario, o None si no existe.
    """
    result = _client().table("users").select("*").eq("email", email.lower()).execute()
    return result.data[0] if result.data else None


def get_user_by_username(username: str) -> Optional[dict]:
    """
    Busca un usuario por su username.

    Returns:
        Diccionario con los datos del usuario, o None si no existe.
    """
    result = _client().table("users").select("*").eq("username", username.lower()).execute()
    return result.data[0] if result.data else None


def get_all_users(page: int = 1, page_size: int = 20) -> tuple[list[dict], int]:
    """
    Retorna todos los usuarios con paginación. Solo para admin.

    Returns:
        Tupla con (lista de usuarios, total).
    """
    page_size = min(page_size, 100)
    offset = (page - 1) * page_size

    result = (
        _client()
        .table("users")
        .select("*", count="exact")
        .order("created_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )
    return result.data, result.count or 0


# ──────────────────────────────────────────────────────────────────────────────
# Validaciones
# ──────────────────────────────────────────────────────────────────────────────

def email_exists(email: str) -> bool:
    """Verifica si un email ya está registrado."""
    result = _client().table("users").select("id").eq("email", email.lower()).execute()
    return len(result.data) > 0


def username_exists(username: str) -> bool:
    """Verifica si un username ya está registrado."""
    result = _client().table("users").select("id").eq("username", username.lower()).execute()
    return len(result.data) > 0


# ──────────────────────────────────────────────────────────────────────────────
# Creación
# ──────────────────────────────────────────────────────────────────────────────

def create_user(data: UserRegisterRequest) -> dict:
    """
    Crea un nuevo usuario en la base de datos.

    Hashea la contraseña antes de guardarla.
    El usuario se crea con is_verified=False y role=2 (client).

    Returns:
        Diccionario con los datos del usuario creado.
    """
    result = _client().table("users").insert({
        "email": data.email.lower(),
        "username": data.username.lower(),
        "full_name": data.full_name,
        "password": hash_password(data.password),
        "role": 2,
        "is_verified": False,
        "is_active": True,
    }).execute()

    return result.data[0]


# ──────────────────────────────────────────────────────────────────────────────
# Actualización
# ──────────────────────────────────────────────────────────────────────────────

def update_user(user_id: UUID, data: UserUpdateRequest) -> dict:
    """
    Actualiza el perfil de un usuario (PATCH parcial).
    Solo modifica los campos que vienen en el request.
    """
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}

    if data.full_name is not None:
        updates["full_name"] = data.full_name
    if data.username is not None:
        updates["username"] = data.username.lower()

    result = _client().table("users").update(updates).eq("id", str(user_id)).execute()
    return result.data[0]


def update_user_role(user_id: UUID, new_role: int) -> dict:
    """Cambia el rol de un usuario. Solo para administradores."""
    result = _client().table("users").update({
        "role": new_role,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(user_id)).execute()
    return result.data[0]


def verify_user_email(user_id: UUID) -> dict:
    """Marca el email del usuario como verificado."""
    result = _client().table("users").update({
        "is_verified": True,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(user_id)).execute()
    return result.data[0]


def update_last_login(user_id: UUID) -> None:
    """Actualiza la fecha del último login exitoso."""
    _client().table("users").update({
        "last_login_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(user_id)).execute()


def update_2fa_verified(user_id: UUID) -> None:
    """Actualiza la fecha de última verificación 2FA."""
    _client().table("users").update({
        "last_2fa_verified_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(user_id)).execute()


def update_password(user_id: UUID, new_password: str) -> None:
    """Actualiza la contraseña de un usuario."""
    _client().table("users").update({
        "password": hash_password(new_password),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(user_id)).execute()


# ──────────────────────────────────────────────────────────────────────────────
# Soft delete
# ──────────────────────────────────────────────────────────────────────────────

def deactivate_user(user_id: UUID) -> dict:
    """
    Desactiva un usuario (soft delete).
    No borra el registro — solo pone is_active=False.
    """
    result = _client().table("users").update({
        "is_active": False,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(user_id)).execute()
    return result.data[0]


def activate_user(user_id: UUID) -> dict:
    """Reactiva un usuario previamente desactivado (is_active=True)."""
    result = _client().table("users").update({
        "is_active": True,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", str(user_id)).execute()
    return result.data[0]