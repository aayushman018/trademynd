import asyncio
import os
os.environ["GOOGLE_API_KEY"] = "YOUR_API_KEY_HERE"

from app.services.ai_service import AIService

async def main():
    service = AIService()
    text_result = await service.analyze_text("btc long profit 500")
    print("Parsed result:", text_result)

if __name__ == "__main__":
    asyncio.run(main())
