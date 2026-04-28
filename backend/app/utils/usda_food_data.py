"""USDA FoodData Central helpers."""
from __future__ import annotations

from dataclasses import dataclass
import unicodedata

import requests

from app.config.settings import settings
from app.utils.recipe_translation import translate_text


USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1"

USDA_QUERY_ALIASES = {
    "yumurta": ["egg", "eggs"],
    "zeytinyagi": ["olive oil"],
    "zeytinyagi": ["olive oil"],
    "sut": ["milk"],
    "yogurt": ["yogurt", "plain yogurt"],
    "suzme yogurt": ["strained yogurt", "greek yogurt"],
    "pirinc": ["rice", "white rice"],
    "bulgur": ["bulgur"],
    "yulaf": ["oats", "rolled oats"],
    "un": ["wheat flour", "flour"],
    "ekmek": ["bread"],
    "tavuk eti": ["chicken"],
    "tavuk gogsu": ["chicken breast"],
    "tavuk but": ["chicken thigh"],
    "dana eti": ["beef"],
    "dana kiyma": ["ground beef"],
    "kuzu eti": ["lamb"],
    "hindi eti": ["turkey"],
    "somon": ["salmon"],
    "ton baligi": ["tuna"],
    "domates": ["tomato"],
    "salatalik": ["cucumber"],
    "sogan": ["onion"],
    "taze sogan": ["green onion", "spring onion"],
    "sarimsak": ["garlic"],
    "patates": ["potato"],
    "havuc": ["carrot"],
    "biber": ["pepper"],
    "ispanak": ["spinach"],
    "brokoli": ["broccoli"],
    "karnabahar": ["cauliflower"],
    "kabak": ["zucchini"],
    "patlican": ["eggplant"],
    "pirasa": ["leek"],
    "mantar": ["mushroom"],
    "bezelye": ["peas", "green peas"],
    "fasulye": ["beans"],
    "nohut": ["chickpeas"],
    "mercimek": ["lentils"],
    "kirmizi mercimek": ["red lentils"],
    "yesil mercimek": ["green lentils"],
    "muz": ["banana"],
    "elma": ["apple"],
    "portakal": ["orange"],
    "limon": ["lemon"],
    "avokado": ["avocado"],
    "ceviz": ["walnuts", "walnut"],
    "badem": ["almonds", "almond"],
    "findik": ["hazelnuts", "hazelnut"],
    "tereyagi": ["butter"],
    "peynir": ["cheese"],
    "beyaz peynir": ["feta cheese", "white cheese"],
    "kasar peyniri": ["kashar cheese", "cheddar cheese"],
    "lor peyniri": ["ricotta cheese", "curd cheese"],
    "labne peyniri": ["cream cheese"],
    "mozzarella peyniri": ["mozzarella cheese"],
    "bal": ["honey"],
    "toz seker": ["sugar"],
    "esmer seker": ["brown sugar"],
    "tahin": ["tahini"],
    "sirke": ["vinegar"],
    "soya sosu": ["soy sauce"],
}


@dataclass
class UsdaFoodMatch:
    fdc_id: int
    description: str
    data_type: str | None
    confidence_score: float


NUTRIENT_NAME_MAP = {
    "energy": "calories_per_100g",
    "protein": "protein_per_100g",
    "carbohydrate, by difference": "carbs_per_100g",
    "total lipid (fat)": "fat_per_100g",
    "fatty acids, total saturated": "saturated_fat_per_100g",
    "fiber, total dietary": "fiber_per_100g",
    "sugars, total including nlea": "sugar_per_100g",
    "sodium, na": "sodium_mg_per_100g",
    "sugars, added": "added_sugar_per_100g",
    "fatty acids, total trans": "trans_fat_per_100g",
    "cholesterol": "cholesterol_mg_per_100g",
    "potassium, k": "potassium_mg_per_100g",
    "calcium, ca": "calcium_mg_per_100g",
    "iron, fe": "iron_mg_per_100g",
    "vitamin d (d2 + d3), international units": "vitamin_d_mcg_per_100g",
    "vitamin d (d2 + d3)": "vitamin_d_mcg_per_100g",
}


