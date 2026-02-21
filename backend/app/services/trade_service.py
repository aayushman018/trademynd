from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.trade import Trade
from app.models.user import User
from app.schemas.trade import TradeCreate
from uuid import UUID
from datetime import datetime, timezone


class PlanLimitExceeded(Exception):
    pass


class TradeService:
    def __init__(self, db: Session):
        self.db = db

    def get_trades_by_user(self, user_id: UUID, skip: int = 0, limit: int = 100):
        return self.db.query(Trade).filter(Trade.user_id == user_id).offset(skip).limit(limit).all()

    def create_trade(self, user_id: UUID, trade_in: TradeCreate):
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise PlanLimitExceeded("User not found.")

        if (user.plan or "free").strip().lower() == "free":
            now = datetime.now(timezone.utc)
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if month_start.month == 12:
                next_month = month_start.replace(year=month_start.year + 1, month=1)
            else:
                next_month = month_start.replace(month=month_start.month + 1)

            monthly_count = (
                self.db.query(Trade)
                .filter(
                    Trade.user_id == user_id,
                    Trade.created_at >= month_start,
                    Trade.created_at < next_month,
                )
                .count()
            )
            if monthly_count >= settings.FREE_PLAN_MONTHLY_TRADE_CAP:
                raise PlanLimitExceeded(
                    f"Free plan limit reached: {settings.FREE_PLAN_MONTHLY_TRADE_CAP} trades per month. Upgrade to Pro for unlimited trades."
                )

        db_trade = Trade(
            user_id=user_id,
            **trade_in.model_dump(exclude_unset=True)
        )
        self.db.add(db_trade)
        self.db.commit()
        self.db.refresh(db_trade)
        return db_trade
