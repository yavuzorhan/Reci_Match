import unicodedata
from app.db.models import Ingredient
from app.utils.helpers import normalize_ingredient_name

def ascii_fold(value: str) -> str:
    if not value:
        return ""
    translation = str.maketrans(
        {
            "ç": "c", "Ç": "c",
            "ğ": "g", "Ğ": "g",
            "ı": "i", "İ": "i",
            "ö": "o", "Ö": "o",
            "ş": "s", "Ş": "s",
            "ü": "u", "Ü": "u",
        }
    )
    normalized = unicodedata.normalize("NFKD", value.translate(translation))
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    return " ".join(normalized.lower().split())

def ingredient_keys(value: str) -> set[str]:
    canonical = ascii_fold(normalize_ingredient_name(value or ""))
    if not canonical:
        return set()
    return {
        f"exact:{canonical}",
        f"exact:{canonical.replace(' ', '')}",
    }

def normalize_cooking_type_name(value: str | None) -> str | None:
    if not value:
        return None
    normalized = ascii_fold(value)
    if "firin" in normalized:
        return "firin"
    if "tava" in normalized:
        return "tava"
    if "tencere" in normalized:
        return "tencere"
    return normalized

def piece_gram_for_ingredient(ingredient_name: str | None) -> float:
    normalized_name = unicodedata.normalize("NFKD", ingredient_name or "")
    normalized_name = "".join(char for char in normalized_name if not unicodedata.combining(char))
    normalized_name = normalized_name.translate(str.maketrans({"ı": "i", "İ": "i"}))
    normalized_name = " ".join(normalized_name.lower().split())
    piece_map = {
        "visne": 5,
        "kiraz": 8,
        "cilek": 12,
        "yumurta": 50,
        "domates": 115,
        "sogan": 100,
        "patates": 150,
    }
    return piece_map.get(normalized_name, 50)

def unit_to_grams(amount, unit: str | None, ingredient_name: str | None = None) -> float | None:
    if amount is None:
        return None
    try:
        amount_value = float(amount)
    except (TypeError, ValueError):
        return None
    if amount_value <= 0:
        return None

    normalized_unit = ascii_fold(unit or "g")
    normalized_unit = normalized_unit.replace(".", "")
    unit_map = {
        "g": 1,
        "gr": 1,
        "gram": 1,
        "kg": 1000,
        "kilogram": 1000,
        "ml": 1,
        "mililitre": 1,
        "litre": 1000,
        "l": 1000,
        "adet": 50,
        "tane": 50,
        "yemek kasigi": 15,
        "yk": 15,
        "tatli kasigi": 10,
        "tk": 10,
        "cay kasigi": 5,
        "ck": 5,
        "su bardagi": 200,
        "bardak": 200,
        "olcek": 30,
    }
    multiplier = piece_gram_for_ingredient(ingredient_name) if normalized_unit in {"adet", "tane"} else unit_map.get(normalized_unit)
    if multiplier is None:
        return None
    return round(amount_value * multiplier, 2)

def calculate_recipe_nutrition(items: list[dict]) -> dict:
    totals = {"calorie": 0.0, "protein": 0.0, "carbohydrate": 0.0, "fat": 0.0}
    for item in items:
        grams = item.get("grams")
        ingredient = item.get("ingredient")
        if grams is None or not ingredient:
            continue
        totals["calorie"] += ingredient_calories_per_100g(ingredient) * grams / 100
        totals["protein"] += ingredient_protein_per_100g(ingredient) * grams / 100
        totals["carbohydrate"] += ingredient_carbs_per_100g(ingredient) * grams / 100
        totals["fat"] += ingredient_fat_per_100g(ingredient) * grams / 100
    return {key: round(value, 2) for key, value in totals.items()}

def ingredient_calories_per_100g(ingredient: Ingredient) -> float:
    return float(getattr(ingredient, "calorie_per_100g", 0) or 0)

def ingredient_protein_per_100g(ingredient: Ingredient) -> float:
    return float(getattr(ingredient, "protein_per_100g", 0) or 0)

def ingredient_carbs_per_100g(ingredient: Ingredient) -> float:
    return float(getattr(ingredient, "carbohydrate_per_100g", 0) or 0)

def ingredient_fat_per_100g(ingredient: Ingredient) -> float:
    return float(getattr(ingredient, "fat_per_100g", 0) or 0)
