import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

os.environ["DATABASE_URL"] = "postgresql://postgres.fzmrzyepcdvmdyphktvy:Aayupass%23supabase%232026@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"

from app.core.database import SessionLocal
from app.services.bot_service import BotService
from app.models.user import User
from app.models.trade import Trade

async def main():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.telegram_chat_id != None).first()
        if not user:
            print("No connected user found.")
            return

        bot = BotService(db)
        
        # Mock a trade
        trade = Trade(
            user_id=user.id,
            trade_ref="T999",
            instrument="UNKNOWN",
            pnl_amount=None,
        )
        db.add(trade)
        user.awaiting_response_trade_id = trade.id
        user.awaiting_response_type = "missing_pnl"
        db.commit()
        db.refresh(trade)

        print(f"Testing reply '50 dollars' for {trade.trade_ref}...")
        res = await bot._handle_conversational_response(1234, user, "50 dollars", trade)
        print("Reply 1 result:", res)
        
        db.refresh(trade)
        print(f"Trade PNL is now: {trade.pnl_amount}")
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
