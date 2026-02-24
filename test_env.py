import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    TELEGRAM_BOT_TOKEN: str = None
    
    class Config:
        env_file = ".env.production"
        extra = "ignore"

settings = Settings()
print("TOKEN_REPR:", repr(settings.TELEGRAM_BOT_TOKEN))
