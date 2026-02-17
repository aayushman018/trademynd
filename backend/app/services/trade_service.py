from sqlalchemy.orm import Session
from app.models.trade import Trade
from app.schemas.trade import TradeCreate
from uuid import UUID

class TradeService:
    def __init__(self, db: Session):
        self.db = db

    def get_trades_by_user(self, user_id: UUID, skip: int = 0, limit: int = 100):
        return self.db.query(Trade).filter(Trade.user_id == user_id).offset(skip).limit(limit).all()

    def create_trade(self, user_id: UUID, trade_in: TradeCreate):
        db_trade = Trade(
            user_id=user_id,
            **trade_in.model_dump(exclude_unset=True)
        )
        self.db.add(db_trade)
        self.db.commit()
        self.db.refresh(db_trade)
        return db_trade
