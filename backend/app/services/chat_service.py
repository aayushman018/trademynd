from sqlalchemy.orm import Session
from app.services.ai_service import AIService
from app.services.trade_service import TradeService
from app.schemas.trade import TradeCreate
from app.models.user import User
from decimal import Decimal
import json

class ChatService:
    def __init__(self, db: Session):
        self.db = db
        self.ai_service = AIService()
        self.trade_service = TradeService(db)

    async def process_message(self, user: User, text: str) -> dict:
        """
        Process a text message from a user (web or bot).
        1. Analyze text with AI.
        2. If trade detected, save it.
        3. Return response message and data.
        """
        
        # 1. Analyze
        analysis = await self.ai_service.analyze_text(text)
        
        response_text = ""
        trade_data = None
        
        if analysis.get("instrument") != "UNKNOWN":
            # 2. Create Trade
            try:
                trade_in = TradeCreate(
                    instrument=analysis.get("instrument"),
                    direction=analysis.get("direction"),
                    entry_price=Decimal(str(analysis.get("entry_price", 0))),
                    exit_price=Decimal(str(analysis.get("exit_price", 0))),
                    result=analysis.get("result", "PENDING"),
                    # Simple R calc if not provided
                    r_multiple=Decimal("0.0"), 
                    input_type="text",
                    raw_input_data={"text": text}
                )
                
                # Calculate R if possible
                if trade_in.entry_price and trade_in.exit_price and trade_in.entry_price > 0:
                    diff = trade_in.exit_price - trade_in.entry_price
                    if trade_in.direction == "SHORT":
                        diff = -diff
                    # Assuming 1% risk or just raw price diff for now as stub
                    # Real R requires Stop Loss. Stub AI doesn't always return SL.
                    pass

                trade = self.trade_service.create_trade(user.id, trade_in)
                trade_data = trade
                
                # 3. Format Response
                response_text = (
                    f"Processed: {trade.direction} {trade.instrument}\n"
                    f"Entry: ${trade.entry_price} → Exit: ${trade.exit_price}\n"
                    f"Result: {trade.result}"
                )
            except Exception as e:
                print(f"Error saving trade: {e}")
                response_text = "I understood the trade but couldn't save it properly. Please check the format."
        else:
            response_text = "I didn't detect a trade in that message. Try sending something like 'Long BTCUSDT entry 45000 exit 46000'."

        return {
            "message": response_text,
            "data": analysis,
            "trade_id": str(trade_data.id) if trade_data else None
        }
