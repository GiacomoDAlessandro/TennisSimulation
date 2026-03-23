"""
=============================================================================
TENNIS MATCH CHARTING PROJECT — DATA NOTATION REFERENCE
Jeff Sackmann / Tennis Abstract (github.com/JeffSackmann/tennis_MatchChartingProject)
License: CC BY-NC-SA 4.0
=============================================================================
 
=============================================================================
FILE 1: charting-m-matches.csv
Match-level metadata. One row per match.
Join to points file on: match_id
=============================================================================
 
match_id    : Unique match identifier. Format: YYYYMMDD-M-Tournament-Round-Player1-Player2
 
Player 1    : Full name of player 1 (matches first name in match_id)
Player 2    : Full name of player 2 (matches second name in match_id)
 
Pl 1 hand   : Player 1 dominant hand. R = Right, L = Left
Pl 2 hand   : Player 2 dominant hand. R = Right, L = Left
 
Date        : Match date in YYYYMMDD format
 
Tournament  : Tournament name
 
Round       : Match round.
              F    = Final
              SF   = Semifinal
              QF   = Quarterfinal
              R16  = Round of 16
              R32  = Round of 32
              R64  = Round of 64
              R128 = Round of 128
              RR   = Round Robin
              BR   = Bronze medal / 3rd place match
              Q1/Q2/Q3 = Qualifying rounds
              PO   = Playoff
              PQ   = Pre-qualifying
 
Time        : Match duration (often empty/null)
 
Court       : Court name e.g. "Centre Court", "Rod Laver Arena" (often null)
 
Surface     : Playing surface. Hard / Clay / Grass
 
Umpire      : Chair umpire name (often null)
 
Best of     : Number of sets in the match. 3 or 5.
              NOTE: NextGen Finals uses Best of 5 but with 4-game sets (not standard)
 
Final TB?   : Format of the final set if sets reach the deciding set.
              N = Normal tiebreak at 6-6 (standard ATP)
              A = Advantage set — play until one player leads by 2 games (old Wimbledon)
              T = 10-point match tiebreak instead of a full final set (US Open, Australian Open)
              S = Super tiebreak (same as T, different naming convention)
              1 = First to 1 game (NextGen Finals format — sets are first to 4 games)
              W = Wimbledon format (advantage set until 2022, then 10pt TB introduced)
              V = Unknown/variant format
              0 = No final set tiebreak info recorded
              null = Unknown
 
Charted by  : Username of the volunteer who charted the match
 
 
=============================================================================
FILE 2: charting-m-points-2020s.csv
Point-level data. One row per point. This is the core file for the simulation.
Also applies to charting-m-points-2010s.csv and charting-m-points-to-2009.csv
=============================================================================
 
match_id    : Links to charting-m-matches.csv. Same format as above.
 
Pt          : Point number within the match, sequential from 1.
              Use this to replay the match in order.
 
Set1        : Sets won by Player 1 so far at the START of this point
Set2        : Sets won by Player 2 so far at the START of this point
 
Gm1         : Games won by Player 1 in the current set at the START of this point
Gm2         : Games won by Player 2 in the current set at the START of this point
 
Pts         : Score within the current game at the START of this point.
              Standard game:   0-0, 15-0, 30-15, 40-30, AD-40, 40-AD etc.
              Tiebreak game:   0-0, 1-0, 2-1, 6-6, 7-6 etc. (numeric not tennis scoring)
              NOTE: To detect if a point is in a tiebreak, check Gm1==6 and Gm2==6
              (or Gm1==3 and Gm2==3 for NextGen Finals 4-game sets)
 
Gm#         : Overall game number in the match (sequential across all sets)
 
TbSet       : Boolean. True if this SET uses a tiebreak format.
              WARNING: This is a SET-level flag not a POINT-level flag.
              It being True does NOT mean this specific point is in a tiebreak.
              In practice almost always True for ATP matches post-2000.
 
Svr         : Which player is serving this point. 1 = Player 1, 2 = Player 2
 
1st         : Shot sequence string for the point if the first serve was in play.
              If starts with 'c' = serve was called out but overruled (let replayed)
              If just 'S' = serve went in but rally not charted
              If just 'R' = return not charted
              See SHOT SEQUENCE NOTATION section below for full decoding
 
2nd         : Shot sequence string if there was a second serve (first serve was a fault)
              Same notation as 1st. If both 1st and 2nd are populated, 1st was a fault.
 
Notes       : Free text match notes e.g. "Kyrgios serves underarm",
              "Successful challenge from Thiem", "Match length: 2 hours 34 minutes"
 
PtWinner    : Which player won this point. 1 = Player 1, 2 = Player 2
 
 
=============================================================================
SHOT SEQUENCE NOTATION (the encoded string in 1st and 2nd columns)
Decodes the full rally shot by shot
=============================================================================
 
--- SERVE DIRECTION (first character of sequence) ---
4   = Wide (out wide to deuce court, or down the T to ad court)
5   = Body serve
6   = T serve (down the T to deuce court, or out wide to ad court)
 
--- SHOT TYPE (letter after each number) ---
f   = Forehand groundstroke
b   = Backhand groundstroke
r   = Forehand slice
s   = Backhand slice
v   = Forehand volley
z   = Backhand volley
o   = Forehand overhead / smash
p   = Backhand overhead
u   = Forehand drop shot
y   = Backhand drop shot
l   = Forehand lob
m   = Backhand lob
t   = Forehand trick/tweener shot
q   = Backhand trick/tweener shot
h   = Forehand half volley
i   = Backhand half volley
j   = Forehand swinging volley
k   = Backhand swinging volley
 
--- SHOT DIRECTION (number after shot type) ---
1   = Down the line (or crosscourt for lefties, context dependent)
2   = Crosscourt
3   = Middle of court
7   = Down the line (wide)
8   = Crosscourt (wide)
9   = Middle (wide)
 
--- DEPTH ---
+ sign before shot = player approached the net on that shot
 
--- OUTCOME SYMBOLS (appear at end of sequence) ---
*   = Unreturned serve / ace / service winner (point won by server)
#   = Clean winner (rally winner, point won outright)
@   = Unforced error (point lost by hitting player)
!   = Forced error / winner caused by opponent pressure (can appear mid-sequence)
n   = Net error
d   = Deep error (long)
w   = Wide error
x   = Wide AND net error
g   = Unknown error type
 
--- OTHER SYMBOLS ---
c   = Let serve (appears before serve direction, e.g. c6 = let on T serve)
;   = Second bounce / ball bounced twice (Hawkeye situation)
^   = Player came to net
-   = Player retreated from net
=   = Shot landed on the line
Q   = Medical timeout called
 
--- SPECIAL CODES ---
S   = Serve went in but rally not charted (incomplete data)
R   = Return not charted (incomplete data)
 
 
=============================================================================
FILE 3: charting-m-stats-KeyPointsReturn.csv
Aggregated stats per player per match for key return situations.
One row per player per match per situation type.
=============================================================================
 
match_id        : Links to charting-m-matches.csv
 
player          : Player name
 
row             : Situation type being measured:
                  BPO    = Break Point Opportunities (player is returning on a break point)
                  GPF    = Game Point Faced (player is serving, opponent has game point)
                  DeuceR = Player is returning at deuce
                  DeuceS = Player is serving at deuce
                  (and others — see full data_dictionary.txt in repo for complete list)
 
pts             : Total points played in this situation
 
pts_won         : Points won by this player in this situation
 
rally_winners   : Points won via outright winner in rally
 
rally_forced    : Points won because opponent made a forced error
 
unforced        : Points LOST because this player made an unforced error
                  NOTE: this is errors made, not errors by opponent
"""
import pandas as pd
from db import supabase

