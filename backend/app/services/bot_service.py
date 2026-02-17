from sqlalchemy.orm import Session
from app.models.user import User, TelegramConnection
import logging

logger = logging.getLogger(__name__)

class BotService:
    def __init__(self, db: Session):
        self.db = db

    async def process_update(self, update: dict):
        message = update.get("message")
        if not message:
            return

        chat_id = message.get("chat", {}).get("id")
        text = message.get("text", "")
        telegram_user_id = message.get("from", {}).get("id")
        telegram_username = message.get("from", {}).get("username")

        if text.startswith("/start"):
            return await self.handle_start(chat_id)
        elif text.startswith("/connect"):
            return await self.handle_connect(chat_id, text, telegram_user_id, telegram_username)
        else:
            return await self.handle_message(chat_id, message, telegram_user_id)

    async def handle_start(self, chat_id: int):
        message = (
            "Welcome to TradeJournal AI! 🚀\n\n"
            "I can help you log your trades automatically via screenshots, voice notes, or text.\n\n"
            "To get started, please link your account:\n"
            "1. Sign up at https://app.tradejournal.ai (or localhost:3000)\n"
            "2. Get your USER_ID from the dashboard\n"
            "3. Send `/connect USER_ID` here."
        )
        return self.send_message(chat_id, message)

    async def handle_connect(self, chat_id: int, text: str, telegram_user_id: int, telegram_username: str):
        parts = text.split()
        if len(parts) != 2:
            return self.send_message(chat_id, "Usage: /connect TRD-XXXXX")
        
        user_id_str = parts[1].strip()
        
        # Check if user exists
        user = self.db.query(User).filter(User.user_id == user_id_str).first()
        if not user:
            return self.send_message(chat_id, "❌ User ID not found. Please check your dashboard.")

        # Check if already connected
        existing_conn = self.db.query(TelegramConnection).filter(TelegramConnection.telegram_user_id == telegram_user_id).first()
        if existing_conn:
            if existing_conn.user_id == user.id:
                 return self.send_message(chat_id, "✅ You are already connected to this account.")
            else:
                 # Update connection? Or fail? Let's fail for safety.
                 return self.send_message(chat_id, "❌ This Telegram account is already linked to another user.")

        # Create connection
        new_conn = TelegramConnection(
            user_id=user.id,
            telegram_user_id=telegram_user_id,
            telegram_username=telegram_username
        )
        self.db.add(new_conn)
        self.db.commit()
        
        return self.send_message(chat_id, f"✅ Connected successfully to {user.name}! Send me your trades now.")

    async def handle_message(self, chat_id: int, message: dict, telegram_user_id: int):
        # Check if user is connected
        conn = self.db.query(TelegramConnection).filter(TelegramConnection.telegram_user_id == telegram_user_id).first()
        if not conn:
            return self.send_message(chat_id, "⚠️ Please connect your account first using `/connect USER_ID`.")
        
        # Placeholder for trade processing
        # We will dispatch to trade service here
        if "photo" in message:
            return self.send_message(chat_id, "📸 Screenshot received. Processing...")
        elif "voice" in message:
            return self.send_message(chat_id, "🎤 Voice note received. Processing...")
        else:
            return self.send_message(chat_id, "📝 Text received. Processing...")

    def send_message(self, chat_id: int, text: str):
        # In a real implementation, this would make an API call to Telegram
        # For now, we'll just log it or return a response structure
        # Since this is called from a webhook, we can sometimes return the response directly if synchronous,
        # but usually we make an async call to sendMessage.
        
        # For the MVP webhook endpoint, we might just use the `requests` library to call Telegram API
        # But to avoid blocking, we should use `httpx` or run in background task.
        
        # For this "Stub", I will print to console.
        print(f"-------- TELEGRAM MESSAGE TO {chat_id} --------")
        print(text)
        print("-----------------------------------------------")
        
        # Return a dict that the endpoint can use if needed, 
        # but the actual sending should happen via HTTP request.
        return {"chat_id": chat_id, "text": text}
