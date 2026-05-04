"""
Kullanıcı (User) profil iş mantığı - profil, favoriler ve günlük kayıtlar.
"""
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import Recipe
from app.repositories import user_repository


TURKEY_TZ = timezone(timedelta(hours=3))

ACTIVITY_MULTIPLIERS = {
    "Hareketsiz": 1.2,
    "Az": 1.375,
    "Orta": 1.55,
    "Çok": 1.725,
    "Cok": 1.725,
    "Ekstra": 1.9,
}


def _calculate_daily_calorie(
    gender: str,
    weight_kg: float,
    height_cm: int,
    age: int,
    activity: str,
    objective: str,
) -> int:
    if gender == "Erkek":
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5
    else:
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161

    multiplier = 1.2
    for key, val in ACTIVITY_MULTIPLIERS.items():
        if key in activity:
            multiplier = val
            break

    daily_calorie = int(bmr * multiplier)

    if objective == "Kilo Vermek":
        daily_calorie -= 500
    elif objective == "Kilo Almak":
        daily_calorie += 500

    return daily_calorie


def get_profile(user_id: int, db: Session) -> dict:
    user = _ensure_user_exists(user_id, db)

    return {
        "name": user.name_surname,
        "age": user.age or "",
        "gender": user.gender or "Erkek",
        "height": user.height_cm or "",
        "weight": float(user.weight_kg) if user.weight_kg else "",
        "objective": user.objective or "Kilo Vermek",
        "meals": user.meals or "3",
        "activity": user.activity or "Hareketsiz (Az veya hiç egzersiz)",
        "daily_calorie": user.daily_calorie,
    }


def update_profile(
    user_id: int,
    age: int,
    gender: str,
    height_cm: int,
    weight_kg: float,
    objective: str,
    meals: int,
    activity: str,
    db: Session,
) -> dict:
    try:
        user = _ensure_user_exists(user_id, db)
        user.age = age
        user.gender = gender
        user.height_cm = height_cm
        user.weight_kg = weight_kg
        user.objective = objective
        user.meals = meals
        user.activity = activity

        daily_calorie = _calculate_daily_calorie(gender, weight_kg, height_cm, age, activity, objective)
        user.daily_calorie = daily_calorie

        db.commit()
        return {"message": "Profil güncellendi.", "daily_calorie": daily_calorie}
    except HTTPException:
        raise
    except Exception as exc:
        print(f"Update profile error: {exc}")
        raise HTTPException(status_code=500, detail="Profil güncellenirken bir hata oluştu.")


def get_favorites(user_id: int, db: Session) -> list[int]:
    _ensure_user_exists(user_id, db)
    favorites = user_repository.find_favorites_by_user(db, user_id)
    return [favorite.recipe_id for favorite in favorites]


def add_favorite(user_id: int, recipe_id: int, db: Session) -> dict:
    _ensure_user_exists(user_id, db)
    _ensure_recipe_exists(recipe_id, db)

    existing = user_repository.find_favorite(db, user_id, recipe_id)
    if existing:
        return {"message": "Tarif zaten favorilerde.", "recipe_id": recipe_id}

    user_repository.create_favorite(db, user_id, recipe_id)
    db.commit()
    return {"message": "Favorilere eklendi.", "recipe_id": recipe_id}


def remove_favorite(user_id: int, recipe_id: int, db: Session) -> dict:
    favorite = user_repository.find_favorite(db, user_id, recipe_id)
    if not favorite:
        raise HTTPException(status_code=404, detail="Favori kaydı bulunamadı.")

    db.delete(favorite)
    db.commit()
    return {"message": "Favorilerden kaldırıldı.", "recipe_id": recipe_id}


