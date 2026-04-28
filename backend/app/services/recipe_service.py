"""
Tarif (Recipe) is mantigi - listeleme, detay, oneri motoru ve ozel tarif olusturma.
"""
import re
import unicodedata

from fastapi import HTTPException
from sqlalchemy.orm import Session, selectinload

from app.db.models import (
    HealthyRecipe,
    Ingredient,
    Recipe,
    RecipeIngredient,
    User,
)
from app.services.healthy_recipe_service import ensure_healthy_recipe_table
from app.services.ingredient_resolver_service import resolve_ingredient_for_user
from app.services.ingredient_nutrition_service import ensure_ingredient_nutrition_table
from app.utils.helpers import normalize_ingredient_name
from app.utils.recipe_health import build_recipe_health_profile


def serialize_recipe_summary(
    recipe: Recipe,
    calorie_target: float | None = None,
    meal_count: int | None = None,
) -> dict:
    health_profile = build_recipe_health_profile(
        recipe,
        calorie_target=calorie_target,
        meal_count=meal_count,
    )
    return {
        "id": recipe.recipe_id,
        "name": recipe.recipe_name,
        "recipe_category": recipe.recipe_category,
        "explanation": recipe.explanation,
        "preparation": recipe.preparation,
        "cooking_type": recipe.cooking_type,
        "cooking_method": recipe.cooking_method,
        "total_time_minutes": recipe.total_time_minutes,
        "serving": recipe.serving,
        "calorie": float(recipe.calorie) if recipe.calorie is not None else None,
        "protein": float(recipe.protein) if recipe.protein is not None else None,
        "carbohydrate": float(recipe.carbohydrate) if recipe.carbohydrate is not None else None,
        "fat": float(recipe.fat) if recipe.fat is not None else None,
        "image_url": recipe.image_url,
        "user_id": recipe.user_id,
        "ingredient_ids": [
            item.ingredient_id
            for item in sorted(recipe.ingredients, key=lambda link: link.recipe_ingredient_id)
        ],
        **health_profile,
    }


def serialize_recipe_detail(
    recipe: Recipe,
    calorie_target: float | None = None,
    meal_count: int | None = None,
) -> dict:
    ingredient_rows = sorted(recipe.ingredients, key=lambda item: item.recipe_ingredient_id)
    return {
        **serialize_recipe_summary(recipe, calorie_target=calorie_target, meal_count=meal_count),
        "ingredients": [
            {
                "id": item.ingredient.ingredient_id,
                "name": item.ingredient.ingredient_name,
                "amount": float(item.amount) if item.amount is not None else None,
                "unit": item.unit,
                "nutrition": (
                    {
                        "calories_per_100g": _ingredient_calories_per_100g(item.ingredient),
                        "protein_per_100g": _ingredient_protein_per_100g(item.ingredient),
                        "carbs_per_100g": _ingredient_carbs_per_100g(item.ingredient),
                        "fat_per_100g": _ingredient_fat_per_100g(item.ingredient),
                        "source": item.ingredient.source,
                        "is_verified": bool(item.ingredient.is_verified),
                    }
                    if item.ingredient
                    else None
                ),
            }
            for item in ingredient_rows
        ],
    }


def get_recipes(
    user_id: int | None,
    ids: list[int] | None,
    source: str | None,
    recipe_category: str | None,
    healthy_only: bool,
    db: Session,
) -> list[dict]:
    ensure_ingredient_nutrition_table(db)
    user_profile = _get_user_profile(user_id, db)

    query = db.query(Recipe).options(
        selectinload(Recipe.ingredients)
        .selectinload(RecipeIngredient.ingredient)
        .selectinload(Ingredient.nutrition_value)
    )
    query = query.filter((Recipe.user_id.is_(None)) | (Recipe.user_id == user_id))

    if healthy_only:
        ensure_healthy_recipe_table(db)
        query = query.join(HealthyRecipe, HealthyRecipe.recipe_id == Recipe.recipe_id)

    if ids:
        query = query.filter(Recipe.recipe_id.in_(ids))
    if source:
        query = query.filter(Recipe.source == source)
    if recipe_category:
        query = query.filter(Recipe.recipe_category == recipe_category)

    recipes = query.order_by(Recipe.recipe_name.asc()).all()
    return [
        serialize_recipe_summary(
            recipe,
            calorie_target=user_profile["daily_calorie"],
            meal_count=user_profile["meals"],
        )
        for recipe in recipes
    ]


