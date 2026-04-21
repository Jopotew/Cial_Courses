"""
app/services/category_service.py
---------------------------------
Lógica de negocio del módulo de categorías.
Usa el cliente de Supabase directamente.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
import unicodedata

from app.db.supabase import get_supabase_admin_client
from app.schemas.category import CategoryCreateRequest, CategoryUpdateRequest


def _client():
    """Retorna el cliente admin de Supabase."""
    return get_supabase_admin_client()


def _remove_accents(text: str) -> str:
    """
    Remueve tildes y acentos de un texto.
    
    Convierte "Fonoaudiología" en "Fonoaudiologia".
    """
    return ''.join(
        c for c in unicodedata.normalize('NFD', text)
        if unicodedata.category(c) != 'Mn'
    )


# ──────────────────────────────────────────────────────────────────────────────
# Búsquedas
# ──────────────────────────────────────────────────────────────────────────────

def get_category_by_id(category_id: UUID) -> Optional[dict]:
    """
    Busca una categoría por su UUID.

    Returns:
        Diccionario con los datos de la categoría, o None si no existe.
    """
    result = _client().table("categories").select("*").eq("id", str(category_id)).execute()
    return result.data[0] if result.data else None


def get_category_by_name(name: str) -> Optional[dict]:
    """
    Busca una categoría por su nombre (case-insensitive, sin tildes).

    Returns:
        Diccionario con los datos de la categoría, o None si no existe.
    """
    # Traer todas y buscar en memoria para manejar tildes
    all_categories = get_all_categories()
    name_normalized = _remove_accents(name.lower())
    
    for category in all_categories:
        category_name_normalized = _remove_accents(category["name"].lower())
        if category_name_normalized == name_normalized:
            return category
    
    return None


def get_all_categories() -> list[dict]:
    """
    Retorna todas las categorías ordenadas por nombre.

    Returns:
        Lista de diccionarios con todas las categorías.
    """
    result = _client().table("categories").select("*").order("name").execute()
    return result.data


def search_categories(search: str) -> list[dict]:
    """
    Busca categorías por nombre o descripción (sin tildes).

    Args:
        search: Término de búsqueda.

    Returns:
        Lista de categorías que coinciden con la búsqueda.
    """
    all_categories = get_all_categories()
    search_normalized = _remove_accents(search.lower())
    
    filtered = []
    for category in all_categories:
        name_normalized = _remove_accents(category.get("name", "").lower())
        desc_normalized = _remove_accents(category.get("description", "").lower())
        
        if search_normalized in name_normalized or search_normalized in desc_normalized:
            filtered.append(category)
    
    return filtered


# ──────────────────────────────────────────────────────────────────────────────
# Creación
# ──────────────────────────────────────────────────────────────────────────────

def create_category(data: CategoryCreateRequest) -> dict:
    """
    Crea una nueva categoría.

    Args:
        data: Datos validados del request.

    Returns:
        Diccionario con los datos de la categoría creada.
    """
    result = _client().table("categories").insert({
        "name": data.name,
        "description": data.description,
    }).execute()

    return result.data[0]


# ──────────────────────────────────────────────────────────────────────────────
# Actualización
# ──────────────────────────────────────────────────────────────────────────────

def update_category(category_id: UUID, data: CategoryUpdateRequest) -> dict:
    """
    Actualiza una categoría existente.

    Solo modifica los campos que vienen en el request.

    Args:
        category_id: UUID de la categoría a actualizar.
        data: Datos validados del request.

    Returns:
        Diccionario con los datos de la categoría actualizada.
    """
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}

    if data.name is not None:
        updates["name"] = data.name
    if data.description is not None:
        updates["description"] = data.description

    result = _client().table("categories").update(updates).eq("id", str(category_id)).execute()
    return result.data[0]


# ──────────────────────────────────────────────────────────────────────────────
# Eliminación
# ──────────────────────────────────────────────────────────────────────────────

def delete_category(category_id: UUID) -> None:
    """
    Elimina una categoría de la base de datos.

    Nota: Esto fallará si hay cursos asociados a esta categoría
    debido a la foreign key constraint. En ese caso, Supabase
    retornará un error que debemos manejar en el endpoint.

    Args:
        category_id: UUID de la categoría a eliminar.
    """
    _client().table("categories").delete().eq("id", str(category_id)).execute()