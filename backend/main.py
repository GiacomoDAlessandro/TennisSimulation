from db import supabase
from PointsParse import parse_shot_sequence, SERVE_DIRECTIONS, SHOT_TYPES, OUTCOMES
from fastapi import FastAPI

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

@app.get("/player/{player_name}/serves")
def get_player_serves(player_name: str, surface: str = None):
    result = supabase.table('matches')\
    .select('match_id, player1, player2, surface')\
    .or_(f'player1.eq.{player_name},player2.eq.{player_name}')\
    .execute()


    matches = result.data
    return {"matches": matches}




