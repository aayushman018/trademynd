from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.trade import Trade

DAY_ORDER = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]

EMOTIONS = ["CONFIDENT", "NEUTRAL", "ANXIOUS", "REVENGE", "FOMO", "BORED"]
OUTCOMES = ["WIN", "LOSS", "BREAKEVEN"]

CRYPTO_MARKERS = ("BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "BNB", "LTC")


def _to_float(value: Decimal | float | int | None) -> float:
    if value is None:
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _to_utc(dt_value: datetime | None) -> datetime:
    if dt_value is None:
        return datetime.now(timezone.utc)
    if dt_value.tzinfo is None:
        return dt_value.replace(tzinfo=timezone.utc)
    return dt_value.astimezone(timezone.utc)


def _normalize_result(result: str | None) -> str:
    if not result:
        return "BREAKEVEN"
    normalized = result.strip().upper().replace("-", "_")
    if normalized in {"WIN", "W"}:
        return "WIN"
    if normalized in {"LOSS", "L"}:
        return "LOSS"
    if normalized in {"BREAK_EVEN", "BREAKEVEN", "BE"}:
        return "BREAKEVEN"
    return "BREAKEVEN"


def _normalize_emotion(emotion: str | None) -> str:
    if not emotion:
        return "NEUTRAL"
    upper = emotion.strip().upper()
    if "REVENGE" in upper:
        return "REVENGE"
    if "ANX" in upper:
        return "ANXIOUS"
    if "FOMO" in upper:
        return "FOMO"
    if "BORED" in upper:
        return "BORED"
    if "CONF" in upper:
        return "CONFIDENT"
    if "NEUT" in upper:
        return "NEUTRAL"
    return "NEUTRAL"


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def _get_user_trades(self, user_id: UUID) -> list[Trade]:
        trades = self.db.query(Trade).filter(Trade.user_id == user_id).all()
        trades.sort(key=lambda trade: _to_utc(trade.trade_timestamp or trade.created_at))
        return trades

    def get_summary(self, user_id: UUID) -> dict[str, Any]:
        trades = self._get_user_trades(user_id)
        total_trades = len(trades)
        if total_trades == 0:
            return {
                "total_trades": 0,
                "win_rate": 0.0,
                "total_r": 0.0,
                "avg_r": 0.0,
                "best_trade": {"r_multiple": 0.0, "instrument": None},
                "worst_trade": {"r_multiple": 0.0, "instrument": None},
                "current_streak": {"type": "NONE", "count": 0},
            }

        r_values = [_to_float(trade.r_multiple) for trade in trades]
        total_r = round(sum(r_values), 4)
        avg_r = round(total_r / len(r_values), 4) if r_values else 0.0

        wins = sum(1 for trade in trades if _normalize_result(trade.result) == "WIN")
        win_rate = round(wins / total_trades, 4)

        best_trade = max(trades, key=lambda trade: _to_float(trade.r_multiple), default=None)
        worst_trade = min(trades, key=lambda trade: _to_float(trade.r_multiple), default=None)

        streak_type = "NONE"
        streak_count = 0
        for trade in reversed(trades):
            result = _normalize_result(trade.result)
            if result not in {"WIN", "LOSS"}:
                continue
            if streak_type == "NONE":
                streak_type = result
                streak_count = 1
                continue
            if result == streak_type:
                streak_count += 1
            else:
                break

        return {
            "total_trades": total_trades,
            "win_rate": win_rate,
            "total_r": total_r,
            "avg_r": avg_r,
            "best_trade": {
                "r_multiple": round(_to_float(best_trade.r_multiple), 4) if best_trade else 0.0,
                "instrument": best_trade.instrument if best_trade else None,
            },
            "worst_trade": {
                "r_multiple": round(_to_float(worst_trade.r_multiple), 4) if worst_trade else 0.0,
                "instrument": worst_trade.instrument if worst_trade else None,
            },
            "current_streak": {"type": streak_type, "count": streak_count},
        }

    def get_by_hour(self, user_id: UUID) -> list[dict[str, Any]]:
        trades = self._get_user_trades(user_id)
        stats: dict[int, dict[str, float]] = {hour: {"wins": 0.0, "count": 0.0} for hour in range(24)}

        for trade in trades:
            hour = _to_utc(trade.trade_timestamp or trade.created_at).hour
            stats[hour]["count"] += 1
            if _normalize_result(trade.result) == "WIN":
                stats[hour]["wins"] += 1

        return [
            {
                "hour": hour,
                "win_rate": round(stats[hour]["wins"] / stats[hour]["count"], 4) if stats[hour]["count"] else 0.0,
                "trade_count": int(stats[hour]["count"]),
            }
            for hour in range(24)
        ]

    def get_by_day(self, user_id: UUID) -> list[dict[str, Any]]:
        trades = self._get_user_trades(user_id)
        day_stats: dict[str, dict[str, float]] = {
            day: {"net_r": 0.0, "trade_count": 0.0}
            for day in DAY_ORDER
        }

        has_crypto = False
        for trade in trades:
            instrument = (trade.instrument or "").upper()
            if any(marker in instrument for marker in CRYPTO_MARKERS):
                has_crypto = True

            weekday = _to_utc(trade.trade_timestamp or trade.created_at).strftime("%A")
            if weekday not in day_stats:
                continue
            day_stats[weekday]["trade_count"] += 1
            day_stats[weekday]["net_r"] += _to_float(trade.r_multiple)

        selected_days = DAY_ORDER if has_crypto else DAY_ORDER[:5]
        rows = [
            {
                "day": day,
                "net_r": round(day_stats[day]["net_r"], 4),
                "trade_count": int(day_stats[day]["trade_count"]),
            }
            for day in selected_days
        ]
        rows.sort(key=lambda row: row["net_r"], reverse=True)
        return rows

    def get_by_emotion(self, user_id: UUID) -> list[dict[str, Any]]:
        trades = self._get_user_trades(user_id)
        counts = defaultdict(int)

        for trade in trades:
            emotion = _normalize_emotion(trade.emotion)
            result = _normalize_result(trade.result)
            counts[(emotion, result)] += 1

        rows: list[dict[str, Any]] = []
        for emotion in EMOTIONS:
            for result in OUTCOMES:
                rows.append(
                    {
                        "emotion": emotion,
                        "result": result,
                        "count": counts[(emotion, result)],
                    }
                )
        return rows

    def get_by_instrument(self, user_id: UUID) -> list[dict[str, Any]]:
        trades = self._get_user_trades(user_id)
        stats: dict[str, dict[str, float]] = defaultdict(lambda: {"net_r": 0.0, "trade_count": 0.0})

        for trade in trades:
            instrument = (trade.instrument or "UNKNOWN").upper()
            stats[instrument]["net_r"] += _to_float(trade.r_multiple)
            stats[instrument]["trade_count"] += 1

        rows = [
            {
                "instrument": instrument,
                "net_r": round(values["net_r"], 4),
                "trade_count": int(values["trade_count"]),
            }
            for instrument, values in stats.items()
        ]
        rows.sort(key=lambda row: row["net_r"], reverse=True)
        return rows

    def get_drawdown(self, user_id: UUID) -> list[dict[str, Any]]:
        trades = self._get_user_trades(user_id)
        rows: list[dict[str, Any]] = []
        cumulative = 0.0
        peak = 0.0

        for index, trade in enumerate(trades, start=1):
            cumulative += _to_float(trade.r_multiple)
            peak = max(peak, cumulative)
            drawdown = cumulative - peak
            rows.append({"trade_number": index, "drawdown": round(drawdown, 4)})

        return rows

    def get_calendar(self, user_id: UUID) -> list[dict[str, Any]]:
        trades = self._get_user_trades(user_id)
        now = datetime.now(timezone.utc)
        month_stats: dict[str, dict[str, float]] = defaultdict(lambda: {"net_r": 0.0, "trade_count": 0.0})

        for trade in trades:
            trade_time = _to_utc(trade.trade_timestamp or trade.created_at)
            if trade_time.year != now.year or trade_time.month != now.month:
                continue

            date_key = trade_time.date().isoformat()
            month_stats[date_key]["net_r"] += _to_float(trade.r_multiple)
            month_stats[date_key]["trade_count"] += 1

        rows = [
            {
                "date": date_key,
                "net_r": round(values["net_r"], 4),
                "trade_count": int(values["trade_count"]),
            }
            for date_key, values in month_stats.items()
        ]
        rows.sort(key=lambda row: row["date"])
        return rows

