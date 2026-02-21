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
from app.services.trade_service import PlanLimitExceeded, TradeService

logger = logging.getLogger(__name__)
CONNECT_TOKEN_PATTERN = re.compile(r"^TM-[A-Z0-9]{6}$")
NUMBER_PATTERN = re.compile(r"[-+]?\d+(?:\.\d+)?")
ENTRY_PATTERN = re.compile(r"(?:entry|entry price|buy|current price)\s*[:=]?\s*([-+]?\d+(?:\.\d+)?)", re.IGNORECASE)
EXIT_PATTERN = re.compile(r"(?:exit|exit price|sell|take profit|target|tp)\s*[:=]?\s*([-+]?\d+(?:\.\d+)?)", re.IGNORECASE)
R_MULTIPLE_PATTERN = re.compile(r"([-+]?\d+(?:\.\d+)?)\s*[rR]\b")
INSTRUMENT_PATTERN = re.compile(r"\b[A-Z]{3,12}(?:USDT|USD|USDC)?\b")

IGNORED_INSTRUMENT_TOKENS = {
    "LONG",
    "SHORT",
    "ENTRY",
    "EXIT",
    "PRICE",
    "CURRENT",
    "PROFIT",
    "LOSS",
    "WIN",
    "BREAK",
    "EVEN",
    "CONNECT",
    "TM",
    "BOT",
    "TRADE",
    "TRADES",
    "TAKE",
    "TARGET",
    "STOP",
    "SL",
    "TP",
}


