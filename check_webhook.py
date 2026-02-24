import os
import urllib.request
import json
import re

with open(".env.production", "r") as f:
    env_content = f.read()

bot_token = re.search(r'TELEGRAM_BOT_TOKEN="(.+?)"', env_content)
if bot_token:
    bot_token = bot_token.group(1).replace("\\n", "").strip()
    url = f"https://api.telegram.org/bot{bot_token}/getWebhookInfo"
    print(f"Checking URL: {url}")
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            print(response.read().decode())
    except Exception as e:
        print(f"Error: {e}")
else:
    print("No bot token found in .env.production")
