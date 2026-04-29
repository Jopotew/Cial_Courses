"""
app/api/videos.py
-----------------
Endpoints del módulo de videos.

AHORA CON VALIDACIÓN DE MATRÍCULA:
- Solo usuarios matriculados pueden ver videos del curso
- Admins tienen acceso a todo

Rutas públicas (requieren matrícula):
    GET /courses/{course_id}/videos     → listar videos del curso
    GET /videos/{id}                    → detalle del video
    GET /videos/{id}/stream             → obtener URL firmada

Rutas de admin:
    POST   /courses/{course_id}/videos  → subir video
    PATCH  /videos/{id}                 → editar metadata y/o reemplazar archivos
    PATCH  /videos/{id}/publish         → publicar/despublicar
    DELETE /videos/{id}                 → eliminar
"""

from uuid import UUID

from fastapi import (
    APIRouter,
    Body,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)

from app.core.dependencies import get_current_user, require_admin
from app.schemas.video import (
    VideoDeleteResponse,
    VideoPublishRequest,
    VideoResponse,
    VideoStreamResponse,
    VideoUpdateRequest,
)
from app.services import enrollment as enrollment_service
from app.services import course as course_service
from app.services import video as video_service

from app.services.video_utils import validate_video_file

router = APIRouter(prefix="/videos", tags=["Videos"])


# ──────────────────────────────────────────────────────────────────────────────
# Helper para validar matrícula
# ──────────────────────────────────────────────────────────────────────────────

def _check_enrollment(user_id: UUID, course_id: UUID, user_role: int):
    """
    Valida que el usuario esté matriculado en el curso.
    Los admins (role=1) tienen acceso automático.
    """
    # Admins tienen acceso a todo
    if user_role == 1:
        return
    
    # Verificar matrícula
    if not enrollment_service.is_user_enrolled(user_id, course_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No estás matriculado en este curso. Debes comprarlo primero para acceder a los videos.",
        )


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints públicos (requieren autenticación + matrícula)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/courses/{course_id}/videos", response_model=list[VideoResponse])
def list_course_videos(
    course_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """
    Lista los videos de un curso.
    
    ✅ Requiere: JWT válido + matrícula activa en el curso (o ser admin).
    """
    user_id = UUID(current_user["id"])
    
    # Verificar que el curso existe y está publicado
    course = course_service.get_course_by_id(course_id, include_unpublished=False)
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado o no está publicado.",
        )
    
    # ✅ VALIDAR MATRÍCULA
    _check_enrollment(user_id, course_id, current_user.get("role", 0))
    
    videos = video_service.get_videos_by_course(course_id, include_unpublished=False)
    return [VideoResponse.model_validate(v) for v in videos]


@router.get("/{video_id}", response_model=VideoResponse)
def get_video(
    video_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """
    Obtiene el detalle de un video.
    
    ✅ Requiere: JWT válido + matrícula activa en el curso del video (o ser admin).
    """
    user_id = UUID(current_user["id"])
    
    video = video_service.get_video_by_id(video_id, include_unpublished=False)
    if video is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video no encontrado o no está publicado.",
        )
    
    # ✅ VALIDAR MATRÍCULA en el curso del video
    course_id = UUID(video["course_id"])
    _check_enrollment(user_id, course_id, current_user.get("role", 0))
    
    return VideoResponse.model_validate(video)


