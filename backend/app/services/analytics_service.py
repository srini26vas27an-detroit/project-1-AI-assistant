from collections import defaultdict

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.schemas.analytics import ChartPoint, SummaryOut, TopSellingItem
from app.utils.money import paise_to_rupees
from app.utils.time import IST, now_ist, start_of_day_utc, to_ist

PERIOD_DAYS_BACK = {"today": 0, "7days": 6, "30days": 29}
TODAY_LABELS = ["6 AM", "8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM"]


def _sales_totals(db: Session, since=None) -> tuple[int, int]:
    stmt = select(func.coalesce(func.sum(Sale.total_paise), 0), func.count(Sale.id))
    if since is not None:
        stmt = stmt.where(Sale.created_at >= since)
    total_paise, count = db.execute(stmt).one()
    return int(total_paise), int(count)


def get_summary(db: Session) -> SummaryOut:
    products = db.scalars(select(Product)).all()
    out_of_stock = sum(1 for p in products if p.stock_qty <= 0)
    low_stock = sum(1 for p in products if 0 < p.stock_qty <= p.low_stock_threshold)

    total_paise, total_count = _sales_totals(db)
    today_paise, today_count = _sales_totals(db, since=start_of_day_utc())

    return SummaryOut(
        total_products_count=len(products),
        in_stock_count=len(products) - out_of_stock - low_stock,
        low_stock_count=low_stock,
        out_of_stock_count=out_of_stock,
        today_sales=paise_to_rupees(today_paise),
        today_transactions_count=today_count,
        total_sales=paise_to_rupees(total_paise),
        total_transactions_count=total_count,
        average_bill=round(paise_to_rupees(total_paise) / total_count) if total_count else 0,
        top_category=_top_category(db),
    )


def _top_category(db: Session) -> str:
    rows = db.execute(
        select(func.coalesce(Product.category, "General"), func.sum(SaleItem.line_total_paise))
        .select_from(SaleItem)
        .outerjoin(Product, Product.id == SaleItem.product_id)
        .group_by(func.coalesce(Product.category, "General"))
        .order_by(func.sum(SaleItem.line_total_paise).desc())
        .limit(1)
    ).first()
    return rows[0] if rows else "Flour & Rice"


def get_top_products(db: Session, limit: int = 5, period: str | None = None) -> list[TopSellingItem]:
    stmt = (
        select(
            SaleItem.product_name,
            func.coalesce(Product.category, "General"),
            SaleItem.unit,
            func.sum(SaleItem.qty),
            func.sum(SaleItem.line_total_paise),
        )
        .select_from(SaleItem)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .outerjoin(Product, Product.id == SaleItem.product_id)
        .group_by(SaleItem.product_id, SaleItem.product_name, SaleItem.unit)
        .order_by(func.sum(SaleItem.qty).desc())
        .limit(limit)
    )
    if period in PERIOD_DAYS_BACK:
        stmt = stmt.where(Sale.created_at >= start_of_day_utc(PERIOD_DAYS_BACK[period]))

    return [
        TopSellingItem(
            name=name,
            category=category,
            quantity_sold=float(qty),
            unit=unit,
            total_revenue=paise_to_rupees(int(revenue)),
        )
        for name, category, unit, qty, revenue in db.execute(stmt)
    ]


def get_chart(db: Session, period: str) -> list[ChartPoint]:
    sales = db.scalars(
        select(Sale).where(Sale.created_at >= start_of_day_utc(PERIOD_DAYS_BACK[period]))
    ).all()
    today = now_ist().date()

    if period == "today":
        # 8 two-hour buckets, 6 AM to 10 PM; earlier/later sales fold into first/last
        points = [ChartPoint(label=l, sales=0, transactions=0) for l in TODAY_LABELS]
        for s in sales:
            hour = to_ist(s.created_at).hour
            idx = min(len(points) - 1, max(0, (hour - 6) // 2))
            points[idx].sales += paise_to_rupees(s.total_paise)
            points[idx].transactions += 1
        return points

    if period == "7days":
        days = [today - _days(6 - i) for i in range(7)]
        points = [ChartPoint(label=d.strftime("%a"), sales=0, transactions=0) for d in days]
        for s in sales:
            ago = (today - to_ist(s.created_at).date()).days
            if 0 <= ago <= 6:
                points[6 - ago].sales += paise_to_rupees(s.total_paise)
                points[6 - ago].transactions += 1
        return points

    # 30days: five 6-day buckets, oldest first
    buckets, size = 5, 6
    starts = [today - _days((buckets - i) * size - 1) for i in range(buckets)]
    points = [
        ChartPoint(label=f"{d.day} {d.strftime('%b')}", sales=0, transactions=0) for d in starts
    ]
    for s in sales:
        ago = (today - to_ist(s.created_at).date()).days
        if 0 <= ago < buckets * size:
            idx = buckets - 1 - ago // size
            points[idx].sales += paise_to_rupees(s.total_paise)
            points[idx].transactions += 1
    return points


def _days(n: int):
    from datetime import timedelta
    return timedelta(days=n)