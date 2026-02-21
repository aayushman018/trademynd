from __future__ import annotations

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class TelegramDeliveryError(Exception):
    pass


async def send_telegram_message(chat_id: int, text: str, parse_mode: str | None = None) -> None:
    if not settings.TELEGRAM_BOT_TOKEN:
        raise TelegramDeliveryError("Telegram bot token is not configured")

    payload = {"chat_id": chat_id, "text": text}
    if parse_mode:
        payload["parse_mode"] = parse_mode

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient(timeout=12.0) as client:
        response = await client.post(url, json=payload)

    if response.status_code >= 400:
        logger.error("Telegram sendMessage failed (%s): %s", response.status_code, response.text)
        raise TelegramDeliveryError("Telegram API request failed")

    payload = response.json()
    if not payload.get("ok"):
        logger.error("Telegram sendMessage error: %s", payload)
        raise TelegramDeliveryError(payload.get("description", "Telegram delivery failed"))
