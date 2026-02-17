from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from app.core.config import settings
import os

# Determine if we are running in a serverless environment or using Supabase
is_serverless = os.getenv("VERCEL") or os.getenv("RENDER")
is_supabase = "supabase" in (settings.DATABASE_URL or "")

engine_args = {}

# Use NullPool for serverless environments to prevent connection exhaustion
if is_serverless or is_supabase:
    engine_args["poolclass"] = NullPool
    
    # Ensure SSL is enabled for Supabase
    if is_supabase and "sslmode" not in (settings.DATABASE_URL or ""):
        engine_args["connect_args"] = {"sslmode": "require"}

# Sync engine for Alembic and standard sync operations
engine = create_engine(settings.sync_database_url, **engine_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
