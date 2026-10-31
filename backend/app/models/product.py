from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), index=True)        # English name
    name_ta: Mapped[str] = mapped_column(String(120), default="")     # Tamil name
    aliases: Mapped[str] = mapped_column(String(300), default="")     # Tanglish, comma-separated
    category: Mapped[str] = mapped_column(String(60), default="")
    unit: Mapped[str] = mapped_column(String(20), default="piece")   # kg, g, litre, ml, packet, piece, box
    price_paise: Mapped[int] = mapped_column(Integer, default=0)       # selling price
    cost_price_paise: Mapped[int] = mapped_column(Integer, default=0)
    stock_qty: Mapped[float] = mapped_column(Float, default=0)
    low_stock_threshold: Mapped[float] = mapped_column(Float, default=5)
    sku: Mapped[str | None] = mapped_column(String(40), nullable=True)
    image: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    change: Mapped[float] = mapped_column(Float)                      # +restock, -sale
    reason: Mapped[str] = mapped_column(String(30), default="sale")   # sale, restock, adjust
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)