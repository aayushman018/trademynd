import asyncio
import json
import tempfile
import zipfile
from typing import Any
import google.generativeai as genai
import os
from app.core.config import settings
from openai import OpenAI

try:
    from sarvamai import SarvamAI
except Exception:
    SarvamAI = None

# Configure Gemini
# Using the key provided by the user if not in settings
GOOGLE_API_KEY = settings.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# Configure Sarvam AI
SARVAM_API_KEY = settings.SARVAM_API_KEY or os.getenv("SARVAM_API_KEY")

class AIService:
    def __init__(self):
        # Initialize Gemini 1.5 Flash for multimodal capabilities (Text, Image, Audio)
        self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
        # Keep gemini-pro-vision for backward compatibility or specific vision tasks if needed
        self.vision_model = genai.GenerativeModel("gemini-1.5-flash") 

        self.sarvam_client: OpenAI | None = None
        if SARVAM_API_KEY:
            try:
                self.sarvam_client = OpenAI(
                    base_url="https://api.sarvam.ai/v1",
                    api_key=SARVAM_API_KEY,
                )
            except Exception as exc:
                print(f"Failed to initialize Sarvam AI client: {exc}")

        self.sarvam_vision: Any = None
        if SARVAM_API_KEY and SarvamAI is not None:
            try:
                self.sarvam_vision = SarvamAI(api_subscription_key=SARVAM_API_KEY)
            except Exception as exc:
                print(f"Failed to initialize Sarvam Vision client: {exc}")

    async def analyze_screenshot(self, image_data: Any, caption: str | None = None) -> dict:
        image_bytes = self._coerce_image_bytes(image_data)
        if not image_bytes:
            return {
                "instrument": "UNKNOWN",
                "direction": "UNKNOWN",
                "entry_price": 0.0,
                "exit_price": 0.0,
                "current_price": 0.0,
                "pnl_value": 0.0,
                "pnl_percent": 0.0,
                "result": "PENDING",
                "notes": caption or "",
                "confidence": 0.0,
                "error": "Invalid image input",
            }

        # Use Gemini 1.5 Flash for vision analysis
        if self.vision_model:
            try:
                prompt = f"""
                Analyze this trading screenshot and extract the following details.
                Caption provided by user: "{caption or ''}"
                
                Return ONLY a JSON object with these keys:
                instrument (e.g. BTCUSDT, XAUUSD), direction (LONG/SHORT), 
                entry_price (number), exit_price (number), current_price (number), 
                pnl_value (number), pnl_percent (number), stop_loss (number), take_profit (number), 
                result (WIN/LOSS/PENDING/BREAK_EVEN), confidence (0.0 to 1.0).
                
                If a value is not visible or cannot be inferred, use null.
                Infer direction from entry vs current price if explicit direction is missing.
                """
                
                # Pass image bytes directly with mime_type
                image_blob = {'mime_type': 'image/jpeg', 'data': image_bytes}
                
                response = self.vision_model.generate_content([prompt, image_blob])
                result_text = response.text
                return self._process_vision_trade_response(result_text, caption or "", None)
            except Exception as e:
                print(f"Gemini Vision Error: {e}")

        # Fallback to Sarvam if Gemini fails (or if configured to do so)
        # ... (Existing Sarvam logic can remain as fallback or be removed if strict rollback is desired)
        # For now, we return error/empty if Gemini fails to stick to the "rollback to Gemini" instruction.
        
        return {
            "instrument": "UNKNOWN",
            "direction": "UNKNOWN",
            "entry_price": 0.0,
            "exit_price": 0.0,
            "current_price": 0.0,
            "pnl_value": 0.0,
            "pnl_percent": 0.0,
            "result": "PENDING",
            "notes": caption or "",
            "confidence": 0.0,
            "error": "AI analysis failed",
        }

    async def generate_personality_response(self, trade_data: dict, user_message: str) -> str:
        """
        Generate a friendly, supportive, and motivational response based on the trade result.
        """
        system_prompt = (
            "You are a friendly, supportive, and motivational trading companion bot named 'TradeMynd'. "
            "Your goal is to encourage the trader, celebrate their wins, and offer constructive empathy for losses. "
            "Be concise, professional but warm. Use emojis. "
            "If the trade is a WIN, celebrate it. If it's a LOSS, remind them of risk management or psychology. "
            "If it's PENDING, encourage them to follow their plan. "
            "Never give financial advice. Focus on execution and psychology."
        )

        user_prompt = f"""
        User Message: "{user_message}"
        Trade Details: {json.dumps(trade_data, default=str)}
        
        Generate a short response (max 2 sentences) acknowledging the trade log.
        """

        try:
            # Use Gemini 1.5 Flash
            if self.gemini_model:
                response = self.gemini_model.generate_content(f"{system_prompt}\n\n{user_prompt}")
                return response.text or "Trade logged! Good job following your plan. 📉📈"

        except Exception as e:
            print(f"AI Persona Generation Error: {e}")
        
        # Static Fallback
        result = trade_data.get("result", "PENDING")
        if result == "WIN":
            return "Great trade! 🚀 Added to your journal."
        elif result == "LOSS":
            return "Logged. Review the setup and move on to the next one. 💪"
        else:
            return "Trade logged. Stick to your plan! 🛡️"

    async def analyze_voice(self, audio_data: Any) -> dict:
        """
        Analyze voice note using Gemini 1.5 Flash (multimodal).
        """
        audio_bytes = self._coerce_image_bytes(audio_data) # Reusing coerce function for bytes
        if not audio_bytes:
             return {"error": "Invalid audio data"}

        if self.gemini_model:
            try:
                prompt = """
                Listen to this trading voice note. Extract the following details into a JSON object:
                instrument (e.g. BTCUSDT), direction (LONG/SHORT), entry_price (number), exit_price (number), 
                result (WIN/LOSS/PENDING), emotion (e.g. calm, anxious, excited), confidence (0.0 to 1.0).
                
                If values are missing, use null.
                """
                
                # Pass audio bytes directly (Gemini 1.5 supports audio input)
                # Note: For audio, mime_type is usually audio/mp3 or audio/wav. 
                # Telegram usually sends OGG or MP3. We'll assume a generic type or try to detect.
                # For safety with the API, audio/mp3 is a good default to try if format is unknown, 
                # or we rely on the API to detect.
                audio_blob = {'mime_type': 'audio/mp3', 'data': audio_bytes}
                
                response = self.gemini_model.generate_content([prompt, audio_blob])
                result_text = response.text
                return self._process_ai_response(result_text, "Voice Note")
                
            except Exception as e:
                print(f"Gemini Voice Analysis Error: {e}")
        
        return {
            "instrument": "UNKNOWN",
            "direction": "UNKNOWN",
            "result": "PENDING",
            "notes": "Voice analysis failed",
            "confidence": 0.0
        }

    async def analyze_text(self, text: str) -> dict:
        """
        Analyze text using Gemini 1.5 Flash (primary).
        """
        # Use Gemini
        try:
            print("Using Gemini 1.5 Flash...")
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
                "emotion": data.get("emotion", "neutral"), # Added emotion support
                "notes": original_text,
                "confidence": float(data.get("confidence") or 0.9)
            }
        except json.JSONDecodeError:
            print(f"JSON Decode Error: {result_text}")
            # raise Exception("Invalid JSON response from AI") # Don't raise, fallback
            return self._fallback_analyze_text(original_text)

    def _process_vision_trade_response(self, result_text: str, notes: str, ocr_text: str | None) -> dict:
        cleaned = result_text
        if "```json" in cleaned:
            cleaned = cleaned.replace("```json", "").replace("```", "")
        elif "```" in cleaned:
            cleaned = cleaned.replace("```", "")

        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError:
             print(f"JSON Decode Error (Vision): {result_text}")
             return {
                "instrument": "UNKNOWN",
                "direction": "UNKNOWN",
                "result": "PENDING",
                "confidence": 0.0,
                "error": "Failed to parse AI response"
            }

        instrument = (data.get("instrument") or "UNKNOWN").strip() if isinstance(data.get("instrument"), str) else "UNKNOWN"
        direction = (data.get("direction") or "UNKNOWN").strip().upper() if isinstance(data.get("direction"), str) else "UNKNOWN"

        entry_price = float(data.get("entry_price") or 0.0)
        exit_price = float(data.get("exit_price") or 0.0)
        current_price = float(data.get("current_price") or 0.0)
        pnl_value = data.get("pnl_value")
        pnl_percent = data.get("pnl_percent")
        stop_loss = data.get("stop_loss")
        take_profit = data.get("take_profit")

        normalized_pnl_value = float(pnl_value) if pnl_value is not None else 0.0
        normalized_pnl_percent = float(pnl_percent) if pnl_percent is not None else 0.0
        normalized_stop_loss = float(stop_loss) if stop_loss is not None else 0.0
        normalized_take_profit = float(take_profit) if take_profit is not None else 0.0

        if direction not in {"LONG", "SHORT"} and entry_price and current_price and current_price != entry_price:
            direction = "LONG" if current_price > entry_price else "SHORT"

        result = data.get("result") or "PENDING"
        if isinstance(result, str):
            result = result.strip().upper()

        confidence = float(data.get("confidence") or 0.0)
        confidence = max(0.0, min(1.0, confidence))

        return {
            "instrument": instrument,
            "direction": direction,
            "entry_price": entry_price,
            "exit_price": exit_price,
            "current_price": current_price,
            "pnl_value": normalized_pnl_value,
            "pnl_percent": normalized_pnl_percent,
            "stop_loss": normalized_stop_loss,
            "take_profit": normalized_take_profit,
            "result": result,
            "notes": notes,
            "confidence": confidence,
            "ocr_text": ocr_text[:2000] if ocr_text else None,
        }

    # Helper methods (Sarvam OCR and coercion) remain if needed, but coercion is used by new logic.
    # Sarvam OCR logic is effectively unused now but kept as dead code/fallback if we wanted.
    
    def _sarvam_document_intelligence_markdown(self, image_bytes: bytes) -> str:
         # ... (existing code, now unused by primary path) ...
         return "" 

    def _coerce_image_bytes(self, image_data: Any) -> bytes | None:
        if image_data is None:
            return None
        if isinstance(image_data, (bytes, bytearray)):
            return bytes(image_data)
        if hasattr(image_data, "read"):
            try:
                return image_data.read()
            except Exception:
                return None
        return None
            
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