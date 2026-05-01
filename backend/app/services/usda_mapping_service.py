"""Controlled USDA mapping service using a manual Turkish->English seed dictionary."""
from __future__ import annotations

import json
import os
import unicodedata

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.models import Ingredient, IngredientNutritionValue, IngredientUsdaMapping
from app.services.usda_client import UsdaClient


REQUIRED_FIELDS = (
    "calories_per_100g",
    "protein_per_100g",
    "carbs_per_100g",
    "fat_per_100g",
    "saturated_fat_per_100g",
    "fiber_per_100g",
    "sugar_per_100g",
    "sodium_mg_per_100g",
)


DATA_TYPE_PRIORITY = {
    "Foundation": 1.0,
    "SR Legacy": 0.94,
    "Survey (FNDDS)": 0.88,
    "Experimental": 0.7,
    "Branded": 0.15,
}


SEED_MAPPINGS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "usda_seed_mappings.json",
)


_SEED_CACHE: dict[str, dict] | None = None


def ensure_nutrition_support_tables(db: Session) -> None:
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS ingredient_usda_mappings (
                mapping_id SERIAL PRIMARY KEY,
                ingredient_id INTEGER NOT NULL UNIQUE REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
                fdc_id INTEGER,
                usda_description VARCHAR(255),
                data_type VARCHAR(50),
                search_query VARCHAR(150),
                match_confidence NUMERIC(5, 2),
                match_status VARCHAR(20) NOT NULL DEFAULT 'pending',
                is_verified BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
            """
        )
    )
    db.execute(text("ALTER TABLE ingredient_usda_mappings ADD COLUMN IF NOT EXISTS search_query VARCHAR(150)"))
    db.execute(text("UPDATE ingredient_usda_mappings SET search_query = match_query WHERE search_query IS NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ingredient_usda_mappings' AND column_name='match_query')"))
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS ingredient_nutrition_values (
                nutrition_id SERIAL PRIMARY KEY,
                ingredient_id INTEGER NOT NULL UNIQUE REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
                fdc_id INTEGER NOT NULL,
                calories_per_100g NUMERIC(8, 2) NOT NULL,
                protein_per_100g NUMERIC(8, 2) NOT NULL,
                carbs_per_100g NUMERIC(8, 2) NOT NULL,
                fat_per_100g NUMERIC(8, 2) NOT NULL,
                saturated_fat_per_100g NUMERIC(8, 2) NOT NULL,
                fiber_per_100g NUMERIC(8, 2) NOT NULL,
                sugar_per_100g NUMERIC(8, 2) NOT NULL,
                sodium_mg_per_100g NUMERIC(10, 2) NOT NULL,
                added_sugar_per_100g NUMERIC(8, 2),
                trans_fat_per_100g NUMERIC(8, 2),
                cholesterol_mg_per_100g NUMERIC(10, 2),
                potassium_mg_per_100g NUMERIC(10, 2),
                calcium_mg_per_100g NUMERIC(10, 2),
                iron_mg_per_100g NUMERIC(10, 2),
                vitamin_d_mcg_per_100g NUMERIC(10, 2),
                source VARCHAR(30) NOT NULL DEFAULT 'USDA_FDC',
                confidence_score NUMERIC(5, 2),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
            """
        )
    )
    db.execute(text("ALTER TABLE ingredient_nutrition_values ALTER COLUMN fdc_id DROP NOT NULL"))
    db.execute(text("ALTER TABLE ingredient_nutrition_values DROP CONSTRAINT IF EXISTS ingredient_nutrition_values_fdc_id_key"))
    db.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS ix_ingredient_usda_mappings_ingredient_id
            ON ingredient_usda_mappings (ingredient_id)
            """
        )
    )
    db.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS ix_ingredient_nutrition_values_ingredient_id
            ON ingredient_nutrition_values (ingredient_id)
            """
        )
    )
    db.commit()


def import_all_missing_nutrition(db: Session, client: UsdaClient, *, limit: int | None = None) -> dict:
    ensure_nutrition_support_tables(db)
    query = db.query(Ingredient).filter(Ingredient.user_id.is_(None)).order_by(Ingredient.ingredient_id.asc())
    if limit:
        query = query.limit(limit)
    ingredients = query.all()

    report = {
        "total_ingredients": len(ingredients),
        "matched": [],
        "manual_review": [],
        "no_result": [],
        "nutrition_missing": [],
        "nutrition_saved": 0,
    }

    for ingredient in ingredients:
        try:
            result = import_ingredient_nutrition(ingredient, db, client)
            if result["status"] == "matched":
                report["matched"].append(result)
                if result.get("nutrition_saved"):
                    report["nutrition_saved"] += 1
            elif result["status"] == "manual_review":
                report["manual_review"].append(result)
            else:
                report["no_result"].append(result)
        except Exception as exc:
            db.rollback()
            report["manual_review"].append(
                {
                    "ingredient_id": ingredient.ingredient_id,
                    "ingredient_name": ingredient.ingredient_name,
                    "status": "manual_review",
                    "reason": str(exc),
                }
            )

    report["summary"] = {
        "Total ingredients": report["total_ingredients"],
        "Matched": len(report["matched"]),
        "Manual review": len(report["manual_review"]),
        "No result": len(report["no_result"]),
        "Nutrition saved": report["nutrition_saved"],
        "Nutrition missing": len(report["nutrition_missing"]),
    }
    return report


