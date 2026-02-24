import asyncio
import os
import sys

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

os.environ["DATABASE_URL"] = "postgresql://postgres.fzmrzyepcdvmdyphktvy:Aayupass%23supabase%232026@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"

from app.core.database import SessionLocal
from app.services.bot_service import BotService
from app.models.user import User

async def main():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.telegram_chat_id != None).first()
        if not user:
            print("No connected user found.")
            return

        bot = BotService(db)
        
        # Test just the save trade method alone without the handles
        try:
            print("Executing _save_trade standalone...")
            res = await bot._save_trade(
                user=user,
                input_type="screenshot",
                parsed={},
                raw_input_data={
                    "source": "telegram",
                    "mode": "image",
                    "caption": "took a loss of 50",
                    "telegram_message_id": 1234,
                    "error": "image_processing_failed",
                },
                is_narrative=False
            )
            print("Success!", res)
        except Exception as e:
            import traceback
            traceback.print_exc()

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
