# test_models_syntax.py
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, String, Uuid, ForeignKey
from sqlalchemy.orm import relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Uuid, primary_key=True)
    awaiting_response_trade_id = Column(Uuid, ForeignKey("trades.id"))
    trades = relationship("Trade", back_populates="user", foreign_keys="[Trade.user_id]")

class Trade(Base):
    __tablename__ = "trades"
    id = Column(Uuid, primary_key=True)
    user_id = Column(Uuid, ForeignKey("users.id"))
    user = relationship("User", back_populates="trades", foreign_keys="[Trade.user_id]")

try:
    from sqlalchemy.orm import configure_mappers
    configure_mappers()
    print("Mappers configured successfully!")
except Exception as e:
    import traceback
    traceback.print_exc()

