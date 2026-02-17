from fastapi import APIRouter, Request, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from app.api import deps
from app.services.bot_service import BotService
from app.core.config import settings
import httpx

router = APIRouter()

async def send_telegram_message(chat_id: int, text: str):
    if not settings.TELEGRAM_BOT_TOKEN:
        print(f"Skipping Telegram send (no token): {text}")
        return
        
    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
    async with httpx.AsyncClient() as client:
        await client.post(url, json={"chat_id": chat_id, "text": text})

@router.post("/webhook")
async def telegram_webhook(
    request: Request, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(deps.get_db_session)
):
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
        background_tasks.add_task(send_telegram_message, response["chat_id"], response["text"])
    
    return {"status": "ok"}
