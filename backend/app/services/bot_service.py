from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.schemas.trade import TradeCreate
from app.services.forex_factory import (
    format_high_impact_news_message,
    format_news_unavailable_message,
    get_today_high_impact_news,
)
from app.services.telegram_connect_service import (
    TelegramTokenStoreError,
    consume_connect_token,
)
from app.services.telegram_service import TelegramDeliveryError, download_telegram_file
from app.services.trade_service import TradeService

logger = logging.getLogger(__name__)
CONNECT_TOKEN_PATTERN = re.compile(r"^TM-[A-Z0-9]{6}$")


class BotService:
    def __init__(self, db: Session):
        self.db = db
        self.trade_service = TradeService(db)
        self.ai_service = None
        try:
            from app.services.ai_service import AIService

            self.ai_service = AIService()
        except Exception as exc:
            logger.exception("AI service unavailable: %s", exc)

    async def process_update(self, update: dict):
        message = update.get("message")
        if not message:
            return

        chat_id = message.get("chat", {}).get("id")
        text = message.get("text", "")
        if chat_id is None:
            return

        if text.startswith("/start"):
            return await self.handle_start(chat_id)
        if text.startswith("/connect"):
            return await self.handle_connect(chat_id, text)
        if text.startswith("/news"):
            return await self.handle_news(chat_id)
        return await self.handle_message(chat_id, message)

    async def handle_start(self, chat_id: int):
        message = (
            "Welcome to TradeJournal AI!\n\n"
            "I'm your trading companion. I can help you log your trades automatically via screenshots, voice notes, or text.\n\n"
            "To get started, let's link your account:\n"
            f"1. Sign up at {settings.FRONTEND_URL}\n"
            "2. Open Connect Telegram in settings\n"
            "3. Generate your connect code\n"
            "4. Send `/connect TM-XXXXXX` here.\n\n"
            f"Bot: @{settings.TELEGRAM_BOT_USERNAME}"
        )
        return self.send_message(chat_id, message)

    async def handle_connect(self, chat_id: int, text: str):
        parts = text.split(maxsplit=1)
        if len(parts) != 2:
            return self.send_message(chat_id, "Usage: /connect TM-XXXXXX")

        token = parts[1].strip().upper()
        if not CONNECT_TOKEN_PATTERN.match(token):
            return self.send_message(chat_id, "Invalid code format. Use /connect TM-XXXXXX")

        try:
            user_id_str = consume_connect_token(token)
        except TelegramTokenStoreError:
            return self.send_message(chat_id, "Connection service is unavailable. Try again in a moment.")

        if not user_id_str:
            return self.send_message(chat_id, "Connect code is invalid or expired. Generate a new one in dashboard.")

        try:
            user_uuid = UUID(user_id_str)
        except (TypeError, ValueError):
            return self.send_message(chat_id, "Invalid connect code. Generate a new one in dashboard.")

        user = self.db.query(User).filter(User.id == user_uuid).first()
        if not user:
            return self.send_message(chat_id, "Account not found for this code. Generate a new one in dashboard.")
        if (user.plan or "free").strip().lower() == "free":
            return self.send_message(chat_id, "Telegram bot logging is available on Pro and Elite plans. Upgrade to unlock!")

        existing_user = self.db.query(User).filter(
            User.telegram_chat_id == chat_id,
            User.telegram_connected.is_(True),
        ).first()
        if existing_user:
            if existing_user.id == user.id:
                return self.send_message(chat_id, "You are already connected to this account.")
            return self.send_message(chat_id, "This chat is already linked to another account.")

        user.telegram_chat_id = chat_id
        user.telegram_connected = True
        self.db.add(user)
        self.db.commit()

        return self.send_message(chat_id, f"Connected successfully to {user.name}.")

    async def handle_news(self, chat_id: int):
        user = self.db.query(User).filter(
            User.telegram_chat_id == chat_id,
            User.telegram_connected.is_(True),
        ).first()
        if not user:
            return self.send_message(chat_id, "Please connect your account first using `/connect TM-XXXXXX`.")

        payload = get_today_high_impact_news()
        events = payload.get("events", [])
        if not payload.get("scraper_healthy", False) and payload.get("error") and not events:
            message = format_news_unavailable_message(payload.get("error"))
        else:
            message = format_high_impact_news_message(events)
        return self.send_message(chat_id, message, parse_mode="HTML")

    async def handle_message(self, chat_id: int, message: dict):
        user = self.db.query(User).filter(
            User.telegram_chat_id == chat_id,
            User.telegram_connected.is_(True),
        ).first()
        if not user:
            return self.send_message(chat_id, "Please connect your account first using `/connect TM-XXXXXX`.")

        if "photo" in message or self._is_image_document(message):
            return await self._handle_image_message(chat_id, user, message)
        if "voice" in message or "audio" in message:
            return await self._handle_audio_message(chat_id, user, message)

        text = (message.get("text") or "").strip()
        if text and not text.startswith("/"):
            return await self._handle_text_message(chat_id, user, text, message)

        if text.startswith("/"):
            return self.send_message(
                chat_id,
                "Unknown command. Use `/connect TM-XXXXXX` to link your account or `/news` for today's events.",
            )
        return self.send_message(chat_id, "Unsupported message format. Send trade text, screenshot, or voice.")

    async def _handle_image_message(self, chat_id: int, user: User, message: dict):
        caption = (message.get("caption") or "").strip()
        file_id, mime_type = self._extract_image_file(message)
        parsed: dict = {}

        try:
            if self.ai_service and file_id:
                image_bytes = await download_telegram_file(file_id)
                parsed = await self.ai_service.analyze_screenshot(
                    image_data=image_bytes,
                    caption=caption,
                    mime_type=mime_type,
                )
            await self._save_trade(
                user=user,
                input_type="screenshot",
                parsed=parsed,
                raw_input_data={
                    "source": "telegram",
                    "mode": "image",
                    "caption": caption,
                    "telegram_message_id": message.get("message_id"),
                    "telegram_file_id": file_id,
                    "mime_type": mime_type,
                    "parsed": parsed,
                },
            )
        except TelegramDeliveryError as exc:
            logger.error("Failed to download Telegram image file: %s", exc)
            await self._save_trade(
                user=user,
                input_type="screenshot",
                parsed={},
                raw_input_data={
                    "source": "telegram",
                    "mode": "image",
                    "caption": caption,
                    "telegram_message_id": message.get("message_id"),
                    "download_error": str(exc),
                },
            )
        except Exception:
            logger.exception("Image trade logging failed for user_id=%s", user.id)
            try:
                await self._save_trade(
                    user=user,
                    input_type="screenshot",
                    parsed={},
                    raw_input_data={
                        "source": "telegram",
                        "mode": "image",
                        "caption": caption,
                        "telegram_message_id": message.get("message_id"),
                        "error": "image_processing_failed",
                    },
                )
            except Exception:
                logger.exception("Fallback image save failed for user_id=%s", user.id)

        return self.send_message(chat_id, "Logged ✅")

    async def _handle_text_message(self, chat_id: int, user: User, text: str, message: dict):
        parsed: dict = {}
        try:
            if self.ai_service:
                parsed = await self.ai_service.analyze_text(text)
            await self._save_trade(
                user=user,
                input_type="text",
                parsed=parsed,
                raw_input_data={
                    "source": "telegram",
                    "mode": "text",
                    "text": text,
                    "telegram_message_id": message.get("message_id"),
                    "parsed": parsed,
                },
            )
        except Exception:
            logger.exception("Text trade logging failed for user_id=%s", user.id)
            try:
                await self._save_trade(
                    user=user,
                    input_type="text",
                    parsed={},
                    raw_input_data={
                        "source": "telegram",
                        "mode": "text",
                        "text": text,
                        "telegram_message_id": message.get("message_id"),
                        "error": "text_processing_failed",
                    },
                )
            except Exception:
                logger.exception("Fallback text save failed for user_id=%s", user.id)

        return self.send_message(chat_id, "Logged ✅")

    async def _handle_audio_message(self, chat_id: int, user: User, message: dict):
        file_id, mime_type = self._extract_audio_file(message)
        parsed: dict = {}
        transcript = ""

        try:
            if self.ai_service and file_id:
                audio_bytes = await download_telegram_file(file_id)
                transcript = await self.ai_service.transcribe_audio(
                    audio_data=audio_bytes,
                    mime_type=mime_type,
                )
                parsed = await self.ai_service.analyze_text(transcript)

            await self._save_trade(
                user=user,
                input_type="voice",
                parsed=parsed,
                raw_input_data={
                    "source": "telegram",
                    "mode": "audio",
                    "telegram_message_id": message.get("message_id"),
                    "telegram_file_id": file_id,
                    "mime_type": mime_type,
                    "transcript": transcript,
                    "parsed": parsed,
                },
            )
        except TelegramDeliveryError as exc:
            logger.error("Failed to download Telegram audio file: %s", exc)
            await self._save_trade(
                user=user,
                input_type="voice",
                parsed={},
                raw_input_data={
                    "source": "telegram",
                    "mode": "audio",
                    "telegram_message_id": message.get("message_id"),
                    "download_error": str(exc),
                },
            )
        except Exception:
            logger.exception("Audio trade logging failed for user_id=%s", user.id)
            try:
                await self._save_trade(
                    user=user,
                    input_type="voice",
                    parsed={},
                    raw_input_data={
                        "source": "telegram",
                        "mode": "audio",
                        "telegram_message_id": message.get("message_id"),
                        "transcript": transcript,
                        "error": "audio_processing_failed",
                    },
                )
            except Exception:
                logger.exception("Fallback audio save failed for user_id=%s", user.id)

        return self.send_message(chat_id, "Logged ✅")

    async def _save_trade(self, user: User, input_type: str, parsed: dict, raw_input_data: dict):
        instrument = parsed.get("instrument")
        direction = self._normalize_direction(parsed.get("direction"))
        entry_price = self._to_decimal(parsed.get("entry"))
        stop_loss = self._to_decimal(parsed.get("sl"))
        take_profit = self._to_decimal(parsed.get("tp"))
        result = self._normalize_result(parsed.get("result"))
        timeframe = parsed.get("timeframe") if isinstance(parsed.get("timeframe"), str) else None
        pnl_amount = self._to_decimal(parsed.get("pnl_amount"))

        trade_create = TradeCreate(
            instrument=instrument if isinstance(instrument, str) and instrument.strip() else "UNKNOWN",
            timeframe=timeframe,
            direction=direction,
            entry_price=entry_price,
            stop_loss=stop_loss,
            take_profit=take_profit,
            result=result,
            pnl_amount=pnl_amount,
            trade_timestamp=datetime.now(timezone.utc),
            input_type=input_type,
            raw_input_data=raw_input_data,
        )
        self.trade_service.create_trade(user.id, trade_create, enforce_plan_limit=False)

    def _extract_image_file(self, message: dict) -> tuple[str | None, str]:
        document = message.get("document") or {}
        document_mime = document.get("mime_type") or "image/jpeg"
        if self._is_image_document(message):
            return document.get("file_id"), document_mime

        photos = message.get("photo") or []
        if photos:
            return photos[-1].get("file_id"), "image/jpeg"
        return None, "image/jpeg"

    def _extract_audio_file(self, message: dict) -> tuple[str | None, str]:
        voice = message.get("voice") or {}
        if voice.get("file_id"):
            return voice.get("file_id"), voice.get("mime_type") or "audio/ogg"

        audio = message.get("audio") or {}
        if audio.get("file_id"):
            return audio.get("file_id"), audio.get("mime_type") or "audio/mpeg"
        return None, "audio/ogg"

    def _is_image_document(self, message: dict) -> bool:
        document = message.get("document") or {}
        mime_type = document.get("mime_type") or ""
        return bool(document.get("file_id") and mime_type.startswith("image/"))

    def _to_decimal(self, value) -> Decimal | None:
        if value is None or value == "":
            return None
        try:
            return Decimal(str(value))
        except (InvalidOperation, ValueError, TypeError):
            return None

    def _normalize_direction(self, direction_value) -> str | None:
        if not isinstance(direction_value, str):
            return None
        value = direction_value.strip().upper()
        if value in {"LONG", "SHORT"}:
            return value
        if value == "BUY":
            return "LONG"
        if value == "SELL":
            return "SHORT"
        return None

    def _normalize_result(self, result_value) -> str | None:
        if not isinstance(result_value, str):
            return None
        value = result_value.strip().upper()
        if value in {"WIN", "LOSS", "BREAK_EVEN", "PENDING"}:
            return value
        return None

    def send_message(self, chat_id: int, text: str, parse_mode: str | None = None):
        logger.info("Telegram reply prepared for chat_id=%s", chat_id)
        response = {"chat_id": chat_id, "text": text}
        if parse_mode:
            response["parse_mode"] = parse_mode
        return response
