"""Nutrition resolver: local DB first, Gemini second."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.repositories import ingredient_repository
from app.services.gemini_client import estimate_nutrition_with_gemini
from app.utils.text_normalize import normalize_turkish_text


NUTRITION_FIELDS = (
    "calorie_per_100g",
    "protein_per_100g",
    "carbohydrate_per_100g",
    "fat_per_100g",
    "saturated_fat_per_100g",
    "fiber_per_100g",
    "sugar_per_100g",
    "sodium_mg_per_100g",
    "added_sugar_per_100g",
    "trans_fat_per_100g",
    "cholesterol_mg_per_100g",
    "potassium_mg_per_100g",
    "calcium_mg_per_100g",
    "iron_mg_per_100g",
    "vitamin_d_mcg_per_100g",
)


@dataclass
class NutritionResult:
    source: str
    confidence_score: float
    nutrition: dict


async def resolve_ingredient_nutrition(db: Session, user_id: int, ingredient_name: str) -> NutritionResult | None:
    normalized_name = normalize_turkish_text(ingredient_name)
    local = ingredient_repository.find_local_nutrition_match(db, user_id, normalized_name)
    if local and float(getattr(local, "calorie_per_100g", 0) or 0) > 0:
        return NutritionResult(
            source="db",
            confidence_score=1.0,
            nutrition={field: float(getattr(local, field, 0) or 0) for field in NUTRITION_FIELDS},
        )

    nutrition = estimate_nutrition_with_gemini(normalized_name)
    if nutrition:
        return NutritionResult(source="gemini", confidence_score=0.7, nutrition=nutrition)

    return None
