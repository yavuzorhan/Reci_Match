from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import Ingredient
from app.repositories import ingredient_repository
from app.services.ingredient_nutrition_service import ensure_ingredient_columns
from app.services.nutrition_resolver_service import NUTRITION_FIELDS, resolve_ingredient_nutrition
from app.utils.helpers import infer_ingredient_category, normalize_ingredient_name
from app.utils.text_normalize import normalize_turkish_text

try:
    from rapidfuzz import fuzz
except ImportError:
    fuzz = None

@dataclass
class ResolveResult:
    status: str
    ingredient: Ingredient | None = None
    ingredient_name: str | None = None

async def resolve_ingredient_for_user(
    db: Session,
    user_id: int,
    ingredient_name: str,
    try_ai: bool = True,
) -> ResolveResult:
    clean_name = normalize_ingredient_name(ingredient_name)
    if not clean_name:
        raise HTTPException(status_code=400, detail="Malzeme adi bos olamaz.")

    existing = find_matching_ingredient(db, user_id, clean_name)
    if existing:
        return await ensure_nutrition_for_ingredient(
            db=db,
            ingredient=existing,
            query_name=clean_name,
            try_ai=try_ai,
        )

    if not try_ai:
        return ResolveResult(status="manual_required", ingredient_name=ingredient_name)

    nutrition_result = await resolve_ingredient_nutrition(db, user_id, clean_name)
    if nutrition_result:
        source_tag = "gemini_auto" if nutrition_result.source == "gemini" else "manual"
        ingredient = create_or_get_user_ingredient(
            db=db,
            user_id=user_id,
            ingredient_name=clean_name,
            source=source_tag,
            flush=True,
        )
        upsert_ingredient_nutrition(
            db,
            ingredient,
            nutrition_result.nutrition,
            source=nutrition_result.source,
            confidence=nutrition_result.confidence_score,
        )
        return ResolveResult(status="resolved", ingredient=ingredient)

    return ResolveResult(status="manual_required", ingredient_name=ingredient_name)

async def ensure_nutrition_for_ingredient(
    db: Session,
    ingredient: Ingredient,
    query_name: str | None = None,
    try_ai: bool = True,
) -> ResolveResult:
    if float(getattr(ingredient, "calorie_per_100g", 0) or 0) > 0:
        return ResolveResult(status="resolved", ingredient=ingredient)

    if not try_ai:
        return ResolveResult(status="manual_required", ingredient_name=ingredient.ingredient_name)

    nutrition_result = await resolve_ingredient_nutrition(db, ingredient.user_id or 0, query_name or ingredient.ingredient_name)
    if nutrition_result:
        upsert_ingredient_nutrition(
            db,
            ingredient,
            nutrition_result.nutrition,
            source=nutrition_result.source,
            confidence=nutrition_result.confidence_score,
        )
        return ResolveResult(status="resolved", ingredient=ingredient)

    return ResolveResult(status="resolved", ingredient=ingredient)

def find_matching_ingredient(db: Session, user_id: int, normalized_name: str) -> Ingredient | None:
    normalized_key = normalize_turkish_text(normalized_name)
    exact_matches = [
        ingredient
        for ingredient in ingredient_repository.find_accessible_ingredients_by_name(db, user_id, normalized_name)
        if normalize_turkish_text(ingredient.ingredient_name) == normalized_key
    ]
    if exact_matches:
        return _pick_best_match(exact_matches, user_id, normalized_key)

    alias = ingredient_repository.find_accessible_ingredient_alias(db, user_id, normalized_key)
    if alias:
        return alias.ingredient

    best_match: Ingredient | None = None
    best_score = 0.0
    python_exact: list[Ingredient] = []
    for ingredient in ingredient_repository.list_accessible_ingredients(db, user_id):
        candidate_key = normalize_turkish_text(ingredient.ingredient_name)
        if not candidate_key:
            continue
        if candidate_key == normalized_key:
            python_exact.append(ingredient)
            continue
        if fuzz:
            direct = fuzz.ratio(normalized_key, candidate_key)
            token_sort = fuzz.token_sort_ratio(normalized_key, candidate_key)
            raw = max(direct, token_sort)
            len_ratio = min(len(normalized_key), len(candidate_key)) / max(len(normalized_key), len(candidate_key), 1)
            score = raw * (0.5 + 0.5 * len_ratio)
        else:
            score = 0.0
        if score > best_score:
            best_match = ingredient
            best_score = score

    if python_exact:
        return _pick_best_match(python_exact, user_id, normalized_key)

    if best_match is not None and best_score >= 85:
        return best_match

    return None

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

    ensure_ingredient_columns(db)
    clean_name = normalize_ingredient_name(ingredient_name)
    existing = find_matching_ingredient(db, user_id, clean_name)
    if existing and existing.user_id == user_id:
        ingredient = existing
    else:
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
        },
        source="manual",
        confidence=0.4,
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
    confidence: float | None = None,
) -> Ingredient:
    for field in NUTRITION_FIELDS:
        setattr(ingredient, field, float(nutrition.get(field) or 0))

    ingredient.nutrition_source = source if source in {"gemini", "manual", "db"} else "manual"
    ingredient.nutrition_confidence = float(
        confidence
        if confidence is not None
        else {"db": 1.0, "gemini": 0.7, "manual": 0.4}.get(source, 0.4)
    )
    db.flush()
    return ingredient

def serialize_ingredient(ingredient: Ingredient) -> dict:
    return {
        "id": ingredient.ingredient_id,
        "name": ingredient.ingredient_name,
        "calorie_per_100g": float(ingredient.calorie_per_100g or 0),
        "protein_per_100g": float(ingredient.protein_per_100g or 0),
        "carbohydrate_per_100g": float(ingredient.carbohydrate_per_100g or 0),
        "fat_per_100g": float(ingredient.fat_per_100g or 0),
        "saturated_fat_per_100g": float(ingredient.saturated_fat_per_100g or 0),
        "fiber_per_100g": float(ingredient.fiber_per_100g or 0),
        "sugar_per_100g": float(ingredient.sugar_per_100g or 0),
        "sodium_mg_per_100g": float(ingredient.sodium_mg_per_100g or 0),
        "nutrition_source": ingredient.nutrition_source,
        "nutrition_confidence": float(ingredient.nutrition_confidence or 0),
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
