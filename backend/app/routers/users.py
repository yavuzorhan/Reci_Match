"""
Kullanıcı (User) router'i - profil, favoriler ve günlük kayıtlar.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.user import (
    DailyLogCreateRequest,
    DailyLogUpdateRequest,
    FavoriteCreateRequest,
    ProfileUpdateRequest,
)
from app.services import user_service

router = APIRouter(prefix="/api", tags=["Users"])


@router.get("/users/{user_id}/profile")
def get_profile(user_id: int, db: Session = Depends(get_db)):
    return user_service.get_profile(user_id, db)


@router.put("/users/{user_id}/profile")
def update_profile(user_id: int, req: ProfileUpdateRequest, db: Session = Depends(get_db)):
    return user_service.update_profile(
        user_id=user_id,
        age=req.age,
        gender=req.gender,
        height_cm=req.height_cm,
        weight_kg=req.weight_kg,
        objective=req.objective,
        meals=req.meals,
        activity=req.activity,
        db=db,
    )


@router.get("/users/{user_id}/favorites")
def get_favorites(user_id: int, db: Session = Depends(get_db)):
    return user_service.get_favorites(user_id, db)


@router.post("/users/{user_id}/favorites")
def add_favorite(user_id: int, req: FavoriteCreateRequest, db: Session = Depends(get_db)):
    return user_service.add_favorite(user_id, req.recipe_id, db)


@router.delete("/users/{user_id}/favorites/{recipe_id}")
def remove_favorite(user_id: int, recipe_id: int, db: Session = Depends(get_db)):
    return user_service.remove_favorite(user_id, recipe_id, db)


@router.get("/users/{user_id}/daily-logs")
def get_daily_logs(user_id: int, db: Session = Depends(get_db)):
    return user_service.get_daily_logs(user_id, db)


@router.post("/users/{user_id}/daily-logs")
def add_daily_log(user_id: int, req: DailyLogCreateRequest, db: Session = Depends(get_db)):
    return user_service.add_daily_log(
        user_id,
        req.recipe_id,
        req.meal_type,
        req.serving_count,
        req.serving_multiplier,
        db,
        req.log_date,
        req.entry_source,
        calorie_intake=req.calorie_intake,
        protein_intake=req.protein_intake,
        carbohydrate_intake=req.carbohydrate_intake,
        fat_intake=req.fat_intake,
    )


@router.delete("/users/{user_id}/daily-logs/{log_id}")
def remove_daily_log(user_id: int, log_id: int, db: Session = Depends(get_db)):
    return user_service.remove_daily_log(user_id, log_id, db)


@router.put("/users/{user_id}/daily-logs/{log_id}")
def update_daily_log(
    user_id: int,
    log_id: int,
    req: DailyLogUpdateRequest,
    db: Session = Depends(get_db),
):
    return user_service.update_daily_log(
        user_id=user_id,
        log_id=log_id,
        meal_type=req.meal_type,
        serving_count=req.serving_count,
        calorie_intake=req.calorie_intake,
        protein_intake=req.protein_intake,
        carbohydrate_intake=req.carbohydrate_intake,
        fat_intake=req.fat_intake,
        db=db,
    )


@router.get("/users/{user_id}/daily-logs/totals")
def get_daily_log_totals(user_id: int, log_date: str | None = None, db: Session = Depends(get_db)):
    return user_service.get_daily_log_totals(user_id, log_date, db)
