"""
app/core/security.py
--------------------
Funciones de seguridad de AulaCAL.

Responsabilidades:
    1. Hasheo y verificación de passwords con bcrypt.
    2. Generación y validación de JWT (Access Token y Refresh Token).
    3. Generación de códigos numéricos de 6 dígitos para 2FA y verificación de email.

Flujo de autenticación:
    Registro   → hash_password() guarda el hash en la DB.
    Login      → verify_password() compara password con hash.
    Login ok   → create_access_token() + create_refresh_token() se devuelven al cliente.
    Request    → decode_access_token() valida el JWT en cada endpoint protegido.
    Cada 30d   → generate_numeric_code() envía código por email para 2FA.
"""

import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings


# ──────────────────────────────────────────────────────────────────────────────
# Contexto de bcrypt
# ──────────────────────────────────────────────────────────────────────────────

# CryptContext configura el algoritmo de hasheo.
# bcrypt es el estándar actual para passwords: lento por diseño,
# lo que hace que los ataques de fuerza bruta sean costosos.
# deprecated="auto" migra automáticamente hashes viejos si cambiamos algoritmo.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ──────────────────────────────────────────────────────────────────────────────
# Hasheo de passwords
# ──────────────────────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """
    Genera el hash bcrypt de una contraseña en texto plano.

    Nunca guardar la contraseña original en la DB.
    Siempre usar esta función antes de insertar un usuario.

    Args:
        password: Contraseña en texto plano ingresada por el usuario.

    Returns:
        Hash bcrypt de la contraseña, listo para guardar en la DB.

    Ejemplo:
        hashed = hash_password("MiPass123")
        # "$2b$12$..."
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica si una contraseña en texto plano coincide con su hash bcrypt.

    Usar en el proceso de login para comparar lo que ingresó
    el usuario contra lo que está guardado en la DB.

    Args:
        plain_password:  Contraseña ingresada por el usuario en el login.
        hashed_password: Hash almacenado en la columna 'password' de la DB.

    Returns:
        True si la contraseña es correcta, False si no coincide.

    Ejemplo:
        is_valid = verify_password("MiPass123", hash_guardado_en_db)
    """
    return pwd_context.verify(plain_password, hashed_password)


# ──────────────────────────────────────────────────────────────────────────────
# JWT — Access Token
# ──────────────────────────────────────────────────────────────────────────────

def create_access_token(user_id: UUID, role: int) -> str:
    """
    Genera un JWT Access Token para un usuario autenticado.

    El Access Token tiene vida corta (15 min por defecto) y se envía
    en el header Authorization de cada request protegido:
        Authorization: Bearer <token>

    Payload del token:
        sub  → UUID del usuario (como string)
        role → rol del usuario (1=admin, 2=client)
        type → "access" para distinguirlo del refresh token
        exp  → timestamp de expiración

    Args:
        user_id: UUID del usuario autenticado.
        role:    Rol del usuario (1=admin, 2=client).

    Returns:
        JWT firmado como string.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {  #type: ignore
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "exp": expire,
    }
    return jwt.encode(
        payload, #type: ignore
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(user_id: UUID) -> str:
    """
    Genera un JWT Refresh Token para renovar el Access Token.

    El Refresh Token tiene vida larga (7 días por defecto) y se envía
    en una httpOnly cookie — nunca en el body ni en headers normales.
    Se usa SOLO para obtener un nuevo Access Token cuando el anterior expiró.

    Payload del token:
        sub  → UUID del usuario
        type → "refresh" para distinguirlo del access token
        exp  → timestamp de expiración

    Args:
        user_id: UUID del usuario autenticado.

    Returns:
        JWT firmado como string.
    """
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = { #type: ignore
        "sub": str(user_id),
        "type": "refresh",
        "exp": expire,
    }
    return jwt.encode(
        payload, #type: ignore
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> Optional[dict]: # type: ignore
    """
    Decodifica y valida un JWT Access Token.

    Verifica:
        - Firma válida (con JWT_SECRET_KEY).
        - Token no expirado.
        - Tipo de token es "access" (no un refresh token reutilizado).

    Args:
        token: JWT recibido en el header Authorization.

    Returns:
        Diccionario con el payload del token si es válido.
        None si el token es inválido, expirado o mal formado.

    Ejemplo de payload retornado:
        {"sub": "uuid-del-usuario", "role": 2, "type": "access", "exp": ...}
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        # Verificar que sea un access token y no un refresh token
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


def decode_refresh_token(token: str) -> Optional[str]:
    """
    Decodifica y valida un JWT Refresh Token.

    Verifica firma, expiración y que sea de tipo "refresh".

    Args:
        token: JWT del refresh token almacenado en la httpOnly cookie.

    Returns:
        UUID del usuario como string si el token es válido.
        None si el token es inválido o expirado.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "refresh":
            return None
        return payload.get("sub")
    except JWTError:
        return None


# ──────────────────────────────────────────────────────────────────────────────
# Códigos numéricos — 2FA y verificación de email
# ──────────────────────────────────────────────────────────────────────────────

def generate_numeric_code(length: int = 6) -> str:
    """
    Genera un código numérico aleatorio para verificación de email y 2FA.

    Se usa en:
        - Verificación de email al registrarse.
        - Doble factor de autenticación (cada 30 días).
        - Reset de contraseña.

    El código siempre empieza con un dígito no cero para
    evitar que códigos como "012345" pierdan el cero al mostrarse.

    Args:
        length: Longitud del código. Default: 6 dígitos.

    Returns:
        String numérico de 'length' dígitos.

    Ejemplo:
        code = generate_numeric_code()
        # "847291"
    """
    # Primer dígito: 1-9 para evitar ceros iniciales
    first_digit = random.choice(string.digits[1:])
    # Resto de los dígitos: 0-9
    rest = "".join(random.choices(string.digits, k=length - 1))
    return first_digit + rest