df = pd.read_csv('Data/charting-m-points-2020s.csv', low_memory=False)
matches_df = pd.read_csv('Data/charting-m-matches.csv')
match_info = matches_df.set_index('match_id')[['Surface', 'Tournament', 'Round']].to_dict('index')

SERVE_DIRECTIONS = {
    "4": "wide",
    "5": "body",
    "6": "T"
}

SHOT_TYPES = {
    "f": "forehand",
    "b": "backhand",
    "r": "forehand slice",
    "s": "backhand slice",
    "v": "forehand volley",
    "z": "backhand volley",
    "o": "forehand overhead",
    "p": "backhand overhead",
    "u": "forehand drop shot",
    "y": "backhand drop shot",
    "l": "forehand lob",
    "m": "backhand lob",
    "t": "forehand trick shot",
    "q": "backhand trick shot",
    "h": "forehand half volley",
    "i": "backhand half volley",
    "j": "forehand swinging volley",
    "k": "backhand swinging volley",
}

DIRECTIONS = {
    "1": "Down the line",  # Crosscourt for lefties
    "2": "Crosscourt",
    "3": "Middle of court",
    "7": "Down the line(wide)",
    "8": "Crosscourt(wide)",
    "9": "Middle(wide)"
}

DEPTH = {
    "+": "Player approached net on shot"
}

