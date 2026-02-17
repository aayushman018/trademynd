from fastapi import APIRouter

from app.api.endpoints import login, users, bot, trades, chat

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(bot.router, prefix="/bot", tags=["bot"])
api_router.include_router(trades.router, prefix="/trades", tags=["trades"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
