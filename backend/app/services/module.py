"""
app/services/module.py
----------------------
Lógica de negocio para módulos de cursos.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from app.db.supabase import get_supabase_admin_client
from app.schemas.module import ModuleCreateRequest, ModuleUpdateRequest


def _client():
    return get_supabase_admin_client()


def get_modules_by_course(course_id: UUID, include_unpublished_videos: bool = True) -> list[dict]:
    result = _client().table("modules").select("*").eq("course_id", str(course_id)).order("order").execute()
    modules = result.data or []

    if not modules:
        return modules

    # Cargar videos de este curso y agruparlos por module_id
    videos_query = (
        _client()
        .table("videos")
        .select("id, title, order, duration_seconds, is_published, module_id")
        .eq("course_id", str(course_id))
        .order("order")
    )
    if not include_unpublished_videos:
        videos_query = videos_query.eq("is_published", True)

    videos_result = videos_query.execute()
    videos = videos_result.data or []

    videos_by_module: dict[str, list[dict]] = {}
    for v in videos:
        mid = v.get("module_id")
        if mid:
            videos_by_module.setdefault(str(mid), []).append(v)

    for m in modules:
        m["videos"] = videos_by_module.get(str(m["id"]), [])

    return modules


def get_module_by_id(module_id: UUID) -> Optional[dict]:
    result = _client().table("modules").select("*").eq("id", str(module_id)).execute()
    if not result.data:
        return None
    module = result.data[0]
    # Cargar videos del módulo
    videos_result = (
        _client()
        .table("videos")
        .select("id, title, order, duration_seconds, is_published, module_id")
        .eq("module_id", str(module_id))
        .order("order")
        .execute()
    )
    module["videos"] = videos_result.data or []
    return module


def create_module(course_id: UUID, data: ModuleCreateRequest) -> dict:
    # Siguiente orden disponible
    order_result = (
        _client()
        .table("modules")
        .select("order")
        .eq("course_id", str(course_id))
        .order("order", desc=True)
        .limit(1)
        .execute()
    )
    next_order = (order_result.data[0]["order"] + 1) if order_result.data else 0

    result = _client().table("modules").insert({
        "course_id": str(course_id),
        "title": data.title,
        "description": data.description,
        "order": next_order,
    }).execute()

    module = result.data[0]
    module["videos"] = []
    return module


def update_module(module_id: UUID, data: ModuleUpdateRequest) -> dict:
    updates: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}

    if data.title is not None:
        updates["title"] = data.title
    if data.description is not None:
        updates["description"] = data.description
    if data.order is not None:
        updates["order"] = data.order

    result = _client().table("modules").update(updates).eq("id", str(module_id)).execute()
    module = result.data[0]

    videos_result = (
        _client()
        .table("videos")
        .select("id, title, order, duration_seconds, is_published, module_id")
        .eq("module_id", str(module_id))
        .order("order")
        .execute()
    )
    module["videos"] = videos_result.data or []
    return module


def delete_module(module_id: UUID) -> None:
    # Los videos con este module_id quedan con module_id = NULL (ON DELETE SET NULL)
    _client().table("modules").delete().eq("id", str(module_id)).execute()
