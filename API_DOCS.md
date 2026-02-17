# Backend API Documentation

This document describes the API endpoints for the Trademynd backend.

## Base URL
`http://localhost:8000/api/v1`

## Authentication
Most endpoints require a Bearer Token. Include the token in the `Authorization` header:
`Authorization: Bearer <your_token>`

## Endpoints

### Authentication

#### POST `/login`
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
