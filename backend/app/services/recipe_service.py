"""
Tarif (Recipe) is mantigi - listeleme, detay, oneri motoru ve ozel tarif olusturma.
"""
from fastapi import HTTPException
from pathlib import Path
from uuid import uuid4

from sqlalchemy.orm import Session

from app.db.models import Recipe
from app.repositories import recipe_repository
from app.services.healthy_recipe_service import ensure_healthy_recipe_table
from app.services.ingredient_nutrition_service import ensure_ingredient_nutrition_table
from app.services.ingredient_resolver_service import resolve_ingredient_for_user
from app.utils.recipe_health import build_recipe_health_profile
from app.utils.recipe_helpers import (
    calculate_recipe_nutrition,
    ingredient_calories_per_100g,
    ingredient_carbs_per_100g,
    ingredient_fat_per_100g,
    ingredient_keys,
    ingredient_protein_per_100g,
    normalize_cooking_type_name,
    unit_to_grams,
)


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
                        "calories_per_100g": ingredient_calories_per_100g(item.ingredient),
                        "protein_per_100g": ingredient_protein_per_100g(item.ingredient),
                        "carbs_per_100g": ingredient_carbs_per_100g(item.ingredient),
                        "fat_per_100g": ingredient_fat_per_100g(item.ingredient),
                        "source": item.ingredient.source,
                        "nutrition_data_source": getattr(item.ingredient.nutrition_value, "data_source", None),
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

    if healthy_only:
        ensure_healthy_recipe_table(db)

    recipes = recipe_repository.get_all_recipes(
        db=db,
        user_id=user_id,
        ids=ids,
        source=source,
        recipe_category=recipe_category,
        healthy_only=healthy_only,
    )

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
    recipe = recipe_repository.find_recipe_by_id_with_relations(db, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Tarif bulunamadi.")

    user_profile = _get_user_profile(recipe.user_id, db)
    return serialize_recipe_detail(
        recipe,
        calorie_target=user_profile["daily_calorie"],
        meal_count=user_profile["meals"],
    )


class _ManualRequired(Exception):
    def __init__(self, name: str):
        self.name = name


async def _resolve_ingredients(db: Session, user_id: int, ingredients: list[dict]) -> list[dict]:
    resolved_items = []
    for ing in ingredients:
        if ing.get("ingredient_id"):
            ingredient = recipe_repository.find_ingredient_by_id(db, ing["ingredient_id"], user_id)
            if not ingredient:
                raise HTTPException(status_code=404, detail="Malzeme bulunamadi.")
            if not getattr(ingredient, "nutrition_value", None):
                result = await resolve_ingredient_for_user(db=db, user_id=user_id, ingredient_name=ingredient.ingredient_name, try_usda=True)
                if result.status == "manual_required":
                    raise _ManualRequired(ingredient.ingredient_name)
                ingredient = result.ingredient
        else:
            result = await resolve_ingredient_for_user(db=db, user_id=user_id, ingredient_name=ing.get("ingredient_name") or "", try_usda=True)
            if result.status == "manual_required":
                raise _ManualRequired(result.ingredient_name)
            ingredient = result.ingredient

        grams = unit_to_grams(ing.get("amount"), ing.get("unit"), ingredient.ingredient_name)
        resolved_items.append({"ingredient": ingredient, "amount": ing.get("amount"), "unit": ing.get("unit"), "grams": grams})
    return resolved_items


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
    if not recipe_repository.find_user_by_id(db, user_id):
        raise HTTPException(status_code=404, detail="Kullanici bulunamadi.")
    if not name.strip():
        raise HTTPException(status_code=400, detail="Tarif adi zorunludur.")
    if not ingredients:
        raise HTTPException(status_code=400, detail="En az bir malzeme eklemelisiniz.")

    ensure_ingredient_nutrition_table(db)
    try:
        resolved_items = await _resolve_ingredients(db, user_id, ingredients)

        totals = calculate_recipe_nutrition(resolved_items)
        new_recipe = recipe_repository.create_recipe(
            db=db,
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

        ingredient_rows = [
            {
                "ingredient_id": item["ingredient"].ingredient_id,
                "amount": item["amount"],
                "unit": item["unit"],
                "miktar_gram": item["grams"],
                "donusum_kaynagi": "custom_recipe_default_unit",
                "donusum_guveni": "medium" if item["grams"] is not None else "low",
                "donusum_notu": "Kullanici tarif ekleme akisi icin basit varsayilan donusum.",
            }
            for item in resolved_items
        ]
        recipe_repository.replace_recipe_ingredients(db, new_recipe.recipe_id, ingredient_rows)
        db.flush()
        recipe_with_relations = recipe_repository.find_recipe_by_id_with_relations(db, new_recipe.recipe_id)
        if recipe_with_relations:
            health_profile = build_recipe_health_profile(recipe_with_relations)
            new_recipe.health_score = health_profile.get("health_score")
            new_recipe.health_grade = health_profile.get("health_grade")
            new_recipe.health_explanation = health_profile.get("health_summary")

        db.commit()
        db.refresh(new_recipe)
        return {
            "status": "success",
            "message": "Tarif eklendi.",
            "recipe_id": new_recipe.recipe_id,
            "nutrition": totals,
        }
    except _ManualRequired as exc:
        db.rollback()
        return {"status": "manual_required", "ingredient_name": exc.name}
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
    recipe = recipe_repository.find_recipe_by_id(db, recipe_id)
    if not recipe or recipe.user_id != user_id:
        raise HTTPException(status_code=404, detail="Tarif bulunamadi veya bu tarif size ait degil.")
    if not name.strip():
        raise HTTPException(status_code=400, detail="Tarif adi zorunludur.")
    if not ingredients:
        raise HTTPException(status_code=400, detail="En az bir malzeme eklemelisiniz.")

    ensure_ingredient_nutrition_table(db)
    try:
        resolved_items = await _resolve_ingredients(db, user_id, ingredients)
        totals = calculate_recipe_nutrition(resolved_items)
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

        ingredient_rows = [
            {
                "ingredient_id": item["ingredient"].ingredient_id,
                "amount": item["amount"],
                "unit": item["unit"],
                "miktar_gram": item["grams"],
                "donusum_kaynagi": "custom_recipe_default_unit",
                "donusum_guveni": "medium" if item["grams"] is not None else "low",
                "donusum_notu": "Kullanici tarif duzenleme akisi icin basit varsayilan donusum.",
            }
            for item in resolved_items
        ]
        recipe_repository.replace_recipe_ingredients(db, recipe_id, ingredient_rows)

        db.commit()
        return {"status": "success", "message": "Tarif guncellendi.", "recipe_id": recipe_id, "nutrition": totals}
    except _ManualRequired as exc:
        db.rollback()
        return {"status": "manual_required", "ingredient_name": exc.name}
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Tarif guncellenirken bir hata olustu.") from exc


def delete_custom_recipe(user_id: int, recipe_id: int, db: Session) -> dict:
    recipe = recipe_repository.find_recipe_by_id(db, recipe_id)
    if not recipe or recipe.user_id != user_id:
        raise HTTPException(status_code=404, detail="Tarif bulunamadi veya bu tarif size ait degil.")

    recipe_repository.delete_recipe(db, recipe)
    db.commit()
    return {"status": "success", "message": "Tarif silindi."}


async def upload_recipe_image(user_id: int, recipe_id: int, upload_file, db: Session) -> dict:
    recipe = recipe_repository.find_recipe_by_id(db, recipe_id)
    if not recipe or recipe.user_id != user_id:
        raise HTTPException(status_code=404, detail="Tarif bulunamadi veya bu tarif size ait degil.")

    if upload_file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="Sadece jpeg, png veya webp yukleyebilirsiniz.")

    content = await upload_file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Resim boyutu en fazla 5 MB olabilir.")

    try:
        from io import BytesIO
        from PIL import Image

        image = Image.open(BytesIO(content))
        image.thumbnail((1200, 1200))
        if image.mode not in {"RGB", "L"}:
            image = image.convert("RGB")

        upload_dir = Path(__file__).resolve().parents[2] / "uploads" / "recipe_images"
        upload_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid4().hex}.jpg"
        output_path = upload_dir / filename
        image.save(output_path, format="JPEG", quality=85, optimize=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Resim islenemedi.") from exc

    recipe.image_url = f"/uploads/recipe_images/{filename}"
    db.commit()
    return {"status": "success", "image_url": recipe.image_url}


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
    cooking_type_filters = {normalize_cooking_type_name(item) for item in cooking_types if item}

    if not available_ids:
        return []

    ingredient_ids = list(available_ids | disliked_ids)
    ingredient_index = {}
    if ingredient_ids:
        ingredient_index = {
            ingredient.ingredient_id: ingredient.ingredient_name
            for ingredient in recipe_repository.get_ingredients_by_ids(db, ingredient_ids)
        }

    selected_keys_by_id = {
        ingredient_id: ingredient_keys(ingredient_index.get(ingredient_id, ""))
        for ingredient_id in selected_ids
    }
    pantry_keys_by_id = {
        ingredient_id: ingredient_keys(ingredient_index.get(ingredient_id, ""))
        for ingredient_id in pantry_only_ids
    }
    disliked_keys = {
        key
        for ingredient_id in disliked_ids
        for key in ingredient_keys(ingredient_index.get(ingredient_id, ""))
    }

    user_profile = _get_user_profile(user_id, db)
    
    if healthy_only:
        ensure_healthy_recipe_table(db)

    recipes = recipe_repository.get_all_recipes(
        db=db,
        user_id=user_id,
        source=source,
        healthy_only=healthy_only,
    )

    results = []
    for recipe in recipes:
        if cooking_type_filters and normalize_cooking_type_name(recipe.cooking_type) not in cooking_type_filters:
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
            item_keys = ingredient_keys(item.ingredient.ingredient_name)

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
    user = recipe_repository.find_user_by_id(db, user_id)
    if not user:
        return {"daily_calorie": None, "meals": None}
    return {"daily_calorie": user.daily_calorie, "meals": user.meals}
