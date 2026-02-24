from fastapi import APIRouter, Request, BackgroundTasks, Header, HTTPException
from sqlalchemy import text
from app.services.bot_service import BotService
from app.core.config import settings
from app.core.database import SessionLocal
import httpx
import logging
from app.services.telegram_service import TelegramDeliveryError, send_telegram_message

router = APIRouter()
logger = logging.getLogger(__name__)

# In-process set for idempotency (fast path before DB check)
_processed_update_ids: set[int] = set()


async def _process_update_background(data: dict):
    """
    Runs the full bot logic in the background AFTER the webhook has already
    returned 200 OK to Telegram. Uses its own DB session.
    """
    update_id = data.get("update_id")

    # 1. Enforce idempotency via in-memory set (fast, handles concurrent retries)
    if update_id:
        if update_id in _processed_update_ids:
            logger.info(f"[idempotency] Skipping already-processed update_id={update_id} (in-memory)")
            return
        _processed_update_ids.add(update_id)
        # Cap set size to avoid unbounded growth
        if len(_processed_update_ids) > 2000:
            oldest = next(iter(_processed_update_ids))
            _processed_update_ids.discard(oldest)

    # 2. Also enforce via DB for cross-instance deduplication
    db = SessionLocal()
    try:
        if update_id:
            try:
                result = db.execute(
                    text("INSERT INTO telegram_updates (update_id) VALUES (:uid) ON CONFLICT DO NOTHING RETURNING update_id"),
                    {"uid": update_id}
                )
                db.commit()
                if result.rowcount == 0:
                    logger.info(f"[idempotency] Skipping duplicate update_id={update_id} (DB)")
                    return
            except Exception as e:
                logger.warning(f"[idempotency] DB check failed (table may not exist yet): {e}")
                db.rollback()

        # 3. Run actual bot logic
        bot_service = BotService(db)
        response = await bot_service.process_update(data)

        # 4. Send response to Telegram
        if response:
            try:
                await send_telegram_message(
                    chat_id=response["chat_id"],
                    text=response["text"],
                    parse_mode=response.get("parse_mode"),
                )
            except TelegramDeliveryError as exc:
                logger.error(f"Telegram sendMessage failed: {exc}")

    except Exception as e:
        logger.error(f"Error in background update processing: {e}", exc_info=True)
    finally:
        db.close()


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    telegram_secret_token: str | None = Header(default=None, alias="X-Telegram-Bot-Api-Secret-Token"),
):
    expected_secret = settings.TELEGRAM_WEBHOOK_SECRET
    if expected_secret and telegram_secret_token != expected_secret:
        raise HTTPException(status_code=403, detail="Invalid webhook secret token")

    data = await request.json()

    # Fast-path in-memory duplicate check BEFORE spawning background task
    update_id = data.get("update_id")
    if update_id and update_id in _processed_update_ids:
        logger.info(f"[webhook] Fast-path: dropping duplicate update_id={update_id}")
        return {"status": "ok"}

    # Schedule the heavy processing as a background task —
    # this returns 200 to Telegram immediately, preventing retries.
    background_tasks.add_task(_process_update_background, data)

    return {"status": "ok"}


@router.get("/webhook-info")
async def get_webhook_info():
    """
    Inspect Telegram webhook status for the configured bot token.
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
