"""
app/api/course_files.py
------------------------
Endpoints para archivos de curso (PDFs, DOCs, PPTs, etc.)

    GET    /course-files/courses/{course_id}/files  → listar archivos del curso
    POST   /course-files/courses/{course_id}/files  → subir archivo
    DELETE /course-files/{file_id}                  → eliminar archivo
"""

from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.dependencies import require_admin
from app.schemas.course_file import CourseFileDeleteResponse, CourseFileResponse
from app.services import course as course_service
from app.services import course_file as course_file_service

router = APIRouter(prefix="/course-files", tags=["Archivos de Curso"])

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "application/x-zip-compressed",
    "text/plain",
    "image/jpeg",
    "image/png",
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


@router.get("/courses/{course_id}/files", response_model=list[CourseFileResponse])
def list_course_files(
    course_id: UUID,
    current_user: dict = Depends(require_admin),
):
    """Lista todos los archivos del curso. Requiere admin."""
    return course_file_service.get_files_by_course(course_id)


@router.post(
    "/courses/{course_id}/files",
    response_model=CourseFileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_course_file(
    course_id: UUID,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin),
):
    """Sube un archivo al curso. Requiere admin."""
    course = course_service.get_course_by_id(course_id, include_unpublished=True)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Curso no encontrado.")

    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo supera el límite de 50 MB.",
        )

    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de archivo no permitido: {content_type}",
        )

    return course_file_service.upload_course_file(
        course_id=course_id,
        file_content=content,
        filename=file.filename or "archivo",
        content_type=content_type,
    )


@router.delete("/{file_id}", response_model=CourseFileDeleteResponse)
def delete_course_file(
    file_id: UUID,
    current_user: dict = Depends(require_admin),
):
    """Elimina un archivo del curso y del storage. Requiere admin."""
    course_file_service.delete_course_file(file_id)
    return CourseFileDeleteResponse(message="Archivo eliminado correctamente.")