DATA_TYPE_PRIORITY = {
    "Foundation": 1.0,
    "SR Legacy": 0.94,
    "Survey (FNDDS)": 0.88,
    "Experimental": 0.8,
    "Branded": 0.55,
}


def build_usda_query_candidates(ingredient_name: str) -> list[str]:
    candidates: list[str] = []
    normalized_source = _normalize_text(ingredient_name)
    for alias in USDA_QUERY_ALIASES.get(normalized_source, []):
        if alias and alias not in candidates:
            candidates.append(alias)

    translated = translate_text(ingredient_name)
    for item in [translated, ingredient_name]:
        if not item:
            continue
        compact = " ".join(item.replace(",", " ").split()).strip()
        if compact and compact not in candidates:
            candidates.append(compact)

    if normalized_source and normalized_source not in candidates:
        candidates.append(normalized_source)
    return candidates


def search_best_usda_food(ingredient_name: str) -> UsdaFoodMatch | None:
    session = requests.Session()
    session.trust_env = False
    api_key = _get_usda_api_key()

    best_match: UsdaFoodMatch | None = None
    for candidate in build_usda_query_candidates(ingredient_name):
        response = session.post(
            f"{USDA_API_BASE}/foods/search",
            params={"api_key": api_key},
            json={
                "query": candidate,
                "pageSize": 10,
                "dataType": ["Foundation", "SR Legacy", "Survey (FNDDS)"],
            },
            timeout=30,
        )
        response.raise_for_status()
        foods = response.json().get("foods", [])
        for food in foods:
            score = _score_food_candidate(candidate, food)
            if best_match is None or score > best_match.confidence_score:
                best_match = UsdaFoodMatch(
                    fdc_id=int(food["fdcId"]),
                    description=food.get("description") or "",
                    data_type=food.get("dataType"),
                    confidence_score=round(score, 2),
                )

    return best_match


def fetch_usda_food_nutrients(fdc_id: int) -> dict:
    session = requests.Session()
    session.trust_env = False
    api_key = _get_usda_api_key()
    response = session.get(
        f"{USDA_API_BASE}/food/{fdc_id}",
        params={"api_key": api_key},
        timeout=30,
    )
    response.raise_for_status()
    food = response.json()

    normalized = {
        "fdc_id": int(food["fdcId"]),
    }
    for nutrient in food.get("foodNutrients", []):
        nutrient_info = nutrient.get("nutrient") or {}
        name = _normalize_text(nutrient_info.get("name") or nutrient.get("nutrientName") or "")
        mapped_field = NUTRIENT_NAME_MAP.get(name)
        if not mapped_field:
            continue

        amount = nutrient.get("amount")
        if amount is None:
            continue

        if mapped_field == "vitamin_d_mcg_per_100g" and nutrient_info.get("unitName") == "IU":
            normalized[mapped_field] = round(float(amount) * 0.025, 4)
        else:
            normalized[mapped_field] = float(amount)

    return normalized


def _score_food_candidate(query: str, food: dict) -> float:
    normalized_query = _normalize_text(query)
    description = _normalize_text(food.get("description") or "")
    query_tokens = set(normalized_query.split())
    description_tokens = set(description.split())
    overlap = len(query_tokens & description_tokens)
    overlap_ratio = overlap / max(1, len(query_tokens))

    priority = DATA_TYPE_PRIORITY.get(food.get("dataType"), 0.5)
    exact_bonus = 0.25 if normalized_query == description else 0.0
    starts_bonus = 0.12 if description.startswith(normalized_query) else 0.0
    return min(0.99, (overlap_ratio * 0.65) + (priority * 0.25) + exact_bonus + starts_bonus)


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    translation = str.maketrans({
        "ı": "i", "İ": "i",
        "ğ": "g", "Ğ": "g",
        "ş": "s", "Ş": "s",
        "ö": "o", "Ö": "o",
        "ü": "u", "Ü": "u",
        "ç": "c", "Ç": "c",
    })
    return " ".join(normalized.translate(translation).lower().split())


def _get_usda_api_key() -> str:
    api_key = (settings.USDA_API_KEY or "").strip()
    if not api_key:
        raise ValueError("USDA_API_KEY tanimli degil. Anahtari backend/.env icine eklemelisin.")
    return api_key
