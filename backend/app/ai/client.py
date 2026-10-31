import logging
import time
import json
from google import genai
from google.genai import errors, types

from app.ai.prompts import build_system_prompt
from app.core.config import settings

logger = logging.getLogger(__name__)


class GeminiError(Exception):
    """Raised whenever the AI can't answer, so the caller can use the fallback."""


_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if not settings.GEMINI_API_KEY:
        raise GeminiError("GEMINI_API_KEY is not set")
    if _client is None:
        _client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options=types.HttpOptions(timeout=20000),  # 20 seconds
        )
    return _client


def _build_contents(message, history):
    """Last few chat turns + the new message, so follow-up questions work."""
    contents = []
    for turn in (history or [])[-6:]:
        role = "user" if turn.sender == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=turn.text)]))
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))
    return contents


def ask_gemini(message: str, language: str, tools: list, history=None, context=None) -> str:
    contents = _build_contents(message, history)
    system = build_system_prompt(language)
    if context is not None:
        # One request per question: the live shop data goes into the instructions.
        system += "\n\nSHOP DATA (live):\n" + json.dumps(context, ensure_ascii=False)

    for attempt in range(2):
        try:
            response = _get_client().models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    tools=tools or None,
                    temperature=0.3,
                ),
            )
            text = (response.text or "").strip()
            if not text:
                raise GeminiError("Empty answer from Gemini")
            return text
        except errors.APIError as exc:
            if exc.code in (429, 503) and attempt == 0:
                time.sleep(1.5)
                continue
            logger.warning("Gemini API error %s: %s", exc.code, exc)
            raise GeminiError(str(exc)) from exc
        except GeminiError:
            raise
        except Exception as exc:
            logger.warning("Gemini failed: %s", exc)
            raise GeminiError(str(exc)) from exc


def ping_gemini() -> str:
    """Tiny test call used by GET /assistant/status. Returns Gemini's short reply."""
    try:
        response = _get_client().models.generate_content(
            model=settings.GEMINI_MODEL,
            contents="Reply with just the word OK",
        )
        return (response.text or "").strip() or "(empty reply)"
    except GeminiError:
        raise
    except Exception as exc:
        raise GeminiError(str(exc)) from exc