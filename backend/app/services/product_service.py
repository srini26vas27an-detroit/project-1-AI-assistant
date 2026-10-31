from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import NotFound
from app.models.product import Product, StockMovement
from app.schemas.product import ProductCreate, ProductUpdate
from app.utils.ids import parse_id
from app.utils.money import rupees_to_paise

FIELD_MAP ={
    "name":"name",
    "tamil_name": "name_ta",
    "aliases": "aliases",
    "category": "category",
    "unit": "unit",
    "quantity": "stock_qty",
    "min_stock": "low_stock_threshold",
    "image": "image",
    "sku": "sku",
}
PRICE_MAP = {"selling_price": "price_paise", "cost_price": "cost_price_paise"}
NULLABLE = {"image", "sku", "tamil_name", "aliases"}

def list_products(db: Session) -> list[Product]:
    return list(db.scalars(select(Product).order_by(Product.name)))


def get_product(db: Session, raw_id: str) -> Product:
    product = db.get(Product, parse_id(raw_id))
    if product is None:
        raise NotFound("Product not found")
    return product


def create_product(db: Session, data: ProductCreate) -> Product:
    product = Product(
        name=data.name,
        name_ta=data.tamil_name or "",
        aliases=data.aliases or "",
        category=data.category,
        unit=data.unit,
        price_paise=rupees_to_paise(data.selling_price),
        cost_price_paise=rupees_to_paise(data.cost_price),
        stock_qty=data.quantity,
        low_stock_threshold=data.min_stock,
        image=data.image or "",
        sku=data.sku or "",
    )
    db.add(product)
    db.flush()  # gets product.id
    if data.quantity > 0:
        db.add(StockMovement(product_id=product.id, change=data.quantity, reason="initial"))
    db.commit()
    db.refresh(product)
    return product
def update_product(db: Session, raw_id: str, data: ProductUpdate) -> Product:
    product = get_product(db, raw_id)
    old_qty = product.stock_qty

    for key, value in data.model_dump(exclude_unset=True).items():
        if value is None and key not in NULLABLE:
            continue
        if key in PRICE_MAP:
            setattr(product, PRICE_MAP[key], rupees_to_paise(value))
        elif key in FIELD_MAP:
            if key == "tamil_name" and value is None:
                value = ""
            setattr(product, FIELD_MAP[key], value)

    if product.stock_qty != old_qty:
        db.add(
            StockMovement(
                product_id=product.id,
                change=product.stock_qty - old_qty,
                reason="adjust",
            )
        )
    db.commit()
    db.refresh(product)
    return product

def delete_product(db: Session, raw_id: str) -> None:
    product = get_product(db,raw_id)
    db.delete(product)
    db.commit()
    