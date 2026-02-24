import httpx
import asyncio

async def main():
    url = "https://trademynd.vercel.app/api/v1/bot/webhook"
    
    payload = {
        "update_id": 12345,
        "message": {
            "message_id": 1,
            "chat": {
                "id": 123
            },
            "text": "/start"
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers={"X-Telegram-Bot-Api-Secret-Token": "NFXITHLPdB-w3phSvbCLcmbFypqNx5-p6RGJC72C-GU"})
        print(response.status_code)
        print(response.text)

if __name__ == "__main__":
    asyncio.run(main())
