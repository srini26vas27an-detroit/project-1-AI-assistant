import re

from rapidfuzz import fuzz

from app.models.product import Product

# --- Tamil script -> rough English letters -------------------------------
VOWELS = {"அ": "a", "ஆ": "a", "இ": "i", "ஈ": "i", "உ": "u", "ஊ": "u", "எ": "e",
          "ஏ": "e", "ஐ": "ai", "ஒ": "o", "ஓ": "o", "ஔ": "au"}
CONSONANTS = {"க": "k", "ங": "ng", "ச": "s", "ஞ": "n", "ட": "t", "ண": "n", "த": "t",
              "ந": "n", "ப": "p", "ம": "m", "ய": "y", "ர": "r", "ல": "l", "வ": "v",
              "ழ": "l", "ள": "l", "ற": "r", "ன": "n", "ஜ": "j", "ஷ": "s", "ஸ": "s", "ஹ": "h"}
SIGNS = {"ா": "a", "ி": "i", "ீ": "i", "ு": "u", "ூ": "u", "ெ": "e", "ே": "e",
         "ை": "ai", "ொ": "o", "ோ": "o", "ௌ": "au"}
PULLI = "்"


def tamil_to_latin(text: str) -> str:
    out, i = [], 0
    while i < len(text):
        ch = text[i]
        if ch in CONSONANTS:
            out.append(CONSONANTS[ch])
            nxt = text[i + 1] if i + 1 < len(text) else ""
            if nxt == PULLI:
                i += 1
            elif nxt in SIGNS:
                out.append(SIGNS[nxt])
                i += 1
            else:
                out.append("a")
        elif ch in VOWELS:
            out.append(VOWELS[ch])
        elif ch == PULLI or ch in SIGNS:
            pass
        else:
            out.append(ch)
        i += 1
    return "".join(out)


# --- Normalise Tamil / Tanglish / English to one comparable form ---------
def normalize(text: str) -> str:
    t = tamil_to_latin((text or "").lower())
    for old, new in [("th", "t"), ("dh", "t"), ("ch", "s"), ("sh", "s"), ("zh", "l"),
                     ("aa", "a"), ("ee", "i"), ("ii", "i"), ("oo", "u"), ("uu", "u")]:
        t = t.replace(old, new)
    t = t.translate(str.maketrans({"w": "v", "b": "p", "g": "k", "d": "t", "j": "s"}))
    t = re.sub(r"[^a-z0-9 ]", " ", t)
    t = re.sub(r"(.)\1+", r"\1", t)           # sakkarai -> sakarai
    return re.sub(r"\s+", " ", t).strip()


# Words that mean "price / how much / is there" etc. Not product names.
_STOP_RAW = ["price", "rate", "cost", "of", "the", "what", "is", "how", "much", "for",
             "find", "show", "me", "a", "in", "stock", "vilai", "vila", "evlo",
             "evvalavu", "enna", "irukku", "iruka", "iruku", "sollu", "sollunga",
             "kaattu", "kaattunga", "anna", "விலை", "என்ன", "எவ்வளவு", "இருக்கு",
             "காட்டு", "சொல்லு", "அண்ணா"]
STOP = {normalize(w) for w in _STOP_RAW}


def match_products(query: str, products: list[Product], limit: int = 3,
                   threshold: int = 75) -> list[Product]:
    """Find products from a Tamil, Tanglish or English query. Best match first."""
    tokens = [t for t in normalize(query).split() if t not in STOP]
    q = " ".join(tokens)
    if not q:
        return []

    scored: list[tuple[float, Product]] = []
    for p in products:
        names = [p.name, p.name_ta, *p.aliases.split(",")]
        best = 0.0
        for raw in names:
            n = normalize(raw)
            if not n:
                continue
            score = max(
                fuzz.ratio(q, n),
                fuzz.token_set_ratio(q, n),
                *(fuzz.ratio(tok, n) for tok in tokens),
            )
            best = max(best, score)
        if best >= threshold:
            scored.append((best, p))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [p for _, p in scored[:limit]]