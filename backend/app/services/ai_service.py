import json
from typing import Any
import google.generativeai as genai
import os
from app.core.config import settings
from openai import OpenAI

# Configure Gemini
# Using the key provided by the user if not in settings
GOOGLE_API_KEY = settings.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY") or "AIzaSyDiehDN3NYrnmpmv0a6LVUtn0QtKwSlRfA"
genai.configure(api_key=GOOGLE_API_KEY)

# Configure Sarvam AI
SARVAM_API_KEY = settings.SARVAM_API_KEY or os.getenv("SARVAM_API_KEY")

class AIService:
    def __init__(self):
        self.gemini_model = genai.GenerativeModel('gemini-pro')
        self.vision_model = genai.GenerativeModel('gemini-pro-vision')
        
        self.sarvam_client = None
        if SARVAM_API_KEY:
            try:
                self.sarvam_client = OpenAI(
                    base_url="https://api.sarvam.ai/v1",
                    api_key=SARVAM_API_KEY
                )
            except Exception as e:
                print(f"Failed to initialize Sarvam AI client: {e}")

    async def analyze_screenshot(self, image_data: Any) -> dict:
        """
        Analyze screenshot using Gemini Pro Vision.
        image_data should be bytes or a PIL Image.
        """
        # For now, we'll return the mock because handling image upload/bytes 
        # requires more setup in the controller (to pass PIL Image).
        # But here is the logic structure:
        try:
            # prompt = "Analyze this trading chart. Extract instrument, direction, entry, exit, result."
            # response = self.vision_model.generate_content([prompt, image_data])
            # return self._parse_response(response.text)
            pass
        except Exception as e:
            print(f"Gemini Vision Error: {e}")

        # Mock response fallback
        return {
            "instrument": "BTCUSDT",
            "direction": "LONG",
            "entry_price": 45000.0,
            "exit_price": 46000.0,
            "result": "WIN",
            "r_multiple": 2.0,
            "stop_loss": 44000.0,
            "take_profit": 47000.0,
            "confidence": 0.85
        }

    async def analyze_voice(self, audio_data: Any) -> dict:
        """
        Stub for Whisper + GPT analysis.
        """
        return {
            "instrument": "ETHUSDT",
            "direction": "SHORT",
            "entry_price": 2500.0,
            "exit_price": 2450.0,
            "result": "WIN",
            "emotion": "calm",
            "mistakes": [],
            "confidence": 0.9
        }

    async def analyze_text(self, text: str) -> dict:
        """
        Analyze text using Sarvam AI (primary) or Gemini Pro (fallback).
        """
        # Try Sarvam AI first
        if self.sarvam_client:
            try:
                print("Using Sarvam AI...")
                prompt = f"""
                Extract trading data from the following text. 
                Return ONLY a JSON object with keys: instrument (e.g. BTCUSDT), direction (LONG/SHORT), 
                entry_price (number), exit_price (number), result (WIN/LOSS/PENDING/BREAK_EVEN).
                If a value is missing, use null or 0.0.
                
                Text: "{text}"
                
                JSON:
                """
                
                response = self.sarvam_client.chat.completions.create(
                    model="sarvam-m",
                    messages=[{"role": "user", "content": prompt}],
                    # reasoning_effort="medium", # Optional
                )
                
                result_text = response.choices[0].message.content
                return self._process_ai_response(result_text, text)
                
            except Exception as e:
                print(f"Sarvam AI Error: {e}")
                # Fallback to Gemini
        
        # Fallback to Gemini
        try:
            print("Using Gemini fallback...")
            prompt = f"""
            Extract trading data from the following text. 
            Return a JSON object with keys: instrument (e.g. BTCUSDT), direction (LONG/SHORT), 
            entry_price (number), exit_price (number), result (WIN/LOSS/PENDING/BREAK_EVEN).
            If a value is missing, use null or 0.0.
            
            Text: "{text}"
            
            JSON:
            """
            
            response = self.gemini_model.generate_content(prompt)
            result_text = response.text
            return self._process_ai_response(result_text, text)
            
        except Exception as e:
            print(f"Gemini Error: {e}")
            # Fallback to regex
            return self._fallback_analyze_text(text)

    def _process_ai_response(self, result_text: str, original_text: str) -> dict:
        # Clean up markdown code blocks if present
        if "```json" in result_text:
            result_text = result_text.replace("```json", "").replace("```", "")
        elif "```" in result_text:
            result_text = result_text.replace("```", "")
        
        try:
            data = json.loads(result_text)
            
            # Normalize keys
            return {
                "instrument": data.get("instrument", "UNKNOWN"),
                "direction": data.get("direction", "UNKNOWN"),
                "entry_price": float(data.get("entry_price") or 0.0),
                "exit_price": float(data.get("exit_price") or 0.0),
                "result": data.get("result", "PENDING"),
                "notes": original_text,
                "confidence": 0.9
            }
        except json.JSONDecodeError:
             print(f"JSON Decode Error: {result_text}")
             raise Exception("Invalid JSON response from AI")
            
    def _fallback_analyze_text(self, text: str) -> dict:
        # Simple keyword extraction for demo
        instrument = "UNKNOWN"
        direction = "UNKNOWN"
        
        if "BTC" in text.upper():
            instrument = "BTCUSDT"
        if "ETH" in text.upper():
            instrument = "ETHUSDT"
            
        if "long" in text.lower() or "buy" in text.lower():
            direction = "LONG"
        elif "short" in text.lower() or "sell" in text.lower():
            direction = "SHORT"
            
        return {
            "instrument": instrument,
            "direction": direction,
            "entry_price": 0.0,
            "exit_price": 0.0,
            "result": "PENDING",
            "notes": text,
            "confidence": 0.7
        }
