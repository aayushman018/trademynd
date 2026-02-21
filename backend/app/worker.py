from celery import Celery
from celery.schedules import crontab

from app.core.config import settings
from app.services.forex_factory import prewarm_forex_factory_cache

celery_app = Celery("trademynd", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery_app.conf.timezone = "UTC"
celery_app.conf.beat_schedule = {
    "prewarm-forex-factory-calendar": {
        "task": "app.worker.prewarm_forex_factory_calendar",
        "schedule": crontab(hour=6, minute=0),
    }
}


@celery_app.task(name="app.worker.prewarm_forex_factory_calendar")
def prewarm_forex_factory_calendar() -> dict:
    return prewarm_forex_factory_cache()
