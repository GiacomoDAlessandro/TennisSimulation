from typing import Optional

from db import supabase
from PointsParse import parse_shot_sequence, SERVE_DIRECTIONS, SHOT_TYPES, OUTCOMES
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/getAllPlayers")
def get_players():
    players = set()
    page = 0
    page_size = 1000

    while True:
        result = supabase.table('matches') \
            .select('player1, player2') \
            .range(page * page_size, (page + 1) * page_size - 1) \
            .execute()

        for match in result.data:
            if match['player1']:
                players.add(match['player1'])
            if match['player2']:
                players.add(match['player2'])
        if len(result.data) < page_size:
            break
        page += 1
    return {"players": sorted(list(players))}

def _normalize_surface(surface: str) -> str:
    s = surface.strip().lower()
    if not s:
        return ""
    return s[0].upper() + s[1:] if len(s) > 1 else s.upper()


@app.get("/getPlayerMatches/{player_name}")
def get_player_matches(
    player_name: str,
    surface: Optional[str] = Query(None),
):
    """Matches rows match loadData.py: player1, player2, tournament, round, surface (Hard/Clay/Grass)."""
    query = (
        supabase.table("matches")
        .select("match_id, player1, player2, tournament, round, surface")
        .or_(f"player1.eq.{player_name}, player2.eq.{player_name}")
    )

    if surface:
        query = query.eq("surface", _normalize_surface(surface))

    result = query.execute()
    return {"matches": result.data or []}


POINT_SELECT = (
    "match_id, point_number, server, score, set1, set2, game1, game2, "
    "first_serve_direction, first_serve_outcome, "
    "second_serve_direction, second_serve_outcome, point_end, had_fault"
)


def _fetch_points_paginated(match_ids: list, server_slot: int) -> list:
    """Fetch all points for match_ids where server == server_slot, paginating past the 1000-row cap."""
    if not match_ids:
        return []

    page_size = 1000
    # Batch match_ids to keep PostgREST URL length reasonable
    batch_size = 80
    all_points = []

    for i in range(0, len(match_ids), batch_size):
        batch = match_ids[i : i + batch_size]
        page = 0
        while True:
            result = (
                supabase.table("points")
                .select(POINT_SELECT)
                .in_("match_id", batch)
                .eq("server", server_slot)
                .range(page * page_size, (page + 1) * page_size - 1)
                .execute()
            )
            rows = result.data or []
            all_points.extend(rows)
            if len(rows) < page_size:
                break
            page += 1

    return all_points


@app.get("/getPlayerServes/{match_id}/{player_name}")
def get_match_points(match_id: str, player_name: str):

    ourPlayer = 0

    playerResult = supabase.table("matches").select("player1").eq("match_id", match_id).execute()

    if (player_name == playerResult.data[0]["player1"]):
        ourPlayer = 1
    else:
        ourPlayer = 2
    query = (
        supabase.table("points")
        .select("point_number, server, score, set1, set2, game1, game2, first_serve_direction, first_serve_outcome,"
                "second_serve_direction, second_serve_outcome, point_end, had_fault")
        .eq("match_id", match_id).eq("server", ourPlayer)
    )

    result = query.execute()
    return {"points": result.data or []}


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
    Returns serve points for a player across multiple matches in one call.
    Each point is tagged with match_id and surface so the frontend can
    aggregate and color by surface without extra round-trips.
    """
    matches_resp = get_player_matches(player_name, surface=surface)
    matches = matches_resp.get("matches") or []

    if match_ids:
        id_set = {mid.strip() for mid in match_ids.split(",") if mid.strip()}
        matches = [m for m in matches if str(m.get("match_id")) in id_set]

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

    points = []
    points.extend(_fetch_points_paginated(slot1_ids, 1))
    points.extend(_fetch_points_paginated(slot2_ids, 2))

    for point in points:
        point["surface"] = surface_by_match.get(point.get("match_id"))

    return {"points": points, "match_count": len(matches)}