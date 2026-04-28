"""Map Turkish ingredients to USDA foods and persist nutrition values."""
from __future__ import annotations

import difflib
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


USDA_QUERY_HINTS = {
    "domates": ["tomato raw", "tomato"],
    "tavuk gogsu": ["chicken breast raw", "chicken breast"],
    "yogurt": ["yogurt plain", "plain yogurt"],
    "suzme yogurt": ["greek yogurt plain", "strained yogurt"],
    "zeytinyagi": ["olive oil"],
    "bulgur": ["bulgur dry", "bulgur"],
    "pirinc": ["rice white raw", "white rice raw"],
    "mercimek": ["lentils raw", "lentils"],
    "kirmizi mercimek": ["red lentils raw", "red lentils"],
    "yesil mercimek": ["lentils raw", "green lentils raw"],
    "domates salcasi": ["tomato paste"],
    "yumurta": ["egg raw", "eggs"],
    "sut": ["milk"],
    "tavuk eti": ["chicken raw", "chicken"],
    "dana eti": ["beef raw", "beef"],
    "dana kiyma": ["ground beef raw", "ground beef"],
    "somon": ["salmon raw", "salmon"],
    "patates": ["potato raw", "potato"],
    "sogan": ["onion raw", "onion"],
    "sarimsak": ["garlic raw", "garlic"],
    "salatalik": ["cucumber with peel raw", "cucumber raw"],
    "biber": ["pepper raw", "sweet pepper raw"],
    "ispanak": ["spinach raw"],
    "ekmek": ["bread", "white bread"],
}


DATA_TYPE_PRIORITY = {
    "Foundation": 1.0,
    "SR Legacy": 0.95,
    "Survey (FNDDS)": 0.88,
    "Experimental": 0.75,
    "Branded": 0.45,
}


