"""
Malzeme (Ingredient) router'ı — Kategorize listeleme, özel malzeme, kiler, sevilmeyenler.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.ingredient import (
    IngredientUpdate,
    CustomIngredientCreate,
    IngredientResolveRequest,
    ManualIngredientCreate,
    IngredientNutritionSyncRequest,
    MissingIngredientNutritionSyncRequest,
)
from app.services import ingredient_service
from app.services import ingredient_nutrition_service
from app.services import ingredient_resolver_service

router = APIRouter(prefix="/api", tags=["Ingredients"])


@router.get("/ingredients/categorized")
def get_categorized_ingredients(
    user_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return ingredient_service.get_categorized_ingredients(user_id, db)


@router.post("/users/{user_id}/custom-ingredients")
async def create_custom_ingredient(
    user_id: int,
    req: CustomIngredientCreate,
    db: Session = Depends(get_db),
):
    return await ingredient_service.create_custom_ingredient(user_id, req.name, req.category_id, db)


@router.post("/ingredients/resolve")
async def resolve_ingredient(req: IngredientResolveRequest, db: Session = Depends(get_db)):
    if not req.user_id:
        return {"status": "manual_required", "ingredient_name": req.ingredient_name}
    ingredient_nutrition_service.ensure_ingredient_nutrition_table(db)
    result = await ingredient_resolver_service.resolve_ingredient_for_user(
        db=db,
        user_id=req.user_id,
        ingredient_name=req.ingredient_name,
        try_usda=True,
    )
    if result.status == "manual_required":
        db.rollback()
        return {"status": "manual_required", "ingredient_name": result.ingredient_name}
    db.commit()
    db.refresh(result.ingredient)
    return {
        "status": "resolved",
        "ingredient": ingredient_resolver_service.serialize_ingredient(result.ingredient),
    }


@router.post("/users/{user_id}/ingredients/manual")
def create_manual_ingredient(
    user_id: int,
    req: ManualIngredientCreate,
    db: Session = Depends(get_db),
):
    ingredient = ingredient_resolver_service.create_manual_ingredient(
        db=db,
        user_id=user_id,
        ingredient_name=req.ingredient_name,
        calorie_per_100g=req.calorie_per_100g,
        protein_per_100g=req.protein_per_100g,
        carbohydrate_per_100g=req.carbohydrate_per_100g,
        fat_per_100g=req.fat_per_100g,
    )
    return {
        "status": "success",
        "ingredient": ingredient_resolver_service.serialize_ingredient(ingredient),
    }


# ─── Kiler (Pantry / Elimdekiler) ───────────────────────────────────────────

@router.get("/users/{user_id}/ingredients")
def get_user_ingredients(user_id: int, db: Session = Depends(get_db)):
    return ingredient_service.get_user_ingredients(user_id, db)


@router.post("/users/{user_id}/ingredients")
def update_user_ingredients(user_id: int, req: IngredientUpdate, db: Session = Depends(get_db)):
    return ingredient_service.update_user_ingredients(user_id, req.ingredient_ids, db)


# ─── Sevilmeyen Malzemeler ───────────────────────────────────────────────────

@router.get("/users/{user_id}/disliked-ingredients")
def get_user_disliked_ingredients(user_id: int, db: Session = Depends(get_db)):
    return ingredient_service.get_disliked_ingredients(user_id, db)


@router.post("/users/{user_id}/disliked-ingredients")
def update_user_disliked_ingredients(user_id: int, req: IngredientUpdate, db: Session = Depends(get_db)):
    return ingredient_service.update_disliked_ingredients(user_id, req.ingredient_ids, db)


@router.get("/ingredients/{ingredient_id}/nutrition")
def get_ingredient_nutrition(ingredient_id: int, db: Session = Depends(get_db)):
    return ingredient_nutrition_service.get_ingredient_nutrition(ingredient_id, db)


@router.post("/ingredients/nutrition/sync")
def sync_ingredient_nutrition(req: IngredientNutritionSyncRequest, db: Session = Depends(get_db)):
    return ingredient_nutrition_service.sync_ingredient_nutrition_from_usda(req.ingredient_id, db)


@router.post("/ingredients/nutrition/sync-missing")
async def sync_missing_ingredient_nutrition(
    req: MissingIngredientNutritionSyncRequest,
    db: Session = Depends(get_db),
):
    return await ingredient_nutrition_service.complete_missing_ingredient_nutrition(req.limit, db)
