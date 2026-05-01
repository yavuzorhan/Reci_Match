"""Async USDA FoodData Central nutrition fetcher for ingredient fallback."""
from __future__ import annotations

import logging
import os
import unicodedata
from functools import lru_cache

from app.config.settings import settings
from app.utils.helpers import normalize_ingredient_name


USDA_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"
LOGGER = logging.getLogger(__name__)

TURKISH_USDA_ALIASES = {
    "bal": "honey",
    "badem": "almonds raw",
    "domates": "tomatoes raw",
    "elma sirkesi": "apple cider vinegar",
    "elma": "apples raw",
    "tuz": "salt table",
    "sarimsak": "garlic raw",
    "maydanoz": "parsley fresh",
    "dereotu": "dill weed fresh",
    "tereyagi": "butter",
    "krema": "cream",
    "kinoa": "quinoa uncooked",
    "zeytinyagi": "olive oil",
    "zeytinya": "olive oil",
    "tavuk gogsu": "chicken breast",
    "yumurta": "whole egg",
    "sut": "cow milk fluid",
    "yogurt": "yogurt",
    "cikolata": "chocolate dark",
    "visne": "sour cherry",
    "muz": "bananas raw",
    "protein tozu": "whey protein powder",
    "yulaf": "oats",
    "yulaf unu": "oat flour",
    "pirinc unu": "rice flour",
    "pirinc": "rice",
    "bulgur": "bulgur",
    "mercimek": "lentil",
}

USDA_DATA_TYPE_PRIORITY = ["Foundation", "SR Legacy", "Survey (FNDDS)"]
USDA_REQUIRED_DESCRIPTION_TOKENS = {
    "bal": {"honey"},
    "badem": {"almond", "almonds"},
    "avokado": {"avocado", "avocados"},
    "domates": {"tomato", "tomatoes"},
    "elma": {"apple", "apples"},
    "elma sirkesi": {"apple", "cider", "vinegar"},
    "sarimsak": {"garlic"},
    "maydanoz": {"parsley"},
    "dereotu": {"dill"},
    "kinoa": {"quinoa"},
    "yulaf unu": {"oat", "flour"},
    "tuz": {"salt"},
    "zeytinyagi": {"olive", "oil"},
    "zeytinya": {"olive", "oil"},
    "sut": {"milk"},
    "cikolata": {"chocolate", "candies"},
    "visne": {"cherry", "cherries"},
    "muz": {"banana", "bananas"},
}
USDA_EXCLUDED_DESCRIPTION_TOKENS = {
    "domates": {"sauce", "soup", "juice", "paste"},
    "badem": {"butter", "milk", "flour", "oil"},
    "avokado": {"oil", "sauce"},
    "maydanoz": {"corn", "cilantro"},
    "dereotu": {"pickle", "pickles", "cucumber", "sauce"},
    "kinoa": {"flour"},
    "tuz": {"tomato", "sauce", "soup", "seasoning", "cracker", "snack"},
    "zeytinyagi": {"anchovies", "fish", "tuna", "sardines", "corn", "peanut"},
    "zeytinya": {"anchovies", "fish", "tuna", "sardines", "corn", "peanut"},
    "sut": {"almond", "cheese", "coconut", "oat", "soy", "yogurt"},
    "visne": {"juice", "cream", "pork", "sauce"},
    "muz": {"pepper", "peppers", "wax", "hungarian"},
}
GENERIC_EXCLUDED_DESCRIPTION_TOKENS = {"juice", "concentrate", "drink", "beverage"}


