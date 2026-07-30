"""
FastAPI backend for TennisSimulation.

Start with a single worker so process-local cache stays coherent:
  uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1
"""

from __future__ import annotations

import os
import re
from concurrent.futures import as_completed
from typing import Optional

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import cache as app_cache
from db import supabase
from supabase_pool import SHARED_EXECUTOR, execute_with_limit

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

POINT_SELECT = (
    "match_id, point_number, server, winner, score, set1, set2, game1, game2, "
    "first_serve_direction, first_serve_outcome, "
    "second_serve_direction, second_serve_outcome, point_end, had_fault"
)

MATCH_SELECT = "match_id, player1, player2, tournament, round, surface"
PAGE_SIZE = 1000
MATCH_ID_BATCH = 80


def _normalize_surface(surface: str) -> str:
    s = surface.strip().lower()
    if not s:
        return ""
    return s[0].upper() + s[1:] if len(s) > 1 else s.upper()


def _normalize_player_name(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip())


def _paginate_select(build_query, page_size: int = PAGE_SIZE) -> list:
    """Run a supabase query builder factory with .range() until exhausted."""
    all_rows: list = []
    page = 0
    while True:
        start = page * page_size
        end = start + page_size - 1

        def _run(s=start, e=end):
            return build_query().range(s, e).execute()

        result = execute_with_limit(_run)
        rows = result.data or []
        all_rows.extend(rows)
        if len(rows) < page_size:
            break
        page += 1
    return all_rows


@app.get("/")
def root():
    return {"status": "ok"}


def _players_from_matches_scan() -> list:
    """Scan matches for unique player names (fallback when players table is empty/missing)."""
    players_set = set()
    page = 0
    while True:
        start = page * PAGE_SIZE
        end = start + PAGE_SIZE - 1

        def _run(s=start, e=end):
            return (
                supabase.table("matches")
                .select("player1, player2")
                .range(s, e)
                .execute()
            )

        result = execute_with_limit(_run)
        for match in result.data or []:
            if match.get("player1"):
                players_set.add(_normalize_player_name(match["player1"]))
            if match.get("player2"):
                players_set.add(_normalize_player_name(match["player2"]))
        if len(result.data or []) < PAGE_SIZE:
            break
        page += 1
    return sorted(players_set)


@app.get("/getAllPlayers")
def get_players():
    cached = app_cache.get(app_cache.players_cache_key())
    if cached is not None and len(cached) > 0:
        return {"players": cached}

    players: list = []
    try:
        def build():
            return supabase.table("players").select("name").order("name")

        rows = _paginate_select(build)
        players = [r["name"] for r in rows if r.get("name")]
    except Exception:
        players = []

    # Empty players table (not yet backfilled) must fall back — do not cache [].
    if not players:
        players = _players_from_matches_scan()

    if players:
        app_cache.set(app_cache.players_cache_key(), players, app_cache.PLAYERS_TTL_SECONDS)
    return {"players": players}


@app.get("/getPlayerMatches/{player_name}")
def get_player_matches(
    player_name: str,
    surface: Optional[str] = Query(None),
):
    """Matches for a player via two indexed .eq() queries (no .or_())."""
    player_name = _normalize_player_name(player_name)
    surface_norm = _normalize_surface(surface) if surface else None
    cache_key = app_cache.matches_cache_key(player_name, surface_norm)
    cached = app_cache.get(cache_key)
    if cached is not None:
        return {"matches": cached}

    def build_for_column(column: str):
        def build():
            q = supabase.table("matches").select(MATCH_SELECT).eq(column, player_name)
            if surface_norm:
                q = q.eq("surface", surface_norm)
            return q

        return build

    rows_p1 = _paginate_select(build_for_column("player1"))
    rows_p2 = _paginate_select(build_for_column("player2"))

    by_id = {}
    for row in rows_p1 + rows_p2:
        mid = row.get("match_id")
        if mid is not None:
            by_id[mid] = row

    matches = list(by_id.values())
    app_cache.set(cache_key, matches, app_cache.MATCHES_TTL_SECONDS)
    return {"matches": matches}


def _fetch_points_for_batch(match_ids: list, server_slot: int) -> list:
    if not match_ids:
        return []

    all_points: list = []
    page = 0
    while True:
        start = page * PAGE_SIZE
        end = start + PAGE_SIZE - 1
        ids = list(match_ids)

        def _run(s=start, e=end, batch=ids, slot=server_slot):
            return (
                supabase.table("points")
                .select(POINT_SELECT)
                .in_("match_id", batch)
                .eq("server", slot)
                .range(s, e)
                .execute()
            )

        result = execute_with_limit(_run)
        rows = result.data or []
        all_points.extend(rows)
        if len(rows) < PAGE_SIZE:
            break
        page += 1
    return all_points


