"""Ingredient nutrition sync and lookup logic."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.models import Ingredient, IngredientNutritionValue, IngredientUsdaMapping
from app.services.usda_mapping_service import (
    ensure_nutrition_support_tables,
    import_all_missing_nutrition,
    import_ingredient_nutrition,
)
from app.services.usda_client import UsdaClient


def ensure_ingredient_nutrition_table(db: Session) -> None:
    ensure_nutrition_support_tables(db)


def get_ingredient_nutrition(ingredient_id: int, db: Session) -> dict | None:
    ensure_nutrition_support_tables(db)
    nutrition = (
        db.query(IngredientNutritionValue)
        .filter(IngredientNutritionValue.ingredient_id == ingredient_id)
        .first()
    )
    if not nutrition:
        return None

    mapping = (
        db.query(IngredientUsdaMapping)
        .filter(IngredientUsdaMapping.ingredient_id == ingredient_id)
        .first()
    )
    return {
        "mapping": serialize_mapping(mapping) if mapping else None,
        "nutrition": serialize_ingredient_nutrition(nutrition),
    }


def sync_ingredient_nutrition_from_usda(ingredient_id: int, db: Session) -> dict:
    ensure_nutrition_support_tables(db)
    ingredient = db.query(Ingredient).filter(Ingredient.ingredient_id == ingredient_id).first()
    if not ingredient:
        raise ValueError("Ingredient not found.")
    client = UsdaClient()
    result = import_ingredient_nutrition(ingredient, db, client)
    mapping = (
        db.query(IngredientUsdaMapping)
        .filter(IngredientUsdaMapping.ingredient_id == ingredient_id)
        .first()
    )
    nutrition = (
        db.query(IngredientNutritionValue)
        .filter(IngredientNutritionValue.ingredient_id == ingredient_id)
        .first()
    )
    return {
        "result": result,
        "mapping": serialize_mapping(mapping) if mapping else None,
        "nutrition": serialize_ingredient_nutrition(nutrition) if nutrition else None,
    }


def sync_missing_ingredient_nutrition(limit: int, db: Session) -> dict:
    ensure_nutrition_support_tables(db)
    client = UsdaClient()
    return import_all_missing_nutrition(db, client, limit=max(1, min(limit, 500)))


def serialize_mapping(mapping: IngredientUsdaMapping) -> dict:
    return {
        "ingredient_id": mapping.ingredient_id,
        "fdc_id": mapping.fdc_id,
        "usda_description": mapping.usda_description,
        "data_type": mapping.data_type,
        "search_query": getattr(mapping, "search_query", None),
        "match_confidence": _as_float(mapping.match_confidence),
        "match_status": mapping.match_status,
        "is_verified": bool(mapping.is_verified),
    }


def serialize_ingredient_nutrition(nutrition: IngredientNutritionValue) -> dict:
    return {
        "ingredient_id": nutrition.ingredient_id,
        "fdc_id": nutrition.fdc_id,
        "calories_per_100g": _as_float(nutrition.calories_per_100g),
        "protein_per_100g": _as_float(nutrition.protein_per_100g),
        "carbs_per_100g": _as_float(nutrition.carbs_per_100g),
        "fat_per_100g": _as_float(nutrition.fat_per_100g),
        "saturated_fat_per_100g": _as_float(nutrition.saturated_fat_per_100g),
        "fiber_per_100g": _as_float(nutrition.fiber_per_100g),
        "sugar_per_100g": _as_float(nutrition.sugar_per_100g),
        "sodium_mg_per_100g": _as_float(nutrition.sodium_mg_per_100g),
        "added_sugar_per_100g": _as_float(nutrition.added_sugar_per_100g),
        "trans_fat_per_100g": _as_float(nutrition.trans_fat_per_100g),
        "cholesterol_mg_per_100g": _as_float(nutrition.cholesterol_mg_per_100g),
        "potassium_mg_per_100g": _as_float(nutrition.potassium_mg_per_100g),
        "calcium_mg_per_100g": _as_float(nutrition.calcium_mg_per_100g),
        "iron_mg_per_100g": _as_float(nutrition.iron_mg_per_100g),
        "vitamin_d_mcg_per_100g": _as_float(nutrition.vitamin_d_mcg_per_100g),
        "source": nutrition.source,
        "confidence_score": _as_float(nutrition.confidence_score),
    }


def _as_float(value) -> float | None:
    return float(value) if value is not None else None