async def fetch_ingredient_nutrition(ingredient_name: str) -> dict | None:
    api_key = (os.getenv("USDA_API_KEY") or settings.USDA_API_KEY or "").strip()
    if not api_key:
        return None

    normalized_name = normalize_ingredient_name(ingredient_name)
    normalized_key = _ascii_key(normalized_name)
    query_candidates = build_usda_query_candidates(normalized_name, normalized_key)
    try:
        import httpx

        async with httpx.AsyncClient(timeout=12) as client:
            best_food = None
            nutrients = None
            for query in query_candidates:
                for data_type in USDA_DATA_TYPE_PRIORITY:
                    response = await client.post(
                        USDA_SEARCH_URL,
                        params={"api_key": api_key},
                        json={
                            "query": query,
                            "pageSize": 8,
                            "dataType": [data_type],
                        },
                    )
                    response.raise_for_status()
                    foods = response.json().get("foods") or []
                    if not foods:
                        continue
                    for candidate_food in _rank_foods(query, foods, normalized_key):
                        candidate_nutrients = parse_usda_nutrients(candidate_food.get("foodNutrients") or [])
                        if _has_reliable_food_match(candidate_food, query, candidate_nutrients, normalized_key):
                            best_food = candidate_food
                            nutrients = candidate_nutrients
                            break
                    if best_food:
                        break
                if best_food:
                    break
    except ImportError:
        LOGGER.warning("httpx is not installed; USDA lookup skipped.")
        return None
    except Exception as exc:
        LOGGER.warning("USDA lookup failed for %s: %s", ingredient_name, exc)
        return None

    if not best_food or not nutrients:
        return None

    return {
        **nutrients,
        "fdc_id": best_food.get("fdcId"),
        "description": best_food.get("description"),
        "data_type": best_food.get("dataType"),
    }


def build_usda_query_candidates(normalized_name: str, normalized_key: str | None = None) -> list[str]:
    candidates: list[str] = []
    normalized_key = normalized_key or _ascii_key(normalized_name)

    alias = TURKISH_USDA_ALIASES.get(normalized_key or "")
    if alias:
        candidates.append(alias)

    translated = translate_turkish_to_english(normalized_name)
    for item in (translated, normalized_name, normalized_key):
        if item and item not in candidates:
            candidates.append(item)

    return candidates


@lru_cache(maxsize=1024)
def translate_turkish_to_english(text: str) -> str | None:
    cleaned = " ".join((text or "").split()).strip()
    if not cleaned:
        return None
    try:
        from deep_translator import GoogleTranslator

        _prepare_translation_env()
        translated = GoogleTranslator(source="tr", target="en").translate(cleaned)
    except Exception as exc:
        LOGGER.warning("Ingredient translation failed for %s: %s", text, exc)
        return None

    translated = " ".join((translated or "").split()).strip()
    if not translated or _normalize_text(translated) == _normalize_text(cleaned):
        return None
    return translated


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


def parse_usda_nutrients(food_nutrients: list[dict]) -> dict:
    result = {
        "calorie_per_100g": 0.0,
        "protein_per_100g": 0.0,
        "carbohydrate_per_100g": 0.0,
        "fat_per_100g": 0.0,
        "saturated_fat_per_100g": 0.0,
        "fiber_per_100g": 0.0,
        "sugar_per_100g": 0.0,
        "sodium_mg_per_100g": 0.0,
    }
    for item in food_nutrients:
        nutrient_name = _normalize_text(item.get("nutrientName") or "")
        nutrient_number = str(item.get("nutrientNumber") or "")
        unit_name = _normalize_text(item.get("unitName") or "")
        value = item.get("value")
        if value is None:
            continue

        amount = float(value)
        if nutrient_name == "energy" or nutrient_number == "208":
            result["calorie_per_100g"] = round(amount / 4.184, 2) if unit_name == "kj" else amount
        elif nutrient_name == "protein":
            result["protein_per_100g"] = amount
        elif nutrient_name == "carbohydrate by difference":
            result["carbohydrate_per_100g"] = amount
        elif nutrient_name == "total lipid fat":
            result["fat_per_100g"] = amount
        elif nutrient_name == "fatty acids total saturated":
            result["saturated_fat_per_100g"] = amount
        elif nutrient_name == "fiber total dietary":
            result["fiber_per_100g"] = amount
        elif nutrient_name in {"sugars total including nlea", "total sugars"}:
            result["sugar_per_100g"] = amount
        elif nutrient_name == "sodium na":
            result["sodium_mg_per_100g"] = amount
    if (
        result["calorie_per_100g"] == 0
        and any(result[key] > 0 for key in ("protein_per_100g", "carbohydrate_per_100g", "fat_per_100g"))
    ):
        result["calorie_per_100g"] = round(
            (result["protein_per_100g"] * 4)
            + (result["carbohydrate_per_100g"] * 4)
            + (result["fat_per_100g"] * 9),
            2,
        )
    return result


