# Backend API Documentation

This document describes the API endpoints for the Trademynd backend.

## Base URL
`http://localhost:8000/api/v1`

## Authentication
Most endpoints require a Bearer Token. Include the token in the `Authorization` header:
`Authorization: Bearer <your_token>`

## Endpoints

### Authentication

#### POST `/login/access-token`
Authenticate a user and get an access token.

**Request Body:**
```json
{
  "username": "demo@trademynd.com",
  "password": "password123"
}
```
*Note: `username` field is used for email.*

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR...",
  "token_type": "bearer"
}
```

#### POST `/login/google`
Authenticate or auto-register a user with Google ID token.

**Request Body:**
```json
{
  "token": "google_id_token"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR...",
  "token_type": "bearer"
}
```

---

### Chat

#### POST `/chat/send`
Send a message to the AI assistant and receive a response.

**Request Body:**
```json
{
  "message": "Analyze the market trend for AAPL"
}
```

**Response:**
```json
{
  "response": "Based on the current data...",
  "timestamp": "2023-10-27T10:00:00Z"
}
```

---

### Trades

#### GET `/trades`
Get a list of trades for the authenticated user.

**Query Parameters:**
- `skip` (optional): Number of records to skip (default: 0)
- `limit` (optional): Number of records to return (default: 100)

**Response:**
```json
[
  {
    "id": "uuid-string",
    "instrument": "EURUSD",
    "direction": "LONG",
    "entry_price": 1.0500,
    "exit_price": 1.0550,
    "result": "WIN",
    "r_multiple": 2.5,
    "trade_timestamp": "2023-10-26T14:30:00",
    "emotion": "CONFIDENT"
  }
]
```

#### POST `/trades`
Create a new trade log.

**Request Body:**
```json
{
  "instrument": "BTCUSD",
  "direction": "SHORT",
  "entry_price": 35000,
  "exit_price": 34000,
  "result": "WIN",
  "r_multiple": 3.0,
  "trade_timestamp": "2023-10-27T09:00:00",
  "emotion": "NEUTRAL"
}
```

**Free plan behavior:**
- Monthly trade cap is enforced (default `30` trades/month).
- When cap is reached, returns `403` with an upgrade prompt.

**Response:**
```json
{
  "id": "uuid-string",
  "instrument": "BTCUSD",
  ...
}
```

---

### Users

#### POST `/users`
Register a new user.

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "securepassword",
  "full_name": "New User"
}
```

**Response:**
```json
{
  "email": "newuser@example.com",
  "full_name": "New User",
  "id": "uuid-string",
  "is_active": true
}
```

#### GET `/users/me`
Get the authenticated user profile.

**Response:**
```json
{
  "id": "uuid-string",
  "email": "newuser@example.com",
  "name": "New User",
  "user_id": "TRD-8X29K",
  "plan": "free",
  "telegram_connected": false,
  "telegram_chat_id": null
}
```

#### GET `/users/me/telegram-token`
Generate a one-time Telegram connect code (expires in 15 minutes).

**Response:**
```json
{
  "token": "TM-ABC123"
}
```

**Free plan behavior:**
- Returns `403` with `Telegram bot logging is available on Pro and Elite plans.`

#### POST `/users/me/telegram-disconnect`
Disconnect Telegram from the authenticated account.

**Response:**
```json
{
  "ok": true
}
```

---

### Telegram Bot

#### POST `/bot/webhook`
Telegram webhook endpoint. Receives bot updates and processes commands/messages.

#### GET `/bot/webhook-info`
Returns Telegram webhook status for the currently configured bot token (authenticated endpoint).

Bot commands:
- `/connect TM-XXXXXX` links user Telegram account
- `/news` sends today's high-impact news

---

### Analytics

All analytics endpoints are authenticated and scoped to the logged-in user.

- `GET /analytics/summary`
- `GET /analytics/by-hour`
- `GET /analytics/by-day`
- `GET /analytics/by-emotion`
- `GET /analytics/by-instrument`
- `GET /analytics/drawdown`
- `GET /analytics/calendar`

---

### News

#### GET `/news/today`
Returns today's high-impact Forex Factory events with graceful fallback metadata.

#### POST `/news/send-to-telegram`
Delivers today's high-impact events to the linked Telegram chat. Requires `telegram_connected=true`.

---

### Payments

#### POST `/payments/checkout`
Create a payment session for plan upgrade.

**Request Body:**
```json
{
  "gateway": "stripe",
  "plan": "pro",
  "billing_cycle": "monthly",
  "currency": "USD"
}
```

**Notes:**
- `gateway`: `stripe` or `upi`
- `plan`: `pro` or `elite`
- `billing_cycle`: `monthly` or `annual`
- `currency`: `USD` or `INR` (`upi` supports `INR` only)

**Response:**
```json
{
  "gateway": "stripe",
  "payment_url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "amount_minor": 1200,
  "currency": "USD",
  "plan": "pro",
  "billing_cycle": "monthly",
  "provider_ref": "cs_test_..."
}
```

#### POST `/payments/webhook/stripe`
Stripe webhook endpoint. Validates `Stripe-Signature` and activates user plan on successful checkout completion.

#### POST `/payments/webhook/upi`
UPI/Razorpay webhook endpoint. Validates `X-Razorpay-Signature` and activates user plan on successful payment link completion.

---

## Telegram Linking Flow

1. User opens Settings and clicks **Generate Connect Code**.
2. Frontend calls `GET /users/me/telegram-token`.
3. User sends `/connect TM-XXXXXX` to Telegram bot.
4. Bot validates token in Redis, links `telegram_chat_id`, and marks `telegram_connected=true`.
5. Frontend polls `GET /users/me` every 3 seconds until connected.

---

## Bot Configuration Checklist

Set these environment variables for backend/frontend:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_WEBHOOK_SECRET` (recommended)
- `FRONTEND_URL`
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`
- `GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

Set Telegram webhook to your production API endpoint:

`https://<your-domain>/api/v1/bot/webhook`
