import secrets
import string
from datetime import datetime, timedelta, timezone
from functools import lru_cache

import redis
from redis.exceptions import RedisError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import TelegramConnectToken

TOKEN_PREFIX = "telegram_connect_token:"
TOKEN_TTL_SECONDS = 15 * 60
TOKEN_ALPHABET = string.ascii_uppercase + string.digits
TOKEN_LENGTH = 6


class TelegramTokenStoreError(Exception):
    """Raised when token operations fail due to Redis issues."""


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


@lru_cache(maxsize=1)
def _get_redis_client() -> redis.Redis:
    return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


def _token_key(token: str) -> str:
    return f"{TOKEN_PREFIX}{token}"


def _generate_random_token() -> str:
    return f"TM-{''.join(secrets.choice(TOKEN_ALPHABET) for _ in range(TOKEN_LENGTH))}"


def _cleanup_expired_db_tokens(db: Session) -> None:
    db.query(TelegramConnectToken).filter(TelegramConnectToken.expires_at < _utc_now()).delete(
        synchronize_session=False
    )


def _generate_connect_token_db(user_id: str) -> str:
    with SessionLocal() as db:
        _cleanup_expired_db_tokens(db)

        for _ in range(20):
            token = _generate_random_token()
            exists = db.query(TelegramConnectToken).filter(TelegramConnectToken.token == token).first()
            if exists:
                continue

            db.add(
                TelegramConnectToken(
                    token=token,
                    user_id=user_id,
                    expires_at=_utc_now() + timedelta(seconds=TOKEN_TTL_SECONDS),
                )
            )
            db.commit()
            return token

    raise TelegramTokenStoreError("Unable to generate unique connect token")


def _consume_connect_token_db(token: str) -> str | None:
    with SessionLocal() as db:
        _cleanup_expired_db_tokens(db)

        record = db.query(TelegramConnectToken).filter(TelegramConnectToken.token == token).first()
        if not record:
            return None

        if _as_utc(record.expires_at) < _utc_now():
            db.delete(record)
            db.commit()
            return None

        user_id = str(record.user_id)
        db.delete(record)
        db.commit()
        return user_id


def generate_connect_token(user_id: str) -> str:
    try:
        client = _get_redis_client()
        for _ in range(10):
            token = _generate_random_token()
            created = client.set(_token_key(token), user_id, ex=TOKEN_TTL_SECONDS, nx=True)
            if created:
                return token
    except RedisError:
        pass

    # Fallback when Redis is unavailable or token collisions are encountered.
    try:
        return _generate_connect_token_db(user_id)
    except Exception as db_exc:
        raise TelegramTokenStoreError("Token storage unavailable") from db_exc


def consume_connect_token(token: str) -> str | None:
    try:
        client = _get_redis_client()
        key = _token_key(token)

        # Redis 6.2+ supports GETDEL atomically.
        if hasattr(client, "getdel"):
            value = client.getdel(key)
        else:
            value = client.get(key)
            if value is not None:
                client.delete(key)

        if value is not None:
            return value
    except RedisError:
        pass

    # Fallback for deployments without Redis or when tokens were DB-backed.
    try:
        return _consume_connect_token_db(token)
    except Exception as exc:
        raise TelegramTokenStoreError("Token validation storage unavailable") from exc