def _pick_best_food(query: str, foods: list[dict], normalized_key: str | None = None) -> dict:
    return max(foods, key=lambda food: _score_food(query, food, normalized_key))


def _rank_foods(query: str, foods: list[dict], normalized_key: str | None = None) -> list[dict]:
    return sorted(foods, key=lambda food: _score_food(query, food, normalized_key), reverse=True)


def _score_food(query: str, food: dict, normalized_key: str | None = None) -> float:
    normalized_query = _normalize_text(query)
    ordered_query_tokens = normalized_query.split()
    query_tokens = set(ordered_query_tokens)
    description = _normalize_text(food.get("description") or "")
    description_tokens = set(description.split())
    overlap = len(query_tokens & description_tokens) / max(1, len(query_tokens))
    data_type_bonus = {
        "Foundation": 0.25,
        "SR Legacy": 0.2,
        "Survey (FNDDS)": 0.15,
    }.get(food.get("dataType"), 0)
    exact_bonus = 0.15 if description == normalized_query else 0
    first_token = ordered_query_tokens[0] if ordered_query_tokens else ""
    starts_bonus = 0.35 if first_token and description.startswith(first_token) else 0
    required_bonus = 0.35 if _description_matches_required_tokens(description_tokens, normalized_key) else 0
    return overlap + data_type_bonus + exact_bonus + starts_bonus + required_bonus


def _has_reliable_food_match(food: dict, query: str, nutrients: dict, normalized_key: str | None = None) -> bool:
    has_macro = any(
        float(nutrients.get(key) or 0) > 0
        for key in ("calorie_per_100g", "protein_per_100g", "carbohydrate_per_100g", "fat_per_100g")
    )
    has_nutrition_signal = has_macro or float(nutrients.get("sodium_mg_per_100g") or 0) > 0
    description = _normalize_text(food.get("description") or "")
    description_tokens = set(description.split())
    query_tokens = set(_normalize_text(query).split())
    if normalized_key == "tuz":
        excluded = USDA_EXCLUDED_DESCRIPTION_TOKENS.get("tuz", set())
        return has_nutrition_signal and description.startswith("salt") and not (description_tokens & excluded)
    if normalized_key in USDA_REQUIRED_DESCRIPTION_TOKENS:
        return has_nutrition_signal and _description_matches_required_tokens(description_tokens, normalized_key)
    if not query_tokens & GENERIC_EXCLUDED_DESCRIPTION_TOKENS and description_tokens & GENERIC_EXCLUDED_DESCRIPTION_TOKENS:
        return False
    return has_nutrition_signal and _score_food(query, food, normalized_key) >= 0.35


def _description_matches_required_tokens(description_tokens: set[str], normalized_key: str | None) -> bool:
    required = USDA_REQUIRED_DESCRIPTION_TOKENS.get(normalized_key or "")
    if not required:
        return True
    excluded = USDA_EXCLUDED_DESCRIPTION_TOKENS.get(normalized_key or "", set())
    if description_tokens & excluded:
        return False
    if normalized_key in {"zeytinyagi", "zeytinya"}:
        return {"olive", "oil"}.issubset(description_tokens)
    if normalized_key == "elma sirkesi":
        return {"apple", "vinegar"}.issubset(description_tokens) or {"cider", "vinegar"}.issubset(description_tokens)
    if normalized_key == "yulaf unu":
        return {"oat", "flour"}.issubset(description_tokens)
    if normalized_key == "kinoa":
        return "quinoa" in description_tokens
    if normalized_key == "badem":
        return bool({"almond", "almonds"} & description_tokens) and not ({"butter", "milk", "flour", "oil"} & description_tokens)
    if normalized_key == "avokado":
        return bool({"avocado", "avocados"} & description_tokens) and not ({"oil", "sauce"} & description_tokens)
    if normalized_key == "dereotu":
        return "dill" in description_tokens and not ({"pickle", "pickles", "cucumber"} & description_tokens)
    if normalized_key == "sut":
        return "milk" in description_tokens
    return bool(description_tokens & required)


def _ascii_key(value: str) -> str:
    return _normalize_text(value)


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    translation = str.maketrans({
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
    })
    text = normalized.translate(translation).lower()
    return " ".join("".join(char if char.isalnum() else " " for char in text).split())
