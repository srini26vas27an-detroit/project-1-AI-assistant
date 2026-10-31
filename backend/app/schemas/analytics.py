from app.schemas.base import CamelModel


class SummaryOut(CamelModel):
    total_products_count: int
    in_stock_count: int
    low_stock_count: int
    out_of_stock_count: int
    today_sales: float
    today_transactions_count: int
    total_sales: float
    total_transactions_count: int
    average_bill: float
    top_category: str


class ChartPoint(CamelModel):
    label: str
    sales: float
    transactions: int


class TopSellingItem(CamelModel):
    name: str
    category: str
    quantity_sold: float
    unit: str
    total_revenue: float