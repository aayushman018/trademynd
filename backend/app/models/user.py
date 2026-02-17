import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, BigInteger, Uuid
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    user_id = Column(String, unique=True, index=True, nullable=False)  # TRD-XXXXX
    name = Column(String, nullable=False)
    plan = Column(String, default="free")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    telegram_connection = relationship("TelegramConnection", back_populates="user", uselist=False, cascade="all, delete-orphan")
    trades = relationship("Trade", back_populates="user", cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="user", uselist=False, cascade="all, delete-orphan")

class TelegramConnection(Base):
    __tablename__ = "telegram_connections"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id"), unique=True, nullable=False)
    telegram_user_id = Column(BigInteger, unique=True, index=True, nullable=False)
    telegram_username = Column(String)
    connected_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="telegram_connection")

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id"), unique=True, nullable=False)
    plan_type = Column(String, nullable=False)
    payment_provider = Column(String)
    payment_status = Column(String)
    current_period_start = Column(DateTime(timezone=True))
    current_period_end = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="subscription")
