import os

# mock environment so pydantic settings picks it up
os.environ["TELEGRAM_BOT_TOKEN"] = "123:ABC\\n\\n"
os.environ["TELEGRAM_WEBHOOK_SECRET"] = "secret\\n"

from app.core.config import Settings
# Need to reload settings since app.core.config.settings already instantiated
settings = Settings()

print("TOKEN:", repr(settings.TELEGRAM_BOT_TOKEN))
print("SECRET:", repr(settings.TELEGRAM_WEBHOOK_SECRET))
