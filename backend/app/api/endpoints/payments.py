from __future__ import annotations

import json
from typing import Any, Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api import deps
from app.models.user import User
from app.services.payments_service import (
    InvalidPaymentRequest,
    PaymentConfigError,
    PaymentGatewayError,
    create_checkout,
    handle_razorpay_webhook,
    handle_stripe_webhook,
    verify_razorpay_signature,
    verify_stripe_signature,
)

router = APIRouter()


class CheckoutRequest(BaseModel):
    gateway: Literal["stripe", "upi"]
    plan: Literal["pro", "elite"]
    billing_cycle: Literal["monthly", "annual"]
    currency: Literal["USD", "INR"] = "USD"


@router.post("/checkout")
def create_payment_checkout(
    request_body: CheckoutRequest,
    db: Session = Depends(deps.get_db_session),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    try:
        result = create_checkout(
            current_user,
            gateway=request_body.gateway,
            plan=request_body.plan,
            billing_cycle=request_body.billing_cycle,
            currency=request_body.currency,
        )
    except InvalidPaymentRequest as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except PaymentConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except PaymentGatewayError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "gateway": result.gateway,
        "payment_url": result.payment_url,
        "amount_minor": result.amount_minor,
        "currency": result.currency,
        "plan": request_body.plan,
        "billing_cycle": request_body.billing_cycle,
        "provider_ref": result.provider_ref,
    }


@router.post("/webhook/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
    db: Session = Depends(deps.get_db_session),
) -> Any:
    payload_bytes = await request.body()

    try:
        is_valid = verify_stripe_signature(payload_bytes, stripe_signature)
    except PaymentConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook signature")

    try:
        payload = json.loads(payload_bytes.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook payload") from exc

    processed = handle_stripe_webhook(db, payload)
    return {"ok": True, "processed": processed}


@router.post("/webhook/upi")
async def upi_webhook(
    request: Request,
    razorpay_signature: str | None = Header(default=None, alias="X-Razorpay-Signature"),
    db: Session = Depends(deps.get_db_session),
) -> Any:
    payload_bytes = await request.body()

    try:
        is_valid = verify_razorpay_signature(payload_bytes, razorpay_signature)
    except PaymentConfigError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid UPI webhook signature")

    try:
        payload = json.loads(payload_bytes.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid UPI webhook payload") from exc

    processed = handle_razorpay_webhook(db, payload)
    return {"ok": True, "processed": processed}
