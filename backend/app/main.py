import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from sqlalchemy import inspect, text

# Ensure the backend root is on sys.path for serverless runtimes (e.g. Vercel).
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.core.config import settings
from app.api.api import api_router
from app.core.database import engine, Base

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create tables on startup
# In a real production app, you would use Alembic for migrations,
# but for this deployment, we'll ensure tables exist on startup.
try:
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    if "users" in inspector.get_table_names():
        existing_columns = {column["name"] for column in inspector.get_columns("users")}
        with engine.begin() as connection:
            connection.execute(text("""
            CREATE TABLE IF NOT EXISTS telegram_updates (
                update_id BIGINT PRIMARY KEY,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
            """))
            if "telegram_chat_id" not in existing_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN telegram_chat_id BIGINT"))
            if "telegram_connected" not in existing_columns:
                connection.execute(
                    text("ALTER TABLE users ADD COLUMN telegram_connected BOOLEAN NOT NULL DEFAULT FALSE")
                )
            if "awaiting_response_trade_id" not in existing_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN awaiting_response_trade_id UUID REFERENCES trades(id)"))
            if "awaiting_response_type" not in existing_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN awaiting_response_type VARCHAR"))
            connection.execute(
                text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_telegram_chat_id ON users (telegram_chat_id)")
            )

    if "trades" in inspector.get_table_names():
        trade_columns = {column["name"] for column in inspector.get_columns("trades")}
        with engine.begin() as connection:
            if "trade_ref" not in trade_columns:
                connection.execute(text("ALTER TABLE trades ADD COLUMN trade_ref VARCHAR"))
            if "notes" not in trade_columns:
                connection.execute(text("ALTER TABLE trades ADD COLUMN notes VARCHAR"))
            if "emotion_score" not in trade_columns:
                connection.execute(text("ALTER TABLE trades ADD COLUMN emotion_score NUMERIC(4, 2)"))
            if "narrative_data" not in trade_columns:
                connection.execute(text("ALTER TABLE trades ADD COLUMN narrative_data JSON"))

    logger.info("Database tables created successfully")
except Exception as e:
    logger.error(f"Error creating database tables: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Allow all origins for now to simplify deployment/testing. 
# In production, you should restrict this to your frontend URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {"message": "Welcome to TradeJournal AI API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}
