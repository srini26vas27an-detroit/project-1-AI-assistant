from sqlalchemy import func, select
from sqlalchemy.orm import Session
import functools
from app.ai.transliteration import match_products
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.schemas.product import ProductOut
from app.schemas.sale import CREDIT_METHOD
from app.services import analytics_service, customer_service
from app.utils.money import paise_to_rupees
from app.utils.time import start_of_day_utc


class Toolbox:
    """Functions the AI (and the fallback) can call to read shop data.
    The docstrings are what Gemini reads to decide which tool to use.
    `self.last` remembers the latest result as (payload_type, data)."""

    def __init__(self, db: Session):
        self.db = db
        self.last: tuple[str, dict] | None = None

    def _done(self, kind: str, data: dict) -> dict:
        self.last = (kind, data)
        return data

    @staticmethod
    def _dump(products) -> list[dict]:
        return [ProductOut.from_model(p).model_dump(by_alias=True) for p in products]

    def get_low_stock(self) -> dict:
        """List products that are low on stock or completely out of stock."""
        products = self.db.scalars(select(Product)).all()
        out = [p for p in products if p.stock_qty <= 0]
        low = [p for p in products if 0 < p.stock_qty <= p.low_stock_threshold]
        return self._done(
            "low_stock",
            {"totalProducts": len(products), "lowStock": self._dump(low), "outOfStock": self._dump(out)},
        )

    def get_restock_priorities(self) -> dict:
        """Which products to restock FIRST. Lists out-of-stock and low-stock products with
        how much of each sold in the last 7 days and roughly how many days the current
        stock will last. Most urgent first. Use this for 'what should I restock / order'."""
        sold = dict(
            self.db.execute(
                select(SaleItem.product_id, func.sum(SaleItem.qty))
                .join(Sale, Sale.id == SaleItem.sale_id)
                .where(Sale.created_at >= start_of_day_utc(6))
                .group_by(SaleItem.product_id)
            ).all()
        )
        products = self.db.scalars(select(Product)).all()
        rows = []
        for p in products:
            if p.stock_qty > p.low_stock_threshold:
                continue
            sold_7d = float(sold.get(p.id, 0))
            per_day = sold_7d / 7
            rows.append(
                {
                    "name": p.name,
                    "tamilName": p.name_ta or None,
                    "quantity": p.stock_qty,
                    "unit": p.unit,
                    "minStock": p.low_stock_threshold,
                    "sold7Days": round(sold_7d, 2),
                    "daysLeft": round(p.stock_qty / per_day, 1) if per_day > 0 else None,
                    "sellingPrice": paise_to_rupees(p.price_paise),
                }
            )
        # out of stock first, then fewest days left, then best sellers
        rows.sort(
            key=lambda r: (
                r["quantity"] > 0,
                r["daysLeft"] if r["daysLeft"] is not None else 9999,
                -r["sold7Days"],
            )
        )
        out = [p for p in products if p.stock_qty <= 0]
        low = [p for p in products if 0 < p.stock_qty <= p.low_stock_threshold]
        return self._done(
            "low_stock",
            {
                "totalProducts": len(products),
                "priorities": rows,
                "lowStock": self._dump(low),
                "outOfStock": self._dump(out),
            },
        )

    def get_inventory_overview(self) -> dict:
        """Every product with category, stock, unit and selling price. Use this to compare
        products, find the cheapest or most expensive item, or answer questions about a
        whole category (like all oils)."""
        products = self.db.scalars(select(Product).order_by(Product.category, Product.name)).all()
        return {
            "count": len(products),
            "products": [
                {
                    "name": p.name,
                    "tamilName": p.name_ta or None,
                    "category": p.category,
                    "quantity": p.stock_qty,
                    "unit": p.unit,
                    "sellingPrice": paise_to_rupees(p.price_paise),
                }
                for p in products[:150]
            ],
        }

    def get_sales_summary(self) -> dict:
        """Today's sales: total rupees, number of bills, average bill, and the
        cash / UPI / credit split."""
        since = start_of_day_utc()
        rows = self.db.execute(
            select(Sale.payment_method, func.sum(Sale.total_paise), func.count(Sale.id))
            .where(Sale.created_at >= since)
            .group_by(Sale.payment_method)
        ).all()
        by_method = {m: paise_to_rupees(int(t)) for m, t, _ in rows}
        bills = sum(int(c) for _, _, c in rows)
        total = sum(by_method.values())
        return self._done(
            "sales_summary",
            {
                "total": total,
                "bills": bills,
                "averageBill": round(total / bills) if bills else 0,
                "cash": by_method.get("Cash", 0),
                "upi": by_method.get("UPI / GPay", 0),
                "credit": by_method.get(CREDIT_METHOD, 0),
            },
        )

    def find_product_price(self, product_name: str) -> dict:
        """Look up the selling price, cost price and stock of a product.
        product_name can be English, Tamil script or Tanglish (e.g. 'arisi', 'அரிசி')."""
        products = self.db.scalars(select(Product)).all()
        matches = match_products(product_name, products)
        if not matches:
            names = [p.name for p in products[:5]]
            return self._done("price_info", {"found": False, "examples": names})
        p = ProductOut.from_model(matches[0]).model_dump(by_alias=True)
        p["margin"] = round(p["sellingPrice"] - p["costPrice"], 2)
        others = [m.name for m in matches[1:]]
        return self._done("price_info", {"found": True, "product": p, "otherMatches": others})

    def get_top_products(self, period: str) -> dict:
        """Best selling products by quantity. period must be 'today', '7days' or '30days'
        (use '7days' if the owner does not say)."""
        if period not in ("today", "7days", "30days"):
            period = "7days"
        items = analytics_service.get_top_products(self.db, limit=5, period=period)
        return self._done(
            "top_products",
            {"period": period, "items": [i.model_dump(by_alias=True) for i in items]},
        )

    def get_credit_customers(self) -> dict:
        """Customers who still owe money in Kadai Khata (credit), with balances."""
        owing = [c for c in customer_service.list_customers(self.db) if c.balance > 0]
        return self._done(
            "credit_list",
            {
                "totalOutstanding": sum(c.balance for c in owing),
                "customers": [c.model_dump(by_alias=True) for c in owing],
            },
        )
    def snapshot(self) -> dict:
        """All shop data the AI needs, in one go (a small shop fits easily), so Gemini
        can answer with ONE request instead of several tool calls."""
        sales = self.get_sales_summary()
        restock = self.get_restock_priorities()
        credit = self.get_credit_customers()
        top = self.get_top_products("7days")
        products = self.db.scalars(select(Product).order_by(Product.category, Product.name)).all()
        self.last = None
        return {
            "todaySales": sales,
            "restockPriorities": restock["priorities"],
            "creditCustomers": credit,
            "topProducts7Days": top["items"],
            "products": [
                {
                    "name": p.name,
                    "tamilName": p.name_ta or None,
                    "tanglishNames": p.aliases or None,
                    "category": p.category,
                    "quantity": p.stock_qty,
                    "unit": p.unit,
                    "minStock": p.low_stock_threshold,
                    "sellingPrice": paise_to_rupees(p.price_paise),
                    "costPrice": paise_to_rupees(p.cost_price_paise),
                }
                for p in products[:120]
            ],
        }

    def all_tools(self) -> list:
        """Plain functions for Gemini. The SDK deep-copies the request config, and a bound
        method drags this object (and its database session) into the copy, which fails.
        A plain wrapper function is copied by reference, so it is safe."""
        def plain(method):
            @functools.wraps(method)
            def tool(*args, **kwargs):
                return method(*args, **kwargs)
            return tool

        return [
            plain(self.get_low_stock),
            plain(self.get_restock_priorities),
            plain(self.get_inventory_overview),
            plain(self.get_sales_summary),
            plain(self.find_product_price),
            plain(self.get_top_products),
            plain(self.get_credit_customers),
        ]