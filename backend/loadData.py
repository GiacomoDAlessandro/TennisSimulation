import pandas as pd
from db import supabase
import math
import time
import re
import sys
from PointsParse import (
    SERVE_DIRECTIONS,
    SHOT_TYPES,
    OUTCOMES,
    SERVE_OUTCOMES,
    RALLY_OUTCOMES,
    split_leading_serve,
)

RETURN_DEPTHS = {
    "7": "short",
    "8": "mid",
    "9": "deep"
}

SHOT_DIRECTIONS_MAP = {
    "1": "forehand side",
    "2": "middle",
    "3": "backhand side",
    "0": "unknown"
}

BATCH_SIZE = 500
MAX_RETRIES = 3


def clean(val):
    if isinstance(val, float) and math.isnan(val):
        return None
    return val


def clean_int(val):
    if isinstance(val, float) and math.isnan(val):
        return None
    return int(val)


def normalize_player_name(name):
    """Trim and collapse internal whitespace so players PK stays clean."""
    if name is None or (isinstance(name, float) and math.isnan(name)):
        return None
    normalized = re.sub(r"\s+", " ", str(name).strip())
    return normalized or None


def upsert_players(names):
    """Upsert normalized player names into the players table."""
    unique = sorted({n for n in names if n})
    if not unique:
        return True
    batch = [{"name": n} for n in unique]
    ok = True
    for i in range(0, len(batch), BATCH_SIZE):
        chunk = batch[i : i + BATCH_SIZE]
        if not upsert_with_retry("players", chunk, on_conflict="name"):
            ok = False
    return ok


def backfill_players_from_csv(matches_df=None):
    """Build players from the matches CSV (normalized)."""
    if matches_df is None:
        matches_df = pd.read_csv(MATCHES_FILE)
        matches_df = matches_df[matches_df["Surface"].isin(["Hard", "Clay", "Grass"])]

    names = []
    for col in ("Player 1", "Player 2"):
        if col not in matches_df.columns:
            continue
        for val in matches_df[col].tolist():
            n = normalize_player_name(val)
            if n:
                names.append(n)

    print(f"Upserting {len(set(names))} players…")
    success = upsert_players(names)
    print(f"{'✓' if success else '✗'} Players upsert done")
    return success


def backfill_players_from_supabase():
    """Re-sync players from existing matches rows in Supabase."""
    names = set()
    page = 0
    page_size = 1000
    while True:
        result = (
            supabase.table("matches")
            .select("player1, player2")
            .range(page * page_size, (page + 1) * page_size - 1)
            .execute()
        )
        rows = result.data or []
        for match in rows:
            for key in ("player1", "player2"):
                n = normalize_player_name(match.get(key))
                if n:
                    names.add(n)
        if len(rows) < page_size:
            break
        page += 1

    print(f"Upserting {len(names)} players from Supabase matches…")
    success = upsert_players(names)
    print(f"{'✓' if success else '✗'} Players upsert done")
    return success


def extract_point_summary(first, second):
    try:
        had_fault = isinstance(second, str) and len(second) > 0

        first_serve_dir = None
        first_serve_outcome = None

        if isinstance(first, str) and len(first) > 0:
            first_serve_dir, first_out, _ = split_leading_serve(first)
            first_serve_outcome = "in_play" if first_out is None else first_out

        second_serve_dir = None
        second_serve_outcome = None
        return_type = None
        return_direction = None
        return_depth = None
        point_end = None

        sequence = second if had_fault else first
        if not isinstance(sequence, str) or len(sequence) == 0:
            return first_serve_dir, first_serve_outcome, None, None, None, None, None, None, had_fault

        serve_dir, serve_out, rest = split_leading_serve(sequence)
        serve_outcome = "in_play" if serve_out is None else serve_out

        # Preserve first-serve fault metadata when second serve starts the rally.
        if had_fault:
            second_serve_dir = serve_dir
            second_serve_outcome = serve_outcome
        else:
            pass

        for i, char in enumerate(rest):
            if char in SHOT_TYPES:
                return_type = SHOT_TYPES[char]

                j = i + 1
                if j < len(rest) and rest[j] in SHOT_DIRECTIONS_MAP:
                    return_direction = SHOT_DIRECTIONS_MAP[rest[j]]
                    j += 1
                if j < len(rest) and rest[j] in RETURN_DEPTHS:
                    return_depth = RETURN_DEPTHS[rest[j]]
                break

        last_outcome_char = next(
            (c for c in reversed(sequence) if c in RALLY_OUTCOMES or c in SERVE_OUTCOMES),
            None,
        )
        if last_outcome_char is None:
            point_end = None
        elif rest == "" or not any(c in SHOT_TYPES for c in rest):
            # No rally shots — serve-only point
            point_end = SERVE_OUTCOMES.get(last_outcome_char)
        else:
            point_end = RALLY_OUTCOMES.get(last_outcome_char)

        return (first_serve_dir, first_serve_outcome, second_serve_dir, second_serve_outcome,
                return_type, return_direction, return_depth, point_end, had_fault)

    except Exception:
        return None, None, None, None, None, None, None, None, None


