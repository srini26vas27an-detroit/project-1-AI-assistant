from datetime import datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30))
UTC = timezone.utc


def now_ist() -> datetime:
    return datetime.now(IST)


def start_of_day_utc(days_ago: int = 0) -> datetime:
    """Midnight IST of (today - days_ago), returned in UTC for DB queries."""
    midnight = now_ist().replace(hour=0, minute=0, second=0, microsecond=0)
    return (midnight - timedelta(days=days_ago)).astimezone(UTC)


def to_iso(dt: datetime) -> str:
    """SQLite returns naive datetimes; treat them as UTC and return ISO."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.isoformat()

def to_ist(dt: datetime) -> datetime:
    """SQLite returns naive datetimes; treat them as UTC, then convert to IST."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(IST)