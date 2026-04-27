"""
app/schemas/user.py
-------------------
Schemas de Pydantic v2 para el módulo de usuarios.

Nota importante:
    El servicio devuelve diccionarios desde Supabase (no objetos ORM).
    Por eso los response schemas usan model_config con:
        - from_attributes=True  → para compatibilidad futura con ORM
        - populate_by_name=True → para aceptar tanto dicts como objetos

    En los endpoints se usa:
        UserProfileResponse.model_validate(user_dict)

Campos del diccionario que devuelve Supabase para la tabla users:
    id, email, username, full_name, password (hash),
    role, is_verified, is_active, created_at, updated_at,
    last_login_at, last_2fa_verified_at
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

# ──────────────────────────────────────────────────────────────────────────────
# Constantes
# ──────────────────────────────────────────────────────────────────────────────

# Regex de fortaleza: al menos una mayúscula, una minúscula y un dígito.
_PASSWORD_REGEX = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$")


# ──────────────────────────────────────────────────────────────────────────────
# Base
# ──────────────────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    """
    Campos comunes compartidos entre varios schemas de usuario.
    Base para evitar repetición (principio DRY).
    """

    email: EmailStr = Field(
        ...,
        description="Email del usuario. Identificador principal de login.",
        examples=["juan.perez@ejemplo.com"],
    )
    username: str = Field(
        ...,
        min_length=3,
        max_length=50,
        description="Nombre de usuario único.",
        examples=["juanperez"],
    )
    full_name: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Nombre completo del usuario.",
        examples=["Juan Pérez"],
    )


# ──────────────────────────────────────────────────────────────────────────────
# REQUEST schemas — lo que envía el cliente
# ──────────────────────────────────────────────────────────────────────────────

class UserRegisterRequest(UserBase):
    """
    Body esperado en POST /auth/register.

    Campos requeridos:
        email     : str  → email válido
        username  : str  → 3-50 chars, solo letras/números/_/.
        full_name : str  → opcional, max 100 chars
        password  : str  → min 8 chars, 1 mayúscula, 1 minúscula, 1 número
    """

    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description=(
            "Contraseña. Mínimo 8 caracteres, "
            "al menos una mayúscula, una minúscula y un número."
        ),
        examples=["MiPass123"],
    )

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        """Valida fortaleza mínima de la contraseña."""
        if not _PASSWORD_REGEX.match(value):
            raise ValueError(
                "La contraseña debe tener al menos una mayúscula, "
                "una minúscula y un número."
            )
        return value

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        """Solo letras, números, guiones bajos y puntos. Sin espacios."""
        if not re.match(r"^[a-zA-Z0-9_.]+$", value):
            raise ValueError(
                "El username solo puede tener letras, números, "
                "guiones bajos (_) y puntos (.)."
            )
        return value.lower()


class UserUpdateRequest(BaseModel):
    """
    Body esperado en PATCH /users/me.

    Todos los campos son opcionales.
    Al menos uno debe enviarse (validado por model_validator).

    Campos opcionales:
        full_name : str | None → nuevo nombre completo
        username  : str | None → nuevo username
    """

    full_name: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Nuevo nombre completo.",
        examples=["Juan Carlos Pérez"],
    )
    username: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=50,
        description="Nuevo nombre de usuario.",
        examples=["juancarlos"],
    )

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: Optional[str]) -> Optional[str]:
        """Valida formato del username si se envía."""
        if value is not None:
            if not re.match(r"^[a-zA-Z0-9_.]+$", value):
                raise ValueError(
                    "El username solo puede tener letras, números, "
                    "guiones bajos (_) y puntos (.)."
                )
            return value.lower()
        return value

    @model_validator(mode="after")
    def at_least_one_field(self) -> "UserUpdateRequest":
        """Rechaza bodies vacíos {} para evitar llamadas sin efecto."""
        if self.full_name is None and self.username is None:
            raise ValueError("Enviá al menos un campo para actualizar.")
        return self


class UserRoleUpdateRequest(BaseModel):
    """
    Body esperado en PATCH /users/{user_id}/role.
    Solo accesible por administradores.

    Campos requeridos:
        role : int → 1 (admin) o 2 (client)
    """

    role: int = Field(
        ...,
        description="Nuevo rol. 1=admin, 2=client.",
        examples=[2],
    )

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: int) -> int:
        """Verifica que el rol sea un valor válido del sistema."""
        if value not in {1, 2}:
            raise ValueError("Rol inválido. Opciones: 1 (admin), 2 (client).")
        return value


# ──────────────────────────────────────────────────────────────────────────────
# RESPONSE schemas — lo que devuelve el servidor
# ──────────────────────────────────────────────────────────────────────────────

class UserProfileResponse(BaseModel):
    """
    Respuesta de GET /users/me.

    Campos devueltos:
        id          : UUID     → identificador único
        email       : str      → email del usuario
        username    : str      → nombre de usuario
        full_name   : str|None → nombre completo
        role        : int      → 1=admin, 2=client
        is_verified : bool     → True si verificó el email
        created_at  : datetime → fecha de registro

    Nunca incluye el campo 'password'.
    Se construye desde un dict con: UserProfileResponse.model_validate(dict)
    """

    model_config = ConfigDict(
        from_attributes=True,   # Compatible con ORM si se necesita
        populate_by_name=True,  # Acepta tanto dicts como objetos
    )

    id: UUID
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    role: int
    is_verified: bool
    created_at: datetime


class UserAdminResponse(UserProfileResponse):
    """
    Respuesta de GET /users y GET /users/{user_id}.
    Solo accesible por administradores.

    Extiende UserProfileResponse con campos adicionales:
        is_active           : bool         → False si fue dado de baja
        last_login_at       : datetime|None → último login exitoso
        last_2fa_verified_at: datetime|None → última verificación 2FA
    """

    is_active: bool
    last_login_at: Optional[datetime] = None
    last_2fa_verified_at: Optional[datetime] = None


# ──────────────────────────────────────────────────────────────────────────────
# RESPONSE de operaciones simples
# ──────────────────────────────────────────────────────────────────────────────

class UserRegisterResponse(BaseModel):
    """
    Respuesta de POST /auth/register.

    Campos devueltos:
        message : str → mensaje informativo
    """

    message: str


class UserDeleteResponse(BaseModel):
    """
    Respuesta de DELETE /users/me y DELETE /users/{id}.
    La baja es un soft delete: is_active=False.

    Campos devueltos:
        message : str → confirmación de baja
    """

    message: str