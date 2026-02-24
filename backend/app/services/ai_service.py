from __future__ import annotations

import base64
import json
import os
from typing import Any

import httpx

from app.core.config import settings

GOOGLE_API_KEY = settings.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY")

IMAGE_SYSTEM_PROMPT = """You are a trading journal parser that analyzes TradingView chart screenshots. Return ONLY a valid JSON object, nothing else. No explanation, no markdown, just raw JSON.
Extract the following fields:

instrument: Read from top-left corner of chart. Convert full name to ticker (Ethereum/U.S. Dollar -> ETHUSD, Euro/Japanese Yen -> EURJPY, Gold Futures -> XAUUSD). Never take this from caption.
timeframe: Read from top-left of chart (1m, 5m, 15m, 1h, 4h, 1D etc.)
direction: Look at the colored risk/reward box drawn on the chart. If the GREEN box is ABOVE the entry and RED box is BELOW the entry = LONG. If the RED box is ABOVE the entry and GREEN box is BELOW the entry = SHORT.
entry: The price level where the green and red boxes meet. Also visible as a label on the right-side price axis.
tp: The top of the green box. Also visible as a label on the right-side price axis.
sl: The bottom of the red box. Also visible as a label on the right-side price axis.
result: Extract from caption text only. "loss", "hit sl", "stopped out" = LOSS. "win", "made", "took profit", "tp hit" = WIN.
pnl_amount: The number from caption text only. e.g. "loss of 50" -> 50, "made 200" -> 200.
emotion: null (will be collected separately)

If a field is not visible, return null for that field. Never return an error or explanation."""

TEXT_EXTRACTION_PROMPT = """Extract a trading journal entry from this text. Return ONLY JSON with fields: instrument, direction, entry, sl, tp, result, pnl_amount, emotion. Infer as much as possible from context."""

NARRATIVE_EXTRACTION_PROMPT = """You are a trading psychologist and journal assistant. The user is telling you the story of their trade. Extract the following from their narrative and return ONLY valid JSON:

instrument: what they traded
direction: long or short
entry: entry price if mentioned
sl: stop loss if mentioned
tp: take profit if mentioned
result: WIN or LOSS
pnl_amount: profit or loss amount if mentioned
emotion_score: rate the emotional state from 1-10 (1 = fully emotional/revenge, 10 = fully disciplined/calm)
emotions: array of emotions detected (e.g. ["anxious", "FOMO", "revenge trading", "confident", "disciplined"])
narrative_summary: write a 2-3 sentence summary of what happened in the trade in third person
mistakes: array of any trading mistakes detected from the story
lessons: array of lessons the trader mentioned or that can be inferred
tags: array of relevant tags"""

TRANSCRIBE_PROMPT = "Transcribe this trading voice/audio message. Return only the transcription text."


