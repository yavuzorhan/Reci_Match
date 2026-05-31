import logging
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import Recipe
from app.repositories import user_repository
from app.utils.recipe_health import recipe_macro_values_per_serving


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
        logging.error("Update profile error: %s", exc)
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

        recipe_macros = _recipe_macros_per_serving(recipe)

        if log.protein_intake is not None:
            protein = float(log.protein_intake)
        else:
            protein = round(recipe_macros["protein"] * multiplier, 2)

        if log.carbohydrate_intake is not None:
            carbohydrate = float(log.carbohydrate_intake)
        else:
            carbohydrate = round(recipe_macros["carbohydrate"] * multiplier, 2)

        if log.fat_intake is not None:
            fat = float(log.fat_intake)
        else:
            fat = round(recipe_macros["fat"] * multiplier, 2)

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


def get_daily_log_totals(user_id: int, log_date: str | None, db: Session) -> dict:
    logs = get_daily_logs(user_id, db)
    if log_date:
        try:
            target_date = date.fromisoformat(str(log_date).split("T")[0])
        except ValueError:
            raise HTTPException(status_code=400, detail="Geçersiz günlük kayıt tarihi.")
    else:
        target_date = _local_now().date()

    totals = {"calories": 0.0, "protein": 0.0, "carbohydrate": 0.0, "fat": 0.0}
    count = 0
    for log in logs:
        eaten_at = log.get("eatenAt")
        if not eaten_at:
            continue
        try:
            eaten_date = date.fromisoformat(str(eaten_at).split("T")[0])
        except ValueError:
            continue
        if eaten_date != target_date:
            continue
        count += 1
        totals["calories"] += float(log.get("calorieIntake") or 0)
        totals["protein"] += float(log.get("protein") or 0)
        totals["carbohydrate"] += float(log.get("carbohydrate") or 0)
        totals["fat"] += float(log.get("fat") or 0)

    return {
        "date": target_date.isoformat(),
        "log_count": count,
        "calories": round(totals["calories"], 2),
        "protein": round(totals["protein"], 2),
        "carbohydrate": round(totals["carbohydrate"], 2),
        "fat": round(totals["fat"], 2),
    }


