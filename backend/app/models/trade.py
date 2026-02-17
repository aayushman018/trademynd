import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, JSON, Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Trade(Base):
    __tablename__ = "trades"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id"), nullable=False)
    instrument = Column(String, nullable=False)
    direction = Column(String)  # LONG, SHORT
    entry_price = Column(Numeric(12, 4))
    exit_price = Column(Numeric(12, 4))
    stop_loss = Column(Numeric(12, 4))
    take_profit = Column(Numeric(12, 4))
    result = Column(String)  # WIN, LOSS, BREAK_EVEN
    r_multiple = Column(Numeric(8, 4))
    emotion = Column(String)
    trade_timestamp = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    input_type = Column(String)  # screenshot, voice, text
    raw_input_data = Column(JSON)

    user = relationship("User", back_populates="trades")
    mistakes = relationship("TradeMistake", back_populates="trade", cascade="all, delete-orphan")

class TradeMistake(Base):
    __tablename__ = "trade_mistakes"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    trade_id = Column(Uuid, ForeignKey("trades.id"), nullable=False)
    mistake_type = Column(String, nullable=False)
    description = Column(String)

    trade = relationship("Trade", back_populates="mistakes")
