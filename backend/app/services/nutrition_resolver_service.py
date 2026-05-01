"""Hybrid nutrition resolver: local DB, USDA, then AI fallback."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.repositories import ingredient_repository
from app.services.gemini_client import estimate_nutrition_with_gemini
from app.utils.nutrition_fetcher import fetch_ingredient_nutrition
from app.utils.text_normalize import normalize_turkish_text


@dataclass
class NutritionResult:
    source: str
    confidence_score: float
    nutrition: dict


async def resolve_ingredient_nutrition(db: Session, user_id: int, ingredient_name: str) -> NutritionResult | None:
    normalized_name = normalize_turkish_text(ingredient_name)
    local = ingredient_repository.find_local_nutrition_match(db, user_id, normalized_name)
    if local and getattr(local, "nutrition_value", None):
        value = local.nutrition_value
        return NutritionResult(
            source="db",
            confidence_score=1.0,
            nutrition={
                "calorie_per_100g": float(value.calories_per_100g),
                "protein_per_100g": float(value.protein_per_100g),
                "carbohydrate_per_100g": float(value.carbs_per_100g),
                "fat_per_100g": float(value.fat_per_100g),
                "saturated_fat_per_100g": float(value.saturated_fat_per_100g),
                "fiber_per_100g": float(value.fiber_per_100g),
                "sugar_per_100g": float(value.sugar_per_100g),
                "sodium_mg_per_100g": float(value.sodium_mg_per_100g),
                "fdc_id": value.fdc_id,
            },
        )

    usda = await fetch_ingredient_nutrition(normalized_name)
    if usda:
        return NutritionResult(source="usda", confidence_score=0.85, nutrition=usda)

    ai = estimate_nutrition_with_gemini(normalized_name)
    if ai:
        return NutritionResult(source="ai", confidence_score=0.5, nutrition=ai)

    return None
