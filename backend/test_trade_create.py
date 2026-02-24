import os
import sys
from datetime import datetime, timezone

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.schemas.trade import TradeCreate

try:
    trade_create = TradeCreate(
        trade_ref="T1",
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
        raw_input_data={"source": "telegram"},
    )
    print("TradeCreate valid!", trade_create.dict())
except Exception as e:
    import traceback
    traceback.print_exc()

