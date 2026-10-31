"""Fills an EMPTY database with demo data. Safe to run on every start:
it does nothing if SEED_DEMO_DATA is off or products already exist."""

from sqlalchemy import func, select

from app.core.config import settings
from app.core.database import SessionLocal
from app.models import Customer, KhataEntry, Product, StockMovement
from app.utils.money import rupees_to_paise

# name, tamil name, category, qty, unit, selling ₹, cost ₹, min stock, Tanglish aliases
PRODUCTS = [
    ("Ponni Raw Rice", "பொன்னி அரிசி", "Flour & Rice", 40, "kg", 58, 50, 10, "arisi, ari, ponni, ponni arisi, rice"),
    ("Idli Rice", "இட்லி அரிசி", "Flour & Rice", 25, "kg", 48, 41, 10, "idli arisi, idly rice, idli ari"),
    ("Wheat Flour (Atta)", "கோதுமை மாவு", "Flour & Rice", 30, "kg", 46, 40, 8, "atta, aata, godhumai maavu, maavu, wheat flour"),
    ("Rice Flour", "அரிசி மாவு", "Flour & Rice", 12, "kg", 52, 45, 5, "arisi maavu, rice flour"),
    ("Sunflower Oil", "சூரியகாந்தி எண்ணெய்", "Oils & Ghee", 20, "litre", 145, 132, 6, "ennai, ennei, sunflower ennai, fortune oil, oil"),
    ("Gingelly Oil", "நல்லெண்ணெய்", "Oils & Ghee", 8, "litre", 420, 385, 3, "nallennai, nallenna, nalla ennai, sesame oil"),
    ("Coconut Oil", "தேங்காய் எண்ணெய்", "Oils & Ghee", 10, "litre", 230, 210, 4, "thengai ennai, thengai ennei, coconut oil"),
    ("Ghee", "நெய்", "Oils & Ghee", 0, "packet", 320, 290, 3, "nei, ney, ghee"),
    ("Toor Dal", "துவரம் பருப்பு", "Dals & Pulses", 25, "kg", 165, 148, 8, "thuvaram paruppu, tuvaram paruppu, toor dal, paruppu"),
    ("Urad Dal", "உளுத்தம் பருப்பு", "Dals & Pulses", 18, "kg", 150, 135, 6, "ulutham paruppu, ulundhu, urad dal, minapa"),
    ("Moong Dal", "பாசிப்பருப்பு", "Dals & Pulses", 3, "kg", 140, 125, 5, "pasi paruppu, payatham paruppu, moong dal"),
    ("Sugar", "சர்க்கரை", "Sugar & Salt", 35, "kg", 44, 39, 10, "sakkarai, sarkarai, chakkarai, sugar"),
    ("Salt", "உப்பு", "Sugar & Salt", 30, "packet", 28, 24, 10, "uppu, salt, tata salt"),
    ("Jaggery", "வெல்லம்", "Sugar & Salt", 10, "kg", 70, 60, 4, "vellam, jaggery"),
    ("Turmeric Powder", "மஞ்சள் தூள்", "Masala & Spices", 20, "packet", 35, 29, 6, "manjal, manjal thool, manjal podi, turmeric"),
    ("Red Chilli Powder", "மிளகாய் தூள்", "Masala & Spices", 18, "packet", 60, 51, 6, "milagai, milagai thool, milagai podi, chilli powder"),
    ("Coriander Powder", "மல்லி தூள்", "Masala & Spices", 14, "packet", 45, 38, 5, "malli, malli thool, malli podi, dhania"),
    ("Tea Powder", "தேயிலை தூள்", "Beverages", 15, "packet", 85, 74, 5, "tea thool, tea powder, tea, chai"),
    ("Milk (Aavin)", "ஆவின் பால்", "Dairy", 24, "packet", 27, 25, 8, "paal, pal, aavin, milk"),
    ("Curd", "தயிர்", "Dairy", 12, "packet", 30, 26, 5, "thayir, tayir, curd"),
    ("Good Day Biscuits", "குட் டே பிஸ்கட்", "Biscuits & Snacks", 30, "packet", 10, 8, 10, "biscuit, biscuits, good day"),
    ("Bath Soap", "குளியல் சோப்பு", "Personal Care", 20, "piece", 38, 32, 8, "soap, sabbu, saboo"),
]

# name, phone, notes, amount owed ₹
CUSTOMERS = [
    ("Murugan Anna", "9876500001", "Pays on the 1st of every month", 1250),
    ("Lakshmi Akka", "9876500002", "", 480),
    ("Selvam", "9876500003", "Weekly settlement", 2100),
]


def seed() -> None:
    if not settings.SEED_DEMO_DATA:
        print("Seed skipped (SEED_DEMO_DATA is off).")
        return

    with SessionLocal() as db:
        if db.scalar(select(func.count(Product.id))):
            print("Seed skipped (database already has products).")
            return

        for name, ta, cat, qty, unit, sell, cost, min_stock, aliases in PRODUCTS:
            product = Product(
                name=name, name_ta=ta, category=cat, unit=unit,
                price_paise=rupees_to_paise(sell),
                cost_price_paise=rupees_to_paise(cost),
                stock_qty=qty, low_stock_threshold=min_stock, aliases=aliases,
            )
            db.add(product)
            db.flush()
            if qty > 0:
                db.add(StockMovement(product_id=product.id, change=qty, reason="initial"))

        for name, phone, notes, owed in CUSTOMERS:
            customer = Customer(name=name, phone=phone, notes=notes)
            db.add(customer)
            db.flush()
            db.add(KhataEntry(
                customer_id=customer.id,
                amount_paise=rupees_to_paise(owed),
                note="Opening balance",
            ))

        db.commit()
        print(f"Seeded {len(PRODUCTS)} products and {len(CUSTOMERS)} customers.")


if __name__ == "__main__":
    seed()