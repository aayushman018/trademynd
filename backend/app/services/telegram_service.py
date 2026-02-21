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


async def download_telegram_file(file_id: str) -> bytes:
    if not settings.TELEGRAM_BOT_TOKEN:
        raise TelegramDeliveryError("Telegram bot token is not configured")

    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getFile"
    async with httpx.AsyncClient(timeout=18.0) as client:
        response = await client.get(url, params={"file_id": file_id})

    if response.status_code >= 400:
        logger.error("Telegram getFile failed (%s): %s", response.status_code, response.text)
        raise TelegramDeliveryError("Telegram API request failed")

    payload = response.json()
    if not payload.get("ok"):
        logger.error("Telegram getFile error: %s", payload)
        raise TelegramDeliveryError(payload.get("description", "Telegram getFile failed"))

    result = payload.get("result") or {}
    file_path = result.get("file_path")
    if not file_path:
        raise TelegramDeliveryError("Telegram file path missing")

    download_url = f"https://api.telegram.org/file/bot{settings.TELEGRAM_BOT_TOKEN}/{file_path}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        file_response = await client.get(download_url)

    if file_response.status_code >= 400:
        logger.error("Telegram file download failed (%s): %s", file_response.status_code, file_response.text)
        raise TelegramDeliveryError("Telegram file download failed")

    return file_response.content
