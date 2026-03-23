
import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report


try:
    import matplotlib.pyplot as plt
    import seaborn as sns
except ModuleNotFoundError:
    plt = None
    sns = None
import warnings

warnings.filterwarnings('ignore')

df = pd.read_csv('Data/2025.csv')


# Minimal columns needed for player profiles (leave other missing values alone)
stat_cols = [
    'surface',
    'winner_id', 'winner_name', 'winner_rank',
    'loser_id', 'loser_name', 'loser_rank',
    'w_ace', 'w_df', 'w_svpt', 'w_1stIn', 'w_1stWon', 'w_2ndWon', 'w_bpSaved', 'w_bpFaced',
    'l_ace', 'l_df', 'l_svpt', 'l_1stIn', 'l_1stWon', 'l_2ndWon', 'l_bpSaved', 'l_bpFaced',
]
df = df.dropna(subset=[c for c in stat_cols if c in df.columns])

# Match-level rate features (used later for quick inspection; profiles use summed totals)
df['w_serve_win_pct'] = (df['w_1stWon'] + df['w_2ndWon']) / df['w_svpt'].replace(0, np.nan)
df['w_ace_rate'] = df['w_ace'] / df['w_svpt'].replace(0, np.nan)
df['w_double_fault_rate'] = df['w_df'] / df['w_svpt'].replace(0, np.nan)
df['w_1st_in_pct'] = df['w_1stIn'] / df['w_svpt'].replace(0, np.nan)
df['w_bp_save_pct'] = df['w_bpSaved'] / df['w_bpFaced'].replace(0, np.nan)

df['l_serve_win_pct'] = (df['l_1stWon'] + df['l_2ndWon']) / df['l_svpt'].replace(0, np.nan)
df['l_ace_rate'] = df['l_ace'] / df['l_svpt'].replace(0, np.nan)
df['l_double_fault_rate'] = df['l_df'] / df['l_svpt'].replace(0, np.nan)
df['l_1st_in_pct'] = df['l_1stIn'] / df['l_svpt'].replace(0, np.nan)
df['l_bp_save_pct'] = df['l_bpSaved'] / df['l_bpFaced'].replace(0, np.nan)


def _finalize_profile(profile: pd.DataFrame, prefix: str, matches_col: str) -> pd.DataFrame:
    svpt = profile[f'{prefix}_svpt'].replace(0, np.nan)
    profile[f'{prefix}_serve_win_pct'] = (profile[f'{prefix}_1stWon'] + profile[f'{prefix}_2ndWon']) / svpt
    profile[f'{prefix}_1st_in_pct'] = profile[f'{prefix}_1stIn'] / svpt
    profile[f'{prefix}_ace_rate'] = profile[f'{prefix}_ace'] / svpt
    profile[f'{prefix}_double_fault_rate'] = profile[f'{prefix}_df'] / svpt
    bp_faced = profile[f'{prefix}_bpFaced'].replace(0, np.nan)
    profile[f'{prefix}_bp_save_pct'] = profile[f'{prefix}_bpSaved'] / bp_faced

    # per-match averages for count stats
    m = profile[matches_col].replace(0, np.nan)
    for c in [f'{prefix}_ace', f'{prefix}_df', f'{prefix}_bpFaced', f'{prefix}_bpSaved']:
        profile[f'{c}_per_match'] = profile[c] / m

    return profile


def build_player_profiles(df):
    player_profiles_w = df.groupby(['winner_id', 'winner_name'], dropna=False).agg(
        matches_won=('surface', 'size'),
        w_ace=('w_ace', 'sum'),
        w_df=('w_df', 'sum'),
        w_svpt=('w_svpt', 'sum'),
        w_1stIn=('w_1stIn', 'sum'),
        w_1stWon=('w_1stWon', 'sum'),
        w_2ndWon=('w_2ndWon', 'sum'),
        w_bpSaved=('w_bpSaved', 'sum'),
        w_bpFaced=('w_bpFaced', 'sum'),
    ).reset_index().rename(columns={'winner_id': 'player_id', 'winner_name': 'player_name'})
    player_profiles_w = _finalize_profile(player_profiles_w, prefix='w', matches_col='matches_won')

    # Loser player profiles
    player_profiles_l = df.groupby(['loser_id', 'loser_name'], dropna=False).agg(
        matches_lost=('surface', 'size'),
        l_ace=('l_ace', 'sum'),
        l_df=('l_df', 'sum'),
        l_svpt=('l_svpt', 'sum'),
        l_1stIn=('l_1stIn', 'sum'),
        l_1stWon=('l_1stWon', 'sum'),
        l_2ndWon=('l_2ndWon', 'sum'),
        l_bpSaved=('l_bpSaved', 'sum'),
        l_bpFaced=('l_bpFaced', 'sum'),
    ).reset_index().rename(columns={'loser_id': 'player_id', 'loser_name': 'player_name'})
    player_profiles_l = _finalize_profile(player_profiles_l, prefix='l', matches_col='matches_lost')
