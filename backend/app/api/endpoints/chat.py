from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api import deps
from app.models.user import User
from app.services.chat_service import ChatService

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    data: Any = None

@router.post("/send", response_model=ChatResponse)
async def send_message(
    *,
    db: Session = Depends(deps.get_db_session),
    chat_request: ChatRequest,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Send a message to the bot and get a response.
    """
    service = ChatService(db)
    result = await service.process_message(current_user, chat_request.message)
    
    return ChatResponse(
        response=result["message"],
        data=result
    )
