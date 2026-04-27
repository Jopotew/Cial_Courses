"""
app/api/auth.py
---------------
Endpoints de autenticación de AulaCAL.
Ahora con envío real de emails via Mailtrap.
"""

from datetime import datetime, timedelta, timezone
from typing import cast
from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status

from app.core.dependencies import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)
from app.schemas.auth import (
    ChangePasswordRequest,
    EmailVerifyRequest,
    ForgotPasswordRequest,
    LoginResponse,
    MessageResponse,
    RefreshTokenResponse,
    ResetPasswordRequest,
    TwoFactorVerifyRequest,
    UserLoginRequest,
)
from app.schemas.user import UserRegisterRequest, UserRegisterResponse
from app.services import email as email_service
from app.services import user as user_service

router = APIRouter(prefix="/auth", tags=["Autenticación"])

TWO_FACTOR_DAYS = 30


def _needs_2fa(user: dict) -> bool:
    """Determina si el usuario necesita completar el 2FA."""
    last = user.get("last_2fa_verified_at")
    if last is None:
        return True
    if isinstance(last, str):
        last = datetime.fromisoformat(last.replace("Z", "+00:00"))
    cutoff = datetime.now(timezone.utc) - timedelta(days=TWO_FACTOR_DAYS)
    return last < cutoff


# ── REGISTRO ──────────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserRegisterResponse, status_code=201)
def register(data: UserRegisterRequest):
    """
    Registra un nuevo usuario.

    Proceso:
        1. Verifica unicidad de email y username.
        2. Crea el usuario con is_verified=False.
        3. Genera código de 6 dígitos y lo guarda en la DB.
        4. Envía el código por email al usuario.
    """
    if user_service.email_exists(data.email):
        raise HTTPException(status_code=409, detail="El email ya está registrado.")

    if user_service.username_exists(data.username):
        raise HTTPException(status_code=409, detail="El username ya está en uso.")

    new_user = user_service.create_user(data)

    code = email_service.create_code(new_user["email"], "register")
    email_service.send_verification_email(new_user["email"], code)

    return UserRegisterResponse(
        message="Registro exitoso. Revisá tu email para verificar tu cuenta.",
    )


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(data: EmailVerifyRequest):
    """
    Verifica el email con el código recibido.

    Valida el código contra la DB:
        - Que exista y corresponda al usuario.
        - Que no esté usado.
        - Que no haya expirado.
    """
    email: str = cast(str, data.email)
    user = user_service.get_user_by_email(email)  # type: ignore[arg-type]
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    if user.get("is_verified"):
        raise HTTPException(status_code=400, detail="El email ya fue verificado.")

    is_valid = email_service.verify_code(email, data.code, "register")
    if not is_valid:
        raise HTTPException(status_code=400, detail="Código inválido o expirado.")

    user_service.verify_user_email(UUID(user["id"]))  # type: ignore[arg-type]

    return MessageResponse(message="Email verificado. Ya podés iniciar sesión.")


# ── LOGIN ─────────────────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
def login(data: UserLoginRequest, response: Response):
    """
    Autentica con email y contraseña.

    Si han pasado más de 30 días desde el último 2FA:
        1. Genera código de 6 dígitos.
        2. Lo guarda en la DB.
        3. Lo envía por email.
        4. Retorna requires_2fa=True.

    El cliente debe llamar a /auth/verify-2fa para completar el login.
    """
    user = user_service.get_user_by_email(data.email)
    if user is None or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos.")

    if not user.get("is_active"):
        raise HTTPException(status_code=401, detail="Cuenta desactivada.")

    if not user.get("is_verified"):
        raise HTTPException(status_code=403, detail="Verificá tu email antes de iniciar sesión.")

    user_id = UUID(user["id"])
    needs_2fa = _needs_2fa(user)

    if needs_2fa:
        code = email_service.create_code(user["email"], "login_2fa")  # type: ignore[arg-type]
        email_service.send_2fa_email(user["email"], code)

    # Generar tokens
    access_token = create_access_token(user_id=user_id, role=user["role"])
    refresh_token = create_refresh_token(user_id=user_id)

    # Guardar refresh token en httpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,       # True en producción
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
    )

    user_service.update_last_login(user_id)

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        requires_2fa=needs_2fa,
        user_id=user_id,
    )