OUTCOMES = {
    "*": "Ace",
    "#": "Clean Winner",
    "@": "Unforced error",
    "!": "Forced error",
    "n": "Net error",
    "d": "Deep error",
    "w": "Wide error",
    "x": "Wide and net error",
    "g": "General Error"
}

OTHER_SYMBOLS = {
    "c": "Let serve",
    ";": "Second bounce (Hawkeye Challenge)",
    "^": "Player came to net",
    "-": "Player retreated from net",
    "=": "Shot landed on the line",
    "Q": "Medical timeout called",
    "S": "Serve went in but rally not charted",
    "R": "Return not charted"
}


def get_players_from_match_id(match_id: str) -> tuple:
    # Splits match_id between '-'
    parts = match_id.split('-')
    rounds = {'F', 'SF', 'QF', 'R16', 'R32', 'R64', 'R128', 'RR', 'BR'}
    # Fixes issue of players having hyphens in their name "Auger-Aliassime"
    for i, part in enumerate(parts):
        if part in rounds:
            player1 = parts[i + 1]
            player2 = '_'.join(parts[i + 2:])
            return player1.replace('_', ' '), player2.replace('_', ' ')

class Point:
    def __init__(self, row):
        self.match_id = row['match_id']
        self.score = row['Pts']
        self.game_number = row['Gm#']
        self.pt_num = row['Pt']
        self.set1 = row['Set1']
        self.set2 = row['Set2']
        self.gm1 = row['Gm1']
        self.gm2 = row['Gm2']
        self.winner = row['PtWinner']
        self.server = row['Svr']
        self.first = row['1st']
        self.second = row['2nd']
        self.parsed_shots = None

    def get_shots(self):
        if self.parsed_shots is None:
            self.parsed_shots = parse_shot_sequence(self)
        return self.parsed_shots


# Decodes the actual point, forehand deep to other forehand, etc.
def parse_shot_sequence(curr_points: Point) -> list[dict]:
    shots = []

    current_shot = {}
    if pd.isna(curr_points.second):
        sequence = curr_points.first
    else:
        sequence = curr_points.second
        miss = curr_points.first
        fault_outcome = OUTCOMES.get(miss[1]) if len(miss) > 1 else None
        current_shot = {"type": "serve", "direction": SERVE_DIRECTIONS[miss[0]], "outcome": fault_outcome}
        shots.append(current_shot)

    #Ace handling, if ace the data is simply (ex. 4*)
    if sequence[0] in SERVE_DIRECTIONS:
        current_shot = {"type": "serve", "direction": SERVE_DIRECTIONS[sequence[0]], "outcome": None}
        if len(sequence) > 1 and sequence[1] in OUTCOMES:
            current_shot["outcome"] = OUTCOMES[sequence[1]]
            shots.append(current_shot)
            current_shot = {}
            sequence = sequence[2:]  #chop both serve direction and outcome
        else:
            sequence = sequence[1:]  #just chop serve direction

    for char in sequence:
        if char in SHOT_TYPES:
            if current_shot:
                shots.append(current_shot)
            current_shot = {"type": SHOT_TYPES[char], "direction": None, "outcome": None}
        elif char in DIRECTIONS:
            current_shot["direction"] = DIRECTIONS[char]
        elif char in OUTCOMES:
            current_shot["outcomes"] = OUTCOMES[char]
        elif char in OTHER_SYMBOLS:
            current_shot["other"] = OTHER_SYMBOLS[char]

    if current_shot:
        shots.append(current_shot)

    return shots


class Match:
    def __init__(self, match_id, points):
        self.match_id = match_id
        self.points = []
        self.tournament = match_info.get(match_id, {}).get('Tournament')
        self.surface = match_info.get(match_id, {}).get('Surface')
        self.round = match_info.get(match_id, {}).get('Round')
        for _, row in points.iterrows():
            point = Point(row)
            self.points.append(point)


matches = []
 #Load all matches into array
for match_id, group in df.groupby('match_id'):
    group = group.sort_values('Pt')
    match = Match(match_id, group)
    matches.append(match)
