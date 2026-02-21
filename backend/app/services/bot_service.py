import logging
import re
import json
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
    "TOOK",
    "MADE",
    "GOT",
    "HAVE",
    "WITH",
    "FROM",
    "INTO",
    "OUT",
    "OF",
    "FOR",
    "THIS",
    "THAT",
    "THE",
    "AN",
    "AT",
    "ON",
    "IN",
    "BY",
    "UP",
    "DOWN",
    "OVER",
    "UNDER",
    "THEN",
    "NOW",
    "WILL",
    "SHALL",
    "MAY",
    "MIGHT",
    "CAN",
    "COULD",
    "WOULD",
    "SHOULD",
    "MUST",
    "BE",
    "AM",
    "IS",
    "ARE",
    "WAS",
    "WERE",
    "BEEN",
    "BEING",
    "DO",
    "DOES",
    "DID",
    "DONE",
    "DOING",
    "HAVE",
    "HAS",
    "HAD",
    "HAVING",
    "GO",
    "GOES",
    "WENT",
    "GONE",
    "GOING",
    "GET",
    "GETS",
    "GOT",
    "GOTTEN",
    "GETTING",
    "MAKE",
    "MAKES",
    "MADE",
    "MAKING",
    "KNOW",
    "KNOWS",
    "KNEW",
    "KNOWN",
    "KNOWING",
    "THINK",
    "THINKS",
    "THOUGHT",
    "THINKING",
    "TAKE",
    "TAKES",
    "TOOK",
    "TAKEN",
    "TAKING",
    "SEE",
    "SEES",
    "SAW",
    "SEEN",
    "SEEING",
    "COME",
    "COMES",
    "CAME",
    "COMING",
    "WANT",
    "WANTS",
    "WANTED",
    "WANTING",
    "LOOK",
    "LOOKS",
    "LOOKED",
    "LOOKING",
    "USE",
    "USES",
    "USED",
    "USING",
    "FIND",
    "FINDS",
    "FOUND",
    "FINDING",
    "GIVE",
    "GIVES",
    "GAVE",
    "GIVEN",
    "GIVING",
    "TELL",
    "TELLS",
    "TOLD",
    "TELLING",
    "WORK",
    "WORKS",
    "WORKED",
    "WORKING",
    "CALL",
    "CALLS",
    "CALLED",
    "CALLING",
    "TRY",
    "TRIES",
    "TRIED",
    "TRYING",
    "ASK",
    "ASKS",
    "ASKED",
    "ASKING",
    "NEED",
    "NEEDS",
    "NEEDED",
    "NEEDING",
    "FEEL",
    "FEELS",
    "FELT",
    "FEELING",
    "BECOME",
    "BECOMES",
    "BECAME",
    "BECOMING",
    "LEAVE",
    "LEAVES",
    "LEFT",
    "LEAVING",
    "PUT",
    "PUTS",
    "PUTTING",
    "MEAN",
    "MEANS",
    "MEANT",
    "MEANING",
    "KEEP",
    "KEEPS",
    "KEPT",
    "KEEPING",
    "LET",
    "LETS",
    "LETTING",
    "BEGIN",
    "BEGINS",
    "BEGAN",
    "BEGUN",
    "BEGINNING",
    "SEEM",
    "SEEMS",
    "SEEMED",
    "SEEMING",
    "HELP",
    "HELPS",
    "HELPED",
    "HELPING",
    "TALK",
    "TALKS",
    "TALKED",
    "TALKING",
    "TURN",
    "TURNS",
    "TURNED",
    "TURNING",
    "START",
    "STARTS",
    "STARTED",
    "STARTING",
    "SHOW",
    "SHOWS",
    "SHOWED",
    "SHOWN",
    "SHOWING",
    "HEAR",
    "HEARS",
    "HEARD",
    "HEARING",
    "PLAY",
    "PLAYS",
    "PLAYED",
    "PLAYING",
    "RUN",
    "RUNS",
    "RAN",
    "RUNNING",
    "MOVE",
    "MOVES",
    "MOVED",
    "MOVING",
    "LIKE",
    "LIKES",
    "LIKED",
    "LIKING",
    "LIVE",
    "LIVES",
    "LIVED",
    "LIVING",
    "BELIEVE",
    "BELIEVES",
    "BELIEVED",
    "BELIEVING",
    "HOLD",
    "HOLDS",
    "HELD",
    "HOLDING",
    "BRING",
    "BRINGS",
    "BROUGHT",
    "BRINGING",
    "HAPPEN",
    "HAPPENS",
    "HAPPENED",
    "HAPPENING",
    "WRITE",
    "WRITES",
    "WROTE",
    "WRITTEN",
    "WRITING",
    "PROVIDE",
    "PROVIDES",
    "PROVIDED",
    "PROVIDING",
    "SIT",
    "SITS",
    "SAT",
    "SITTING",
    "STAND",
    "STANDS",
    "STOOD",
    "STANDING",
    "LOSE",
    "LOSES",
    "LOST",
    "LOSING",
    "PAY",
    "PAYS",
    "PAID",
    "PAYING",
    "MEET",
    "MEETS",
    "MET",
    "MEETING",
    "INCLUDE",
    "INCLUDES",
    "INCLUDED",
    "INCLUDING",
    "CONTINUE",
    "CONTINUES",
    "CONTINUED",
    "CONTINUING",
    "SET",
    "SETS",
    "SETTING",
    "LEARN",
    "LEARNS",
    "LEARNED",
    "LEARNING",
    "CHANGE",
    "CHANGES",
    "CHANGED",
    "CHANGING",
    "LEAD",
    "LEADS",
    "LED",
    "LEADING",
    "UNDERSTAND",
    "UNDERSTANDS",
    "UNDERSTOOD",
    "UNDERSTANDING",
    "WATCH",
    "WATCHES",
    "WATCHED",
    "WATCHING",
    "FOLLOW",
    "FOLLOWS",
    "FOLLOWED",
    "FOLLOWING",
    "STOP",
    "STOPS",
    "STOPPED",
    "STOPPING",
    "CREATE",
    "CREATES",
    "CREATED",
    "CREATING",
    "SPEAK",
    "SPEAKS",
    "SPOKE",
    "SPOKEN",
    "SPEAKING",
    "READ",
    "READS",
    "READ",
    "READING",
    "ALLOW",
    "ALLOWS",
    "ALLOWED",
    "ALLOWING",
    "ADD",
    "ADDS",
    "ADDED",
    "ADDING",
    "SPEND",
    "SPENDS",
    "SPENT",
    "SPENDING",
    "GROW",
    "GROWS",
    "GREW",
    "GROWN",
    "GROWING",
    "OPEN",
    "OPENS",
    "OPENED",
    "OPENING",
    "WALK",
    "WALKS",
    "WALKED",
    "WALKING",
    "WIN",
    "WINS",
    "WON",
    "WINNING",
    "OFFER",
    "OFFERS",
    "OFFERED",
    "OFFERING",
    "REMEMBER",
    "REMEMBERS",
    "REMEMBERED",
    "REMEMBERING",
    "LOVE",
    "LOVES",
    "LOVED",
    "LOVING",
    "CONSIDER",
    "CONSIDERS",
    "CONSIDERED",
    "CONSIDERING",
    "APPEAR",
    "APPEARS",
    "APPEARED",
    "APPEARING",
    "BUY",
    "BUYS",
    "BOUGHT",
    "BUYING",
    "WAIT",
    "WAITS",
    "WAITED",
    "WAITING",
    "SERVE",
    "SERVES",
    "SERVED",
    "SERVING",
    "DIE",
    "DIES",
    "DIED",
    "DYING",
    "SEND",
    "SENDS",
    "SENT",
    "SENDING",
    "EXPECT",
    "EXPECTS",
    "EXPECTED",
    "EXPECTING",
    "BUILD",
    "BUILDS",
    "BUILT",
    "BUILDING",
    "STAY",
    "STAYS",
    "STAYED",
    "STAYING",
    "FALL",
    "FALLS",
    "FELL",
    "FALLEN",
    "FALLING",
    "CUT",
    "CUTS",
    "CUTTING",
    "REACH",
    "REACHES",
    "REACHED",
    "REACHING",
    "KILL",
    "KILLS",
    "KILLED",
    "KILLING",
    "REMAIN",
    "REMAINS",
    "REMAINED",
    "REMAINING",
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
            "Welcome to TradeJournal AI! 🚀\n\n"
            "I'm your trading companion. I can help you log your trades automatically via screenshots, voice notes, or text.\n\n"
            "To get started, let's link your account:\n"
            f"1. Sign up at {settings.FRONTEND_URL}\n"
            "2. Open Connect Telegram in settings\n"
            "3. Generate your connect code\n"
            "4. Send `/connect TM-XXXXXX` here.\n\n"
            f"Let's crush the markets together! 💪\nBot: @{settings.TELEGRAM_BOT_USERNAME}"
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
            return self.send_message(chat_id, "Telegram bot logging is available on Pro and Elite plans. Upgrade to unlock! 🚀")

        existing_user = self.db.query(User).filter(
            User.telegram_chat_id == chat_id,
            User.telegram_connected.is_(True),
        ).first()
        if existing_user:
            if existing_user.id == user.id:
                return self.send_message(chat_id, "You are already connected to this account. Ready to trade! 📈")
            return self.send_message(chat_id, "This chat is already linked to another account.")

        user.telegram_chat_id = chat_id
        user.telegram_connected = True
        self.db.add(user)
        self.db.commit()

        return self.send_message(chat_id, f"Connected successfully to {user.name}. Send me your trades/screenshots and I'll log them for you! 📝")

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
            return self.send_message(chat_id, "Voice note received. I'm listening... 👂")

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
            # Try to use AI to parse text if regex fails (fallback)
            if self.ai_service:
                parsed_trade = await self.ai_service.analyze_text(text)
            
            if not parsed_trade or parsed_trade.get("instrument") == "UNKNOWN":
                return self.send_message(
                    chat_id,
                    "I couldn't quite catch that trade details. Try: `Long BTC entry 99000 exit 100000 result win`. 🤔",
                )

        # Validate trade
        validation_error = self._validate_trade(parsed_trade)
        if validation_error:
             return self.send_message(chat_id, f"⚠️ Trade Validation Error: {validation_error}")

        try:
            trade_create = TradeCreate(
                instrument=parsed_trade["instrument"],
                direction=parsed_trade["direction"],
                entry_price=parsed_trade["entry_price"],
                exit_price=parsed_trade["exit_price"],
                result=parsed_trade["result"],
                r_multiple=parsed_trade["r_multiple"],
                trade_timestamp=datetime.now(timezone.utc),
                input_type="text",
                raw_input_data={"source": "telegram", "text": text},
            )
            
            trade = self.trade_service.create_trade(user.id, trade_create)
            
            # Generate personality response
            reply_text = "Trade logged."
            if self.ai_service:
                reply_text = await self.ai_service.generate_personality_response(
                    {
                        "instrument": trade.instrument,
                        "direction": trade.direction,
                        "result": trade.result,
                        "entry": str(trade.entry_price),
                        "exit": str(trade.exit_price)
                    }, 
                    text
                )
            
            return self.send_message(chat_id, reply_text)

        except PlanLimitExceeded as exc:
            return self.send_message(chat_id, str(exc))
        except Exception:
            logger.exception("Failed to create trade from Telegram text for user_id=%s", user.id)
            return self.send_message(chat_id, "I understood your message but hit a snag saving it. Please try again! 🔄")

    async def _handle_photo_message(self, chat_id: int, user: User, message: dict):
        caption = (message.get("caption") or "").strip()
        
        # We parse the caption ONLY for P&L/Result context, NOT for instrument/prices.
        # This prevents "Hit 50" from being read as Instrument=HIT, Entry=50.
        parsed_caption_result = self._parse_trade_text(caption) if caption else None

        instrument = "SCREENSHOT"
        direction = None
        entry_price = None
        exit_price = None
        result = "PENDING"
        r_multiple = None
        
        # If caption explicitly has result info (Win/Loss), we can take it.
        if parsed_caption_result:
            if parsed_caption_result.get("result") != "PENDING":
                result = parsed_caption_result.get("result")

        photos = message.get("photo") or []
        file_id = None
        if photos:
            file_id = photos[-1].get("file_id")

        vision_trade = None
        if self.ai_service and file_id:
            try:
                self.send_message(chat_id, "Analyzing screenshot... 🕵️‍♂️")
                image_bytes = await download_telegram_file(file_id)
                vision_trade = await self.ai_service.analyze_screenshot(image_bytes, caption=caption or None)
            except TelegramDeliveryError as exc:
                logger.info("Telegram photo download unavailable: %s", exc)
                return self.send_message(chat_id, "Couldn't download the image from Telegram. Please try again.")
            except Exception:
                logger.exception("Screenshot analysis failed for user_id=%s", user.id)
                return self.send_message(chat_id, "AI analysis failed. Please try again.")

        if vision_trade:
            # STRICT RULE: Instrument MUST come from AI Vision (Chart)
            if vision_trade.get("instrument") and vision_trade.get("instrument") != "UNKNOWN":
                instrument = vision_trade.get("instrument")
            
            # STRICT RULE: Direction MUST come from AI Vision (Chart)
            if vision_trade.get("direction") and vision_trade.get("direction") != "UNKNOWN":
                direction = vision_trade.get("direction")

            # STRICT RULE: Prices MUST come from AI Vision (Chart)
            try:
                if vision_trade.get("entry_price"):
                    entry_price = Decimal(str(vision_trade.get("entry_price")))
                if vision_trade.get("exit_price"):
                    exit_price = Decimal(str(vision_trade.get("exit_price")))
            except Exception:
                pass

            if caption and vision_trade.get("notes") is None:
                vision_trade["notes"] = caption
                
            # Result can come from AI (which parses caption too) or fallback to caption regex
            if result == "PENDING" and vision_trade.get("result") and vision_trade.get("result") != "PENDING":
                result = vision_trade.get("result")
        
        # Validation
        trade_data = {
            "instrument": instrument,
            "direction": direction,
            "entry_price": entry_price,
            "exit_price": exit_price,
            "result": result,
            "r_multiple": r_multiple
        }
        
        # If instrument is unknown after vision, we can't save effectively without more info
        if instrument == "UNKNOWN" or instrument == "SCREENSHOT":
             return self.send_message(chat_id, "I couldn't identify the instrument from the screenshot chart. Please ensure the ticker is visible in the top-left.")

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
            
            # Generate personality response
            reply_text = "Screenshot logged."
            if self.ai_service:
                reply_text = await self.ai_service.generate_personality_response(
                    {
                        "instrument": trade.instrument,
                        "direction": trade.direction,
                        "result": trade.result,
                        "entry": str(trade.entry_price),
                        "exit": str(trade.exit_price)
                    }, 
                    caption or "Screenshot Trade"
                )
            
            return self.send_message(chat_id, reply_text)
            
        except PlanLimitExceeded as exc:
            return self.send_message(chat_id, str(exc))
        except Exception:
            logger.exception("Failed to create trade from Telegram screenshot for user_id=%s", user.id)
            return self.send_message(chat_id, "Screenshot received, but I could not save it. Please try again.")

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
        
    def _validate_trade(self, trade: dict) -> str | None:
        """
        Validate trade data for logical consistency.
        Returns an error message string if invalid, None if valid.
        """
        if not trade.get("instrument"):
            return "Instrument is missing."
            
        entry = trade.get("entry_price")
        exit_price = trade.get("exit_price")
        direction = trade.get("direction")
        
        if entry is not None and entry < 0:
            return "Entry price cannot be negative."
        if exit_price is not None and exit_price < 0:
            return "Exit price cannot be negative."
            
        if direction and direction not in ["LONG", "SHORT"]:
            return "Direction must be LONG or SHORT."
            
        if direction and entry and exit_price:
            if direction == "LONG" and exit_price > entry and trade.get("result") == "LOSS":
                 return "Logic Error: Long trade with Exit > Entry should be a WIN."
            if direction == "SHORT" and exit_price < entry and trade.get("result") == "LOSS":
                 return "Logic Error: Short trade with Exit < Entry should be a WIN."
                 
        return None

    def send_message(self, chat_id: int, text: str, parse_mode: str | None = None):
        logger.info("Telegram reply prepared for chat_id=%s", chat_id)
        response = {"chat_id": chat_id, "text": text}
        if parse_mode:
            response["parse_mode"] = parse_mode
        return response