def upsert_with_retry(table, batch, on_conflict=None):
    for attempt in range(MAX_RETRIES):
        try:
            if on_conflict:
                supabase.table(table).upsert(batch, on_conflict=on_conflict).execute()
            else:
                supabase.table(table).upsert(batch).execute()
            return True
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                wait = 2 ** attempt
                print(f"  Retry {attempt + 1}/{MAX_RETRIES}: {e}. Waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"  Failed after {MAX_RETRIES} attempts: {e}")
                return False


# ── DATA FILES (run pipeline only via ``python loadData.py``) ───────────────

MATCHES_FILE = '../Data/charting-m-matches.csv'

POINTS_FILES = [
    '../Data/charting-m-points-2020s.csv',
]


def _run_load_pipeline():
    matches_df = pd.read_csv(MATCHES_FILE)
    matches_df = matches_df[matches_df['Surface'].isin(['Hard', 'Clay', 'Grass'])]
    valid_match_ids = set(matches_df['match_id'])

    # ── LOADING MATCHES ──────────────────────────────────────────────────────
    """
    winners_lookup = {}
    for file in POINTS_FILES:
        try:
            df = pd.read_csv(file, low_memory=False)
            w = df.sort_values('Pt').groupby('match_id').last()['PtWinner'].to_dict()
            winners_lookup.update(w)
            print(f"Loaded winners from {file}")
        except FileNotFoundError:
            print(f"Skipping missing file: {file}")

    batch = []
    for _, row in matches_df.iterrows():
        match_id = row['match_id']
        winner = winners_lookup.get(match_id)
        batch.append({
            'match_id': match_id,
            'player1': normalize_player_name(row['Player 1']),
            'player2': normalize_player_name(row['Player 2']),
            'surface': None if pd.isna(row['Surface']) else row['Surface'],
            'tournament': None if pd.isna(row['Tournament']) else row['Tournament'],
            'round': None if pd.isna(row['Round']) else row['Round'],
            'winner': None if pd.isna(winner) else int(winner)
        })

    for i in range(0, len(batch), BATCH_SIZE):
        success = upsert_with_retry('matches', batch[i:i + BATCH_SIZE])
        print(f"{'✓' if success else '✗'} Matches: {min(i + BATCH_SIZE, len(batch))} / {len(batch)}")
    print("Matches done")
    backfill_players_from_csv(matches_df)

    """
    # ── LOADING POINTS ───────────────────────────────────────────────────────

    all_points = []
    for file in POINTS_FILES:
        try:
            df = pd.read_csv(file, low_memory=False)
            df = df[df['match_id'].isin(valid_match_ids)]
            df = df.drop_duplicates(subset=['match_id', 'Pt'])
            all_points.append(df)
            print(f"Loaded {file}: {len(df)} rows")
        except FileNotFoundError:
            print(f"Skipping missing file: {file}")

    points_df = pd.concat(all_points, ignore_index=True)
    points_df = points_df.drop_duplicates(subset=['match_id', 'Pt'])
    print(f"Total points to insert: {len(points_df)}")

    batch = []
    for idx, (_, row) in enumerate(points_df.iterrows()):
        first_serve_dir, first_serve_outcome, second_serve_dir, second_serve_outcome, \
            return_type, return_dir, return_depth, point_end, had_fault = \
            extract_point_summary(row['1st'], row['2nd'])

        batch.append({
            'first_serve_direction': first_serve_dir,
            'first_serve_outcome': first_serve_outcome,
            'second_serve_direction': second_serve_dir,
            'second_serve_outcome': second_serve_outcome,
            'had_fault': had_fault,
            'match_id': row['match_id'],
            'score': clean(row['Pts']),
            'game_number': clean_int(row['Gm#']),
            'point_number': clean_int(row['Pt']),
            'set1': clean_int(row['Set1']),
            'set2': clean_int(row['Set2']),
            'game1': clean_int(row['Gm1']),
            'game2': clean_int(row['Gm2']),
            'winner': clean_int(row['PtWinner']),
            'server': clean_int(row['Svr']),
            'first': clean(row['1st']),
            'second': clean(row['2nd']),
            'return_type': return_type,
            'return_direction': return_dir,
            'return_depth': return_depth,
            'point_end': point_end,
        })

        if len(batch) == BATCH_SIZE:
            success = upsert_with_retry('points', batch, on_conflict='match_id,point_number')
            print(f"{'✓' if success else '✗'} Points: {idx + 1} / {len(points_df)}")
            batch = []

    if batch:
        upsert_with_retry('points', batch, on_conflict='match_id,point_number')
    print("Points done")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in ("--backfill-players", "backfill-players"):
        # Prefer CSV (source of truth for names); fall back to Supabase scan.
        try:
            backfill_players_from_csv()
        except FileNotFoundError:
            print("CSV not found; backfilling from Supabase matches…")
            backfill_players_from_supabase()
    else:
        _run_load_pipeline()
        # Keep players table in sync even when matches upsert block is commented out.
        try:
            backfill_players_from_csv()
        except FileNotFoundError:
            pass
