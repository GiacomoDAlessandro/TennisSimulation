"""
    - Surface (clay, grass, hard)
    - Player rankings
    - Serve stats (ace rate, double fault rate, 1st serve %, win % on serve)
    - Return stats (break points, return points won)

Goal: Predict which player wins a match (1 = player 1 wins)
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
warnings.filterwarnings('ignore')

#LOAD DATA
df = pd.read_csv('2025.csv')
df.isnull().sum()
df['surface'].value_counts();
stat_cols = ['w_ace','w_df','w_svpt','w_1stIn','w_1stWon','w_2ndWon','w_bpSaved','w_bpFaced'
    ,'l_ace','l_df','l_svpt','l_1stIn','l_1stWon','l_2ndWon','l_bpSaved','l_bpFaced','winner_rank','loser_rank']
df = df.dropna(subset=stat_cols)



