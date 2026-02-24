import os
from sqlalchemy import create_engine, inspect, text
import json

DATABASE_URL = "postgresql://postgres.fzmrzyepcdvmdyphktvy:Aayupass%23supabase%232026@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"

try:
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)

    users_columns = [c["name"] for c in inspector.get_columns("users")]
    trades_columns = [c["name"] for c in inspector.get_columns("trades")]

    res = {
        "users_missing_awaiting_response_trade_id": "awaiting_response_trade_id" not in users_columns,
        "users_missing_awaiting_response_type": "awaiting_response_type" not in users_columns,
        "trades_missing_trade_ref": "trade_ref" not in trades_columns,
        "trades_missing_notes": "notes" not in trades_columns,
        "trades_missing_emotion_score": "emotion_score" not in trades_columns,
        "trades_missing_narrative_data": "narrative_data" not in trades_columns,
        "all_user_columns": users_columns,
        "all_trades_columns": trades_columns
    }
    
    with open("db_status.json", "w", encoding="utf-8") as f:
        json.dump(res, f, indent=2)

except Exception as e:
    with open("db_status.json", "w", encoding="utf-8") as f:
        json.dump({"error": str(e)}, f, indent=2)
