import os
import sys
import uuid
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

os.environ["DATABASE_URL"] = "postgresql://postgres.fzmrzyepcdvmdyphktvy:Aayupass%23supabase%232026@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"

from app.core.database import SessionLocal
from app.models.trade import Trade
from app.models.user import User

try:
    db = SessionLocal()
    
    # 1. Get a test user
    user = db.query(User).first()
    if not user:
        print("No users found.")
        sys.exit()

    print(f"Testing insertion for user {user.id}")

    # 2. Try inserting a trade with missing conversational items
    trade = Trade(
        user_id=user.id,
        trade_ref="T999",
        instrument="UNKNOWN",
        timeframe=None,
        direction=None,
        entry_price=None,
        stop_loss=None,
        take_profit=None,
        result=None,
        pnl_amount=None,
        emotion=None,
        emotion_score=None,
        narrative_data=None,
        trade_timestamp=datetime.now(timezone.utc),
        input_type="screenshot",
        raw_input_data={"test": True}
    )

    db.add(trade)
    db.commit()
    db.refresh(trade)

    print(f"Success! Trade inserted: {trade.id}")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
