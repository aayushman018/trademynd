from __future__ import annotations

import hashlib
import hmac
import time
import urllib.parse
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import Subscription, User


class InvalidPaymentRequest(Exception):
    pass


class PaymentConfigError(Exception):
    pass


class PaymentGatewayError(Exception):
    pass


@dataclass(frozen=True)
class CheckoutResult:
    gateway: str
    payment_url: str
    amount_minor: int
    currency: str
    provider_ref: str | None = None


PLAN_PRICING_MINOR: dict[str, dict[str, dict[str, int]]] = {
    "pro": {
        "monthly": {"USD": 1200, "INR": 49900},
        "annual": {"USD": 9900, "INR": 499900},
    },
    "elite": {
        "monthly": {"USD": 1900, "INR": 89900},
        "annual": {"USD": 15900, "INR": 899900},
    },
}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_plan(plan: str) -> str:
    value = (plan or "").strip().lower()
    if value not in PLAN_PRICING_MINOR:
        raise InvalidPaymentRequest("Unsupported plan")
    return value


def _normalize_cycle(cycle: str) -> str:
    value = (cycle or "").strip().lower()
    if value not in {"monthly", "annual"}:
        raise InvalidPaymentRequest("Unsupported billing cycle")
    return value


def _normalize_currency(currency: str) -> str:
    value = (currency or "").strip().upper()
    if value not in {"USD", "INR"}:
        raise InvalidPaymentRequest("Unsupported currency")
    return value


def _resolve_amount_minor(plan: str, billing_cycle: str, currency: str) -> int:
    try:
        return PLAN_PRICING_MINOR[plan][billing_cycle][currency]
    except KeyError as exc:
        raise InvalidPaymentRequest("Price is not available for selected plan/currency/cycle") from exc


def create_checkout(
    user: User,
    *,
    gateway: str,
    plan: str,
    billing_cycle: str,
    currency: str,
) -> CheckoutResult:
    normalized_gateway = (gateway or "").strip().lower()
    if normalized_gateway not in {"stripe", "upi"}:
        raise InvalidPaymentRequest("Unsupported payment gateway")

    normalized_plan = _normalize_plan(plan)
    normalized_cycle = _normalize_cycle(billing_cycle)
    normalized_currency = _normalize_currency(currency)
    amount_minor = _resolve_amount_minor(normalized_plan, normalized_cycle, normalized_currency)

    if normalized_gateway == "stripe":
        return _create_stripe_checkout(
            user=user,
            plan=normalized_plan,
            billing_cycle=normalized_cycle,
            currency=normalized_currency,
            amount_minor=amount_minor,
        )

    return _create_upi_checkout(
        user=user,
        plan=normalized_plan,
        billing_cycle=normalized_cycle,
        currency=normalized_currency,
        amount_minor=amount_minor,
    )