@router.get("/{video_id}/stream", response_model=VideoStreamResponse)
def get_video_stream(
    video_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    """
    Genera URL firmada para reproducir el video.
    
    La URL expira en 1 hora por seguridad.
    ✅ Requiere: JWT válido + matrícula activa (o ser admin).
    """
    user_id = UUID(current_user["id"])
    
    video = video_service.get_video_by_id(video_id, include_unpublished=False)
    if video is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video no encontrado o no está publicado.",
        )
    
    # ✅ VALIDAR MATRÍCULA
    course_id = UUID(video["course_id"])
    _check_enrollment(user_id, course_id, current_user.get("role", 0))
    
    expires_in = 3600  # 1 hora
    video_url = video_service.get_video_stream_url(video_id, expires_in=expires_in)
    
    return VideoStreamResponse(
        video_url=video_url,
        expires_in=expires_in,
        duration_seconds=video.get("duration_seconds"),
    )


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints de admin
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/courses/{course_id}/videos", response_model=VideoResponse, status_code=status.HTTP_201_CREATED)
async def upload_video(
    course_id: UUID,
    title: str = Form(...),
    order: int | None = Form(default=None),
    description: str | None = Form(default=None),
    module_id: str | None = Form(default=None),
    video_file: UploadFile = File(...),
    thumbnail_file: UploadFile | None = File(default=None),
    current_user: dict = Depends(require_admin),
):
    """
    Sube un nuevo video al curso.
    
    Requiere: JWT válido + role=1 (admin).
    
    Form data:
        - title: Título del video
        - order: Orden dentro del curso (opcional, se asigna automáticamente si no se especifica)
        - description: Descripción (opcional)
        - video_file: Archivo de video (.mp4, .avi, .mov, etc.)
        - thumbnail_file: Miniatura del video (.jpg, .png, .webp)
    """
    # Verificar que el curso existe
    course = course_service.get_course_by_id(course_id, include_unpublished=True)
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado.",
        )
    
    # Validar que el archivo es un video real usando FFprobe
    if not validate_video_file(video_file.file, video_file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no es un video válido.",
        )
    
    # Validar thumbnail (si se proporciona)
    if thumbnail_file is not None and not thumbnail_file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El thumbnail debe ser una imagen.",
        )

    # Crear el video
    from app.schemas.video import VideoCreateRequest
    from uuid import UUID as _UUID

    # Fix: Si order es 0 (vacío en Swagger), convertirlo a None
    order_value = order if order and order > 0 else None

    module_uuid = None
    if module_id:
        try:
            module_uuid = _UUID(module_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="module_id inválido.")

    video_data = VideoCreateRequest(
        title=title,
        description=description,
        order=order_value,
        module_id=module_uuid,
    )

    new_video = video_service.create_video(
        course_id=course_id,
        data=video_data,
        video_file=video_file.file,
        video_filename=video_file.filename,
        thumbnail_file=thumbnail_file.file if thumbnail_file else None,
        thumbnail_filename=thumbnail_file.filename if thumbnail_file else None,
    )
    
    return VideoResponse.model_validate(new_video)


@router.post("/courses/{course_id}/videos/metadata", response_model=VideoResponse, status_code=status.HTTP_201_CREATED)
def create_video_metadata(
    course_id: UUID,
    title: str = Body(..., description="Título de la clase"),
    module_id: str | None = Body(default=None, description="UUID del módulo"),
    current_user: dict = Depends(require_admin),
):
    """
    Crea un registro de video sin subir archivos (placeholder para el editor).
    El video queda en estado no publicado hasta que se suba un archivo.
    Requiere: JWT válido + role=1 (admin).
    """
    course = course_service.get_course_by_id(course_id, include_unpublished=True)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado.")

    from app.schemas.video import VideoCreateRequest
    from uuid import UUID as _UUID

    module_uuid = None
    if module_id:
        try:
            module_uuid = _UUID(module_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="module_id inválido.")

    # Obtener siguiente orden
    from app.db.supabase import get_supabase_admin_client
    order_result = get_supabase_admin_client().table("videos").select("order").eq("course_id", str(course_id)).order("order", desc=True).limit(1).execute()
    next_order = (order_result.data[0]["order"] + 1) if order_result.data else 1

    insert_data: dict = {
        "course_id": str(course_id),
        "title": title,
        "order": next_order,
        "storage_provider": "supabase",
        "storage_file_id": "pending",
        "is_published": False,
    }
    if module_uuid:
        insert_data["module_id"] = str(module_uuid)

    result = get_supabase_admin_client().table("videos").insert(insert_data).execute()
    return VideoResponse.model_validate(result.data[0])


