from fastapi import APIRouter

from app.api.endpoints import analytics, bot, chat, login, news, payments, trades, users

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(bot.router, prefix="/bot", tags=["bot"])
api_router.include_router(trades.router, prefix="/trades", tags=["trades"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(news.router, prefix="/news", tags=["news"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