def get_recipe_detail(recipe_id: int, db: Session) -> dict:
    ensure_ingredient_nutrition_table(db)
    recipe = (
        db.query(Recipe)
        .options(
            selectinload(Recipe.ingredients)
            .selectinload(RecipeIngredient.ingredient)
            .selectinload(Ingredient.nutrition_value)
        )
        .filter(Recipe.recipe_id == recipe_id)
        .first()
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Tarif bulunamadi.")

    user_profile = _get_user_profile(recipe.user_id, db)
    return serialize_recipe_detail(
        recipe,
        calorie_target=user_profile["daily_calorie"],
        meal_count=user_profile["meals"],
    )


async def create_custom_recipe(
    user_id: int,
    name: str,
    explanation: str | None,
    preparation: str | None,
    recipe_category: str | None,
    cooking_type: str | None,
    cooking_method: str | None,
    serving: int | None,
    calorie: float | None,
    image_url: str | None,
    ingredients: list[dict],
    db: Session,
) -> dict:
    if not db.query(User).filter(User.user_id == user_id).first():
        raise HTTPException(status_code=404, detail="Kullanici bulunamadi.")
    if not name.strip():
        raise HTTPException(status_code=400, detail="Tarif adi zorunludur.")
    if not ingredients:
        raise HTTPException(status_code=400, detail="En az bir malzeme eklemelisiniz.")

    ensure_ingredient_nutrition_table(db)
    resolved_items = []
    try:
        for ing in ingredients:
            ingredient = None
            if ing.get("ingredient_id"):
                ingredient = (
                    db.query(Ingredient)
                    .filter(
                        Ingredient.ingredient_id == ing["ingredient_id"],
                        (Ingredient.user_id == user_id) | Ingredient.user_id.is_(None),
                    )
                    .first()
                )
                if not ingredient:
                    raise HTTPException(status_code=404, detail="Malzeme bulunamadi.")
                if not getattr(ingredient, "nutrition_value", None):
                    resolve_result = await resolve_ingredient_for_user(
                        db=db,
                        user_id=user_id,
                        ingredient_name=ingredient.ingredient_name,
                        try_usda=True,
                    )
                    if resolve_result.status == "manual_required":
                        db.rollback()
                        return {
                            "status": "manual_required",
                            "ingredient_name": ingredient.ingredient_name,
                        }
                    ingredient = resolve_result.ingredient
            else:
                resolve_result = await resolve_ingredient_for_user(
                    db=db,
                    user_id=user_id,
                    ingredient_name=ing.get("ingredient_name") or "",
                    try_usda=True,
                )
                if resolve_result.status == "manual_required":
                    db.rollback()
                    return {
                        "status": "manual_required",
                        "ingredient_name": resolve_result.ingredient_name,
                    }
                ingredient = resolve_result.ingredient

            grams = _unit_to_grams(ing.get("amount"), ing.get("unit"), ingredient.ingredient_name)
            resolved_items.append({"ingredient": ingredient, "amount": ing.get("amount"), "unit": ing.get("unit"), "grams": grams})

        totals = _calculate_recipe_nutrition(resolved_items)
        new_recipe = Recipe(
            recipe_name=name,
            recipe_category=recipe_category,
            explanation=explanation,
            preparation=preparation,
            cooking_type=cooking_type,
            cooking_method=cooking_method,
            total_time_minutes=None,
            serving=serving,
            calorie=round(totals["calorie"], 2) if totals["calorie"] else calorie,
            protein=round(totals["protein"], 2),
            carbohydrate=round(totals["carbohydrate"], 2),
            fat=round(totals["fat"], 2),
            image_url=image_url,
            source="custom",
            user_id=user_id,
        )
        db.add(new_recipe)
        db.flush()

        for item in resolved_items:
            db.add(
                RecipeIngredient(
                    recipe_id=new_recipe.recipe_id,
                    ingredient_id=item["ingredient"].ingredient_id,
                    amount=item["amount"],
                    unit=item["unit"],
                    miktar_gram=item["grams"],
                    donusum_kaynagi="custom_recipe_default_unit",
                    donusum_guveni="medium" if item["grams"] is not None else "low",
                    donusum_notu="Kullanici tarif ekleme akisi icin basit varsayilan donusum.",
                )
            )

        db.commit()
        db.refresh(new_recipe)
        return {
            "status": "success",
            "message": "Tarif eklendi.",
            "recipe_id": new_recipe.recipe_id,
            "nutrition": totals,
        }
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Tarif kaydedilirken bir hata olustu.") from exc


async def update_custom_recipe(
    user_id: int,
    recipe_id: int,
    name: str,
    explanation: str | None,
    preparation: str | None,
    recipe_category: str | None,
    cooking_type: str | None,
    cooking_method: str | None,
    serving: int | None,
    calorie: float | None,
    image_url: str | None,
    ingredients: list[dict],
    db: Session,
) -> dict:
    recipe = db.query(Recipe).filter(Recipe.recipe_id == recipe_id, Recipe.user_id == user_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Tarif bulunamadi veya bu tarif size ait degil.")
    if not name.strip():
        raise HTTPException(status_code=400, detail="Tarif adi zorunludur.")
    if not ingredients:
        raise HTTPException(status_code=400, detail="En az bir malzeme eklemelisiniz.")

    ensure_ingredient_nutrition_table(db)
    resolved_items = []
    try:
        for ing in ingredients:
            ingredient = None
            if ing.get("ingredient_id"):
                ingredient = (
                    db.query(Ingredient)
                    .filter(
                        Ingredient.ingredient_id == ing["ingredient_id"],
                        (Ingredient.user_id == user_id) | Ingredient.user_id.is_(None),
                    )
                    .first()
                )
                if not ingredient:
                    raise HTTPException(status_code=404, detail="Malzeme bulunamadi.")
                if not getattr(ingredient, "nutrition_value", None):
                    resolve_result = await resolve_ingredient_for_user(
                        db=db,
                        user_id=user_id,
                        ingredient_name=ingredient.ingredient_name,
                        try_usda=True,
                    )
                    if resolve_result.status == "manual_required":
                        db.rollback()
                        return {"status": "manual_required", "ingredient_name": ingredient.ingredient_name}
                    ingredient = resolve_result.ingredient
            else:
                resolve_result = await resolve_ingredient_for_user(
                    db=db,
                    user_id=user_id,
                    ingredient_name=ing.get("ingredient_name") or "",
                    try_usda=True,
                )
                if resolve_result.status == "manual_required":
                    db.rollback()
                    return {"status": "manual_required", "ingredient_name": resolve_result.ingredient_name}
                ingredient = resolve_result.ingredient

            grams = _unit_to_grams(ing.get("amount"), ing.get("unit"), ingredient.ingredient_name)
            resolved_items.append({"ingredient": ingredient, "amount": ing.get("amount"), "unit": ing.get("unit"), "grams": grams})

        totals = _calculate_recipe_nutrition(resolved_items)
        recipe.recipe_name = name
        recipe.recipe_category = recipe_category
        recipe.explanation = explanation
        recipe.preparation = preparation
        recipe.cooking_type = cooking_type
        recipe.cooking_method = cooking_method
        recipe.serving = serving
        recipe.calorie = round(totals["calorie"], 2) if totals["calorie"] else calorie
        recipe.protein = round(totals["protein"], 2)
        recipe.carbohydrate = round(totals["carbohydrate"], 2)
        recipe.fat = round(totals["fat"], 2)
        recipe.image_url = image_url

        db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe_id).delete()
        for item in resolved_items:
            db.add(
                RecipeIngredient(
                    recipe_id=recipe_id,
                    ingredient_id=item["ingredient"].ingredient_id,
                    amount=item["amount"],
                    unit=item["unit"],
                    miktar_gram=item["grams"],
                    donusum_kaynagi="custom_recipe_default_unit",
                    donusum_guveni="medium" if item["grams"] is not None else "low",
                    donusum_notu="Kullanici tarif duzenleme akisi icin basit varsayilan donusum.",
                )
            )

        db.commit()
        return {"status": "success", "message": "Tarif guncellendi.", "recipe_id": recipe_id, "nutrition": totals}
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Tarif guncellenirken bir hata olustu.") from exc


def delete_custom_recipe(user_id: int, recipe_id: int, db: Session) -> dict:
    recipe = db.query(Recipe).filter(Recipe.recipe_id == recipe_id, Recipe.user_id == user_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Tarif bulunamadi veya bu tarif size ait degil.")

    db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe_id).delete()
    from app.db.models import DailyLog, Favorite

    db.query(Favorite).filter(Favorite.recipe_id == recipe_id).delete()
    db.query(DailyLog).filter(DailyLog.recipe_id == recipe_id).delete()
    db.delete(recipe)
    db.commit()
    return {"status": "success", "message": "Tarif silindi."}


def get_recommendations(
    selected_ingredient_ids: list[int],
    pantry_ingredient_ids: list[int],
    disliked_ingredient_ids: list[int],
    cooking_types: list[str],
    exclude_disliked: bool,
    user_id: int | None,
    source: str | None,
    healthy_only: bool,
    db: Session,
) -> list[dict]:
    ensure_ingredient_nutrition_table(db)
    selected_ids = set(selected_ingredient_ids)
    pantry_ids = set(pantry_ingredient_ids)
    pantry_only_ids = pantry_ids - selected_ids
    disliked_ids = set(disliked_ingredient_ids) if exclude_disliked else set()
    available_ids = selected_ids | pantry_ids
    cooking_type_filters = {_normalize_cooking_type_name(item) for item in cooking_types if item}

    if not available_ids:
        return []

    ingredient_ids = list(available_ids | disliked_ids)
    ingredient_index = {}
    if ingredient_ids:
        ingredient_index = {
            ingredient.ingredient_id: ingredient.ingredient_name
            for ingredient in db.query(Ingredient).filter(Ingredient.ingredient_id.in_(ingredient_ids)).all()
        }

    selected_keys_by_id = {
        ingredient_id: _ingredient_keys(ingredient_index.get(ingredient_id, ""))
        for ingredient_id in selected_ids
    }
    pantry_keys_by_id = {
        ingredient_id: _ingredient_keys(ingredient_index.get(ingredient_id, ""))
        for ingredient_id in pantry_only_ids
    }
    disliked_keys = {
        key
        for ingredient_id in disliked_ids
        for key in _ingredient_keys(ingredient_index.get(ingredient_id, ""))
    }

    user_profile = _get_user_profile(user_id, db)
    recipes = (
        db.query(Recipe)
        .options(
            selectinload(Recipe.ingredients)
            .selectinload(RecipeIngredient.ingredient)
            .selectinload(Ingredient.nutrition_value)
        )
        .filter((Recipe.user_id.is_(None)) | (Recipe.user_id == user_id))
    )
    if healthy_only:
        ensure_healthy_recipe_table(db)
        recipes = recipes.join(HealthyRecipe, HealthyRecipe.recipe_id == Recipe.recipe_id)
    if source:
        recipes = recipes.filter(Recipe.source == source)
    recipes = recipes.all()

    results = []
    for recipe in recipes:
        if cooking_type_filters and _normalize_cooking_type_name(recipe.cooking_type) not in cooking_type_filters:
            continue

        ingredient_links = sorted(recipe.ingredients, key=lambda item: item.recipe_ingredient_id)
        if not ingredient_links:
            continue

        matched_links = []
        missing_links = []
        disliked_links = []
        matched_selected_input_ids: set[int] = set()
        matched_pantry_input_ids: set[int] = set()

        for item in ingredient_links:
            item_keys = _ingredient_keys(item.ingredient.ingredient_name)

            selected_match = False
            pantry_match = False

            for ingredient_id, keys in selected_keys_by_id.items():
                if keys and item_keys & keys:
                    matched_selected_input_ids.add(ingredient_id)
                    selected_match = True

            for ingredient_id, keys in pantry_keys_by_id.items():
                if keys and item_keys & keys:
                    matched_pantry_input_ids.add(ingredient_id)
                    pantry_match = True

            if selected_match or pantry_match:
                matched_links.append(item)
            else:
                missing_links.append(item)

            if item_keys & disliked_keys:
                disliked_links.append(item)

        if not matched_links:
            continue

        if exclude_disliked and disliked_links:
            continue

        selected_hit_count = len(matched_selected_input_ids)
        pantry_hit_count = len(matched_pantry_input_ids)
        matched_count = len(matched_links)
        missing_count = len(missing_links)
        disliked_count = len(disliked_links)
        total_count = len(ingredient_links)
        recipe_match_ratio = matched_count / total_count if total_count else 0

        selected_score = (selected_hit_count / len(selected_ids)) * 75 if selected_ids else 0
        pantry_score = (pantry_hit_count / len(pantry_only_ids)) * 15 if pantry_only_ids else 0
        recipe_bonus = min(10, recipe_match_ratio * 20)
        matched_bonus = min(10, matched_count * 2)
        disliked_penalty = disliked_count * 35

        score = selected_score + pantry_score + recipe_bonus + matched_bonus - disliked_penalty
        score = round(max(5 if matched_count else 0, min(100, score)))

        reasons = []
        if selected_hit_count:
            reasons.append(f"{selected_hit_count} secili malzeme eslesti")
        if pantry_hit_count:
            reasons.append(f"{pantry_hit_count} dolap malzemesi eslesti")
        if missing_count:
            reasons.append(f"{missing_count} tarif malzemesi eksik")
        if disliked_count:
            reasons.append("Sevilmeyen malzeme iceriyor")

        results.append({
            **serialize_recipe_summary(
                recipe,
                calorie_target=user_profile["daily_calorie"],
                meal_count=user_profile["meals"],
            ),
            "score": score,
            "matched_ingredients": [
                {"id": item.ingredient.ingredient_id, "name": item.ingredient.ingredient_name}
                for item in matched_links
            ],
            "missing_ingredients": [
                {"id": item.ingredient.ingredient_id, "name": item.ingredient.ingredient_name}
                for item in missing_links
            ],
            "disliked_ingredients": [
                {"id": item.ingredient.ingredient_id, "name": item.ingredient.ingredient_name}
                for item in disliked_links
            ],
            "reason": ", ".join(reasons),
        })

    results.sort(
        key=lambda item: (
            item["score"],
            len(item["matched_ingredients"]),
            -len(item["missing_ingredients"]),
            item["name"],
        ),
        reverse=True,
    )
    return results


def _get_user_profile(user_id: int | None, db: Session) -> dict:
    if not user_id:
        return {"daily_calorie": None, "meals": None}
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        return {"daily_calorie": None, "meals": None}
    return {"daily_calorie": user.daily_calorie, "meals": user.meals}


def _ingredient_keys(value: str) -> set[str]:
    canonical = _ascii_fold(normalize_ingredient_name(value or ""))
    if not canonical:
        return set()

    return {
        f"exact:{canonical}",
        f"exact:{canonical.replace(' ', '')}",
    }


def _ascii_fold(value: str) -> str:
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


def _normalize_cooking_type_name(value: str | None) -> str | None:
    if not value:
        return None
    normalized = _ascii_fold(value)
    if "firin" in normalized:
        return "firin"
    if "tava" in normalized:
        return "tava"
    if "tencere" in normalized:
        return "tencere"
    return normalized


def _unit_to_grams(amount, unit: str | None, ingredient_name: str | None = None) -> float | None:
    if amount is None:
        return None
    try:
        amount_value = float(amount)
    except (TypeError, ValueError):
        return None
    if amount_value <= 0:
        return None

    normalized_unit = _ascii_fold(unit or "g")
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
    multiplier = _piece_gram_for_ingredient(ingredient_name) if normalized_unit in {"adet", "tane"} else unit_map.get(normalized_unit)
    if multiplier is None:
        return None
    return round(amount_value * multiplier, 2)


def _piece_gram_for_ingredient(ingredient_name: str | None) -> float:
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


def _calculate_recipe_nutrition(items: list[dict]) -> dict:
    totals = {"calorie": 0.0, "protein": 0.0, "carbohydrate": 0.0, "fat": 0.0}
    for item in items:
        grams = item.get("grams")
        ingredient = item.get("ingredient")
        if grams is None or not ingredient:
            continue
        totals["calorie"] += _ingredient_calories_per_100g(ingredient) * grams / 100
        totals["protein"] += _ingredient_protein_per_100g(ingredient) * grams / 100
        totals["carbohydrate"] += _ingredient_carbs_per_100g(ingredient) * grams / 100
        totals["fat"] += _ingredient_fat_per_100g(ingredient) * grams / 100
    return {key: round(value, 2) for key, value in totals.items()}


def _ingredient_calories_per_100g(ingredient: Ingredient) -> float:
    nutrition = getattr(ingredient, "nutrition_value", None)
    if nutrition:
        return float(nutrition.calories_per_100g or 0)
    return float(getattr(ingredient, "calorie_per_100g", 0) or 0)


def _ingredient_protein_per_100g(ingredient: Ingredient) -> float:
    nutrition = getattr(ingredient, "nutrition_value", None)
    if nutrition:
        return float(nutrition.protein_per_100g or 0)
    return float(getattr(ingredient, "protein_per_100g", 0) or 0)


def _ingredient_carbs_per_100g(ingredient: Ingredient) -> float:
    nutrition = getattr(ingredient, "nutrition_value", None)
    if nutrition:
        return float(nutrition.carbs_per_100g or 0)
    return float(getattr(ingredient, "carbohydrate_per_100g", 0) or 0)


def _ingredient_fat_per_100g(ingredient: Ingredient) -> float:
    nutrition = getattr(ingredient, "nutrition_value", None)
    if nutrition:
        return float(nutrition.fat_per_100g or 0)
    return float(getattr(ingredient, "fat_per_100g", 0) or 0)