def _fetch_points_for_slots(slot1_ids: list, slot2_ids: list) -> list:
    """Fetch both server slots' batches in one non-nested executor wave."""
    jobs = []
    for i in range(0, len(slot1_ids), MATCH_ID_BATCH):
        jobs.append((slot1_ids[i : i + MATCH_ID_BATCH], 1))
    for i in range(0, len(slot2_ids), MATCH_ID_BATCH):
        jobs.append((slot2_ids[i : i + MATCH_ID_BATCH], 2))

    if not jobs:
        return []
    if len(jobs) == 1:
        batch, slot = jobs[0]
        return _fetch_points_for_batch(batch, slot)

    futures = [
        SHARED_EXECUTOR.submit(_fetch_points_for_batch, batch, slot)
        for batch, slot in jobs
    ]
    all_points: list = []
    for fut in as_completed(futures):
        all_points.extend(fut.result())
    return all_points


def _fetch_matches_by_ids(match_ids: list) -> list:
    if not match_ids:
        return []

    all_rows: list = []
    for i in range(0, len(match_ids), MATCH_ID_BATCH):
        batch = match_ids[i : i + MATCH_ID_BATCH]

        def build(b=batch):
            return supabase.table("matches").select(MATCH_SELECT).in_("match_id", b)

        all_rows.extend(_paginate_select(build))
    return all_rows


@app.get("/getPlayerServes/{match_id}/{player_name}")
def get_match_points(match_id: str, player_name: str):
    player_name = _normalize_player_name(player_name)

    def _lookup():
        return (
            supabase.table("matches")
            .select("player1")
            .eq("match_id", match_id)
            .execute()
        )

    player_result = execute_with_limit(_lookup)
    if not player_result.data:
        return {"points": []}

    our_player = 1 if player_name == player_result.data[0].get("player1") else 2

    def build():
        return (
            supabase.table("points")
            .select(
                "point_number, server, winner, score, set1, set2, game1, game2, "
                "first_serve_direction, first_serve_outcome,"
                "second_serve_direction, second_serve_outcome, point_end, had_fault"
            )
            .eq("match_id", match_id)
            .eq("server", our_player)
        )

    return {"points": _paginate_select(build)}


@app.get("/getPlayerServesBulk/{player_name}")
def get_player_serves_bulk(
    player_name: str,
    match_ids: Optional[str] = Query(
        None,
        description="Comma-separated match_ids. Omit to fetch ALL matches for this player.",
    ),
    surface: Optional[str] = Query(None),
):
    """
    Serve points for a player across multiple matches.
    Each point is tagged with match_id and surface.
    """
    player_name = _normalize_player_name(player_name)
    surface_norm = _normalize_surface(surface) if surface else None

    if match_ids:
        id_list = [mid.strip() for mid in match_ids.split(",") if mid.strip()]
        matches = _fetch_matches_by_ids(id_list)
        if surface_norm:
            matches = [m for m in matches if m.get("surface") == surface_norm]
        # Only keep matches that actually involve this player
        matches = [
            m
            for m in matches
            if m.get("player1") == player_name or m.get("player2") == player_name
        ]
    else:
        matches = get_player_matches(player_name, surface=surface).get("matches") or []

    slot1_ids = []
    slot2_ids = []
    surface_by_match = {}
    for m in matches:
        mid = m.get("match_id")
        if mid is None:
            continue
        surface_by_match[mid] = m.get("surface")
        if m.get("player1") == player_name:
            slot1_ids.append(mid)
        else:
            slot2_ids.append(mid)

    # Parallelize all match-id batches for both slots in one executor wave
    # (no nested pool submits — avoids ThreadPoolExecutor deadlock).
    points = _fetch_points_for_slots(slot1_ids, slot2_ids)

    for point in points:
        point["surface"] = surface_by_match.get(point.get("match_id"))

    return {"points": points, "match_count": len(matches)}


_CACHE_ADMIN_SECRET = os.getenv("CACHE_ADMIN_SECRET", "").strip()

if _CACHE_ADMIN_SECRET:

    @app.post("/admin/cache/clear")
    def clear_cache(x_cache_admin_secret: Optional[str] = Header(None)):
        if x_cache_admin_secret != _CACHE_ADMIN_SECRET:
            raise HTTPException(status_code=401, detail="Unauthorized")
        cleared = app_cache.clear()
        return {"cleared": cleared}
