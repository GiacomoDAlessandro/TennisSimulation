from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path='/Users/giacomodalessandro/PycharmProjects/TennisSimulation/.env')

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY")
supabase = create_client(url, key)

