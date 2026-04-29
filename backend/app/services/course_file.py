"""
app/services/course_file.py
----------------------------
Lógica de negocio para archivos de curso (PDFs, DOCs, PPTs, etc.)
Los archivos se guardan en el bucket "course-files" de Supabase Storage.
"""

from uuid import UUID, uuid4

from app.db.supabase import get_supabase_admin_client

BUCKET = "course-files"

_EXT_MAP = {
    "pdf": "pdf",
    "doc": "doc", "docx": "doc",
    "ppt": "ppt", "pptx": "ppt",
    "xls": "xls", "xlsx": "xls",
    "mp4": "video", "mov": "video", "avi": "video",
    "zip": "zip", "rar": "zip",
}


def _client():
    return get_supabase_admin_client()


def _ext_to_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return _EXT_MAP.get(ext, "file")


def get_files_by_course(course_id: UUID) -> list[dict]:
    result = (
        _client()
        .table("course_files")
        .select("*")
        .eq("course_id", str(course_id))
        .order("order")
        .execute()
    )
    return result.data or []


def upload_course_file(
    course_id: UUID,
    file_content: bytes,
    filename: str,
    content_type: str,
) -> dict:
    file_id = uuid4()
    storage_path = f"{course_id}/{file_id}_{filename}"

    _client().storage.from_(BUCKET).upload(
        storage_path,
        file_content,
        {"content-type": content_type, "upsert": "false"},
    )

    file_url = _client().storage.from_(BUCKET).get_public_url(storage_path)

    order_result = (
        _client()
        .table("course_files")
        .select("order")
        .eq("course_id", str(course_id))
        .order("order", desc=True)
        .limit(1)
        .execute()
    )
    next_order = (order_result.data[0]["order"] + 1) if order_result.data else 0

    result = _client().table("course_files").insert({
        "id": str(file_id),
        "course_id": str(course_id),
        "name": filename,
        "file_url": file_url,
        "storage_path": storage_path,
        "file_type": _ext_to_type(filename),
        "file_size_bytes": len(file_content),
        "order": next_order,
    }).execute()

    return result.data[0]


def delete_course_file(file_id: UUID) -> None:
    result = _client().table("course_files").select("storage_path").eq("id", str(file_id)).execute()
    if result.data:
        storage_path = result.data[0].get("storage_path")
        if storage_path:
            try:
                _client().storage.from_(BUCKET).remove([storage_path])
            except Exception:
                pass

    _client().table("course_files").delete().eq("id", str(file_id)).execute()
