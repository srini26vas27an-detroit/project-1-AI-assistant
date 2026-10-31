import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai import fallback
from app.ai.client import GeminiError, ask_gemini, ping_gemini
from app.ai.language import detect_language
from app.ai.tools import Toolbox
from app.core.config import settings
from app.core.database import get_db
from app.core.errors import BadRequest
from app.models.chat import ChatMessage
from app.schemas.assistant import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)
router = APIRouter(tags=["assistant"])


def _safe_reason(exc: Exception) -> str:
    """Short error text for the UI, with the API key removed just in case."""
    text = str(exc).replace("\n", " ")
    if settings.GEMINI_API_KEY:
        text = text.replace(settings.GEMINI_API_KEY, "***")
    return text[:240]


@router.get("/status")
def status():
    """Open /assistant/status in the browser to see if Gemini really works."""
    info = {"keyConfigured": bool(settings.GEMINI_API_KEY), "model": settings.GEMINI_MODEL}
    try:
        info["ok"] = True
        info["reply"] = ping_gemini()
    except GeminiError as exc:
        info["ok"] = False
        info["error"] = _safe_reason(exc)
    return info


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    message = req.message.strip()
    if not message:
        raise BadRequest("Message is empty")

    language = detect_language(message)
    toolbox = Toolbox(db)

    try:
        text = ask_gemini(message, language, [], req.history, context=toolbox.snapshot())
        # The rule engine only reads the database (no network). Use it to pick the
        # button / data card that matches the question.
        rule = fallback.answer(message, language, Toolbox(db))
        payload = rule.data_payload
        action = rule.quick_action if payload else None
        response = ChatResponse(
            text=text, quick_action=action, data_payload=payload, source="gemini"
        )
    except GeminiError as exc:
        logger.warning("Using rule-based fallback because Gemini failed: %s", exc)
        response = fallback.answer(message, language, Toolbox(db))
        response.fallback_reason = _safe_reason(exc)

    # Save chat history (small and optional)
    db.add(ChatMessage(role="user", text=message, language=language))
    db.add(ChatMessage(role="assistant", text=response.text, language=language))
    db.commit()

    return response