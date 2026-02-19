from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from .config import settings


@lru_cache
def _build_client() -> Client:
    if not settings.supabase_url or not settings.supabase_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be configured.")
    return create_client(settings.supabase_url, settings.supabase_key)


def get_db() -> Client:
    return _build_client()