@router.get("/courses/{course_id}/videos/admin", response_model=list[VideoResponse])
def list_course_videos_admin(
    course_id: UUID,
    current_user: dict = Depends(require_admin),
):
    """
    Lista todos los videos del curso, incluidos los no publicados.
    Requiere: JWT válido + role=1 (admin).
    """
    course = course_service.get_course_by_id(course_id, include_unpublished=True)
    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Curso no encontrado.",
        )
    
    videos = video_service.get_videos_by_course(course_id, include_unpublished=True)
    return [VideoResponse.model_validate(v) for v in videos]


@router.patch("/{video_id}", response_model=VideoResponse)
async def update_video(
    video_id: UUID,
    title: str | None = Form(default=None),
    description: str | None = Form(default=None),
    order: int | None = Form(default=None),
    module_id: str | None = Form(default=None),
    video_file: UploadFile | None = File(default=None),
    thumbnail_file: UploadFile | None = File(default=None),
    current_user: dict = Depends(require_admin),
):
    """
    Actualiza metadata y/o reemplaza archivos de un video.
    
    Requiere: JWT válido + role=1 (admin).
    
    Form data (todos opcionales):
        - title: Nuevo título
        - description: Nueva descripción
        - order: Nuevo orden
        - video_file: Nuevo archivo de video (reemplaza el actual)
        - thumbnail_file: Nuevo archivo de thumbnail (reemplaza el actual)
    """
    video = video_service.get_video_by_id(video_id, include_unpublished=True)
    if video is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video no encontrado.",
        )
    
    # Validar nuevo video si se proporciona
    if video_file:
        if not validate_video_file(video_file.file, video_file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo no es un video válido.",
            )
    
    # Validar nuevo thumbnail si se proporciona
    if thumbnail_file:
        if not thumbnail_file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El thumbnail debe ser una imagen.",
            )
    
    # Actualizar
    from app.schemas.video import VideoUpdateRequest
    from uuid import UUID as _UUID

    # Fix: Si order es 0 (vacío en Swagger), convertirlo a None
    order_value = order if order and order > 0 else None

    module_uuid = None
    if module_id:
        try:
            module_uuid = _UUID(module_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="module_id inválido.")

    data = VideoUpdateRequest(
        title=title if title else None,
        description=description if description else None,
        order=order_value,
        module_id=module_uuid,
    )
    
    updated = video_service.update_video(
        video_id=video_id,
        data=data,
        video_file=video_file.file if video_file else None,
        video_filename=video_file.filename if video_file else None,
        thumbnail_file=thumbnail_file.file if thumbnail_file else None,
        thumbnail_filename=thumbnail_file.filename if thumbnail_file else None,
    )
    
    return VideoResponse.model_validate(updated)


@router.patch("/{video_id}/publish", response_model=VideoResponse)
def publish_video(
    video_id: UUID,
    data: VideoPublishRequest,
    current_user: dict = Depends(require_admin),
):
    """
    Publica o despublica un video.
    Requiere: JWT válido + role=1 (admin).
    """
    video = video_service.get_video_by_id(video_id, include_unpublished=True)
    if video is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video no encontrado.",
        )
    
    updated = video_service.publish_video(video_id, data.is_published)
    return VideoResponse.model_validate(updated)


@router.delete("/{video_id}", response_model=VideoDeleteResponse)
def delete_video(
    video_id: UUID,
    current_user: dict = Depends(require_admin),
):
    """
    Elimina un video del curso y del storage.
    Requiere: JWT válido + role=1 (admin).
    """
    video = video_service.get_video_by_id(video_id, include_unpublished=True)
    if video is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video no encontrado.",
        )
    
    video_service.delete_video(video_id)
    return VideoDeleteResponse(
        message=f"Video '{video['title']}' eliminado correctamente."
    )