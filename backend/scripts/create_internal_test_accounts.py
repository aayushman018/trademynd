import os
import sys
import secrets
import string
from datetime import datetime, timedelta, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import Subscription, User


ACCOUNTS = [
    {
        "email": "internal.free@trademynd.test",
        "name": "Internal Free",
        "password": "TradeMyndFree#2026",
        "plan": "free",
        "user_id": "TRD-TFREE",
    },
    {
        "email": "internal.pro@trademynd.test",
        "name": "Internal Pro",
        "password": "TradeMyndPro#2026",
        "plan": "pro",
        "user_id": "TRD-TPRO1",
    },
    {
        "email": "internal.elite@trademynd.test",
        "name": "Internal Elite",
        "password": "TradeMyndElite#2026",
        "plan": "elite",
        "user_id": "TRD-TELIT",
    },
]


def _generate_unique_user_id(db: SessionLocal) -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        candidate = "TRD-" + "".join(secrets.choice(alphabet) for _ in range(5))
        exists = db.query(User).filter(User.user_id == candidate).first()
        if not exists:
            return candidate


def upsert_internal_accounts() -> None:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        period_end = now + timedelta(days=30)

        for account in ACCOUNTS:
            user = db.query(User).filter(User.email == account["email"]).first()

            if not user:
                requested_user_id = account.get("user_id")
                if requested_user_id and db.query(User).filter(User.user_id == requested_user_id).first():
                    requested_user_id = _generate_unique_user_id(db)
                elif not requested_user_id:
                    requested_user_id = _generate_unique_user_id(db)

                user = User(
                    email=account["email"],
                    name=account["name"],
                    password_hash=get_password_hash(account["password"]),
                    user_id=requested_user_id,
                    plan=account["plan"],
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            else:
                user.name = account["name"]
                user.password_hash = get_password_hash(account["password"])
                user.plan = account["plan"]
                db.add(user)
                db.commit()
                db.refresh(user)

            if account["plan"] in {"pro", "elite"}:
                subscription = db.query(Subscription).filter(Subscription.user_id == user.id).first()
                if not subscription:
                    subscription = Subscription(
                        user_id=user.id,
                        plan_type=account["plan"],
                        payment_provider="internal",
                        payment_status="active",
                        current_period_start=now,
                        current_period_end=period_end,
                    )
                    db.add(subscription)
                else:
                    subscription.plan_type = account["plan"]
                    subscription.payment_provider = "internal"
                    subscription.payment_status = "active"
                    subscription.current_period_start = now
                    subscription.current_period_end = period_end
                    db.add(subscription)
                db.commit()

        print("Internal test accounts are ready:")
        for account in ACCOUNTS:
            print(
                f"- {account['plan'].upper()}: {account['email']} | password: {account['password']}"
            )
    finally:
        db.close()


if __name__ == "__main__":
    upsert_internal_accounts()
