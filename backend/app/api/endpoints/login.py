from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from pydantic import BaseModel
import secrets
import uuid

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas.token import Token

router = APIRouter()

class GoogleToken(BaseModel):
    token: str

@router.post("/login/access-token", response_model=Token)
def login_access_token(
    db: Session = Depends(deps.get_db_session),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }

@router.post("/login/google", response_model=Token)
def login_google(
    token_data: GoogleToken,
    db: Session = Depends(deps.get_db_session)
) -> Any:
    try:
        # Verify the token
        # Client ID is optional for decoding if you trust the source, but for security 
        # you should check against settings.GOOGLE_CLIENT_ID if available.
        id_info = id_token.verify_oauth2_token(
            token_data.token, 
            google_requests.Request()
        )

        email = id_info.get('email')
        if not email:
             raise HTTPException(status_code=400, detail="Google token does not contain email")

        name = id_info.get('name', email.split('@')[0])
        
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        if not user:
            # Create user
            random_password = secrets.token_urlsafe(16)
            password_hash = security.get_password_hash(random_password)
            
            # Generate a unique TRD ID
            trd_id = f"TRD-{secrets.token_hex(4).upper()}"
            
            user = User(
                email=email,
                name=name,
                password_hash=password_hash,
                user_id=trd_id,
                plan="free",
                id=uuid.uuid4()
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return {
            "access_token": security.create_access_token(
                user.id, expires_delta=access_token_expires
            ),
            "token_type": "bearer",
        }
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid Google token: {str(e)}")
