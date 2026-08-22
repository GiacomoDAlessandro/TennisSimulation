from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv()

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
if url and key:
    supabase = create_client(url, key)
else:
    supabase = None


