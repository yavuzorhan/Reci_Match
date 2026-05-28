"""Ingredient nutrition sync and lookup logic."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.db.database import ensure_ingredient_inline_nutrition_columns
from app.db.models import Ingredient
from app.services.nutrition_resolver_service import NUTRITION_FIELDS


def ensure_ingredient_columns(db: Session) -> None:
    ensure_ingredient_inline_nutrition_columns(db)


def get_ingredient_nutrition(ingredient_id: int, db: Session) -> dict | None:
    ensure_ingredient_columns(db)
    ingredient = db.query(Ingredient).filter(Ingredient.ingredient_id == ingredient_id).first()
    if not ingredient:
        return None
    return {
        "mapping": None,
        "nutrition": serialize_ingredient_nutrition(ingredient),
    }


async def sync_ingredient_nutrition_from_gemini(ingredient_id: int, db: Session) -> dict:
    ensure_ingredient_columns(db)
    ingredient = db.query(Ingredient).filter(Ingredient.ingredient_id == ingredient_id).first()
    if not ingredient:
        raise ValueError("Ingredient not found.")

    from app.services.ingredient_resolver_service import ensure_nutrition_for_ingredient

    result = await ensure_nutrition_for_ingredient(
        db=db,
        ingredient=ingredient,
        query_name=ingredient.ingredient_name,
        try_ai=True,
    )
    if result.status != "resolved":
        return {"result": {"status": "manual_required"}, "mapping": None, "nutrition": None}

    db.commit()
    db.refresh(ingredient)
    return {
        "result": {"status": "completed"},
        "mapping": None,
        "nutrition": serialize_ingredient_nutrition(ingredient),
    }


async def complete_missing_ingredient_nutrition(
    limit: int,
    db: Session,
    include_user_ingredients: bool = True,
) -> dict:
    ensure_ingredient_columns(db)

    query = (
        db.query(Ingredient)
        .filter(Ingredient.calorie_per_100g <= 0)
        .order_by(Ingredient.ingredient_id.asc())
    )
    if not include_user_ingredients:
        query = query.filter(Ingredient.user_id.is_(None))

    ingredients = query.limit(max(1, min(limit, 500))).all()
    report = {
        "checked": len(ingredients),
        "completed": [],
        "manual_required": [],
    }

    from app.services.ingredient_resolver_service import ensure_nutrition_for_ingredient

    for ingredient in ingredients:
        try:
            result = await ensure_nutrition_for_ingredient(
                db=db,
                ingredient=ingredient,
                query_name=ingredient.ingredient_name,
                try_ai=True,
            )
            if result.status == "resolved":
                db.commit()
                db.refresh(ingredient)
                report["completed"].append(
                    {
                        "ingredient_id": ingredient.ingredient_id,
                        "ingredient_name": ingredient.ingredient_name,
                    }
                )
            else:
                db.rollback()
                report["manual_required"].append(
                    {
                        "ingredient_id": ingredient.ingredient_id,
                        "ingredient_name": ingredient.ingredient_name,
                    }
                )
        except Exception as exc:
            db.rollback()
            report["manual_required"].append(
                {
                    "ingredient_id": ingredient.ingredient_id,
                    "ingredient_name": ingredient.ingredient_name,
                    "reason": str(exc),
                }
            )

    report["summary"] = {
        "Checked": report["checked"],
        "Completed": len(report["completed"]),
        "Manual required": len(report["manual_required"]),
    }
    return report


def serialize_ingredient_nutrition(ingredient: Ingredient) -> dict:
    nutrition = {field: _as_float(getattr(ingredient, field, None)) for field in NUTRITION_FIELDS}
    nutrition.update(
        {
            "ingredient_id": ingredient.ingredient_id,
            "calories_per_100g": nutrition["calorie_per_100g"],
            "carbs_per_100g": nutrition["carbohydrate_per_100g"],
            "source": ingredient.nutrition_source,
            "confidence_score": _as_float(ingredient.nutrition_confidence),
        }
    )
    return nutrition


def _as_float(value) -> float | None:
    return float(value) if value is not None else None