class BotService:
    def __init__(self, db: Session):
        self.db = db
        self.trade_service = TradeService(db)
        self.ai_service = None
        try:
            from app.services.ai_service import AIService

            self.ai_service = AIService()
        except Exception as exc:
            print(f"AI service unavailable: {exc}")

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
            "I can help you log your trades automatically via screenshots, voice notes, or text.\n\n"
            "To get started, please link your account:\n"
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
            return self.send_message(chat_id, "Telegram bot logging is available on Pro and Elite plans.")

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

        return self.send_message(chat_id, f"Connected successfully to {user.name}. Send your trades now.")

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

        if "photo" in message:
            return await self._handle_photo_message(chat_id, user, message)
        if "voice" in message:
            return self.send_message(chat_id, "Voice note received. Processing...")

        text = (message.get("text") or "").strip()
        if not text:
            return self.send_message(chat_id, "Unsupported message format. Send trade text, screenshot, or voice.")
        if text.startswith("/"):
            return self.send_message(
                chat_id,
                "Unknown command. Use `/connect TM-XXXXXX` to link your account or `/news` for today's events.",
            )

        parsed_trade = self._parse_trade_text(text)
        if not parsed_trade:
            return self.send_message(
                chat_id,
                "I could not parse that trade. Try: `Long BTC entry 99000 exit 100000 result win`.",
            )

        try:
            trade = self.trade_service.create_trade(
                user.id,
                TradeCreate(
                    instrument=parsed_trade["instrument"],
                    direction=parsed_trade["direction"],
                    entry_price=parsed_trade["entry_price"],
                    exit_price=parsed_trade["exit_price"],
                    result=parsed_trade["result"],
                    r_multiple=parsed_trade["r_multiple"],
                    trade_timestamp=datetime.now(timezone.utc),
                    input_type="text",
                    raw_input_data={"source": "telegram", "text": text},
                ),
            )
        except PlanLimitExceeded as exc:
            return self.send_message(chat_id, str(exc))
        except Exception:
            logger.exception("Failed to create trade from Telegram text for user_id=%s", user.id)
            return self.send_message(chat_id, "I understood your message but could not save the trade. Try again.")

        reply = (
            f"Trade logged: {trade.direction or '-'} {trade.instrument}\n"
            f"Entry: {trade.entry_price if trade.entry_price is not None else '-'} | "
            f"Exit: {trade.exit_price if trade.exit_price is not None else '-'}\n"
            f"Result: {trade.result or 'PENDING'}"
        )
        return self.send_message(chat_id, reply)

    async def _handle_photo_message(self, chat_id: int, user: User, message: dict):
        caption = (message.get("caption") or "").strip()
        parsed_trade = self._parse_trade_text(caption) if caption else None

        instrument = parsed_trade["instrument"] if parsed_trade else "SCREENSHOT"
        direction = parsed_trade["direction"] if parsed_trade else None
        entry_price = parsed_trade["entry_price"] if parsed_trade else None
        exit_price = parsed_trade["exit_price"] if parsed_trade else None
        result = parsed_trade["result"] if parsed_trade else "PENDING"
        r_multiple = parsed_trade["r_multiple"] if parsed_trade else None

        photos = message.get("photo") or []
        file_id = None
        if photos:
            file_id = photos[-1].get("file_id")

        vision_trade = None
        if self.ai_service and file_id:
            try:
                image_bytes = await download_telegram_file(file_id)
                vision_trade = await self.ai_service.analyze_screenshot(image_bytes, caption=caption or None)
            except TelegramDeliveryError as exc:
                logger.info("Telegram photo download unavailable: %s", exc)
            except Exception:
                logger.exception("Screenshot analysis failed for user_id=%s", user.id)

        if vision_trade and (not parsed_trade or parsed_trade.get("instrument") == "SCREENSHOT"):
            instrument = vision_trade.get("instrument") or instrument
            direction = vision_trade.get("direction") or direction
            try:
                if not entry_price:
                    entry_price = Decimal(str(vision_trade.get("entry_price") or 0.0)) or None
                if not exit_price:
                    exit_price = Decimal(str(vision_trade.get("exit_price") or 0.0)) or None
            except Exception:
                pass

            if caption and vision_trade.get("notes") is None:
                vision_trade["notes"] = caption

        try:
            trade = self.trade_service.create_trade(
                user.id,
                TradeCreate(
                    instrument=instrument,
                    direction=direction,
                    entry_price=entry_price,
                    exit_price=exit_price,
                    result=result,
                    r_multiple=r_multiple,
                    trade_timestamp=datetime.now(timezone.utc),
                    input_type="screenshot",
                    raw_input_data={
                        "source": "telegram",
                        "caption": caption,
                        "telegram_message_id": message.get("message_id"),
                        "telegram_photo_file_id": file_id,
                        "vision_trade": vision_trade,
                    },
                ),
            )
        except PlanLimitExceeded as exc:
            return self.send_message(chat_id, str(exc))
        except Exception:
            logger.exception("Failed to create trade from Telegram screenshot for user_id=%s", user.id)
            return self.send_message(chat_id, "Screenshot received, but I could not save it. Please try again.")

        if parsed_trade or (vision_trade and (vision_trade.get("confidence") or 0) >= 0.45):
            reply = (
                f"Screenshot logged: {trade.direction or '-'} {trade.instrument}\n"
                f"Entry: {trade.entry_price if trade.entry_price is not None else '-'} | "
                f"Exit: {trade.exit_price if trade.exit_price is not None else '-'}\n"
                f"Result: {trade.result or 'PENDING'}"
            )
            return self.send_message(chat_id, reply)

        return self.send_message(
            chat_id,
            "Screenshot logged to your dashboard as PENDING. Add a caption like `Long XAUUSD entry 4890 exit 4950` for auto extraction.",
        )

    def _parse_trade_text(self, text: str) -> dict | None:
        upper_text = text.upper()
        lower_text = text.lower()

        direction = None
        if "long" in lower_text or "buy" in lower_text:
            direction = "LONG"
        elif "short" in lower_text or "sell" in lower_text:
            direction = "SHORT"

        instrument = self._extract_instrument(upper_text)
        if not instrument:
            return None

        entry = self._extract_decimal(ENTRY_PATTERN, text)
        exit_price = self._extract_decimal(EXIT_PATTERN, text)

        if entry is None or exit_price is None:
            numbers = [Decimal(n) for n in NUMBER_PATTERN.findall(text)]
            if entry is None and numbers:
                entry = numbers[0]
            if exit_price is None and len(numbers) > 1:
                exit_price = numbers[1]

        r_multiple = self._extract_decimal(R_MULTIPLE_PATTERN, text)
        result = self._extract_result(lower_text, direction, entry, exit_price)

        return {
            "instrument": instrument,
            "direction": direction,
            "entry_price": entry,
            "exit_price": exit_price,
            "result": result,
            "r_multiple": r_multiple,
        }

    def _extract_instrument(self, upper_text: str) -> str | None:
        candidates = INSTRUMENT_PATTERN.findall(upper_text.replace("/", " "))
        for candidate in candidates:
            if candidate in IGNORED_INSTRUMENT_TOKENS:
                continue
            return candidate
        return None

    def _extract_decimal(self, pattern: re.Pattern, text: str) -> Decimal | None:
        match = pattern.search(text)
        if not match:
            return None
        try:
            return Decimal(match.group(1))
        except (InvalidOperation, IndexError):
            return None

    def _extract_result(
        self,
        lower_text: str,
        direction: str | None,
        entry: Decimal | None,
        exit_price: Decimal | None,
    ) -> str:
        if "break even" in lower_text or "breakeven" in lower_text:
            return "BREAK_EVEN"
        if "win" in lower_text:
            return "WIN"
        if "loss" in lower_text:
            return "LOSS"
        if "profit" in lower_text:
            return "WIN"

        if direction and entry is not None and exit_price is not None:
            diff = exit_price - entry if direction == "LONG" else entry - exit_price
            if diff > 0:
                return "WIN"
            if diff < 0:
                return "LOSS"
            return "BREAK_EVEN"

        return "PENDING"

    def send_message(self, chat_id: int, text: str, parse_mode: str | None = None):
        logger.info("Telegram reply prepared for chat_id=%s", chat_id)
        response = {"chat_id": chat_id, "text": text}
        if parse_mode:
            response["parse_mode"] = parse_mode
        return response
