from __future__ import annotations

import json
import logging
from datetime import date, datetime, time, timezone
from functools import lru_cache
import xml.etree.ElementTree as ET
from zoneinfo import ZoneInfo

import httpx
import redis
from bs4 import BeautifulSoup, Tag
from redis.exceptions import RedisError

from app.core.config import settings

logger = logging.getLogger(__name__)

FOREX_FACTORY_CALENDAR_URL = "https://www.forexfactory.com/calendar"
FOREX_FACTORY_XML_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.xml"
CACHE_KEY = "ff_calendar_today"
CACHE_TTL_SECONDS = 60 * 60
NEW_YORK_TZ = ZoneInfo("America/New_York")

REQUEST_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/",
}

CURRENCY_EMOJI = {
    "USD": "🇺🇸",
    "EUR": "🇪🇺",
    "GBP": "🇬🇧",
    "JPY": "🇯🇵",
    "AUD": "🇦🇺",
    "NZD": "🇳🇿",
    "CAD": "🇨🇦",
    "CHF": "🇨🇭",
    "CNY": "🇨🇳",
    "CNH": "🇨🇳",
    "SEK": "🇸🇪",
    "NOK": "🇳🇴",
    "DKK": "🇩🇰",
    "SGD": "🇸🇬",
    "HKD": "🇭🇰",
    "XAU": "🥇",
    "XAG": "🥈",
    "BTC": "₿",
    "ETH": "⟠",
}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _today_key() -> str:
    # Forex Factory calendar is typically interpreted in US market day context.
    return datetime.now(NEW_YORK_TZ).date().isoformat()


@lru_cache(maxsize=1)
def _get_redis_client() -> redis.Redis:
    return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


def _get_cell_text(row: Tag, selectors: list[str]) -> str:
    for selector in selectors:
        node = row.select_one(selector)
        if node:
            value = node.get_text(" ", strip=True)
            if value:
                return value
    return ""


def _is_high_impact_row(row: Tag) -> bool:
    impact_cell = row.select_one(".calendar__impact, .impact")
    if not impact_cell:
        return False

    classes = " ".join(impact_cell.get("class", []))
    if "high" in classes.lower():
        return True

    title = impact_cell.get("title", "")
    if "high" in title.lower():
        return True

    icon = impact_cell.select_one("[title*='High'], [class*='high']")
    return icon is not None


def _parse_date_value(raw: str, fallback: date) -> date:
    clean = " ".join(raw.replace(",", " ").split())
    if not clean:
        return fallback

    formats = ["%a %b %d", "%A %b %d", "%b %d", "%a %d %b", "%d %b"]
    for fmt in formats:
        try:
            parsed = datetime.strptime(clean, fmt)
            return parsed.replace(year=fallback.year).date()
        except ValueError:
            continue
    return fallback


def _parse_xml_date_value(raw: str, fallback: date) -> date:
    clean = " ".join((raw or "").replace(",", " ").split())
    if not clean:
        return fallback

    formats = ["%m-%d-%Y", "%Y-%m-%d", "%d-%m-%Y", "%b %d %Y", "%d %b %Y", "%b %d"]
    for fmt in formats:
        try:
            parsed = datetime.strptime(clean, fmt)
            year = parsed.year if "%Y" in fmt else fallback.year
            return parsed.replace(year=year).date()
        except ValueError:
            continue
    return fallback


def _parse_time_value(raw: str) -> time | None:
    clean = raw.strip().lower()
    if not clean or clean in {"all day", "day 1", "day 2", "tentative"}:
        return None

    clean = clean.replace(" ", "")
    formats = ["%I:%M%p", "%I%p", "%H:%M"]
    for fmt in formats:
        try:
            parsed = datetime.strptime(clean, fmt)
            return parsed.time()
        except ValueError:
            continue
    return None


def _to_utc_time_string(event_date: date, raw_time: str) -> str | None:
    parsed_time = _parse_time_value(raw_time)
    if parsed_time is None:
        return None

    local_dt = datetime.combine(event_date, parsed_time, tzinfo=NEW_YORK_TZ)
    return local_dt.astimezone(timezone.utc).strftime("%H:%M")


