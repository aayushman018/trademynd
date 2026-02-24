import asyncio
import os
os.environ["GOOGLE_API_KEY"] = "AIzaSyCLRJqoFXMXr1XiWE7QYopQh8u8Fwcwse4"

from app.services.ai_service import AIService

async def main():
    service = AIService()
    text_result = await service.analyze_text("btc long profit 500")
    print("Parsed result:", text_result)

if __name__ == "__main__":
    asyncio.run(main())