def _create_stripe_checkout(
    *,
    user: User,
    plan: str,
    billing_cycle: str,
    currency: str,
    amount_minor: int,
) -> CheckoutResult:
    if not settings.STRIPE_SECRET_KEY:
        raise PaymentConfigError("Stripe is not configured")

    if amount_minor <= 0:
        raise InvalidPaymentRequest("Invalid checkout amount")

    success_url = f"{settings.FRONTEND_URL.rstrip('/')}/dashboard/settings?payment=success&gateway=stripe"
    cancel_url = f"{settings.FRONTEND_URL.rstrip('/')}/pricing?payment=cancelled"
    plan_title = f"TradeMynd {plan.upper()} ({billing_cycle})"

    form = {
        "mode": "payment",
        "success_url": success_url,
        "cancel_url": cancel_url,
        "customer_email": user.email,
        "metadata[user_id]": str(user.id),
        "metadata[plan]": plan,
        "metadata[billing_cycle]": billing_cycle,
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": currency.lower(),
        "line_items[0][price_data][unit_amount]": str(amount_minor),
        "line_items[0][price_data][product_data][name]": plan_title,
        "line_items[0][price_data][product_data][description]": "TradeMynd subscription upgrade",
    }

    try:
        response = httpx.post(
            "https://api.stripe.com/v1/checkout/sessions",
            data=form,
            headers={
                "Authorization": f"Bearer {settings.STRIPE_SECRET_KEY}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout=20.0,
        )
    except Exception as exc:
        raise PaymentGatewayError("Unable to contact Stripe") from exc

    if response.status_code >= 400:
        raise PaymentGatewayError("Stripe checkout creation failed")

    payload = response.json()
    payment_url = payload.get("url")
    if not payment_url:
        raise PaymentGatewayError("Stripe checkout URL is missing")

    return CheckoutResult(
        gateway="stripe",
        payment_url=payment_url,
        amount_minor=amount_minor,
        currency=currency,
        provider_ref=payload.get("id"),
    )


def _create_upi_checkout(
    *,
    user: User,
    plan: str,
    billing_cycle: str,
    currency: str,
    amount_minor: int,
) -> CheckoutResult:
    if currency != "INR":
        raise InvalidPaymentRequest("UPI checkout is available for INR only")

    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        return _create_razorpay_payment_link(
            user=user,
            plan=plan,
            billing_cycle=billing_cycle,
            amount_minor=amount_minor,
        )

    if settings.UPI_VPA:
        return _create_upi_deeplink(
            user=user,
            plan=plan,
            billing_cycle=billing_cycle,
            amount_minor=amount_minor,
        )

    raise PaymentConfigError("UPI gateway is not configured")


def _create_razorpay_payment_link(
    *,
    user: User,
    plan: str,
    billing_cycle: str,
    amount_minor: int,
) -> CheckoutResult:
    callback = f"{settings.FRONTEND_URL.rstrip('/')}/dashboard/settings?payment=success&gateway=upi"
    payload = {
        "amount": amount_minor,
        "currency": "INR",
        "description": f"TradeMynd {plan.upper()} ({billing_cycle})",
        "accept_partial": False,
        "customer": {"name": user.name, "email": user.email},
        "notify": {"sms": False, "email": True},
        "reminder_enable": True,
        "callback_url": callback,
        "callback_method": "get",
        "notes": {
            "user_id": str(user.id),
            "plan": plan,
            "billing_cycle": billing_cycle,
        },
    }

    try:
        response = httpx.post(
            "https://api.razorpay.com/v1/payment_links",
            json=payload,
            auth=(settings.RAZORPAY_KEY_ID or "", settings.RAZORPAY_KEY_SECRET or ""),
            timeout=20.0,
        )
    except Exception as exc:
        raise PaymentGatewayError("Unable to contact Razorpay") from exc

    if response.status_code >= 400:
        raise PaymentGatewayError("UPI payment link creation failed")

    body = response.json()
    payment_url = body.get("short_url") or body.get("payment_link")
    if not payment_url:
        raise PaymentGatewayError("UPI payment URL is missing")

    return CheckoutResult(
        gateway="upi",
        payment_url=payment_url,
        amount_minor=amount_minor,
        currency="INR",
        provider_ref=body.get("id"),
    )


def _create_upi_deeplink(
    *,
    user: User,
    plan: str,
    billing_cycle: str,
    amount_minor: int,
) -> CheckoutResult:
    amount_rupees = amount_minor / 100
    note = f"TradeMynd {plan.upper()} {billing_cycle}"
    params = urllib.parse.urlencode(
        {
            "pa": settings.UPI_VPA or "",
            "pn": "TradeMynd",
            "am": f"{amount_rupees:.2f}",
            "cu": "INR",
            "tn": note,
        }
    )
    payment_url = f"upi://pay?{params}"
    return CheckoutResult(
        gateway="upi",
        payment_url=payment_url,
        amount_minor=amount_minor,
        currency="INR",
        provider_ref=None,
    )


def activate_plan(
    db: Session,
    *,
    user_id: str,
    plan: str,
    billing_cycle: str,
    payment_provider: str,
    payment_status: str,
    external_reference: str | None = None,
) -> None:
    normalized_plan = _normalize_plan(plan)
    normalized_cycle = _normalize_cycle(billing_cycle)

    try:
        user_uuid = UUID(user_id)
    except (TypeError, ValueError) as exc:
        raise InvalidPaymentRequest("Invalid user id for plan activation") from exc

    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise InvalidPaymentRequest("User not found for plan activation")

    user.plan = normalized_plan
    db.add(user)

    subscription = db.query(Subscription).filter(Subscription.user_id == user_uuid).first()
    now = _utc_now()
    period_end = now + (timedelta(days=365) if normalized_cycle == "annual" else timedelta(days=30))

    if not subscription:
        subscription = Subscription(
            user_id=user_uuid,
            plan_type=normalized_plan,
            payment_provider=payment_provider,
            payment_status=payment_status,
            current_period_start=now,
            current_period_end=period_end,
        )
        db.add(subscription)
    else:
        subscription.plan_type = normalized_plan
        subscription.payment_provider = payment_provider
        subscription.payment_status = payment_status
        subscription.current_period_start = now
        subscription.current_period_end = period_end
        db.add(subscription)

    if external_reference:
        subscription.payment_status = f"{payment_status}:{external_reference}"

    db.commit()


def verify_stripe_signature(payload_bytes: bytes, signature_header: str | None) -> bool:
    secret = settings.STRIPE_WEBHOOK_SECRET
    if not secret:
        raise PaymentConfigError("Stripe webhook secret is not configured")
    if not signature_header:
        return False

    parts = {}
    for chunk in signature_header.split(","):
        if "=" not in chunk:
            continue
        key, value = chunk.split("=", 1)
        parts.setdefault(key.strip(), []).append(value.strip())

    timestamp_values = parts.get("t", [])
    signatures = parts.get("v1", [])
    if not timestamp_values or not signatures:
        return False

    timestamp = timestamp_values[0]
    signed_payload = f"{timestamp}.{payload_bytes.decode('utf-8')}"
    expected_signature = hmac.new(secret.encode("utf-8"), signed_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected_signature, candidate) for candidate in signatures):
        return False

    try:
        event_time = int(timestamp)
    except ValueError:
        return False
    return abs(int(time.time()) - event_time) <= 300