def _load_cached_payload() -> dict | None:
    try:
        cache_client = _get_redis_client()
        payload = cache_client.get(CACHE_KEY)
        if not payload:
            return None
        return json.loads(payload)
    except (RedisError, json.JSONDecodeError):
        return None


def _save_cache(payload: dict) -> None:
    try:
        cache_client = _get_redis_client()
        cache_client.set(CACHE_KEY, json.dumps(payload), ex=CACHE_TTL_SECONDS)
    except RedisError:
        logger.warning("Redis cache write failed for Forex Factory feed")


def _is_cloudflare_challenge(text: str) -> bool:
    lower = text.lower()
    return "just a moment" in lower and "__cf_chl_opt" in lower


def _is_export_rate_limited(text: str) -> bool:
    lower = text.lower()
    return "request denied" in lower and "calendar export requests" in lower


def _emoji_for_currency(value: str | None) -> str:
    if not value:
        return "🌐"

    code = value.strip().upper().replace("/", "")
    if code in CURRENCY_EMOJI:
        return CURRENCY_EMOJI[code]

    if len(code) == 6 and code.isalpha():
        left = CURRENCY_EMOJI.get(code[:3], "📈")
        right = CURRENCY_EMOJI.get(code[3:], "💱")
        return f"{left}{right}"

    return "🌐"


def _scrape_high_impact_events_html() -> list[dict[str, str | None]]:
    with httpx.Client(timeout=15.0, follow_redirects=True) as client:
        response = client.get(FOREX_FACTORY_CALENDAR_URL, headers=REQUEST_HEADERS)
        response.raise_for_status()

    if _is_cloudflare_challenge(response.text):
        raise RuntimeError("Forex Factory calendar is behind Cloudflare challenge")

    soup = BeautifulSoup(response.text, "html.parser")
    rows = soup.select("tr.calendar__row, tr.calendar__row--grey, tr.js-event-item")
    if not rows:
        raise RuntimeError("No calendar rows found in HTML response")

    events: list[dict[str, str | None]] = []
    today_local = datetime.now(NEW_YORK_TZ).date()
    current_date = today_local

    for row in rows:
        raw_date = _get_cell_text(row, [".calendar__date", ".date"])
        if raw_date:
            current_date = _parse_date_value(raw_date, today_local)

        if current_date != today_local:
            continue

        if not _is_high_impact_row(row):
            continue

        raw_time = _get_cell_text(row, [".calendar__time", ".time"])
        currency = _get_cell_text(row, [".calendar__currency", ".currency"]) or "N/A"
        event_name = _get_cell_text(
            row,
            [".calendar__event-title", ".calendar__event", ".event"],
        ) or "Unnamed event"
        forecast = _get_cell_text(row, [".calendar__forecast", ".forecast"]) or "N/A"
        previous = _get_cell_text(row, [".calendar__previous", ".previous"]) or "N/A"

        events.append(
            {
                "time_utc": _to_utc_time_string(current_date, raw_time),
                "currency": currency,
                "event": event_name,
                "forecast": forecast,
                "previous": previous,
            }
        )

    events.sort(key=lambda row: row.get("time_utc") or "99:99")
    return events


def _scrape_high_impact_events_xml() -> list[dict[str, str | None]]:
    with httpx.Client(timeout=15.0, follow_redirects=True) as client:
        response = client.get(FOREX_FACTORY_XML_URL, headers=REQUEST_HEADERS)
        response.raise_for_status()

    body = response.text
    if _is_export_rate_limited(body):
        raise RuntimeError("Forex Factory XML export is rate limited")

    lowered = body.lstrip().lower()
    if "<weeklyevents" not in lowered:
        raise RuntimeError("Unexpected XML export payload")

    root = ET.fromstring(body)
    today_local = datetime.now(NEW_YORK_TZ).date()
    events: list[dict[str, str | None]] = []

    for event_node in root.findall(".//event"):
        impact = (event_node.findtext("impact") or "").strip()
        if "high" not in impact.lower():
            continue

        event_date = _parse_xml_date_value((event_node.findtext("date") or "").strip(), today_local)
        if event_date != today_local:
            continue

        raw_time = (event_node.findtext("time") or "").strip()
        currency = (event_node.findtext("country") or "").strip() or "N/A"
        event_name = (event_node.findtext("title") or "").strip() or "Unnamed event"
        forecast = (event_node.findtext("forecast") or "").strip() or "N/A"
        previous = (event_node.findtext("previous") or "").strip() or "N/A"

        events.append(
            {
                "time_utc": _to_utc_time_string(event_date, raw_time),
                "currency": currency,
                "event": event_name,
                "forecast": forecast,
                "previous": previous,
            }
        )

    events.sort(key=lambda row: row.get("time_utc") or "99:99")
    return events


