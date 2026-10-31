def rupees_to_paise(rupees: float) -> int:
    return round(rupees * 100)


def paise_to_rupees(paise: int) -> float:
    return paise / 100

def _indian_group(n: int) -> str:
    s = str(abs(n))
    if len(s) <= 3:
        return s
    head, tail = s[:-3], s[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    if head:
        parts.insert(0, head)
    return ",".join(parts + [tail])


def format_inr(amount: float) -> str:
    amount = round(float(amount), 2)
    whole = int(amount)
    cents = round((amount - whole) * 100)
    text = _indian_group(whole)
    return f"₹{text}.{cents:02d}" if cents else f"₹{text}"


def format_qty(qty: float) -> str:
    return f"{qty:.2f}".rstrip("0").rstrip(".")