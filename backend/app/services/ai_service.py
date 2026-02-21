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
        self.gemini_model = genai.GenerativeModel("gemini-pro")
        self.vision_model = genai.GenerativeModel("gemini-pro-vision")

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

        ocr_text = None
        if self.sarvam_vision is not None:
            try:
                ocr_text = await asyncio.to_thread(self._sarvam_document_intelligence_markdown, image_bytes)
            except Exception as exc:
                print(f"Sarvam Vision Error: {exc}")

        if ocr_text:
            ocr_text = ocr_text.strip()

        if self.sarvam_client and ocr_text:
            try:
                prompt = f"""
Extract TradingView position/trade details from OCR text.

Return ONLY JSON with keys:
instrument, direction, entry_price, exit_price, current_price, pnl_value, pnl_percent, stop_loss, take_profit, result, confidence.

Rules:
- direction must be LONG or SHORT. If unclear, infer using entry vs current (current > entry => LONG, else SHORT).
- If pnl_value or pnl_percent is not visible, set null.
- confidence is 0 to 1.
- Do not add extra keys.

Caption: "{(caption or "").strip()}"

OCR:
{ocr_text[:12000]}
"""
                response = self.sarvam_client.chat.completions.create(
                    model="sarvam-m",
                    messages=[{"role": "user", "content": prompt}],
                )
                result_text = response.choices[0].message.content or ""
                return self._process_vision_trade_response(result_text, caption or "", ocr_text)
            except Exception as exc:
                print(f"Sarvam AI Vision Parse Error: {exc}")

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
            "confidence": 0.2,
            "ocr_text": ocr_text[:2000] if ocr_text else None,
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

    def _process_vision_trade_response(self, result_text: str, notes: str, ocr_text: str | None) -> dict:
        cleaned = result_text
        if "```json" in cleaned:
            cleaned = cleaned.replace("```json", "").replace("```", "")
        elif "```" in cleaned:
            cleaned = cleaned.replace("```", "")

        data = json.loads(cleaned)

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

    def _sarvam_document_intelligence_markdown(self, image_bytes: bytes) -> str:
        if self.sarvam_vision is None:
            raise RuntimeError("Sarvam Vision is not configured")

        with tempfile.TemporaryDirectory() as tmpdir:
            image_path = os.path.join(tmpdir, "screenshot.png")
            zip_path = os.path.join(tmpdir, "output.zip")

            with open(image_path, "wb") as f:
                f.write(image_bytes)

            job = self.sarvam_vision.document_intelligence.create_job(language="en-IN", output_format="md")
            job.upload_file(image_path)
            job.start()
            status = job.wait_until_complete()
            if getattr(status, "job_state", None) != "Completed":
                raise RuntimeError(f"Document intelligence failed: {status}")

            job.download_output(zip_path)

            with zipfile.ZipFile(zip_path, "r") as zf:
                md_files = [name for name in zf.namelist() if name.lower().endswith(".md")]
                if not md_files:
                    raise RuntimeError("No markdown output found")
                content = zf.read(md_files[0])
                return content.decode("utf-8", errors="replace")

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
