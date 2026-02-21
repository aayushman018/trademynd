from __future__ import annotations

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional
from pathlib import Path
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "TradeJournal AI"
    API_V1_STR: str = "/api/v1"
    
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_SERVER: str = "db"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "tradejournal"
    DATABASE_URL: Optional[str] = None

    SECRET_KEY: str = "CHANGE_THIS_TO_A_SECURE_SECRET_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    REDIS_URL: str = "redis://redis:6379/0"
    
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost"]

    SARVAM_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GOOGLE_API_KEY: Optional[str] = None
    GOOGLE_CLIENT_ID: Optional[str] = None
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_WEBHOOK_SECRET: Optional[str] = None
    TELEGRAM_BOT_USERNAME: str = "trademyndjournal_bot"
    FRONTEND_URL: str = "http://localhost:3000"
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    RAZORPAY_KEY_ID: Optional[str] = None
    RAZORPAY_KEY_SECRET: Optional[str] = None
    RAZORPAY_WEBHOOK_SECRET: Optional[str] = None
    UPI_VPA: Optional[str] = None
    FREE_PLAN_MONTHLY_TRADE_CAP: int = 30

    @field_validator(
        "SECRET_KEY",
        "TELEGRAM_BOT_TOKEN",
        "TELEGRAM_WEBHOOK_SECRET",
        "TELEGRAM_BOT_USERNAME",
        "FRONTEND_URL",
        "STRIPE_SECRET_KEY",
        "STRIPE_PUBLISHABLE_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "GOOGLE_CLIENT_ID",
        "RAZORPAY_KEY_ID",
        "RAZORPAY_KEY_SECRET",
        "RAZORPAY_WEBHOOK_SECRET",
        "UPI_VPA",
        mode="before",
    )
    @classmethod
    def strip_string_values(cls, value: str | None) -> str | None:
        if isinstance(value, str):
            return value.strip()
        return value

    def _normalize_database_url(self, url: str) -> str:
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql://", 1)
        return url

    def _has_placeholder_password(self, url: str) -> bool:
        return "INSERT_PASSWORD_HERE" in url

    @property
    def local_sqlite_url(self) -> str:
        sqlite_path = Path(__file__).resolve().parents[2] / "sql_app.db"
        return f"sqlite:///{sqlite_path.as_posix()}"

    @property
    def sync_database_url(self) -> str:
        if self.DATABASE_URL and not self._has_placeholder_password(self.DATABASE_URL):
            return self._normalize_database_url(self.DATABASE_URL)

        # Local fallback when DATABASE_URL is missing/placeholder and the default Docker host is not reachable.
        if self.POSTGRES_SERVER == "db" and not os.path.exists("/.dockerenv"):
            return self.local_sqlite_url

        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def async_database_url(self) -> str:
        # Convert postgresql:// to postgresql+asyncpg://
        url = self.sync_database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    class Config:
        env_file = ".env"

settings = Settings()
