import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from app.core.database import SessionLocal
from app.models.user import User
from app.models.trade import Trade
from app.services.telegram_service import get_bot

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_weekly_reports():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        # Assuming run on Monday morning to get previous Mon-Sun
        start_of_last_week = (now - timedelta(days=now.weekday() + 7)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_last_week = start_of_last_week + timedelta(days=7)
        
        users = db.query(User).filter(User.telegram_connected.is_(True)).all()
        bot = get_bot()
        
        for user in users:
            trades = db.query(Trade).filter(
                Trade.user_id == user.id,
                Trade.created_at >= start_of_last_week,
                Trade.created_at < end_of_last_week
            ).all()
            
            if not trades:
                continue

            # Process 3+ losses rule
            instrument_losses = {}
            for t in trades:
                if t.result == "LOSS":
                    instrument_losses[t.instrument] = instrument_losses.get(t.instrument, 0) + 1
                    
            for instrument, losses in instrument_losses.items():
                if losses >= 3:
                    msg = f"Hey, last week you took {len([t for t in trades if t.instrument == instrument])} trades on {instrument} and lost {losses} of them. Want to review what went wrong?"
                    await bot.send_message(chat_id=user.telegram_chat_id, text=msg)

            # Process Emotion Report
            trades_with_score = [t for t in trades if t.emotion_score is not None]
            if trades_with_score:
                avg_score = sum(float(t.emotion_score) for t in trades_with_score) / len(trades_with_score)
                
                # Count explicitly defined emotions 
                emotion_counts = {}
                for t in trades_with_score:
                    if t.narrative_data and t.narrative_data.get("emotions"):
                        for e in t.narrative_data["emotions"]:
                            emotion_counts[e] = emotion_counts.get(e, 0) + 1
                    elif t.emotion:
                        emotion_counts[t.emotion] = emotion_counts.get(t.emotion, 0) + 1
                        
                most_common = max(emotion_counts, key=emotion_counts.get) if emotion_counts else "Unknown"
                
                sorted_by_score = sorted(trades_with_score, key=lambda x: x.emotion_score, reverse=True)
                best_trades = sorted_by_score[:2]
                worst_trades = sorted_by_score[-2:]
                
                # Calculate FOMO losses 
                fomo_losses = sum(
                    float(t.pnl_amount) for t in trades 
                    if t.pnl_amount and t.pnl_amount < 0 and 
                       ((t.narrative_data and "FOMO" in [str(e).upper() for e in t.narrative_data.get("emotions", [])]) or 
                       (t.emotion and "FOMO" in t.emotion.upper()))
                )

                msg = "📊 Weekly Emotion Report\n"
                msg += "───────────────────\n"
                msg += f"Average emotional score : {avg_score:.1f}/10\n"
                msg += f"Most common emotion     : {most_common.capitalize()}\n"
                
                best_refs = ", ".join([t.trade_ref for t in best_trades])
                best_sc = best_trades[0].emotion_score if best_trades else "N/A"
                if best_refs:
                    msg += f"Best trades (emotionally): {best_refs} (score {best_sc}/10)\n"
                    
                worst_refs = ", ".join([t.trade_ref for t in worst_trades[::-1]])
                worst_sc = worst_trades[-1].emotion_score if worst_trades else "N/A"
                if worst_refs:
                    msg += f"Worst trades (emotionally): {worst_refs} (score {worst_sc}/10)\n"
                
                msg += "───────────────────\n"
                if avg_score >= 7:
                    msg += "💡 You traded very well emotionally this week. Great job!\n"
                else:
                    msg += "💡 You trade best when you're disciplined and patience.\n"
                    
                if fomo_losses < 0:
                    msg += f"Your FOMO trades this week lost you ${abs(fomo_losses):.2f} combined.\n"
                    
                msg += "───────────────────\n"
                msg += "Want to review your emotional trades this week?"

                await bot.send_message(chat_id=user.telegram_chat_id, text=msg)

    except Exception as e:
        logger.exception(f"Error sending weekly reports: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_weekly_reports())
