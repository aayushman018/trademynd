from typing import Optional
from pydantic import BaseModel, EmailStr
from uuid import UUID

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None

class UserCreate(UserBase):
    email: EmailStr
    password: str
    name: str

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserInDBBase(UserBase):
    id: Optional[UUID] = None
    user_id: Optional[str] = None
    plan: Optional[str] = "free"

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    hashed_password: str
