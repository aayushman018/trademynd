import httpx
import asyncio

async def main():
    url = "https://trademynd.vercel.app/api/v1/bot/webhook"
    
    payload = {
        "update_id": 123456,
        "message": {
            "message_id": 2,
            "chat": {
                "id": 123456789
            },
            "photo": [
                {
                    "file_id": "AgACAgIAAxkBAAMrZ7XYZ7XYZ...",
                    "file_unique_id": "AQADXYZ...",
                    "width": 800,
                    "height": 600,
                    "file_size": 12345
                }
            ],
            "caption": "took a loss of 50"
        }
    }
    
    async with httpx.AsyncClient() as client:
        # Increase timeout in case Vercel takes longer
        response = await client.post(
            url, 
            json=payload, 
            headers={"X-Telegram-Bot-Api-Secret-Token": "NFXITHLPdB-w3phSvbCLcmbFypqNx5-p6RGJC72C-GU"},
            timeout=30.0
        )
        print(response.status_code)
        print(response.text)

if __name__ == "__main__":
    asyncio.run(main())