# ── 2FA ───────────────────────────────────────────────────────────────────────

@router.post("/verify-2fa", response_model=LoginResponse)
def verify_2fa(data: TwoFactorVerifyRequest):
    """
    Verifica el código de doble factor enviado por email.

    Valida el código contra la DB y actualiza last_2fa_verified_at.
    """
    user = user_service.get_user_by_id(data.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    # Validar código contra la DB
    is_valid = email_service.verify_code(user["email"], data.code, "login_2fa")  # type: ignore[arg-type]
    if not is_valid:
        raise HTTPException(status_code=400, detail="Código inválido o expirado.")

    user_service.update_2fa_verified(data.user_id)

    user_id = UUID(user["id"])
    access_token = create_access_token(user_id=user_id, role=user["role"])

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        requires_2fa=False,
        user_id=user_id,
    )


# ── REFRESH TOKEN ─────────────────────────────────────────────────────────────

@router.post("/refresh", response_model=RefreshTokenResponse)
def refresh_token(refresh_token: str = Cookie(default=None)):
    """Renueva el access token usando el refresh token de la cookie."""
    if refresh_token is None:
        raise HTTPException(status_code=401, detail="No hay refresh token.")

    user_id_str = decode_refresh_token(refresh_token)
    if user_id_str is None:
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado.")

    user = user_service.get_user_by_id(user_id_str)
    if user is None or not user.get("is_active"):
        raise HTTPException(status_code=401, detail="Usuario no encontrado o inactivo.")

    access_token = create_access_token(
        user_id=UUID(user["id"]),
        role=user["role"],
    )
    return RefreshTokenResponse(access_token=access_token)


# ── LOGOUT ────────────────────────────────────────────────────────────────────

@router.post("/logout", response_model=MessageResponse)
def logout(response: Response, current_user: dict = Depends(get_current_user)):
    """Cierra sesión eliminando el refresh token de la cookie."""
    response.delete_cookie(key="refresh_token")
    return MessageResponse(message="Sesión cerrada correctamente.")


# ── CONTRASEÑA ────────────────────────────────────────────────────────────────

@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(data: ForgotPasswordRequest):
    """
    Envía código de reset por email.
    Responde igual si el email existe o no (seguridad).
    """
    user = user_service.get_user_by_email(str(data.email))  # type: ignore[arg-type]
    if user is not None:
        code = email_service.create_code(user["email"], "reset_password")  # type: ignore[arg-type]
        email_service.send_reset_password_email(user["email"], code)

    return MessageResponse(
        message="Si el email está registrado recibirás un código para restablecer tu contraseña."
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(data: ResetPasswordRequest):
    """Cambia la contraseña usando el código recibido por email."""
    user = user_service.get_user_by_id(data.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    is_valid = email_service.verify_code(user["email"], data.code, "reset_password")  # type: ignore[arg-type]
    if not is_valid:
        raise HTTPException(status_code=400, detail="Código inválido o expirado.")

    user_service.update_password(data.user_id, data.new_password)

    return MessageResponse(message="Contraseña restablecida correctamente.")


@router.patch("/change-password", response_model=MessageResponse)
def change_password(
    data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    """Cambia la contraseña del usuario autenticado."""
    if not verify_password(data.current_password, current_user["password"]):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta.")

    user_service.update_password(UUID(current_user["id"]), data.new_password)

    return MessageResponse(message="Contraseña actualizada correctamente.")


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(data: ForgotPasswordRequest):
    """Reenvía el código de verificación de email."""
    user = user_service.get_user_by_email(str(data.email))  # type: ignore[arg-type]
    if user is not None and not user.get("is_verified"):
        code = email_service.create_code(user["email"], "register")  # type: ignore[arg-type]
        email_service.send_verification_email(user["email"], code)

    return MessageResponse(
        message="Si el email está registrado y sin verificar, recibirás un nuevo código."
    )