from typing import Any, Literal

from app.schemas.base import CamelModel


class HistoryItem(CamelModel):
    sender: Literal["user", "assistant"]
    text: str


class ChatRequest(CamelModel):
    message: str
    history: list[HistoryItem] = []   # last few turns, for follow-up questions


class QuickAction(CamelModel):
    label: str
    action_type: Literal[
        "navigate_inventory", "navigate_sales", "open_add_product", "filter_low_stock"
    ]


class DataPayload(CamelModel):
    type: Literal["low_stock", "sales_summary", "top_products", "price_info", "credit_list"]
    data: Any | None = None


class ChatResponse(CamelModel):
    text: str
    quick_action: QuickAction | None = None
    data_payload: DataPayload | None = None
    source: Literal["gemini", "fallback"] = "fallback"
    fallback_reason: str | None = None   