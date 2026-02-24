import urllib.request
import urllib.error
import urllib.parse
import json

LOGIN_URL = "https://trademynd.vercel.app/api/v1/login/access-token"

data = urllib.parse.urlencode({
    "username": "test@trademynd.com",
    "password": "wrongpassword"
}).encode("utf-8")

req = urllib.request.Request(LOGIN_URL, data=data)
req.add_header("Content-Type", "application/x-www-form-urlencoded")

try:
    response = urllib.request.urlopen(req)
    print("Success:", response.read())
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print("Body:", e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
