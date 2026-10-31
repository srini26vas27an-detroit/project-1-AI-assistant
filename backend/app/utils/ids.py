from app.core.errors import NotFound


def parse_id(raw: str) -> int:
    try:
        return int(raw)
    except (TypeError, ValueError):
        raise NotFound("Not found")