def import_ingredient_nutrition(ingredient: Ingredient, db: Session, client: UsdaClient) -> dict:
    ensure_nutrition_support_tables(db)

    existing_mapping = db.query(IngredientUsdaMapping).filter(IngredientUsdaMapping.ingredient_id == ingredient.ingredient_id).first()
    existing_nutrition = db.query(IngredientNutritionValue).filter(IngredientNutritionValue.ingredient_id == ingredient.ingredient_id).first()
    if existing_mapping and existing_mapping.match_status == "matched" and existing_nutrition:
        return _result_payload(ingredient, "matched", "skipped_existing", float(existing_mapping.match_confidence or 0), nutrition_saved=False)

    seed_mapping = get_seed_mapping(ingredient.ingredient_name)
    mapping = existing_mapping or IngredientUsdaMapping(ingredient_id=ingredient.ingredient_id)
    if existing_mapping is None:
        db.add(mapping)

    if not seed_mapping:
        mapping.fdc_id = None
        mapping.usda_description = None
        mapping.data_type = None
        mapping.search_query = None
        mapping.match_confidence = 0
        mapping.match_status = "manual_review"
        mapping.is_verified = False
        db.commit()
        return _result_payload(ingredient, "manual_review", "seed_mapping_missing", 0.0)

    candidate_queries = [seed_mapping["search_query"]]
    fallback_query = seed_mapping.get("fallback_query")
    if fallback_query:
        candidate_queries.append(fallback_query)

    best_food = None
    best_query = None
    best_score = -1.0
    for query in candidate_queries:
        foods = client.search_foods(query, page_size=12)
        if not foods:
            continue
        for food in foods:
            score = score_food(food, seed_mapping)
            if score > best_score:
                best_score = score
                best_food = food
                best_query = query

    if not best_food:
        mapping.fdc_id = None
        mapping.usda_description = None
        mapping.data_type = None
        mapping.search_query = seed_mapping["search_query"]
        mapping.match_confidence = 0
        mapping.match_status = "rejected"
        mapping.is_verified = False
        db.commit()
        return _result_payload(ingredient, "rejected", "no_result", 0.0)

    mapping.fdc_id = int(best_food["fdcId"])
    mapping.usda_description = best_food.get("description")
    mapping.data_type = best_food.get("dataType")
    mapping.search_query = best_query
    mapping.match_confidence = round(best_score, 2)
    mapping.is_verified = False

    if best_score < 0.78:
        mapping.match_status = "manual_review"
        db.commit()
        return _result_payload(ingredient, "manual_review", "low_confidence", best_score)

    food_detail = client.get_food_details(mapping.fdc_id, search_food=best_food)
    nutrient_data = client.extract_nutrients(food_detail)
    missing_required = [field for field in REQUIRED_FIELDS if nutrient_data.get(field) is None]
    if missing_required:
        mapping.match_status = "manual_review"
        db.commit()
        return _result_payload(
            ingredient,
            "manual_review",
            f"nutrition_missing:{','.join(missing_required)}",
            best_score,
        )

    mapping.match_status = "matched"
    nutrition = existing_nutrition or IngredientNutritionValue(ingredient_id=ingredient.ingredient_id)
    if existing_nutrition is None:
        db.add(nutrition)

    for field in (
        "fdc_id",
        *REQUIRED_FIELDS,
        "added_sugar_per_100g",
        "trans_fat_per_100g",
        "cholesterol_mg_per_100g",
        "potassium_mg_per_100g",
        "calcium_mg_per_100g",
        "iron_mg_per_100g",
        "vitamin_d_mcg_per_100g",
    ):
        setattr(nutrition, field, nutrient_data.get(field))

    nutrition.source = "USDA_FDC"
    nutrition.confidence_score = round(best_score, 2)
    db.commit()
    return _result_payload(ingredient, "matched", "nutrition_saved", best_score, nutrition_saved=True)


def score_food(food: dict, seed_mapping: dict) -> float:
    description = _normalize_text(food.get("description") or "")
    data_type = food.get("dataType")
    score = DATA_TYPE_PRIORITY.get(data_type, 0.25) * 0.45

    preferred_keywords = [_normalize_text(item) for item in seed_mapping.get("preferred_keywords", [])]
    avoid_keywords = [_normalize_text(item) for item in seed_mapping.get("avoid_keywords", [])]

    for keyword in preferred_keywords:
        if keyword and keyword in description:
            score += 0.18

    for keyword in avoid_keywords:
        if keyword and keyword in description:
            score -= 0.30

    if "branded" in _normalize_text(data_type or ""):
        score -= 0.30

    return round(max(0.0, min(0.99, score)), 2)


def get_seed_mapping(ingredient_name: str) -> dict | None:
    seed_mappings = load_seed_mappings()
    return seed_mappings.get(_normalize_text(ingredient_name))


def load_seed_mappings() -> dict[str, dict]:
    global _SEED_CACHE
    if _SEED_CACHE is not None:
        return _SEED_CACHE

    with open(SEED_MAPPINGS_PATH, "r", encoding="utf-8") as file:
        raw = json.load(file)

    normalized = {_normalize_text(key): value for key, value in raw.items()}
    _SEED_CACHE = normalized
    return normalized


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    translation = str.maketrans({
        "ı": "i", "İ": "i",
        "ğ": "g", "Ğ": "g",
        "ş": "s", "Ş": "s",
        "ö": "o", "Ö": "o",
        "ü": "u", "Ü": "u",
        "ç": "c", "Ç": "c"
    })
    return " ".join(normalized.translate(translation).lower().split())


def _result_payload(
    ingredient: Ingredient,
    status: str,
    reason: str,
    confidence: float,
    *,
    nutrition_saved: bool = False,
) -> dict:
    return {
        "ingredient_id": ingredient.ingredient_id,
        "ingredient_name": ingredient.ingredient_name,
        "status": status,
        "reason": reason,
        "confidence": round(confidence, 2),
        "nutrition_saved": nutrition_saved,
    }
