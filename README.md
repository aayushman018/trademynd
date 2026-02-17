# TradeJournal AI

An AI-first trading journal that eliminates manual logging through Telegram-first interaction.

## Prerequisites

- Docker and Docker Compose
- Node.js (for local frontend development, optional)
- Python 3.11 (for local backend development, optional)

## Getting Started

1.  **Clone the repository** (if you haven't already).

2.  **Environment Setup**:
    Copy `.env.example` to `.env` in the root directory and fill in your API keys.
    ```bash
    cp .env.example .env
    ```
    *Note: You need an OpenAI API Key and a Telegram Bot Token for full functionality.*

3.  **Build and Run**:
    Run the application using Docker Compose.
    ```bash
    docker-compose up --build
    ```

4.  **Database Migrations**:
    Once the containers are running, you need to apply the database migrations.
    Open a new terminal and run:
    ```bash
    docker-compose exec backend alembic revision --autogenerate -m "Initial migration"
    docker-compose exec backend alembic upgrade head
    ```

5.  **Access the Application**:
    - Frontend: [http://localhost:3000](http://localhost:3000)
    - Backend API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

## Features

- **Authentication**: Sign up and Login with JWT.
- **Telegram Bot**: Connect your Telegram account via `/connect`.
- **Trade Logging**: Send screenshots, voice notes, or text to the bot (Mocked AI service for now).
- **Dashboard**: View recent trades and performance metrics.
- **Trade History**: Detailed list of all your trades.

## Project Structure

- `frontend/`: Next.js 14 application.
- `backend/`: FastAPI application.
- `docker-compose.yml`: Infrastructure orchestration.

## Telegram Bot Setup

1.  Create a bot with [@BotFather](https://t.me/BotFather).
2.  Get the Token and add it to `.env`.
3.  Set the webhook URL (requires a public URL, e.g., using ngrok for local dev):
    ```bash
    curl -F "url=https://your-public-url.ngrok.io/api/v1/bot/webhook" https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook
    ```
