import re

TAMIL_CHARS = re.compile(r"[\u0B80-\u0BFF]")

# Common Tamil words typed in English letters. Extend this list anytime.
TANGLISH_WORDS = {
    "vanakkam", "anna", "annachi", "akka", "enna", "evlo", "evvalavu", "yevlo",
    "vilai", "vila", "kadan", "kadai", "baaki", "pakki", "irukku", "iruku", "irukka",
    "illa", "illai", "venum", "vendam", "sollu", "sollunga", "kaattu", "kaatu",
    "kaattunga", "innaiku", "inniku", "indru", "innikku", "nethu", "ippo", "ippodhu",
    "sarakku", "saraku", "kammi", "kammiya", "vitrapanai", "virpanai", "vanthu",
    "eppadi", "ethana", "yethana", "podu", "poduga", "thevai", "kodu", "paarunga",
    "paaru", "pannunga", "pannu", "romba", "konjam", "naalaiku", "arisi", "paruppu",
    "ennoda", "unga", "enakku", "vaanga", "mudinjathu", "theeruchu", "theernduduchu",
}


def detect_language(text: str) -> str:
    """Returns 'ta' (Tamil script), 'tanglish' (Tamil in English letters) or 'en'."""
    if TAMIL_CHARS.search(text):
        return "ta"
    words = re.findall(r"[a-z]+", text.lower())
    if any(w in TANGLISH_WORDS for w in words):
        return "tanglish"
    return "en"