def _scrape_high_impact_events() -> tuple[list[dict[str, str | None]], str]:
    errors: list[str] = []

    try:
        return _scrape_high_impact_events_xml(), "xml"
    except Exception as exc:
        errors.append(f"xml:{exc}")

    try:
        return _scrape_high_impact_events_html(), "html"
    except Exception as exc:
        errors.append(f"html:{exc}")

    raise RuntimeError("; ".join(errors))


def get_today_high_impact_news(force_refresh: bool = False) -> dict:
    cached_payload = _load_cached_payload()
    today = _today_key()

    if not force_refresh and cached_payload and cached_payload.get("cache_date") == today:
        return {
            "events": cached_payload.get("events", []),
            "scraper_healthy": bool(cached_payload.get("scraper_healthy", True)),
            "error": cached_payload.get("error"),
            "last_fetched_utc": cached_payload.get("last_fetched_utc"),
            "source": cached_payload.get("source", "cache"),
            "from_cache": True,
        }

    try:
        events, source = _scrape_high_impact_events()
        payload = {
            "events": events,
            "scraper_healthy": True,
            "error": None,
            "last_fetched_utc": _utc_now().isoformat(),
            "cache_date": today,
            "source": source,
        }
        _save_cache(payload)
        return {**payload, "from_cache": False}
    except Exception as exc:
        logger.warning("Forex Factory scrape failed: %s", exc)
        error_text = (
            "News temporarily unavailable - Forex Factory may be blocking requests. Try again later."
        )

        # Only trust cached data for the same market day.
        if cached_payload and cached_payload.get("cache_date") == today:
            return {
                "events": cached_payload.get("events", []),
                "scraper_healthy": False,
                "error": error_text,
                "last_fetched_utc": cached_payload.get("last_fetched_utc"),
                "source": cached_payload.get("source", "cache"),
                "from_cache": True,
            }

        return {
            "events": [],
            "scraper_healthy": False,
            "error": error_text,
            "last_fetched_utc": None,
            "source": "none",
            "from_cache": False,
        }


def format_high_impact_news_message(events: list[dict[str, str | None]]) -> str:
    today_label = _utc_now().strftime("%Y-%m-%d")
    lines: list[str] = [
        f"📅 High Impact News - {today_label}",
        "──────────────────────",
        "",
    ]

    if not events:
        lines.append("✅ No red folder events today. Safe to trade.")
        lines.append("")
    else:
        for row in events:
            time_utc = row.get("time_utc") or "TBD"
            currency = row.get("currency") or "N/A"
            event_name = row.get("event") or "Unnamed event"
            forecast = row.get("forecast") or "N/A"
            previous = row.get("previous") or "N/A"
            currency_emoji = _emoji_for_currency(currency)

            lines.extend(
                [
                    f"🔴 {time_utc} UTC | {currency_emoji} {currency}",
                    event_name,
                    f"Forecast: {forecast} | Previous: {previous}",
                    "",
                ]
            )

    lines.extend(["──────────────────────", "Stay sharp. Manage your risk. 🎯"])
    return "\n".join(lines)


def format_news_unavailable_message(error: str | None = None) -> str:
    today_label = _utc_now().strftime("%Y-%m-%d")
    details = error or "News source is temporarily unavailable."
    lines = [
        f"📅 High Impact News - {today_label}",
        "──────────────────────",
        "",
        details,
        "",
        "──────────────────────",
        "Stay sharp. Manage your risk. 🎯",
    ]
    return "\n".join(lines)


def prewarm_forex_factory_cache() -> dict:
    return get_today_high_impact_news(force_refresh=True)
