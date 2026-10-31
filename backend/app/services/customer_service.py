from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import BadRequest, NotFound
from app.models.customer import Customer, KhataEntry
from app.models.sale import Sale
from app.schemas.customer import CustomerCreate, CustomerOut, PaymentIn
from app.utils.ids import parse_id
from app.utils.money import paise_to_rupees, rupees_to_paise
from app.utils.time import to_iso


def get_customer(db: Session, raw_id: str) -> Customer:
    customer = db.get(Customer, parse_id(raw_id))
    if not customer:
        raise NotFound("Customer not found")
    return customer


def _balance_paise(db: Session, customer_id: int) -> int:
    total = db.scalar(
        select(func.coalesce(func.sum(KhataEntry.amount_paise), 0)).where(
            KhataEntry.customer_id == customer_id
        )
    )
    return int(total or 0)


def to_out(db: Session, c: Customer) -> CustomerOut:
    last = db.scalar(select(func.max(Sale.created_at)).where(Sale.customer_id == c.id))
    return CustomerOut(
        id=str(c.id),
        name=c.name,
        phone=c.phone,
        balance=paise_to_rupees(_balance_paise(db, c.id)),
        last_purchased=to_iso(last) if last else "",
        notes=c.notes,
    )


def list_customers(db: Session) -> list[CustomerOut]:
    customers = db.scalars(select(Customer)).all()
    result = [to_out(db, c) for c in customers]   # small shop: simple loop is fine
    return sorted(result, key=lambda c: (-c.balance, c.name.lower()))


def create_customer(db: Session, data: CustomerCreate) -> CustomerOut:
    customer = Customer(name=data.name.strip(), phone=data.phone, notes=data.notes)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return to_out(db, customer)


def find_or_create_by_name(db: Session, name: str) -> Customer:
    """Used by checkout: a khata sale with a new name creates the customer."""
    clean = name.strip()
    existing = db.scalar(select(Customer).where(func.lower(Customer.name) == clean.lower()))
    if existing:
        return existing
    customer = Customer(name=clean)
    db.add(customer)
    db.flush()
    return customer


def record_payment(db: Session, raw_id: str, data: PaymentIn) -> CustomerOut:
    customer = get_customer(db, raw_id)
    amount = rupees_to_paise(data.amount)
    balance = _balance_paise(db, customer.id)
    if amount > balance:
        raise BadRequest(f"Payment is more than the pending balance (₹{paise_to_rupees(balance)})")
    db.add(
        KhataEntry(
            customer_id=customer.id,
            amount_paise=-amount,     # negative = customer paid
            note=data.note or "Payment received",
        )
    )
    db.commit()
    return to_out(db, customer)