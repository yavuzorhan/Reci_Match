"""Ingredient resolve helpers for custom recipe creation."""
from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.models import Ingredient, IngredientNutritionValue, IngredientUsdaMapping
from app.services.ingredient_nutrition_service import ensure_ingredient_nutrition_table
from app.utils.helpers import infer_ingredient_category, normalize_ingredient_name
from app.utils.nutrition_fetcher import fetch_ingredient_nutrition


@dataclass
class ResolveResult:
    status: str
    ingredient: Ingredient | None = None
    ingredient_name: str | None = None


async def resolve_ingredient_for_user(
    db: Session,
    user_id: int,
    ingredient_name: str,
    try_usda: bool = True,
) -> ResolveResult:
    clean_name = normalize_ingredient_name(ingredient_name)
    if not clean_name:
        raise HTTPException(status_code=400, detail="Malzeme adi bos olamaz.")

    existing = find_matching_ingredient(db, user_id, clean_name)
    if existing:
        if getattr(existing, "nutrition_value", None):
            return ResolveResult(status="resolved", ingredient=existing)
        if try_usda:
            nutrition = await fetch_ingredient_nutrition(existing.ingredient_name)
            if nutrition:
                upsert_ingredient_nutrition(db, existing, nutrition, source="USDA_FDC")
                upsert_usda_mapping(db, existing, nutrition, clean_name)
                return ResolveResult(status="resolved", ingredient=existing)
        return ResolveResult(status="manual_required", ingredient_name=ingredient_name)

    if not try_usda:
        return ResolveResult(status="manual_required", ingredient_name=ingredient_name)

    nutrition = await fetch_ingredient_nutrition(clean_name)
    if nutrition:
        ingredient = create_or_get_user_ingredient(
            db=db,
            user_id=user_id,
            ingredient_name=clean_name,
            source="usda_auto",
            flush=True,
        )
        upsert_ingredient_nutrition(db, ingredient, nutrition, source="USDA_FDC")
        upsert_usda_mapping(db, ingredient, nutrition, clean_name)
        return ResolveResult(status="resolved", ingredient=ingredient)

    return ResolveResult(status="manual_required", ingredient_name=ingredient_name)


def find_matching_ingredient(db: Session, user_id: int, normalized_name: str) -> Ingredient | None:
    exact_matches = (
        db.query(Ingredient)
        .filter(
            Ingredient.ingredient_name == normalized_name,
            or_(Ingredient.user_id == user_id, Ingredient.user_id.is_(None)),
        )
        .all()
    )
    if exact_matches:
        return _pick_best_match(exact_matches, user_id, normalized_name)

    fuzzy_matches = (
        db.query(Ingredient)
        .filter(
            Ingredient.ingredient_name.ilike(f"%{normalized_name}%"),
            or_(Ingredient.user_id == user_id, Ingredient.user_id.is_(None)),
        )
        .all()
    )
    if not fuzzy_matches:
        return None
    return _pick_best_match(fuzzy_matches, user_id, normalized_name)


def create_manual_ingredient(
    db: Session,
    user_id: int,
    ingredient_name: str,
    calorie_per_100g: float,
    protein_per_100g: float,
    carbohydrate_per_100g: float,
    fat_per_100g: float,
) -> Ingredient:
    if min(calorie_per_100g, protein_per_100g, carbohydrate_per_100g, fat_per_100g) < 0:
        raise HTTPException(status_code=400, detail="Besin degerleri negatif olamaz.")

    ensure_ingredient_nutrition_table(db)
    clean_name = normalize_ingredient_name(ingredient_name)
    existing = find_matching_ingredient(db, user_id, clean_name)
    if existing and existing.user_id == user_id:
        return existing

    ingredient = create_or_get_user_ingredient(
        db=db,
        user_id=user_id,
        ingredient_name=clean_name,
        source="manual",
        flush=False,
    )
    db.flush()
    upsert_ingredient_nutrition(
        db,
        ingredient,
        {
            "calorie_per_100g": calorie_per_100g,
            "protein_per_100g": protein_per_100g,
            "carbohydrate_per_100g": carbohydrate_per_100g,
            "fat_per_100g": fat_per_100g,
            "fdc_id": None,
        },
        source="manual",
    )
    db.commit()
    db.refresh(ingredient)
    return ingredient


