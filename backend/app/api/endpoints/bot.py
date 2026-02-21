from fastapi import APIRouter, Request, Depends, BackgroundTasks, Header, HTTPException
from sqlalchemy.orm import Session
from app.api import deps
from app.services.bot_service import BotService
from app.core.config import settings
from app.models.user import User
import httpx
import logging
from app.services.telegram_service import TelegramDeliveryError, send_telegram_message

router = APIRouter()
logger = logging.getLogger(__name__)


async def _send_telegram_message_background(chat_id: int, text: str, parse_mode: str | None = None):
    try:
        await send_telegram_message(chat_id=chat_id, text=text, parse_mode=parse_mode)
    except TelegramDeliveryError as exc:
        logger.error("Telegram sendMessage failed: %s", exc)

@router.post("/webhook")
async def telegram_webhook(
    request: Request, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db_session),
    telegram_secret_token: str | None = Header(default=None, alias="X-Telegram-Bot-Api-Secret-Token"),
):
    expected_secret = settings.TELEGRAM_WEBHOOK_SECRET
    if expected_secret and telegram_secret_token != expected_secret:
        raise HTTPException(status_code=403, detail="Invalid webhook secret token")

    data = await request.json()
    
    # Process in background to avoid timeout
    # However, for simplicity in this MVP, we might process synchronously 
    # if it's fast (like /start), but trade processing should be async.
    
    # We need to handle the DB session carefully with background tasks.
    # Ideally, the service creates its own session or we pass the data to a worker.
    # For now, let's instantiate service here and run logic.
    
    bot_service = BotService(db)
    response = await bot_service.process_update(data)
    
    if response:
        # Send the response back to Telegram
        background_tasks.add_task(
            _send_telegram_message_background,
            response["chat_id"],
            response["text"],
            response.get("parse_mode"),
        )
    
    return {"status": "ok"}

@router.get("/webhook-info")
async def get_webhook_info(
    current_user: User = Depends(deps.get_current_user),
):
    """
    Inspect Telegram webhook status for the configured bot token.
    Requires authentication.
    """
    if not settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=503, detail="Telegram bot token is not configured")

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getWebhookInfo"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url)

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail="Failed to query Telegram webhook status")

    payload = response.json()
    if not payload.get("ok"):
        raise HTTPException(status_code=502, detail=payload.get("description", "Telegram API error"))
    return payload.get("result", {})
