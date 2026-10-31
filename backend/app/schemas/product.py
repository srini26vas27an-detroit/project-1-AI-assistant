from pydantic import Field
from app.models.product import Product
from app.schemas.base import CamelModel
from app.utils.money import paise_to_rupees

class ProductCreate(CamelModel):
    name:str
    tamil_name:str | None = None
    aliases: str | None = None
    category:str
    quantity:float = Field(ge=0)
    unit:str
    selling_price: float = Field(ge=0)
    cost_price: float = Field(default=0, ge=0)
    min_stock: float = Field(default=5, ge=0)
    image: str | None = None
    sku: str | None = None
class ProductUpdate(CamelModel):
    name: str | None = None
    tamil_name: str | None = None
    aliases: str | None = None
    category: str | None = None
    quantity: float | None = Field(default=None, ge=0)
    unit: str | None = None
    selling_price: float | None = Field(default=None, ge=0)
    cost_price: float | None = Field(default=None, ge=0)
    min_stock: float | None = Field(default=None, ge=0)
    image: str | None = None
    sku: str | None = None
class ProductOut(CamelModel):
    id: str
    name: str
    tamil_name: str | None = None
    category: str
    quantity: float
    unit: str
    selling_price: float
    cost_price: float
    min_stock: float
    image: str | None = None
    sku: str | None = None
    @classmethod
    def from_model(cls, product: Product) -> "ProductOut":
        return cls(
            id=str(product.id),
            name=product.name,
            tamil_name=product.name_ta or None,
            category=product.category,
            quantity=product.stock_qty,
            unit=product.unit,
            selling_price=paise_to_rupees(product.price_paise),
            cost_price=paise_to_rupees(product.cost_price_paise),
            min_stock=product.low_stock_threshold,
            image=product.image,
            sku=product.sku
        )