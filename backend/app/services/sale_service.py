from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import BadRequest, InsufficientStock, NotFound
from app.models.customer import KhataEntry
from app.models.product import Product, StockMovement
from app.models.sale import Sale, SaleItem
from app.schemas.sale import CREDIT_METHOD, PAYMENT_METHODS, SaleCreate
from app.services.customer_service import find_or_create_by_name
from app.utils.ids import parse_id


def list_sales(db: Session, limit: int = 100) -> list[Sale]:
    stmt = (
        select(Sale)
        .options(selectinload(Sale.items))
        .order_by(Sale.created_at.desc(), Sale.id.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt))


def get_sale(db: Session, raw_id: str) -> Sale:
    sale = db.scalar(
        select(Sale).options(selectinload(Sale.items)).where(Sale.id == parse_id(raw_id))
    )
    if not sale:
        raise NotFound("Sale not found")
    return sale


def create_sale(db: Session, data: SaleCreate) -> Sale:
    """Atomic checkout: stock + bill + khata. All succeed or nothing is saved."""
    if data.payment_method not in PAYMENT_METHODS:
        raise BadRequest("Invalid payment method")

    is_credit = data.payment_method == CREDIT_METHOD
    customer_name = (data.customer_name or "").strip()
    if is_credit and not customer_name:
        raise BadRequest("Customer name is required for credit (Kadai Khata) sales")

    # Merge duplicate lines: same product added twice = one total quantity
    wanted: dict[int, float] = {}
    for item in data.items:
        pid = parse_id(item.product_id)
        wanted[pid] = wanted.get(pid, 0) + item.quantity

    try:
        sale = Sale(
            payment_method=data.payment_method,
            customer_name=customer_name or None,
        )
        total = 0

        for pid, qty in wanted.items():
            product = db.get(Product, pid)
            if not product:
                raise NotFound(f"Product {pid} not found")
            if product.stock_qty < qty:
                raise InsufficientStock(product.name, product.stock_qty)

            line_total = round(product.price_paise * qty)
            product.stock_qty = round(product.stock_qty - qty, 3)

            sale.items.append(
                SaleItem(
                    product_id=product.id,
                    product_name=product.name,
                    unit=product.unit,
                    qty=qty,
                    unit_price_paise=product.price_paise,
                    line_total_paise=line_total,
                )
            )
            db.add(StockMovement(product_id=product.id, change=-qty, reason="sale"))
            total += line_total

        sale.total_paise = total

        if is_credit:
            customer = find_or_create_by_name(db, customer_name)
            sale.customer_id = customer.id

        db.add(sale)
        db.flush()  # gets sale.id

        if is_credit:
            db.add(
                KhataEntry(
                    customer_id=sale.customer_id,
                    sale_id=sale.id,
                    amount_paise=total,   # positive = customer owes more
                    note=f"Bill #{sale.id}",
                )
            )

        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(sale)
    return sale