from typing import Optional, List, Any, Dict
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from decimal import Decimal

class TradeMistakeBase(BaseModel):
    mistake_type: str
    description: Optional[str] = None

class TradeMistakeCreate(TradeMistakeBase):
    pass

class TradeMistake(TradeMistakeBase):
    id: UUID
    trade_id: UUID

    class Config:
        from_attributes = True

class TradeBase(BaseModel):
    instrument: str
    direction: Optional[str] = None
    entry_price: Optional[Decimal] = None
    exit_price: Optional[Decimal] = None
    stop_loss: Optional[Decimal] = None
    take_profit: Optional[Decimal] = None
    result: Optional[str] = None
    r_multiple: Optional[Decimal] = None
    emotion: Optional[str] = None
    trade_timestamp: Optional[datetime] = None
    input_type: Optional[str] = None
    raw_input_data: Optional[Dict[str, Any]] = None

class TradeCreate(TradeBase):
    pass

class TradeUpdate(TradeBase):
    pass

class Trade(TradeBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    mistakes: List[TradeMistake] = []

    class Config:
        from_attributes = True