class AIService:
    def __init__(self):
        self.api_key = GOOGLE_API_KEY
        self.model_name = "gemini-2.5-flash"

    async def analyze_screenshot(self, image_data: Any, caption: str | None = None, mime_type: str = "image/jpeg") -> dict:
        image_bytes = self._coerce_bytes(image_data)
        if not image_bytes or not self.api_key:
            return self._empty_parsed_trade()

        image_b64 = base64.b64encode(image_bytes).decode("ascii")
        raw_response = await self._generate_content(
            parts=[
                {"text": f'Caption: "{caption or ""}"'},
                {"inline_data": {"mime_type": mime_type, "data": image_b64}},
            ],
            system_prompt=IMAGE_SYSTEM_PROMPT,
        )
        print(f"Gemini raw response (image): {raw_response}")
        return self._parse_json_response(raw_response)

    async def analyze_text(self, text: str) -> dict:
        if not self.api_key:
            return self._empty_parsed_trade()

        raw_response = await self._generate_content(
            parts=[{"text": f"{TEXT_EXTRACTION_PROMPT}\n\nText:\n{text}"}],
        )
        print(f"Gemini raw response (text): {raw_response}")
        return self._parse_json_response(raw_response)

    async def analyze_narrative_text(self, text: str) -> dict:
        if not self.api_key:
            return self._empty_parsed_trade()

        raw_response = await self._generate_content(
            parts=[{"text": f"{NARRATIVE_EXTRACTION_PROMPT}\n\nNarrative:\n{text}"}],
        )
        print(f"Gemini raw response (narrative): {raw_response}")
        return self._parse_json_response(raw_response)

    async def transcribe_audio(self, audio_data: Any, mime_type: str = "audio/ogg") -> str:
        audio_bytes = self._coerce_bytes(audio_data)
        if not audio_bytes or not self.api_key:
            return ""

        audio_b64 = base64.b64encode(audio_bytes).decode("ascii")
        raw_response = await self._generate_content(
            parts=[
                {"text": TRANSCRIBE_PROMPT},
                {"inline_data": {"mime_type": mime_type, "data": audio_b64}},
            ],
        )
        print(f"Gemini raw response (audio transcription): {raw_response}")
        return (raw_response or "").strip()

    async def _generate_content(self, parts: list[dict], system_prompt: str | None = None) -> str:
        if not self.api_key:
            return ""

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model_name}:generateContent?key={self.api_key}"
        )
        payload: dict[str, Any] = {"contents": [{"role": "user", "parts": parts}]}
        if system_prompt:
            payload["system_instruction"] = {"parts": [{"text": system_prompt}]}

        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(url, json=payload)

        if response.status_code >= 400:
            print(f"Gemini API error ({response.status_code}): {response.text}")
            return ""

        data = response.json()
        candidates = data.get("candidates") or []
        if not candidates:
            return ""
        content = (candidates[0].get("content") or {}).get("parts") or []
        if not content:
            return ""
        return content[0].get("text", "") or ""

    def _parse_json_response(self, raw_text: str) -> dict:
        if not raw_text:
            return self._empty_parsed_trade()

        cleaned = raw_text.strip()
        if "```json" in cleaned:
            cleaned = cleaned.replace("```json", "").replace("```", "").strip()
        elif "```" in cleaned:
            cleaned = cleaned.replace("```", "").strip()

        if not cleaned.startswith("{"):
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1 and end > start:
                cleaned = cleaned[start : end + 1]

        try:
            parsed = json.loads(cleaned)
            if isinstance(parsed, dict):
                return self._normalize_trade_payload(parsed)
        except json.JSONDecodeError:
            print(f"Gemini JSON parse error: {raw_text}")
        return self._empty_parsed_trade()

    def _coerce_bytes(self, input_data: Any) -> bytes | None:
        if input_data is None:
            return None
        if isinstance(input_data, (bytes, bytearray)):
            return bytes(input_data)
        if hasattr(input_data, "read"):
            try:
                return input_data.read()
            except Exception:
                return None
        return None

    def _empty_parsed_trade(self) -> dict:
        return {
            "instrument": None,
            "timeframe": None,
            "direction": None,
            "entry": None,
            "sl": None,
            "tp": None,
            "result": None,
            "pnl_amount": None,
            "entry_price": None,
            "exit_price": None,
            "stop_loss": None,
            "take_profit": None,
        }

    def _normalize_trade_payload(self, payload: dict) -> dict:
        normalized = dict(payload)
        entry = normalized.get("entry")
        sl = normalized.get("sl")
        tp = normalized.get("tp")

        # Keep everything exactly as is for the raw output fields, but also add the mapped DB fields
        if "instrument" not in normalized or normalized.get("instrument") in (None, ""):
            normalized["instrument"] = "UNKNOWN"
        normalized["entry_price"] = normalized.get("entry_price", entry)
        normalized["exit_price"] = normalized.get("exit_price", tp)
        normalized["stop_loss"] = normalized.get("stop_loss", sl)
        normalized["take_profit"] = normalized.get("take_profit", tp)
        normalized["timeframe"] = normalized.get("timeframe")
        normalized["pnl_amount"] = normalized.get("pnl_amount")
        return normalized