def get_daily_logs(user_id: int, db: Session) -> list[dict]:
    _ensure_user_exists(user_id, db)
    logs = user_repository.find_daily_logs_with_recipe(db, user_id)

    result = []
    for log, recipe in logs:
        eaten_at = None
        if log.logged_at:
            eaten_at = log.logged_at.isoformat()
        elif log.log_date:
            eaten_at = datetime.combine(log.log_date, datetime.min.time()).isoformat()

        multiplier = float(log.serving_multiplier) if log.serving_multiplier is not None else 1

        if log.protein_intake is not None:
            protein = float(log.protein_intake)
        else:
            protein = round((float(recipe.protein) if recipe.protein else 0) * multiplier, 2)

        if log.carbohydrate_intake is not None:
            carbohydrate = float(log.carbohydrate_intake)
        else:
            carbohydrate = round((float(recipe.carbohydrate) if recipe.carbohydrate else 0) * multiplier, 2)

        if log.fat_intake is not None:
            fat = float(log.fat_intake)
        else:
            fat = round((float(recipe.fat) if recipe.fat else 0) * multiplier, 2)

        result.append({
            "id": log.log_id,
            "recipeId": log.recipe_id,
            "name": recipe.recipe_name,
            "eatenAt": eaten_at,
            "mealType": log.meal_type or "Akşam Yemeği",
            "entrySource": log.entry_source or "daily",
            "servingCount": log.serving_count,
            "servingMultiplier": multiplier,
            "calorieIntake": float(log.calorie_intake) if log.calorie_intake is not None else 0,
            "protein": protein,
            "carbohydrate": carbohydrate,
            "fat": fat,
        })
    return result


def add_daily_log(
    user_id: int,
    recipe_id: int,
    meal_type: str,
    serving_count: int | None,
    serving_multiplier: float | None,
    db: Session,
    log_date: str | None = None,
    entry_source: str | None = "daily",
) -> dict:
    _ensure_user_exists(user_id, db)
    recipe = _ensure_recipe_exists(recipe_id, db)

    if log_date:
        from datetime import date

        target_date = date.fromisoformat(log_date)
        now = datetime.combine(target_date, datetime.now().time())
    else:
        now = _local_now()
        target_date = now.date()

    normalized_meal_type = _resolve_daily_meal_slot(
        user_id=user_id,
        requested_meal_type=_normalize_meal_type(meal_type),
        log_date=target_date,
        db=db,
    )

    original_serving = recipe.serving or 1
    resolved_serving_count = max(1, int(round(serving_count))) if serving_count else original_serving
    resolved_multiplier = (
        serving_multiplier
        if serving_multiplier and serving_multiplier > 0
        else (resolved_serving_count / original_serving)
    )
    adjusted_calorie = (float(recipe.calorie) if recipe.calorie is not None else 0) * resolved_multiplier
    adjusted_protein = (float(recipe.protein) if recipe.protein is not None else 0) * resolved_multiplier
    adjusted_carbohydrate = (float(recipe.carbohydrate) if recipe.carbohydrate is not None else 0) * resolved_multiplier
    adjusted_fat = (float(recipe.fat) if recipe.fat is not None else 0) * resolved_multiplier
    resolved_entry_source = (entry_source or "daily").strip().lower()

    log = user_repository.create_daily_log(
        db,
        user_id=user_id,
        recipe_id=recipe_id,
        log_date=now.date(),
        logged_at=now,
        meal_type=normalized_meal_type,
        entry_source=resolved_entry_source,
        calorie_intake=round(adjusted_calorie, 2),
        protein_intake=round(adjusted_protein, 2),
        carbohydrate_intake=round(adjusted_carbohydrate, 2),
        fat_intake=round(adjusted_fat, 2),
        serving_count=resolved_serving_count,
        serving_multiplier=round(resolved_multiplier, 2),
    )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Bugün için tüm öğün kayıtları dolu.")

    db.refresh(log)

    multiplier = float(log.serving_multiplier) if log.serving_multiplier is not None else 1

    return {
        "message": "Günlük kayda eklendi.",
        "log": {
            "id": log.log_id,
            "recipeId": log.recipe_id,
            "name": recipe.recipe_name,
            "eatenAt": now.isoformat(),
            "mealType": log.meal_type or "Akşam Yemeği",
            "entrySource": log.entry_source or "daily",
            "servingCount": log.serving_count,
            "servingMultiplier": multiplier,
            "calorieIntake": float(log.calorie_intake) if log.calorie_intake is not None else 0,
            "protein": float(log.protein_intake) if log.protein_intake is not None else round(adjusted_protein, 2),
            "carbohydrate": float(log.carbohydrate_intake) if log.carbohydrate_intake is not None else round(adjusted_carbohydrate, 2),
            "fat": float(log.fat_intake) if log.fat_intake is not None else round(adjusted_fat, 2),
        },
    }


