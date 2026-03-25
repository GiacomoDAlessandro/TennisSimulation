import pandas as pd
from db import supabase
import math
import time
from PointsParse import SERVE_DIRECTIONS, SHOT_TYPES, OUTCOMES

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

def extract_point_summary(first, second):
    try:
        had_fault = isinstance(second, str) and len(second) > 0
        sequence = second if had_fault else first

        if not isinstance(sequence, str) or len(sequence) == 0:
            return None, None, None, None, None, None, had_fault

        if sequence[0] == 'c':
            sequence = sequence[1:]

        serve_dir = SERVE_DIRECTIONS.get(sequence[0])

        if len(sequence) > 1 and sequence[1] in OUTCOMES:

            serve_outcome = OUTCOMES[sequence[1]]

            rest = sequence[2:]
        else:
            serve_outcome = "in_play"
            rest = sequence[1:]


        return_type = None
        return_direction = None
        return_depth = None

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
        point_end = next((OUTCOMES[c] for c in reversed(sequence) if c in OUTCOMES), None)

        return serve_dir, serve_outcome, return_type, return_direction, return_depth, point_end, had_fault

    except Exception:
        return None, None, None, None, None, None, None


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


# ── DATA FILES ──────────────────────────────────────────────────────────────

MATCHES_FILE = 'Data/charting-m-matches.csv'

POINTS_FILES = [
    'Data/charting-m-points-2020s.csv',
]

matches_df = pd.read_csv(MATCHES_FILE)
matches_df = matches_df[matches_df['Surface'].isin(['Hard', 'Clay', 'Grass'])]
valid_match_ids = set(matches_df['match_id'])

# ── LOADING MATCHES ──────────────────────────────────────────────────────────


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
        'player1': None if pd.isna(row['Player 1']) else row['Player 1'],
        'player2': None if pd.isna(row['Player 2']) else row['Player 2'],
        'surface': None if pd.isna(row['Surface']) else row['Surface'],
        'tournament': None if pd.isna(row['Tournament']) else row['Tournament'],
        'round': None if pd.isna(row['Round']) else row['Round'],
        'winner': None if pd.isna(winner) else int(winner)
    })

for i in range(0, len(batch), BATCH_SIZE):
    success = upsert_with_retry('matches', batch[i:i + BATCH_SIZE])
    print(f"{'✓' if success else '✗'} Matches: {min(i + BATCH_SIZE, len(batch))} / {len(batch)}")
print("Matches done")




# ── LOADING POINTS ───────────────────────────────────────────────────────────

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
    serve_dir, serve_outcome, return_type, return_dir, return_depth, point_end, had_fault = \
        extract_point_summary(row['1st'], row['2nd'])

    batch.append({
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
        'first': clean(row['1st']),      # raw string — parsed on demand for visualization
        'second': clean(row['2nd']),     # raw string — parsed on demand for visualization
        'serve_direction': serve_dir,    # "wide" | "body" | "T"
        'serve_outcome': serve_outcome,  # "Ace" | "in_play" | "Forced error" etc
        'return_type': return_type,      # "forehand" | "backhand slice" etc
        'return_direction': return_dir,  # "forehand side" | "middle" | "backhand side"
        'return_depth': return_depth,    # "short" | "mid" | "deep"
        'point_end': point_end,          # "Clean Winner" | "Unforced error" etc
        'had_fault': had_fault           # True = second serve was used
    })

    if len(batch) == BATCH_SIZE:
        success = upsert_with_retry('points', batch, on_conflict='match_id,point_number')
        print(f"{'✓' if success else '✗'} Points: {idx + 1} / {len(points_df)}")
        batch = []

if batch:
    upsert_with_retry('points', batch, on_conflict='match_id,point_number')
print("Points done")
