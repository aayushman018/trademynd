from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.models.user import User
from app.schemas.trade import Trade, TradeCreate
from app.services.trade_service import PlanLimitExceeded, TradeService

router = APIRouter()

@router.get("", response_model=List[Trade])
def read_trades(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve trades.
    """
    service = TradeService(db)
    return service.get_trades_by_user(current_user.id, skip=skip, limit=limit)

@router.post("", response_model=Trade)
def create_trade(
    *,
    db: Session = Depends(deps.get_db_session),
    trade_in: TradeCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Create new trade.
    """
    service = TradeService(db)
    try:
        return service.create_trade(current_user.id, trade_in)
    except PlanLimitExceeded as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
