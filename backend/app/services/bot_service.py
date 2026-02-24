from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.models.trade import Trade
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
            if user.awaiting_response_trade_id:
                trade = self.db.query(Trade).filter(Trade.id == user.awaiting_response_trade_id).first()
                if trade and text.lower() != "edit" and not text.lower().startswith("edit "):
                    return await self._handle_conversational_response(chat_id, user, text, trade)
            
            if text.lower().startswith("edit "):
                return await self._handle_edit_message(chat_id, user, text)
                
            return await self._handle_text_message(chat_id, user, text, message)

        if text.startswith("/"):
            return self.send_message(
                chat_id,
                "Unknown command. Use `/connect TM-XXXXXX` to link your account or `/news` for today's events.",
            )
        return self.send_message(chat_id, "Unsupported message format. Send trade text, screenshot, or voice.")
        
    async def _handle_conversational_response(self, chat_id: int, user: User, text: str, trade: Trade):
        resp_type = user.awaiting_response_type
        
        if resp_type == "narrative_confirmation":
            if text.strip().upper() == "YES":
                user.awaiting_response_trade_id = None
                user.awaiting_response_type = None
                self.db.add(user)
                self.db.commit()
                return self.send_message(chat_id, f"Awesome, {trade.trade_ref} saved securely.")
            else:
                trade.notes = (trade.notes or "") + f" | Correction: {text}"
                self.db.add(trade)
                self.db.commit()
                return self.send_message(chat_id, "Noted your context updates! Edit any specific field manually using `edit T1 field value`.")
        
        parsed_fields = {}
        if self.ai_service and resp_type not in ["missing_emotion"] and not resp_type.startswith("anomaly_"):
            # Route text through AI to extract numbers gracefully (e.g. "50 dollars" -> {"pnl_amount": 50})
            parsed_fields = await self.ai_service.analyze_text(text)
        
        if resp_type == "missing_entry":
            trade.entry_price = self._to_decimal(parsed_fields.get("entry_price") or parsed_fields.get("entry") or text)
        elif resp_type == "missing_direction":
            trade.direction = self._normalize_direction(parsed_fields.get("direction") or text)
        elif resp_type == "missing_result":
            trade.result = self._normalize_result(parsed_fields.get("result") or text)
        elif resp_type == "missing_pnl":
            trade.pnl_amount = self._to_decimal(parsed_fields.get("pnl_amount") or text)
        elif resp_type == "missing_emotion":
            trade.emotion = text
        elif resp_type and resp_type.startswith("anomaly_"):
            trade.notes = (trade.notes or "") + f" | {resp_type}: {text}"
            
        self.db.add(trade)
        self.db.commit()
        
        return await self._evaluate_trade_state(chat_id, user, trade)
        
    async def _handle_edit_message(self, chat_id: int, user: User, text: str):
        parts = text.split(maxsplit=3)
        if len(parts) < 4:
            return self.send_message(chat_id, "Usage: edit [trade_ref] [field] [new value]")
        
        _, trade_ref_input, field, new_value = parts
        trade_ref = trade_ref_input.upper()
        field = field.lower()
        
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        trade = self.db.query(Trade).filter(
            Trade.user_id == user.id,
            Trade.trade_ref == trade_ref,
            Trade.created_at >= today_start
        ).first()
        
        if not trade:
            return self.send_message(chat_id, f"Couldn't find {trade_ref} today. Please check the trade reference.")
            
        if field in ["instrument"]:
            trade.instrument = new_value.upper()
        elif field in ["direction"]:
            trade.direction = self._normalize_direction(new_value)
        elif field in ["entry", "entry_price"]:
            trade.entry_price = self._to_decimal(new_value)
        elif field in ["sl", "stop_loss"]:
            trade.stop_loss = self._to_decimal(new_value)
        elif field in ["tp", "take_profit"]:
            trade.take_profit = self._to_decimal(new_value)
        elif field in ["result"]:
            trade.result = self._normalize_result(new_value)
        elif field in ["pnl", "pnl_amount"]:
            trade.pnl_amount = self._to_decimal(new_value)
        elif field in ["emotion"]:
            trade.emotion = new_value
        else:
            return self.send_message(chat_id, f"Unknown field '{field}'. Please use instrument, direction, entry, sl, tp, result, pnl, or emotion.")
            
        self.db.add(trade)
        self.db.commit()
        return self.send_message(chat_id, f"Updated ✅ — {trade_ref} {field} changed to {new_value}")

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
            
            logger.info("Gemini Raw Response: %s", parsed)

            return_msg, trade = await self._save_trade(
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
            self.send_message(chat_id, return_msg)
            return await self._evaluate_trade_state(chat_id, user, trade)
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
                return self.send_message(chat_id, "Logged fallback trade ✅")
            except Exception:
                logger.exception("Fallback image save failed for user_id=%s", user.id)
                return self.send_message(chat_id, "Failed to log trade due to a server error.")

    async def _handle_text_message(self, chat_id: int, user: User, text: str, message: dict):
        word_count = len(text.split())
        is_narrative = word_count > 50

        try:
            if self.ai_service:
                if is_narrative:
                    parsed = await self.ai_service.analyze_narrative_text(text)
                else:
                    parsed = await self.ai_service.analyze_text(text)
            
            logger.info("Gemini Raw Response: %s", parsed)

            return_msg, trade = await self._save_trade(
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
                is_narrative=is_narrative
            )
            self.send_message(chat_id, return_msg)
            
            if is_narrative:
                user.awaiting_response_trade_id = trade.id
                user.awaiting_response_type = "narrative_confirmation"
                self.db.add(user)
                self.db.commit()
                return {"chat_id": chat_id, "text": "Does this summary look right? Reply YES to confirm or correct anything."}
            else:
                return await self._evaluate_trade_state(chat_id, user, trade)
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
                return self.send_message(chat_id, "Logged fallback trade ✅")
            except Exception:
                logger.exception("Fallback text save failed for user_id=%s", user.id)
                return self.send_message(chat_id, "Failed to log trade due to a server error.")

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
                
                word_count = len(transcript.split())
                is_narrative = word_count > 50
                
                if is_narrative:
                    parsed = await self.ai_service.analyze_narrative_text(transcript)
                else:
                    parsed = await self.ai_service.analyze_text(transcript)

            logger.info("Gemini Raw Response: %s", parsed)

            return_msg, trade = await self._save_trade(
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
                is_narrative=is_narrative
            )
            self.send_message(chat_id, return_msg)
            
            if is_narrative:
                user.awaiting_response_trade_id = trade.id
                user.awaiting_response_type = "narrative_confirmation"
                self.db.add(user)
                self.db.commit()
                return {"chat_id": chat_id, "text": "Does this summary look right? Reply YES to confirm or correct anything."}
            else:
                return await self._evaluate_trade_state(chat_id, user, trade)
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
                return self.send_message(chat_id, "Logged fallback trade ✅")
            except Exception:
                logger.exception("Fallback audio save failed for user_id=%s", user.id)
                return self.send_message(chat_id, "Failed to log trade due to a server error.")

    async def _save_trade(self, user: User, input_type: str, parsed: dict, raw_input_data: dict, is_narrative: bool = False) -> tuple[str, Trade]:
        instrument = parsed.get("instrument")
        direction = self._normalize_direction(parsed.get("direction"))
        entry_price = self._to_decimal(parsed.get("entry_price") or parsed.get("entry"))
        stop_loss = self._to_decimal(parsed.get("stop_loss") or parsed.get("sl"))
        take_profit = self._to_decimal(parsed.get("take_profit") or parsed.get("tp"))
        result = self._normalize_result(parsed.get("result"))
        timeframe = parsed.get("timeframe") if isinstance(parsed.get("timeframe"), str) else None
        pnl_amount = self._to_decimal(parsed.get("pnl_amount"))
        emotion = parsed.get("emotion")
        emotion_score = self._to_decimal(parsed.get("emotion_score"))
        
        narrative_data = None
        if is_narrative:
            narrative_data = {
                "emotions": parsed.get("emotions", []),
                "mistakes": parsed.get("mistakes", []),
                "lessons": parsed.get("lessons", []),
                "tags": parsed.get("tags", []),
                "narrative_summary": parsed.get("narrative_summary")
            }

        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        daily_count = self.db.query(Trade).filter(
            Trade.user_id == user.id,
            Trade.created_at >= today_start
        ).count()
        trade_ref = f"T{daily_count + 1}"

        trade_create = TradeCreate(
            trade_ref=trade_ref,
            instrument=instrument if isinstance(instrument, str) and instrument.strip() else "UNKNOWN",
            timeframe=timeframe,
            direction=direction,
            entry_price=entry_price,
            stop_loss=stop_loss,
            take_profit=take_profit,
            result=result,
            pnl_amount=pnl_amount,
            emotion=emotion,
            emotion_score=emotion_score,
            narrative_data=narrative_data,
            trade_timestamp=datetime.now(timezone.utc),
            input_type=input_type,
            raw_input_data=raw_input_data,
        )
        created_trade = self.trade_service.create_trade(user.id, trade_create, enforce_plan_limit=False)

        day_str = now.strftime("%d %b")
        pnl_str = f"-${abs(pnl_amount)}" if pnl_amount is not None and pnl_amount < 0 else (f"+${pnl_amount}" if pnl_amount is not None else "N/A")
        
        msg = f"Logged ✅ — Trade {trade_ref} ({day_str})\n"
        msg += "───────────────────\n"
        msg += f"Instrument : {trade_create.instrument}\n"
        msg += f"Direction  : {trade_create.direction or 'N/A'}\n"
        
        entry_str = f"{trade_create.entry_price:,.2f}" if trade_create.entry_price is not None else "N/A"
        tp_str = f"{trade_create.take_profit:,.2f}" if trade_create.take_profit is not None else "N/A"
        sl_str = f"{trade_create.stop_loss:,.2f}" if trade_create.stop_loss is not None else "N/A"
        
        msg += f"Entry      : {entry_str}\n"
        msg += f"TP         : {tp_str}\n"
        msg += f"SL         : {sl_str}\n"
        msg += f"Result     : {trade_create.result or 'N/A'}\n"
        msg += f"PnL        : {pnl_str}\n"
        msg += "───────────────────\n"

        if is_narrative and narrative_data:
            if emotion_score:
                msg += f"🧠 Emotional Score : {emotion_score}/10\n"
            emotions = ", ".join(narrative_data.get("emotions", []))
            if emotions:
                msg += f"😤 Emotions : {emotions}\n"
            msg += "───────────────────\n"
            
            summary = narrative_data.get('narrative_summary')
            if summary:
                msg += "📝 Summary:\n"
                msg += f"{summary}\n"
                msg += "───────────────────\n"
                
            mistakes = narrative_data.get("mistakes", [])
            if mistakes:
                msg += "⚠️ Mistakes detected:\n"
                for m in mistakes:
                    msg += f"- {m}\n"
                msg += "───────────────────\n"
                
            lessons = narrative_data.get("lessons", [])
            if lessons:
                msg += "💡 Lessons:\n"
                for l in lessons:
                    msg += f"- {l}\n"
                msg += "───────────────────\n"

        return msg, created_trade
        
    async def _evaluate_trade_state(self, chat_id: int, user: User, trade: Trade):
        if trade.pnl_amount is None:
            user.awaiting_response_trade_id = trade.id
            user.awaiting_response_type = "missing_pnl"
            self.db.add(user)
            self.db.commit()
            return self.send_message(chat_id, "Hey, what was the P&L on this one?")
            
        if not trade.result:
            user.awaiting_response_trade_id = trade.id
            user.awaiting_response_type = "missing_result"
            self.db.add(user)
            self.db.commit()
            return self.send_message(chat_id, "Did this trade hit TP or SL?")
            
        if not trade.direction:
            user.awaiting_response_trade_id = trade.id
            user.awaiting_response_type = "missing_direction"
            self.db.add(user)
            self.db.commit()
            return self.send_message(chat_id, "Was this a long or short?")
            
        if trade.entry_price is None:
            user.awaiting_response_trade_id = trade.id
            user.awaiting_response_type = "missing_entry"
            self.db.add(user)
            self.db.commit()
            return self.send_message(chat_id, "What was your entry price?")
            
        if not trade.emotion and not trade.emotion_score:
            user.awaiting_response_trade_id = trade.id
            user.awaiting_response_type = "missing_emotion"
            self.db.add(user)
            self.db.commit()
            msg = "How were you feeling during this trade?\nReply with one or more:\n😤 Revenge trading\n😰 Anxious\n🎯 Disciplined\n😍 FOMO\n😎 Confident\n💭 Overthinking\nOr type your own emotion."
            return self.send_message(chat_id, msg)
            
        # Anomaly checks
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        notes_lower = (trade.notes or "").lower()
        
        # 3+ losses check
        if trade.result == "LOSS" and "valid setup" not in notes_lower and "revenge" not in notes_lower:
            loss_count = self.db.query(Trade).filter(
                Trade.user_id == user.id,
                Trade.result == "LOSS",
                Trade.created_at >= today_start
            ).count()
            if loss_count >= 3:
                user.awaiting_response_trade_id = trade.id
                user.awaiting_response_type = "anomaly_3losses"
                self.db.add(user)
                self.db.commit()
                return self.send_message(chat_id, f"You've taken {loss_count} losses today. Still seeing a valid setup or is this revenge trading?")
                
        # R:R check
        if "intentional" not in notes_lower and "r:r" not in notes_lower:
            if trade.entry_price and trade.stop_loss and trade.take_profit:
                risk = abs(trade.entry_price - trade.stop_loss)
                reward = abs(trade.take_profit - trade.entry_price)
                if risk > 0 and (reward / risk) < 1:
                    user.awaiting_response_trade_id = trade.id
                    user.awaiting_response_type = "anomaly_rr"
                    self.db.add(user)
                    self.db.commit()
                    return self.send_message(chat_id, "R:R on this looks below 1:1. Was that intentional?")
                    
        user.awaiting_response_trade_id = None
        user.awaiting_response_type = None
        self.db.add(user)
        self.db.commit()
        return self.send_message(chat_id, f"All good, {trade.trade_ref} is fully logged 🎯")

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