def verify_razorpay_signature(payload_bytes: bytes, signature_header: str | None) -> bool:
    secret = settings.RAZORPAY_WEBHOOK_SECRET or settings.RAZORPAY_KEY_SECRET
    if not secret:
        raise PaymentConfigError("Razorpay webhook secret is not configured")
    if not signature_header:
        return False

    expected = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header)


def handle_stripe_webhook(db: Session, payload: dict) -> bool:
    if payload.get("type") != "checkout.session.completed":
        return False

    session = payload.get("data", {}).get("object", {})
    metadata = session.get("metadata") or {}
    user_id = metadata.get("user_id")
    plan = metadata.get("plan")
    billing_cycle = metadata.get("billing_cycle")
    external_id = session.get("id")

    if not user_id or not plan or not billing_cycle:
        return False

    activate_plan(
        db,
        user_id=user_id,
        plan=plan,
        billing_cycle=billing_cycle,
        payment_provider="stripe",
        payment_status="active",
        external_reference=external_id,
    )
    return True


def handle_razorpay_webhook(db: Session, payload: dict) -> bool:
    if payload.get("event") != "payment_link.paid":
        return False

    link_entity = payload.get("payload", {}).get("payment_link", {}).get("entity", {})
    notes = link_entity.get("notes") or {}
    user_id = notes.get("user_id")
    plan = notes.get("plan")
    billing_cycle = notes.get("billing_cycle")
    external_id = link_entity.get("id")

    if not user_id or not plan or not billing_cycle:
        return False

    activate_plan(
        db,
        user_id=user_id,
        plan=plan,
        billing_cycle=billing_cycle,
        payment_provider="upi",
        payment_status="active",
        external_reference=external_id,
    )
    return True
