from pydantic import Field

from app.schemas.base import CamelModel


class CustomerCreate(CamelModel):
    name: str
    phone: str = ""
    notes: str = ""


class PaymentIn(CamelModel):
    amount: float = Field(gt=0)
    note: str = ""


class CustomerOut(CamelModel):
    id: str
    name: str
    phone: str
    balance: float            # outstanding amount in rupees
    last_purchased: str       # ISO string, or "" if none
    notes: str = ""