def add_daily_log(
    user_id: int,
    recipe_id: int,
    meal_type: str,
    serving_count: int | None,
    serving_multiplier: float | None,
    db: Session,
    log_date: str | None = None,
    entry_source: str | None = "daily",
    calorie_intake: float | None = None,
    protein_intake: float | None = None,
    carbohydrate_intake: float | None = None,
    fat_intake: float | None = None,
) -> dict:
    _ensure_user_exists(user_id, db)
    recipe = _ensure_recipe_exists(recipe_id, db)

    if log_date:
        try:
            target_date = date.fromisoformat(str(log_date).split("T")[0])
        except ValueError:
            raise HTTPException(status_code=400, detail="Geçersiz günlük kayıt tarihi.")
        now = datetime.combine(target_date, datetime.now().time())
    else:
        now = _local_now()
        target_date = now.date()

    normalized_meal_type = _normalize_meal_type(meal_type)

    portion_source = serving_count if serving_count is not None else serving_multiplier
    resolved_serving_count = _normalize_serving_count(portion_source)
    existing_log = user_repository.find_daily_log_by_recipe_meal(
        db,
        user_id=user_id,
        recipe_id=recipe_id,
        log_date=target_date,
        meal_type=normalized_meal_type,
    )
    if existing_log:
        resolved_serving_count = _normalize_serving_count(resolved_serving_count + int(existing_log.serving_count or 1))

    resolved_multiplier = float(resolved_serving_count)
    recipe_macros = _recipe_macros_per_serving(recipe)
    adjusted_calorie = recipe_macros["calorie"] * resolved_multiplier
    adjusted_protein = recipe_macros["protein"] * resolved_multiplier
    adjusted_carbohydrate = recipe_macros["carbohydrate"] * resolved_multiplier
    adjusted_fat = recipe_macros["fat"] * resolved_multiplier
    resolved_entry_source = (entry_source or "daily").strip().lower()

    if existing_log:
        log = existing_log
        log.logged_at = now
        log.entry_source = resolved_entry_source
        log.calorie_intake = round(adjusted_calorie, 2)
        log.protein_intake = round(adjusted_protein, 2)
        log.carbohydrate_intake = round(adjusted_carbohydrate, 2)
        log.fat_intake = round(adjusted_fat, 2)
        log.serving_count = resolved_serving_count
        log.serving_multiplier = round(resolved_multiplier, 2)
    else:
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
        raise HTTPException(status_code=400, detail="Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.")

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
    calorie_intake: float | None,
    protein_intake: float | None,
    carbohydrate_intake: float | None,
    fat_intake: float | None,
    db: Session,
) -> dict:
    log = user_repository.find_daily_log(db, user_id, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı.")

    recipe = user_repository.find_recipe_by_id(db, log.recipe_id)
    recipe_macros = _recipe_macros_per_serving(recipe)

    if meal_type:
        log.meal_type = _normalize_meal_type(meal_type)

    if serving_count is not None:
        normalized_serving_count = _normalize_serving_count(serving_count)
        log.serving_count = normalized_serving_count
        multiplier = float(normalized_serving_count)
        log.serving_multiplier = round(multiplier, 2)
        log.calorie_intake = round(recipe_macros["calorie"] * multiplier, 2)
        log.protein_intake = round(recipe_macros["protein"] * multiplier, 2)
        log.carbohydrate_intake = round(recipe_macros["carbohydrate"] * multiplier, 2)
        log.fat_intake = round(recipe_macros["fat"] * multiplier, 2)

    if calorie_intake is not None:
        log.calorie_intake = round(float(calorie_intake), 2)
    if protein_intake is not None:
        log.protein_intake = round(float(protein_intake), 2)
    if carbohydrate_intake is not None:
        log.carbohydrate_intake = round(float(carbohydrate_intake), 2)
    if fat_intake is not None:
        log.fat_intake = round(float(fat_intake), 2)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Günlük kayıt güncellenirken geçersiz bir değer gönderildi.")
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
            "protein": float(log.protein_intake) if log.protein_intake is not None else round(recipe_macros["protein"] * multiplier, 2),
            "carbohydrate": float(log.carbohydrate_intake) if log.carbohydrate_intake is not None else round(recipe_macros["carbohydrate"] * multiplier, 2),
            "fat": float(log.fat_intake) if log.fat_intake is not None else round(recipe_macros["fat"] * multiplier, 2),
        }
    }



def _normalize_serving_count(value) -> int:
    if value is None:
        return 1

    try:
        number = float(value)
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Porsiyon 1 ile 99 arasında bir sayı olmalıdır.")

    if number < 1 or number > 99:
        raise HTTPException(status_code=400, detail="Porsiyon 1 ile 99 arasında olmalıdır.")

    normalized = int(round(number))
    if normalized < 1 or normalized > 99:
        raise HTTPException(status_code=400, detail="Porsiyon 1 ile 99 arasında olmalıdır.")

    return normalized


def _recipe_macros_per_serving(recipe: Recipe) -> dict:
    macros = recipe_macro_values_per_serving(recipe) or {}
    return {
        "calorie": float(macros.get("calories_per_100g") or 0),
        "protein": float(macros.get("protein_per_100g") or 0),
        "carbohydrate": float(macros.get("carbs_per_100g") or 0),
        "fat": float(macros.get("fat_per_100g") or 0),
    }


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
    meal_order = ["Kahvaltı", "Öğle Yemeği", "Akşam Yemeği", "Ara Öğün"]
    used_meal_types = user_repository.find_daily_log_meal_types(db, user_id, log_date)

    if requested_meal_type not in used_meal_types:
        return requested_meal_type

    for meal_name in meal_order:
        if meal_name not in used_meal_types:
            return meal_name

    counter = 2
    while True:
        candidate = f"Ek Öğün {counter}"
        if candidate not in used_meal_types:
            return candidate
        counter += 1


def _local_now() -> datetime:
    return datetime.now(TURKEY_TZ).replace(tzinfo=None)
