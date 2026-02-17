from typing import Any
from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
import random
import string

from app.api import deps
from app.core import security
from app.models.user import User
from app.schemas.user import UserCreate, User as UserSchema

router = APIRouter()

def generate_user_id():
    """Generate a random 5-character alphanumeric ID (e.g., TRD-8X29K)"""
    chars = string.ascii_uppercase + string.digits
    random_str = ''.join(random.choices(chars, k=5))
    return f"TRD-{random_str}"

@router.post("/", response_model=UserSchema)
def create_user(
    *,
    db: Session = Depends(deps.get_db_session),
    user_in: UserCreate,
) -> Any:
    """
    Create new user.
    """
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    # Generate unique user_id
    user_id = generate_user_id()
    while db.query(User).filter(User.user_id == user_id).first():
        user_id = generate_user_id()
        
    user = User(
        email=user_in.email,
        password_hash=security.get_password_hash(user_in.password),
        name=user_in.name,
        user_id=user_id,
        plan="free"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/me", response_model=UserSchema)
def read_user_me(
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user
