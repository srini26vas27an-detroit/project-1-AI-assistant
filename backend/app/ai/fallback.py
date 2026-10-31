import re
from app.ai.tools import Toolbox
from app.schemas.assistant import ChatResponse, DataPayload, QuickAction
from app.utils.money import format_inr, format_qty


def pick(lang: str, en: str, ta: str, tg: str) -> str:
    return {"ta": ta, "tanglish": tg}.get(lang, en)


def has(q: str, words: list[str]) -> bool:
    return any(w in q for w in words)


GREETINGS = {"hi", "hello", "hey", "vanakkam", "vanakam", "வணக்கம்"}
ADD_WORDS = ["add product", "add new", "new product", "புதிய பொருள்", "puthiya porul", "pudhu porul"]
CREDIT_WORDS = ["credit", "khata", "kadan", "கடன்", "பாக்கி", "baaki", "pakki", "ledger", "balance"]
TOP_WORDS = ["sold most", "best sell", "fast moving", "popular", "அதிகம்", "athigam", "adhigam"]
LOW_WORDS = ["low stock", "low-stock", "out of stock", "stock status", "inventory", "stock kammi",
             "kammi", "sarakku", "saraku", "ஸ்டாக்", "சரக்கு", "குறைந்த",
             "restock", "re-stock", "reorder", "re-order", "order first", "need to buy",
             "vaanganum", "vanganum", "வாங்க"]
SALES_WORDS = ["sales", "sale ", "revenue", "income", "summary", "விற்பனை", "வரவு",
               "vitrapanai", "virpanai", "vyabaram"]
PRICE_WORDS = ["price", "cost", "rate", "விலை", "vilai", "vila"]


# ---- quick action + payload (also used for Gemini answers) -----------------
def build_meta(last: tuple[str, dict] | None):
    if not last:
        return None, None
    kind, data = last
    action = None
    if kind == "low_stock":
        if data["lowStock"] or data["outOfStock"]:
            action = QuickAction(label="Filter Low Stock in Inventory", action_type="filter_low_stock")
        else:
            action = QuickAction(label="View Full Inventory", action_type="navigate_inventory")
    elif kind == "sales_summary":
        action = QuickAction(label="View Transactions", action_type="navigate_sales")
    elif kind == "price_info" and data.get("found"):
        action = QuickAction(label="View in Inventory", action_type="navigate_inventory")
    elif kind == "top_products":
        action = QuickAction(label="View All Sales History", action_type="navigate_sales")
    elif kind == "credit_list":
        action = QuickAction(label="Record New Sale", action_type="navigate_sales")
    return action, DataPayload(type=kind, data=data)


def _reply(text: str, tb: Toolbox, action: QuickAction | None = None) -> ChatResponse:
    auto_action, payload = build_meta(tb.last)
    return ChatResponse(text=text, quick_action=action or auto_action, data_payload=payload)


