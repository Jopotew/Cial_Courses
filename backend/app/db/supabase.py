"""
app/db/supabase.py
------------------
Inicialización y acceso al cliente de Supabase.

Exporta DOS clientes con propósitos distintos:

    get_supabase_client()
        → Usa la ANON KEY.
        → Respeta las políticas de Row Level Security (RLS).
        → Usar para operaciones generales autenticadas.

    get_supabase_admin_client()
        → Usa la SERVICE ROLE KEY.
        → Bypasea RLS completamente. Acceso total a la DB.
        → Usar SOLO en el backend para operaciones administrativas:
          crear usuarios, confirmar pagos, webhooks, etc.
        → NUNCA exponer esta clave ni este cliente al frontend.

Ambos usan @lru_cache para ser singletons: se crean una sola vez
y se reutilizan durante toda la vida de la aplicación.

Uso:
    from app.db.supabase import get_supabase_client, get_supabase_admin_client

    client = get_supabase_client()
    data = client.table("users").select("*").execute()
"""

from functools import lru_cache

from supabase import Client, create_client

from app.core.config import settings


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Retorna el cliente estándar de Supabase (singleton).

    Usa la ANON KEY — respeta las políticas de Row Level Security (RLS)
    configuradas en el dashboard de Supabase.

    Al usar lru_cache con maxsize=1, la conexión se crea una sola vez
    al primer llamado y se reutiliza en todos los siguientes.
    """
    return create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_ANON_KEY,
    )


@lru_cache(maxsize=1)
def get_supabase_admin_client() -> Client:
    """
    Retorna el cliente administrador de Supabase (singleton).

    Usa la SERVICE ROLE KEY — tiene acceso total y bypasea RLS.

    Usar exclusivamente para:
        - Crear y actualizar usuarios desde el backend.
        - Confirmar pagos y actualizar matrículas desde webhooks.
        - Operaciones administrativas con privilegios elevados.

    CRÍTICO: nunca pasar este cliente a un endpoint accesible
    directamente por usuarios no administradores.
    """
    return create_client(
        supabase_url=settings.SUPABASE_URL,
        supabase_key=settings.SUPABASE_SERVICE_ROLE_KEY,
    )