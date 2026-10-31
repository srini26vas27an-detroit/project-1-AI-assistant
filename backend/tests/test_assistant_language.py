import pytest

from app.ai.client import GeminiError
from app.ai.language import detect_language
from app.ai.transliteration import match_products
from app.models.product import Product


@pytest.fixture(autouse=True)
def no_gemini(monkeypatch):
    """Tests never call the real AI. The fallback answers instead."""

    def boom(*args, **kwargs):
        raise GeminiError("disabled in tests")

    monkeypatch.setattr("app.routers.assistant.ask_gemini", boom)


# ---------- language detection ----------
@pytest.mark.parametrize(
    "text, expected",
    [
        ("இன்றைய விற்பனை", "ta"),
        ("சர்க்கரை விலை என்ன", "ta"),
        ("sugar vilai evlo", "tanglish"),
        ("innaiku sales evlo anna", "tanglish"),
        ("show low stock items", "en"),
        ("today's sales summary", "en"),
    ],
)
def test_detect_language(text, expected):
    assert detect_language(text) == expected


# ---------- Tamil / Tanglish / English product matching ----------
PRODUCTS = [
    Product(name="Ponni Raw Rice", name_ta="பொன்னி அரிசி", aliases="arisi, ari, rice"),
    Product(name="Sugar", name_ta="சர்க்கரை", aliases="sakkarai, sarkarai, chakkarai"),
    Product(name="Gingelly Oil", name_ta="நல்லெண்ணெய்", aliases="nallennai, nallenna, sesame oil"),
    Product(name="Turmeric Powder", name_ta="மஞ்சள் தூள்", aliases="manjal, manjal thool"),
]


@pytest.mark.parametrize(
    "query, expected",
    [
        ("sugar", "Sugar"),
        ("sakkarai vilai", "Sugar"),
        ("சர்க்கரை", "Sugar"),
        ("arisi vilai evlo", "Ponni Raw Rice"),
        ("அரிசி", "Ponni Raw Rice"),
        ("nallennai", "Gingelly Oil"),
        ("manjal thool", "Turmeric Powder"),
    ],
)
def test_match_products(query, expected):
    matches = match_products(query, PRODUCTS)
    assert matches and matches[0].name == expected


def test_no_match_returns_empty():
    assert match_products("laptop", PRODUCTS) == []


# ---------- /assistant/chat (rule-based fallback) ----------
def chat(client, message):
    r = client.post("/assistant/chat", json={"message": message})
    assert r.status_code == 200, r.text
    return r.json()


def test_english_low_stock(client, add_product):
    add_product(name="Oil", qty=2)
    body = chat(client, "show low stock items")
    assert "needing attention" in body["text"]
    assert body["quickAction"]["actionType"] == "filter_low_stock"
    assert body["dataPayload"]["type"] == "low_stock"


def test_tamil_sales_question_gets_tamil_answer(client):
    body = chat(client, "இன்றைய விற்பனை")
    assert "இன்றைய விற்பனை" in body["text"]
    assert body["dataPayload"]["type"] == "sales_summary"


def test_tanglish_price_question(client, add_product):
    add_product(name="Sugar", price=44, aliases="sakkarai, sarkarai")
    body = chat(client, "sakkarai vilai evlo")
    assert "Sugar" in body["text"]
    assert "₹44" in body["text"]
    assert "Vilai" in body["text"]          # Tanglish label, not English "Price"


def test_greeting(client):
    body = chat(client, "vanakkam")
    assert body["quickAction"]["actionType"] == "navigate_sales"


def test_unknown_product_price(client, add_product):
    add_product(name="Sugar")
    body = chat(client, "price of laptop")
    assert "couldn't find" in body["text"]


def test_empty_message_is_rejected(client):
    r = client.post("/assistant/chat", json={"message": "   "})
    assert r.status_code == 400


def test_gemini_answer_is_used_when_available(client, monkeypatch):
    monkeypatch.setattr("app.routers.assistant.ask_gemini", lambda *a, **k: "Hello from Gemini")
    body = chat(client, "hi")
    assert body["text"] == "Hello from Gemini"