# ---- the rule-based answer -------------------------------------------------
def answer(message: str, lang: str, tb: Toolbox) -> ChatResponse:
    q = message.strip().lower()
    words = q.split()

    # 1. Greeting
    if len(words) <= 3 and any(w.strip("!.,?") in GREETINGS for w in words):
        text = pick(
            lang,
            "Vanakkam! 🙏 Ungal Kadai Thunai here. Ask me about today's sales, low stock, prices or credit balances.",
            "வணக்கம்! 🙏 உங்கள் கடை துணை இங்கே. இன்றைய விற்பனை, ஸ்டாக், விலை, கடன் பற்றி கேளுங்கள்.",
            "Vanakkam! 🙏 Ungal Kadai Thunai inga irukken. Innaiku sales, stock, vilai, kadan pathi kelunga.",
        )
        return _reply(text, tb, QuickAction(label="Today's Sales Summary", action_type="navigate_sales"))

    # 2. Add product (the app opens the form)
    if has(q, ADD_WORDS) or q.startswith("add "):
        text = pick(
            lang,
            "Click below to open the Add Product form.",
            "புதிய பொருளை சேர்க்க கீழே அழுத்தவும்.",
            "Pudhu porul serkka keezha click pannunga.",
        )
        return _reply(text, tb, QuickAction(label="+ Open Add Product Form", action_type="open_add_product"))

    # 3. Credit / Kadai Khata
    if has(q, CREDIT_WORDS):
        d = tb.get_credit_customers()
        if not d["customers"]:
            text = pick(lang, "No pending Kadai Khata balances.",
                        "கடன் பாக்கி எதுவும் இல்லை.", "Kadan baaki edhuvum illai.")
        else:
            head = pick(
                lang,
                f"📒 Kadai Khata: {format_inr(d['totalOutstanding'])} pending from {len(d['customers'])} customers",
                f"📒 கடன் பாக்கி: {len(d['customers'])} வாடிக்கையாளர்களிடம் {format_inr(d['totalOutstanding'])}",
                f"📒 Kadai Khata: {len(d['customers'])} customers kitta {format_inr(d['totalOutstanding'])} baaki",
            )
            lines = [f"• {c['name']}: {format_inr(c['balance'])}" for c in d["customers"]]
            text = head + "\n" + "\n".join(lines)
        return _reply(text, tb)

    # 4. Top selling
    if has(q, TOP_WORDS) or re.search(r"\btop\b", q):
        period = "today" if has(q, ["today", "இன்று", "innaiku", "inniku"]) else \
                 "30days" if has(q, ["month", "30", "மாதம்", "maadham"]) else "7days"
        d = tb.get_top_products(period)
        if not d["items"]:
            text = pick(lang, "No sales recorded in this period yet.",
                        "இந்த காலத்தில் விற்பனை பதிவு இல்லை.", "Indha kaalathula vitrapanai pathivu illai.")
        else:
            head = pick(lang, "🏆 Top selling items:", "🏆 அதிகம் விற்ற பொருட்கள்:", "🏆 Adhigam vitra porutkal:")
            lines = [
                f"{i}. {x['name']} — {format_qty(x['quantitySold'])} {x['unit']} ({format_inr(x['totalRevenue'])})"
                for i, x in enumerate(d["items"], 1)
            ]
            text = head + "\n" + "\n".join(lines)
        return _reply(text, tb)

    # 5. Low stock
    if has(q, LOW_WORDS):
        d = tb.get_low_stock()
        out, low = d["outOfStock"], d["lowStock"]
        if d["totalProducts"] == 0:
            text = pick(lang, "Your inventory is empty. Add your first product.",
                        "உங்கள் இருப்பு காலியாக உள்ளது. முதல் பொருளை சேர்க்கவும்.",
                        "Inventory kaaliya irukku. Mudhal porulai serunga.")
            return _reply(text, tb, QuickAction(label="+ Open Add Product Form", action_type="open_add_product"))
        if not out and not low:
            text = pick(lang, "All products are well stocked. 👍",
                        "அனைத்து பொருட்களும் போதுமான அளவு உள்ளன. 👍",
                        "Ella porulum podhumana alavu irukku. 👍")
            return _reply(text, tb)
        n = len(out) + len(low)
        text = pick(lang, f"You have {n} item(s) needing attention:",
                    f"{n} பொருட்கள் கவனம் தேவை:", f"{n} porutkalukku gavanam thevai:")
        if out:
            text += "\n\n❌ " + pick(lang, "Out of stock:", "ஸ்டாக் இல்லை:", "Stock illai:")
            text += "\n" + "\n".join(f"• {p['name']}" for p in out)
        if low:
            text += "\n\n⚠️ " + pick(lang, "Running low:", "குறைவாக உள்ளது:", "Kammiya irukku:")
            text += "\n" + "\n".join(
                f"• {p['name']}: {format_qty(p['quantity'])} {p['unit']} (min {format_qty(p['minStock'])})"
                for p in low
            )
        return _reply(text, tb)

    # 6. Today's sales
    if has(q, SALES_WORDS):
        d = tb.get_sales_summary()
        head = pick(lang, "📊 Today's summary:", "📊 இன்றைய விற்பனை:", "📊 Innaiku vitrapanai:")
        text = (
            f"{head}\n"
            + pick(lang, "• Total sales: ", "• மொத்த விற்பனை: ", "• Mothha vitrapanai: ") + format_inr(d["total"]) + "\n"
            + pick(lang, "• Bills: ", "• பில்கள்: ", "• Bills: ") + str(d["bills"]) + "\n"
            + pick(lang, "• Average bill: ", "• சராசரி பில்: ", "• Average bill: ") + format_inr(d["averageBill"]) + "\n"
            + f"• UPI / GPay: {format_inr(d['upi'])}\n• Cash: {format_inr(d['cash'])}\n"
            + f"• Kadai Khata: {format_inr(d['credit'])}"
        )
        return _reply(text, tb)

    # 7. Price lookup (explicit, or just a product name)
    wants_price = has(q, PRICE_WORDS)
    if wants_price or len(words) <= 4:
        d = tb.find_product_price(message)
        if d["found"]:
            p = d["product"]
            if p["quantity"] <= 0:
                status = pick(lang, "❌ Out of stock", "❌ ஸ்டாக் இல்லை", "❌ Stock illai")
            elif p["quantity"] <= p["minStock"]:
                status = pick(lang, "⚠️ Low stock", "⚠️ குறைவாக உள்ளது", "⚠️ Kammiya irukku")
            else:
                status = pick(lang, "✅ In stock", "✅ ஸ்டாக் உள்ளது", "✅ Stock irukku")
            name = p["name"] + (f" ({p['tamilName']})" if p.get("tamilName") else "")
            text = (
                f"🏷️ {name}\n"
                + pick(lang, "• Price: ", "• விலை: ", "• Vilai: ")
                + f"{format_inr(p['sellingPrice'])} / {p['unit']}\n"
                + pick(lang, "• Cost: ", "• அடக்க விலை: ", "• Cost: ")
                + f"{format_inr(p['costPrice'])} / {p['unit']}\n"
                + pick(lang, "• Margin: ", "• லாபம்: ", "• Labam: ") + format_inr(p["margin"]) + "\n"
                + f"• {status} ({format_qty(p['quantity'])} {p['unit']})"
            )
            return _reply(text, tb)
        if wants_price:
            names = ", ".join(d["examples"])
            text = pick(
                lang,
                f"I couldn't find that product. Try one of: {names}",
                f"அந்த பொருள் கிடைக்கவில்லை. இவற்றில் ஒன்றை முயற்சிக்கவும்: {names}",
                f"Andha porul kidaikkala. Idhula ondru try pannunga: {names}",
            )
            return _reply(text, tb)
        tb.last = None  # name-only guess didn't match; fall through to help

    # 8. Help
    text = pick(
        lang,
        "I'm your kirana shop assistant. Ask me:\n• Show low-stock items\n• Today's sales summary\n• Price of sugar\n• Which items sold most this week?\n• Show credit customers",
        "நான் உங்கள் கடை உதவியாளர். கேளுங்கள்:\n• குறைந்த ஸ்டாக் காட்டு\n• இன்றைய விற்பனை\n• சர்க்கரை விலை\n• அதிகம் விற்ற பொருட்கள்\n• கடன் பாக்கி",
        "Naan ungal kadai udhaviyaalar. Kelunga:\n• Low stock kaattu\n• Innaiku vitrapanai\n• Sakkarai vilai\n• Adhigam vitra porutkal\n• Kadan baaki",
    )
    return _reply(text, tb, QuickAction(label="View Dashboard", action_type="navigate_sales"))