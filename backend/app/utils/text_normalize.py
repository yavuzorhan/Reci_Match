from __future__ import annotations

import re
import unicodedata

_TURKISH_TRANSLATION = str.maketrans(
    {
        "ı": "i",
        "İ": "i",
        "ğ": "g",
        "Ğ": "g",
        "ş": "s",
        "Ş": "s",
        "ö": "o",
        "Ö": "o",
        "ü": "u",
        "Ü": "u",
        "ç": "c",
        "Ç": "c",
    }
)

def normalize_turkish_text(value: str | None) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", str(value).strip())
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    normalized = normalized.translate(_TURKISH_TRANSLATION).lower()
    normalized = re.sub(r"[^a-z0-9\s-]", " ", normalized)
    return " ".join(normalized.split())

def contains_word(text: str, term: str) -> bool:
    normalized_text = normalize_turkish_text(text)
    normalized_term = re.escape(normalize_turkish_text(term))
    return bool(re.search(rf"(?<![a-z0-9]){normalized_term}(?![a-z0-9])", normalized_text))

def contains_any_word(text: str, terms: set[str]) -> bool:
    return any(contains_word(text, term) for term in terms)
