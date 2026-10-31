from pydantic import Field

from app.models.sale import Sale
from app.schemas.base import CamelModel
from app.utils.money import paise_to_rupees
from app.utils.time import to_iso

CREDIT_METHOD = "Credit (Kadai Khata)"
PAYMENT_METHODS = {"Cash", "UPI / GPay", CREDIT_METHOD}


class SaleItemIn(CamelModel):
    product_id: str
    quantity: float = Field(gt=0)


class SaleCreate(CamelModel):
    items: list[SaleItemIn] = Field(min_length=1)
    payment_method: str = "Cash"            # 'Cash' | 'UPI / GPay' | 'Credit (Kadai Khata)'
    customer_name: str | None = None


class SaleItemOut(CamelModel):
    product_id: str
    product_name: str
    quantity: float
    unit: str
    unit_price: float
    line_total: float


class SaleOut(CamelModel):
    id: str
    timestamp: str
    items: list[SaleItemOut]
    total: float
    payment_method: str
    customer_name: str | None = None
    item_count: int

    @classmethod
    def from_model(cls, s: Sale) -> "SaleOut":
        return cls(
            id=str(s.id),
            timestamp=to_iso(s.created_at),
            items=[
                SaleItemOut(
                    product_id=str(i.product_id),
                    product_name=i.product_name,
                    quantity=i.qty,
                    unit=i.unit,
                    unit_price=paise_to_rupees(i.unit_price_paise),
                    line_total=paise_to_rupees(i.line_total_paise),
                )
                for i in s.items
            ],
            total=paise_to_rupees(s.total_paise),
            payment_method=s.payment_method,
            customer_name=s.customer_name,
            item_count=len(s.items),
        )