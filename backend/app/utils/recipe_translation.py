"""
Ingilizce scraper tariflerini Turkceye ceviren yardimci.
"""
from __future__ import annotations

import os
import re
from functools import lru_cache


ENGLISH_HINTS = {
    "the", "and", "with", "from", "fresh", "chopped", "sliced", "ground", "recipe",
    "healthy", "breakfast", "dinner", "dessert", "snack", "minutes", "serve", "servings",
    "mix", "cook", "bake", "grill", "pan", "sheet", "salad", "soup", "chicken", "beef",
    "garlic", "onion", "pepper", "cheese", "milk", "oil", "salt", "black", "protein",
    "calories", "carbs", "fat",
}

NON_TRANSLATABLE_SOURCES = {"yemekcom"}


def _prepare_translation_env() -> None:
    for key in (
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "ALL_PROXY",
        "http_proxy",
        "https_proxy",
        "all_proxy",
    ):
        os.environ.pop(key, None)
    os.environ["NO_PROXY"] = "*"


def _looks_like_english(value: str | None) -> bool:
    if not value:
        return False

    text = " ".join(str(value).lower().split())
    if not text:
        return False

    tokens = re.findall(r"[a-zA-Z]+", text)
    if not tokens:
        return False

    english_hits = sum(1 for token in tokens if token in ENGLISH_HINTS)
    ascii_ratio = sum(1 for char in text if ord(char) < 128) / max(len(text), 1)
    return english_hits >= 1 or (ascii_ratio > 0.92 and len(tokens) >= 3)


@lru_cache(maxsize=1)
def _get_translator():
    return None


@lru_cache(maxsize=4096)
def _translate_text(text: str) -> str:
    cleaned = " ".join((text or "").split()).strip()
    if not cleaned or not _looks_like_english(cleaned):
        return cleaned

    translator = _get_translator()
    if translator is None:
        return cleaned

    try:
        translated = translator.translate(cleaned)
    except Exception:
        return cleaned

    return " ".join((translated or cleaned).split()).strip()


def _translate_multiline_text(text: str | None) -> str | None:
    if not text:
        return text

    lines = [line.strip() for line in str(text).splitlines()]
    translated_lines = [_translate_text(line) if line else "" for line in lines]
    return "\n".join(translated_lines).strip()


def translate_text(text: str | None) -> str | None:
    if text is None:
        return None
    return _translate_text(text)


def translate_multiline_text(text: str | None) -> str | None:
    return _translate_multiline_text(text)


def translate_recipe_payload(recipe_data: dict | None) -> dict | None:
    if not recipe_data:
        return recipe_data

    source = (recipe_data.get("source") or "").strip().lower()
    if source in NON_TRANSLATABLE_SOURCES:
        return recipe_data

    translated = dict(recipe_data)
    translated["title"] = _translate_text(recipe_data.get("title") or "")
    translated["description"] = _translate_multiline_text(recipe_data.get("description"))
    translated["instructions"] = _translate_multiline_text(recipe_data.get("instructions"))

    category = recipe_data.get("category")
    translated["category"] = _translate_text(category) if isinstance(category, str) else category

    translated_ingredients: list[dict] = []
    for item in recipe_data.get("ingredients", []) or []:
        translated_item = dict(item)
        translated_item["name"] = _translate_text(item.get("name") or "")
        translated_ingredients.append(translated_item)

    translated["ingredients"] = translated_ingredients
    return translated
