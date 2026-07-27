"""
Shared thread pool + global concurrency limit for sync Supabase calls.

Caps total in-flight .execute() calls across all requests (not per-request),
so concurrent bulk "select all" users cannot overwhelm the Supabase pool.
"""

from __future__ import annotations

import atexit
import os
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, TypeVar

T = TypeVar("T")

_MAX_WORKERS = int(os.getenv("SUPABASE_EXECUTOR_WORKERS", "8"))
_MAX_INFLIGHT = int(os.getenv("SUPABASE_MAX_INFLIGHT", "8"))

SHARED_EXECUTOR = ThreadPoolExecutor(max_workers=_MAX_WORKERS, thread_name_prefix="supabase")
SUPABASE_SEM = threading.BoundedSemaphore(_MAX_INFLIGHT)


def execute_with_limit(fn: Callable[[], T]) -> T:
    """Run a sync Supabase call under the global in-flight semaphore."""
    SUPABASE_SEM.acquire()
    try:
        return fn()
    finally:
        SUPABASE_SEM.release()


def shutdown_pool() -> None:
    SHARED_EXECUTOR.shutdown(wait=False, cancel_futures=True)


atexit.register(shutdown_pool)
