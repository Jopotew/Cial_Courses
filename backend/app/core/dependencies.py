"""
app/core/dependencies.py
------------------------
Dependencias reutilizables de FastAPI.

Uso en endpoints:
    @router.get("/perfil")
    async def perfil(current_user: dict = Depends(get_current_user)):
        ...

    @router.get("/admin/users")
    async def listar_users(current_user: dict = Depends(require_admin)):
        ...
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token
from app.services import user as user_service
from uuid import UUID
from fastapi import Depends, HTTPException, status
from app.services import enrollment as enrollment_service


bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Valida el JWT y retorna el usuario autenticado como diccionario.

    Proceso:
        1. Extrae el token del header Authorization: Bearer <token>.
        2. Decodifica y valida el JWT.
        3. Busca el usuario en Supabase por el UUID del payload.
        4. Verifica que esté activo y verificado.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise credentials_exception

    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception

    user = user_service.get_user_by_id(user_id_str)
    if user is None:
        raise credentials_exception

    if not user.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cuenta desactivada.",
        )

    if not user.get("is_verified"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debés verificar tu email antes de continuar.",
        )

    return user


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Verifica que el usuario autenticado sea administrador (role=1).
    """
    if current_user.get("role") != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tenés permisos para realizar esta acción.",
        )
    return current_user

def require_enrollment(course_id: UUID):
    """
    Dependency para verificar que el usuario esté matriculado en un curso.
    
    Usage en endpoints:
        @router.get("/courses/{course_id}/videos")
        def get_videos(
            course_id: UUID,
            current_user: dict = Depends(get_current_user),
            _: None = Depends(require_enrollment(course_id))
        ):
            ...
    """
    def check_enrollment(current_user: dict = Depends(get_current_user)):
        user_id = UUID(current_user["id"])
        
        # Los admins tienen acceso a todo
        if current_user.get("role") == 1:
            return None
        
        # Verificar matrícula
        if not enrollment_service.is_user_enrolled(user_id, course_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No estás matriculado en este curso. Debes comprarlo primero.",
            )
        
        return None
    
    return check_enrollment