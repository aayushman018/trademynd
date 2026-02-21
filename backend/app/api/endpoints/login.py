from datetime import timedelta
from typing import Any
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.core.config import settings
from app.models.user import User
from app.schemas.token import Token

router = APIRouter()


class GoogleToken(BaseModel):
    token: str


def _generate_user_id(db: Session) -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        candidate = "TRD-" + "".join(secrets.choice(alphabet) for _ in range(5))
        existing = db.query(User).filter(User.user_id == candidate).first()
        if not existing:
            return candidate


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
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google login is not configured")

    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="Google login dependencies are unavailable") from exc

    try:
        verified = id_token.verify_oauth2_token(
            token_data.token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid Google token") from exc

    issuer = verified.get("iss")
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HTTPException(status_code=400, detail="Invalid Google token issuer")

    email = (verified.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Google account email is missing")
    if not verified.get("email_verified", False):
        raise HTTPException(status_code=400, detail="Google account email is not verified")

    name = (verified.get("name") or "").strip() or email.split("@")[0]

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            name=name,
            password_hash=security.get_password_hash(secrets.token_urlsafe(32)),
            user_id=_generate_user_id(db),
            plan="free",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif not user.name and name:
        user.name = name
        db.add(user)
        db.commit()

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return {
        "access_token": security.create_access_token(
            user.id, expires_delta=access_token_expires
        ),
        "token_type": "bearer",
    }
