"""
Process-local TTL cache.

Requires a single uvicorn worker (`--workers 1`). Each process has its own
dict — multi-worker or horizontal scale makes /admin/cache/clear incomplete
and TTLs diverge. Replace with a shared store (or drop server cache) if you scale.
"""

from __future__ import annotations

import threading
import time
from typing import Any, Optional

PLAYERS_TTL_SECONDS = 30 * 60
MATCHES_TTL_SECONDS = 10 * 60

_lock = threading.Lock()
_store: dict[str, tuple[float, Any]] = {}


def get(key: str) -> Optional[Any]:
    now = time.monotonic()
    with _lock:
        entry = _store.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if expires_at <= now:
            del _store[key]
            return None
        return value


def set(key: str, value: Any, ttl_seconds: float) -> None:
    with _lock:
        _store[key] = (time.monotonic() + ttl_seconds, value)


def clear() -> int:
    with _lock:
        n = len(_store)
        _store.clear()
        return n


def players_cache_key() -> str:
    return "players"


def matches_cache_key(player_name: str, surface: Optional[str]) -> str:
    surface_part = surface if surface else "*"
    return f"matches:{player_name}|{surface_part}"
