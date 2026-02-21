from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api import deps
from app.models.user import User
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/summary")
def read_analytics_summary(
    db: Session = Depends(deps.get_db_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    service = AnalyticsService(db)
    return service.get_summary(current_user.id)


@router.get("/by-hour")
def read_analytics_by_hour(
    db: Session = Depends(deps.get_db_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    service = AnalyticsService(db)
    return service.get_by_hour(current_user.id)


@router.get("/by-day")
def read_analytics_by_day(
    db: Session = Depends(deps.get_db_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    service = AnalyticsService(db)
    return service.get_by_day(current_user.id)


@router.get("/by-emotion")
def read_analytics_by_emotion(
    db: Session = Depends(deps.get_db_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    service = AnalyticsService(db)
    return service.get_by_emotion(current_user.id)


@router.get("/by-instrument")
def read_analytics_by_instrument(
    db: Session = Depends(deps.get_db_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    service = AnalyticsService(db)
    return service.get_by_instrument(current_user.id)


@router.get("/drawdown")
def read_analytics_drawdown(
    db: Session = Depends(deps.get_db_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    service = AnalyticsService(db)
    return service.get_drawdown(current_user.id)


@router.get("/calendar")
def read_analytics_calendar(
    db: Session = Depends(deps.get_db_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    service = AnalyticsService(db)
    return service.get_calendar(current_user.id)
