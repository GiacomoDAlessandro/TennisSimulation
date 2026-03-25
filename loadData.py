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

def clean(val):
    if isinstance(val, float) and math.isnan(val):
        return None
    return val

def clean_int(val):
    if isinstance(val, float) and math.isnan(val):
        return None
    return int(val)


matches_df = pd.read_csv('Data/charting-m-matches.csv')
points_df = pd.read_csv('Data/charting-m-points-2020s.csv', low_memory=False)
matches_df = matches_df[matches_df['Surface'].isin(['Hard', 'Clay', 'Grass'])]
winners = points_df.sort_values('Pt').groupby('match_id').last()['PtWinner'].to_dict()
valid_match_ids = set(matches_df['match_id'])
points_df = points_df.drop_duplicates(subset=['match_id', 'Pt'])
points_df = points_df[points_df['match_id'].isin(valid_match_ids)]

"""
#Loading Points
batch = []
for _, row in points_df.iterrows():
    match_id = row['match_id'] 
    batch.append({
        'match_id': match_id,
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
        'second': clean(row['2nd'])
    })

for i in range(0, len(batch), 2000):
    supabase.table('points').upsert(batch[i:i+2000], on_conflict='match_id,point_number').execute()
    print(f"Inserted {min(i + 2000, len(batch))} / {len(batch)}")
"""
#Loading Shots

BATCH_SIZE = 500  # Reduced from 2000
MAX_RETRIES = 3

def upsert_with_retry(batch):
    for attempt in range(MAX_RETRIES):
        try:
            supabase.table('points').upsert(batch, on_conflict='match_id,point_number').execute()
            return True
        except Exception as e:
            if attempt < MAX_RETRIES - 1:
                wait = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                print(f"  Retry {attempt + 1}/{MAX_RETRIES} after error: {e}. Waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"  Failed after {MAX_RETRIES} attempts: {e}")
                return False

# Track where you left off so you can resume
RESUME_FROM = 332000  # Set to 0 to start fresh, or last successful count to resume

batch = []
skipped = 0

for idx, (_, row) in enumerate(points_df.iterrows()):
    # Skip already-inserted rows
    if idx < RESUME_FROM:
        skipped += 1
        continue

    match_id = row['match_id']
    point = Point(row)

    try:
        parsed_shots = parse_shot_sequence(point)
    except Exception:
        parsed_shots = None

    batch.append({
        'match_id': match_id,
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
        'shots': json.dumps(parsed_shots) if parsed_shots is not None else None
    })

    if len(batch) == BATCH_SIZE:
        success = upsert_with_retry(batch)
        print(f"{'✓' if success else '✗'} Inserted up to {idx + 1} / {len(points_df)}")
        batch = []

if batch:
    upsert_with_retry(batch)

print("Done")

#Loading Matches
"""
batch = []
for _, row in matches_df.iterrows():
    match_id = row['match_id']
    winner = winners.get(match_id)
    batch.append({
        'match_id': match_id,
        'player1': None if pd.isna(row['Player 1']) else row['Player 1'],
        'player2': None if pd.isna(row['Player 2']) else row['Player 2'],
        'surface': None if pd.isna(row['Surface']) else row['Surface'],
        'tournament': None if pd.isna(row['Tournament']) else row['Tournament'],
        'round': None if pd.isna(row['Round']) else row['Round'],
        'winner': None if pd.isna(winner) else int(winner)
    })
# Insert in chunks of 500
for i in range(0, len(batch), 500):
    supabase.table('matches').upsert(batch[i:i+500]).execute()
    print(f"Inserted {min(i+500, len(batch))} / {len(batch)}")
"""
