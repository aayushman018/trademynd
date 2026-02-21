from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api import deps
from app.models.user import User
from app.services.forex_factory import (
    format_high_impact_news_message,
    format_news_unavailable_message,
    get_today_high_impact_news,
)
from app.services.telegram_service import TelegramDeliveryError, send_telegram_message

router = APIRouter()


@router.get("/today")
def read_today_news(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    # current_user dependency ensures only authenticated users can access this endpoint.
    _ = current_user
    return get_today_high_impact_news()


@router.post("/send-to-telegram")
async def send_today_news_to_telegram(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    if not current_user.telegram_connected or not current_user.telegram_chat_id:
        raise HTTPException(status_code=400, detail="Telegram is not connected for this account")

    payload = get_today_high_impact_news()
    events = payload.get("events", [])
    if not payload.get("scraper_healthy", False) and payload.get("error") and not events:
        message = format_news_unavailable_message(payload.get("error"))
    else:
        message = format_high_impact_news_message(events)

    try:
        await send_telegram_message(
            chat_id=int(current_user.telegram_chat_id),
            text=message,
            parse_mode="HTML",
        )
    except TelegramDeliveryError as exc:
        raise HTTPException(status_code=502, detail="Failed to deliver message to Telegram") from exc

    return {
        "ok": True,
        "delivered": True,
        "event_count": len(events),
        "scraper_healthy": payload.get("scraper_healthy", False),
        "from_cache": payload.get("from_cache", False),
        "source": payload.get("source", "none"),
    }
