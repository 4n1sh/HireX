import os

from dotenv import load_dotenv

load_dotenv()

# Paste your Supabase connection string from:
# Supabase Dashboard → Settings → Database → Connection string (URI)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:your_password@db.xxxx.supabase.co:5432/postgres",
)

# SQLAlchemy needs postgresql:// not postgres://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
