"""
app/schemas/auth.py
-------------------
Schemas de Pydantic v2 para el módulo de autenticación.

Cubre:
    - Registro y verificación de email.
    - Login y respuesta con tokens.
    - Verificación de doble factor (2FA).
    - Recuperación y cambio de contraseña.
    - Refresh de token.
"""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ──────────────────────────────────────────────────────────────────────────────
# REGISTRO
# ──────────────────────────────────────────────────────────────────────────────

class EmailVerifyRequest(BaseModel):
    """
    Body esperado en POST /auth/verify-email.

    El usuario ingresa el email con el que se registró y el código de 6 dígitos.
    """

    email: EmailStr = Field(
        ...,
        description="Email del usuario registrado.",
        examples=["juan.perez@ejemplo.com"],
    )
    code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        description="Código numérico de 6 dígitos recibido por email.",
        examples=["847291"],
    )


# ──────────────────────────────────────────────────────────────────────────────
# LOGIN
# ──────────────────────────────────────────────────────────────────────────────

class UserLoginRequest(BaseModel):
    """
    Body esperado en POST /auth/login.
    """

    email: EmailStr = Field(
        ...,
        description="Email del usuario.",
        examples=["juan.perez@ejemplo.com"],
    )
    password: str = Field(
        ...,
        min_length=1,
        description="Contraseña del usuario.",
        examples=["MiPass123"],
    )


class LoginResponse(BaseModel):
    """
    Respuesta de POST /auth/login y POST /auth/verify-2fa.

    Si requires_2fa es True, el cliente debe llamar a
    POST /auth/verify-2fa antes de poder usar el access_token.
    """

    access_token: str = Field(
        description="JWT de acceso. Expira en 15 minutos.",
    )
    token_type: str = Field(
        default="bearer",
        description="Tipo de token. Siempre 'bearer'.",
    )
    requires_2fa: bool = Field(
        description=(
            "True si han pasado más de 30 días desde la última verificación 2FA. "
            "En ese caso el access_token es temporal hasta completar el 2FA."
        ),
    )
    user_id: UUID = Field(
        description="UUID del usuario. Necesario para el paso de 2FA.",
    )


# ──────────────────────────────────────────────────────────────────────────────
# DOBLE FACTOR (2FA)
# ──────────────────────────────────────────────────────────────────────────────

class TwoFactorVerifyRequest(BaseModel):
    """
    Body esperado en POST /auth/verify-2fa.

    Se llama cuando LoginResponse.requires_2fa es True.
    """

    user_id: UUID = Field(
        ...,
        description="UUID del usuario retornado en el login.",
    )
    code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        description="Código numérico de 6 dígitos recibido por email.",
        examples=["382910"],
    )


# ──────────────────────────────────────────────────────────────────────────────
# CONTRASEÑA
# ──────────────────────────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    """
    Body esperado en POST /auth/forgot-password.

    Si el email no existe, la respuesta es igual (por seguridad)
    para no revelar qué emails están registrados.
    """

    email: EmailStr = Field(
        ...,
        description="Email de la cuenta a recuperar.",
        examples=["juan.perez@ejemplo.com"],
    )


class ResetPasswordRequest(BaseModel):
    """
    Body esperado en POST /auth/reset-password.
    """

    user_id: UUID = Field(
        ...,
        description="UUID del usuario retornado en forgot-password.",
    )
    code: str = Field(
        ...,
        min_length=6,
        max_length=6,
        description="Código de 6 dígitos recibido por email.",
        examples=["192837"],
    )
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Nueva contraseña.",
        examples=["NuevoPass123"],
    )


class ChangePasswordRequest(BaseModel):
    """
    Body esperado en PATCH /auth/change-password.
    Solo para usuarios autenticados que recuerdan su contraseña actual.
    """

    current_password: str = Field(
        ...,
        min_length=1,
        description="Contraseña actual del usuario.",
    )
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Nueva contraseña.",
        examples=["NuevoPass123"],
    )


# ──────────────────────────────────────────────────────────────────────────────
# RESPUESTAS GENÉRICAS
# ──────────────────────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    """Respuesta genérica para operaciones simples."""

    message: str = Field(
        description="Mensaje informativo.",
        examples=["Operación realizada correctamente."],
    )


class RefreshTokenResponse(BaseModel):
    """Respuesta de POST /auth/refresh."""

    access_token: str = Field(
        description="Nuevo JWT de acceso. Expira en 15 minutos.",
    )
    token_type: str = Field(default="bearer")