def remove_daily_log(user_id: int, log_id: int, db: Session) -> dict:
    log = user_repository.find_daily_log(db, user_id, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Günlük kayıt bulunamadı.")

    db.delete(log)
    db.commit()
    return {"message": "Günlük kayıt silindi.", "log_id": log_id}


def update_daily_log(
    user_id: int,
    log_id: int,
    meal_type: str | None,
    serving_count: int | None,
    db: Session,
) -> dict:
    log = user_repository.find_daily_log(db, user_id, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı.")

    recipe = user_repository.find_recipe_by_id(db, log.recipe_id)

    if meal_type:
        log.meal_type = meal_type

    if serving_count is not None and serving_count > 0:
        log.serving_count = serving_count
        original_serving = recipe.serving or 1
        multiplier = serving_count / original_serving
        log.serving_multiplier = round(multiplier, 2)
        log.calorie_intake = round((float(recipe.calorie) if recipe.calorie else 0) * multiplier, 2)
        log.protein_intake = round((float(recipe.protein) if recipe.protein else 0) * multiplier, 2)
        log.carbohydrate_intake = round((float(recipe.carbohydrate) if recipe.carbohydrate else 0) * multiplier, 2)
        log.fat_intake = round((float(recipe.fat) if recipe.fat else 0) * multiplier, 2)

    db.commit()
    db.refresh(log)

    multiplier = float(log.serving_multiplier) if log.serving_multiplier is not None else 1

    return {
        "message": "Kayıt güncellendi.",
        "log": {
            "id": log.log_id,
            "recipeId": log.recipe_id,
            "name": recipe.recipe_name,
            "eatenAt": log.logged_at.isoformat() if log.logged_at else None,
            "mealType": log.meal_type,
            "entrySource": log.entry_source or "daily",
            "servingCount": log.serving_count,
            "servingMultiplier": multiplier,
            "calorieIntake": float(log.calorie_intake) if log.calorie_intake is not None else 0,
            "protein": float(log.protein_intake) if log.protein_intake is not None else round((float(recipe.protein) if recipe.protein else 0) * multiplier, 2),
            "carbohydrate": float(log.carbohydrate_intake) if log.carbohydrate_intake is not None else round((float(recipe.carbohydrate) if recipe.carbohydrate else 0) * multiplier, 2),
            "fat": float(log.fat_intake) if log.fat_intake is not None else round((float(recipe.fat) if recipe.fat else 0) * multiplier, 2),
        }
    }


# ─── Private Helpers ────────────────────────────────────────────────────────

def _ensure_user_exists(user_id: int, db: Session):
    user = user_repository.find_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    return user


def _ensure_recipe_exists(recipe_id: int, db: Session) -> Recipe:
    recipe = user_repository.find_recipe_by_id(db, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Tarif bulunamadı.")
    return recipe


def _normalize_meal_type(meal_type: str | None) -> str:
    value = (meal_type or "").strip().lower()
    mapping = {
        "kahvalti": "Kahvaltı",
        "kahvaltı": "Kahvaltı",
        "ogle": "Öğle Yemeği",
        "öğle": "Öğle Yemeği",
        "ogle yemegi": "Öğle Yemeği",
        "öğle yemeği": "Öğle Yemeği",
        "aksam": "Akşam Yemeği",
        "akşam": "Akşam Yemeği",
        "aksam yemegi": "Akşam Yemeği",
        "akşam yemeği": "Akşam Yemeği",
    }
    return mapping.get(value, "Akşam Yemeği")


def _resolve_daily_meal_slot(user_id: int, requested_meal_type: str, log_date, db: Session) -> str:
    meal_order = ["Kahvaltı", "Öğle Yemeği", "Akşam Yemeği"]
    used_meal_types = user_repository.find_daily_log_meal_types(db, user_id, log_date)

    if requested_meal_type not in used_meal_types:
        return requested_meal_type

    for meal_name in meal_order:
        if meal_name not in used_meal_types:
            return meal_name

    raise HTTPException(status_code=400, detail="Bugün için tüm öğün kayıtları dolu.")


def _local_now() -> datetime:
    return datetime.now(TURKEY_TZ).replace(tzinfo=None)