def create_or_get_user_ingredient(
    db: Session,
    user_id: int,
    ingredient_name: str,
    source: str,
    flush: bool,
) -> Ingredient:
    clean_name = normalize_ingredient_name(ingredient_name)
    category_name, category_id = infer_ingredient_category(clean_name)
    existing_user = (
        db.query(Ingredient)
        .filter(Ingredient.ingredient_name == clean_name, Ingredient.user_id == user_id)
        .first()
    )
    if existing_user:
        return existing_user

    ingredient = Ingredient(
        ingredient_name=clean_name,
        user_id=user_id,
        category=category_name,
        category_id=category_id,
        calorie_per_100g=0,
        protein_per_100g=0,
        carbohydrate_per_100g=0,
        fat_per_100g=0,
        is_verified=False,
        source=source,
    )
    db.add(ingredient)
    if flush:
        db.flush()
    return ingredient


def upsert_ingredient_nutrition(
    db: Session,
    ingredient: Ingredient,
    nutrition: dict,
    source: str,
) -> IngredientNutritionValue:
    value = (
        db.query(IngredientNutritionValue)
        .filter(IngredientNutritionValue.ingredient_id == ingredient.ingredient_id)
        .first()
    )
    if not value:
        value = IngredientNutritionValue(ingredient_id=ingredient.ingredient_id)
        db.add(value)

    value.fdc_id = nutrition.get("fdc_id")
    value.calories_per_100g = float(nutrition.get("calorie_per_100g") or 0)
    value.protein_per_100g = float(nutrition.get("protein_per_100g") or 0)
    value.carbs_per_100g = float(nutrition.get("carbohydrate_per_100g") or 0)
    value.fat_per_100g = float(nutrition.get("fat_per_100g") or 0)
    value.saturated_fat_per_100g = float(nutrition.get("saturated_fat_per_100g") or 0)
    value.fiber_per_100g = float(nutrition.get("fiber_per_100g") or 0)
    value.sugar_per_100g = float(nutrition.get("sugar_per_100g") or 0)
    value.sodium_mg_per_100g = float(nutrition.get("sodium_mg_per_100g") or 0)
    value.source = source
    value.confidence_score = 0.85 if source == "USDA_FDC" else 0.4
    ingredient.nutrition_value = value
    return value


def upsert_usda_mapping(
    db: Session,
    ingredient: Ingredient,
    nutrition: dict,
    query: str,
) -> IngredientUsdaMapping:
    mapping = (
        db.query(IngredientUsdaMapping)
        .filter(IngredientUsdaMapping.ingredient_id == ingredient.ingredient_id)
        .first()
    )
    if not mapping:
        mapping = IngredientUsdaMapping(ingredient_id=ingredient.ingredient_id)
        db.add(mapping)

    mapping.fdc_id = nutrition.get("fdc_id")
    mapping.usda_description = nutrition.get("description")
    mapping.data_type = nutrition.get("data_type")
    mapping.search_query = query
    mapping.match_confidence = 0.85
    mapping.match_status = "matched"
    mapping.is_verified = False
    return mapping


def serialize_ingredient(ingredient: Ingredient) -> dict:
    return {
        "id": ingredient.ingredient_id,
        "name": ingredient.ingredient_name,
        "calorie_per_100g": float(ingredient.nutrition_value.calories_per_100g) if ingredient.nutrition_value else 0,
        "protein_per_100g": float(ingredient.nutrition_value.protein_per_100g) if ingredient.nutrition_value else 0,
        "carbohydrate_per_100g": float(ingredient.nutrition_value.carbs_per_100g) if ingredient.nutrition_value else 0,
        "fat_per_100g": float(ingredient.nutrition_value.fat_per_100g) if ingredient.nutrition_value else 0,
        "is_verified": bool(ingredient.is_verified),
        "source": ingredient.source,
    }


def _pick_best_match(matches: list[Ingredient], user_id: int, target: str) -> Ingredient:
    def sort_key(ingredient: Ingredient) -> tuple[int, int, int, str]:
        owner_rank = 0 if ingredient.user_id == user_id else 1
        name = ingredient.ingredient_name or ""
        length_delta = abs(len(name) - len(target))
        exact_rank = 0 if name == target else 1
        return owner_rank, exact_rank, length_delta, name

    return sorted(matches, key=sort_key)[0]