DISH_LIKE_TERMS = {
    "burrito",
    "sandwich",
    "salad",
    "soup",
    "pizza",
    "burger",
    "omelet",
    "omelette",
    "wrap",
    "cake",
    "cookie",
    "pasta",
    "casserole",
}


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
                match_query VARCHAR(150),
                match_confidence NUMERIC(5, 2),
                match_status VARCHAR(20) NOT NULL DEFAULT 'pending',
                is_verified BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
            """
        )
    )
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


def import_ingredient_nutrition(
    ingredient: Ingredient,
    db: Session,
    client: UsdaClient,
    manual_review_threshold: float = 0.58,
    matched_threshold: float = 0.74,
) -> dict:
    ensure_nutrition_support_tables(db)

    existing_mapping = db.query(IngredientUsdaMapping).filter(IngredientUsdaMapping.ingredient_id == ingredient.ingredient_id).first()
    existing_nutrition = db.query(IngredientNutritionValue).filter(IngredientNutritionValue.ingredient_id == ingredient.ingredient_id).first()

    if existing_mapping and existing_mapping.match_status == "matched" and existing_nutrition:
        return {
            "ingredient_id": ingredient.ingredient_id,
            "ingredient_name": ingredient.ingredient_name,
            "status": "matched",
            "action": "skipped_existing",
            "confidence": float(existing_mapping.match_confidence or 0),
        }

    best_candidate = None
    best_query = None
    best_score = 0.0

    for index, query in enumerate(generate_usda_queries(ingredient.ingredient_name)):
        foods = client.search_foods(query, page_size=10)
        for food in foods:
            score = score_usda_candidate(ingredient.ingredient_name, query, food, query_rank=index)
            if score > best_score:
                best_score = score
                best_candidate = food
                best_query = query

    mapping = existing_mapping or IngredientUsdaMapping(ingredient_id=ingredient.ingredient_id)
    if existing_mapping is None:
        db.add(mapping)

    if not best_candidate:
        mapping.fdc_id = None
        mapping.usda_description = None
        mapping.data_type = None
        mapping.match_query = best_query
        mapping.match_confidence = 0
        mapping.match_status = "rejected"
        mapping.is_verified = False
        db.commit()
        return _result_payload(ingredient, "rejected", 0.0, "no_result")

    mapping.fdc_id = int(best_candidate["fdcId"])
    mapping.usda_description = best_candidate.get("description")
    mapping.data_type = best_candidate.get("dataType")
    mapping.match_query = best_query
    mapping.match_confidence = round(best_score, 2)
    mapping.is_verified = False

    if best_score < manual_review_threshold:
        mapping.match_status = "manual_review"
        db.commit()
        return _result_payload(ingredient, "manual_review", best_score, "low_confidence")

    food_details = client.get_food_details(mapping.fdc_id, search_food=best_candidate)
    nutrient_data = client.extract_nutrients(food_details)
    missing_required = [field for field in REQUIRED_FIELDS if nutrient_data.get(field) is None]

    if missing_required:
        mapping.match_status = "manual_review"
        db.commit()
        return _result_payload(ingredient, "manual_review", best_score, f"missing_nutrients:{','.join(missing_required)}")

    mapping.match_status = "matched" if best_score >= matched_threshold else "manual_review"
    db.commit()

    if mapping.match_status != "matched":
        return _result_payload(ingredient, "manual_review", best_score, "borderline_confidence")

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

    return _result_payload(
        ingredient,
        "matched",
        best_score,
        "created" if existing_nutrition is None else "updated",
    )


def import_all_missing_nutrition(
    db: Session,
    client: UsdaClient,
    *,
    limit: int | None = None,
) -> dict:
    ensure_nutrition_support_tables(db)

    query = (
        db.query(Ingredient)
        .filter(Ingredient.user_id.is_(None))
        .order_by(Ingredient.ingredient_id.asc())
    )
    if limit:
        query = query.limit(limit)

    ingredients = query.all()
    report = {
        "matched": [],
        "manual_review": [],
        "rejected": [],
        "nutrition_missing": [],
    }

    for ingredient in ingredients:
        try:
            result = import_ingredient_nutrition(ingredient, db, client)
            status = result["status"]
            if status == "matched":
                report["matched"].append(result)
            elif status == "manual_review":
                reason = result.get("reason", "")
                if str(reason).startswith("missing_nutrients"):
                    report["nutrition_missing"].append(result)
                else:
                    report["manual_review"].append(result)
            else:
                report["rejected"].append(result)
        except Exception as exc:
            db.rollback()
            report["rejected"].append({
                "ingredient_id": ingredient.ingredient_id,
                "ingredient_name": ingredient.ingredient_name,
                "status": "rejected",
                "reason": str(exc),
            })

    report["summary"] = {
        "matched": len(report["matched"]),
        "manual_review": len(report["manual_review"]),
        "rejected": len(report["rejected"]),
        "nutrition_missing": len(report["nutrition_missing"]),
    }
    return report


def generate_usda_queries(ingredient_name: str) -> list[str]:
    normalized = _normalize_text(ingredient_name)
    queries = []
    for item in USDA_QUERY_HINTS.get(normalized, []):
        if item not in queries:
            queries.append(item)

    generic = normalized.replace(" ", " ").strip()
    if generic and generic not in queries:
        queries.append(generic)

    english_fallback = _translate_token_by_token(normalized)
    if english_fallback and english_fallback not in queries:
        queries.append(english_fallback)

    return queries[:5]


def score_usda_candidate(ingredient_name: str, query: str, food: dict, query_rank: int = 0) -> float:
    normalized_ingredient = _normalize_text(ingredient_name)
    normalized_query = _normalize_text(query)
    description = _normalize_text(food.get("description") or "")
    query_ratio = difflib.SequenceMatcher(None, normalized_query, description).ratio()
    ingredient_ratio = difflib.SequenceMatcher(None, normalized_ingredient, description).ratio()
    token_overlap = _token_overlap_ratio(query, description)
    data_type_weight = DATA_TYPE_PRIORITY.get(food.get("dataType"), 0.4)
    raw_bonus = 0.10 if "raw" in description else 0.0
    containment_bonus = 0.12 if _query_tokens_contained(query, description) else 0.0
    query_first_token = normalized_query.split()[0] if normalized_query.split() else ""
    exact_prefix_bonus = 0.08 if query_first_token and description.startswith(query_first_token) else 0.0
    query_rank_bonus = max(0.0, 0.06 - (query_rank * 0.02))
    dish_penalty = 0.18 if _contains_dish_like_term(description) else 0.0

    return round(
        min(
            0.99,
            (query_ratio * 0.35)
            + (ingredient_ratio * 0.25)
            + (token_overlap * 0.20)
            + (data_type_weight * 0.20)
            + raw_bonus
            + containment_bonus
            + exact_prefix_bonus,
        )
        - dish_penalty
        + query_rank_bonus,
        2,
    )


TOKEN_TRANSLATIONS = {
    "domates": "tomato",
    "tavuk": "chicken",
    "gogsu": "breast",
    "gogus": "breast",
    "yogurt": "yogurt",
    "zeytinyagi": "olive oil",
    "bulgur": "bulgur",
    "pirinc": "rice",
    "mercimek": "lentils",
    "salcasi": "paste",
    "salca": "paste",
    "sogan": "onion",
    "sarimsak": "garlic",
    "patates": "potato",
    "yumurta": "egg",
    "sut": "milk",
    "biber": "pepper",
    "salatalik": "cucumber",
    "ispanak": "spinach",
    "brokoli": "broccoli",
    "kabak": "zucchini",
    "patlican": "eggplant",
    "pirasa": "leek",
    "mantar": "mushroom",
}


def _translate_token_by_token(normalized_name: str) -> str:
    translated_tokens = [TOKEN_TRANSLATIONS.get(token, token) for token in normalized_name.split()]
    return " ".join(token for token in translated_tokens if token).strip()


def _token_overlap_ratio(left: str, right: str) -> float:
    left_tokens = set(_normalize_text(left).split())
    right_tokens = set(_normalize_text(right).split())
    if not left_tokens:
        return 0.0
    return len(left_tokens & right_tokens) / len(left_tokens)


def _query_tokens_contained(query: str, description: str) -> bool:
    query_tokens = set(_normalize_text(query).split())
    description_tokens = set(_normalize_text(description).split())
    return bool(query_tokens) and query_tokens.issubset(description_tokens)


def _contains_dish_like_term(description: str) -> bool:
    description_tokens = set(_normalize_text(description).split())
    return bool(description_tokens & DISH_LIKE_TERMS)


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


def _result_payload(ingredient: Ingredient, status: str, confidence: float, reason: str) -> dict:
    return {
        "ingredient_id": ingredient.ingredient_id,
        "ingredient_name": ingredient.ingredient_name,
        "status": status,
        "confidence": round(confidence, 2),
        "reason": reason,
    }
