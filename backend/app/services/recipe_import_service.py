"""
Scraper/import tarafindan gelen tarif verilerini uygulama katmaninda isler.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.repositories.recipe_repository import (
    create_recipe,
    find_recipe_by_name,
    find_recipe_by_source_url,
    replace_recipe_ingredients,
)
from app.services.ingredient_matching_service import (
    IngredientMatch,
    log_import_issue,
    log_unmatched_ingredient,
    match_ingredient,
    seed_default_ingredient_aliases,
    validate_recipe_ingredient_matches,
)


def _coerce_decimal(value):
    if value in (None, ""):
        return None
    try:
        normalized = str(value).strip().replace(",", ".")
        replacements = {
            "yarim": "0.5",
            "yarım": "0.5",
            "ceyrek": "0.25",
            "çeyrek": "0.25",
        }
        normalized = replacements.get(normalized.lower(), normalized)
        if " " in normalized and "/" in normalized:
            whole, fraction = normalized.split(" ", 1)
            numerator, denominator = fraction.split("/", 1)
            return float(whole) + (float(numerator) / float(denominator))
        if "/" in normalized:
            numerator, denominator = normalized.split("/", 1)
            return float(numerator) / float(denominator)
        if "-" in normalized:
            start, end = normalized.split("-", 1)
            return (float(start) + float(end)) / 2
        return float(normalized)
    except ValueError:
        return None


def _macro_for_storage(recipe_data: dict, key: str):
    value = _coerce_decimal(recipe_data.get(key))
    if value is None:
        return None

    source = (recipe_data.get("source") or "").strip().lower()
    if source in {"yemekcom", "yemekcom_diet"}:
        try:
            serving = int(recipe_data.get("serving") or 1)
        except (TypeError, ValueError):
            serving = 1
        if serving > 1:
            return value * serving

    return value


def save_scraped_recipe(db: Session, recipe_data: dict):
    recipe_name = (recipe_data.get("title") or "").strip()
    source_url = (recipe_data.get("source_url") or "").strip() or None
    source = (recipe_data.get("source") or "scraper").strip() or "scraper"

    if not recipe_name:
        raise ValueError("Recipe title is required.")

    recipe = None
    if source_url:
        recipe = find_recipe_by_source_url(db, source_url)
    if recipe is None:
        recipe = find_recipe_by_name(db, recipe_name)

    recipe_fields = {
        "recipe_name": recipe_name,
        "source": source,
        "source_url": source_url,
        "recipe_category": recipe_data.get("recipe_category"),
        "explanation": recipe_data.get("description") or recipe_data.get("category"),
        "preparation": recipe_data.get("instructions"),
        "cooking_type": recipe_data.get("cooking_type"),
        "cooking_method": recipe_data.get("cooking_method"),
        "total_time_minutes": recipe_data.get("total_time_minutes"),
        "serving": recipe_data.get("serving"),
        "calorie": _macro_for_storage(recipe_data, "calorie"),
        "protein": _macro_for_storage(recipe_data, "protein"),
        "carbohydrate": _macro_for_storage(recipe_data, "carbohydrate"),
        "fat": _macro_for_storage(recipe_data, "fat"),
        "image_url": recipe_data.get("image_url") or None,
    }

    created = recipe is None
    seed_default_ingredient_aliases(db)

    ingredient_rows: list[dict] = []
    seen_ingredient_ids: set[int] = set()
    unmatched_matches: list[IngredientMatch] = []
    raw_ingredients = recipe_data.get("ingredients") or []

    for ingredient_data in raw_ingredients:
        existing_ingredient_id = ingredient_data.get("ingredient_id")
        if existing_ingredient_id:
            if existing_ingredient_id in seen_ingredient_ids:
                continue

            seen_ingredient_ids.add(existing_ingredient_id)
            ingredient_rows.append(
                {
                    "ingredient_id": existing_ingredient_id,
                    "amount": _coerce_decimal(ingredient_data.get("amount")),
                    "unit": ((ingredient_data.get("unit") or "").strip()[:50] or None),
                }
            )
            continue

        raw_name = ingredient_data.get("name")
        if not raw_name:
            continue

        match = match_ingredient(db, raw_name)
        if not match.accepted:
            unmatched_matches.append(match)
            continue

        if match.ingredient.ingredient_id in seen_ingredient_ids:
            continue

        seen_ingredient_ids.add(match.ingredient.ingredient_id)
        ingredient_rows.append(
            {
                "ingredient_id": match.ingredient.ingredient_id,
                "amount": _coerce_decimal(ingredient_data.get("amount")),
                "unit": ((ingredient_data.get("unit") or "").strip()[:50] or None),
            }
        )

    is_valid, validation_error = validate_recipe_ingredient_matches(
        raw_count=len(raw_ingredients),
        matched_count=len(ingredient_rows),
        minimum_matched=3,
    )

    if not is_valid:
        log_import_issue(
            db,
            recipe_id=recipe.recipe_id if recipe else None,
            recipe_name=recipe_name,
            source_url=source_url,
            issue_type="incomplete_recipe",
            message=validation_error or "Recipe has too few matched ingredients.",
        )
        for unmatched in unmatched_matches:
            log_unmatched_ingredient(
                db,
                match=unmatched,
                recipe_id=recipe.recipe_id if recipe else None,
                recipe_name=recipe_name,
                source_url=source_url,
            )
        db.commit()
        raise ValueError(validation_error or "Recipe has too few matched ingredients.")

    if recipe is None:
        recipe = create_recipe(db, **recipe_fields)
    else:
        for field_name, field_value in recipe_fields.items():
            setattr(recipe, field_name, field_value)

    for unmatched in unmatched_matches:
        log_unmatched_ingredient(
            db,
            match=unmatched,
            recipe_id=recipe.recipe_id,
            recipe_name=recipe_name,
            source_url=source_url,
        )

    replace_recipe_ingredients(db, recipe.recipe_id, ingredient_rows)
    db.commit()
    db.refresh(recipe)
    return recipe, created
