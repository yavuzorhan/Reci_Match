"""
Malzeme (Ingredient) veri erişim katmanı.
"""
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import (
    DislikedIngredient,
    Ingredient,
    IngredientCategory,
    OwnedIngredient,
)


def get_all_categories(db: Session) -> list[IngredientCategory]:
    return db.query(IngredientCategory).all()


def find_global_ingredient_by_name(db: Session, ingredient_name: str) -> Ingredient | None:
    return (
        db.query(Ingredient)
        .filter(
            Ingredient.user_id.is_(None),
            func.lower(Ingredient.ingredient_name) == ingredient_name.lower(),
        )
        .first()
    )


def find_user_ingredient_by_name(db: Session, user_id: int, ingredient_name: str) -> Ingredient | None:
    return (
        db.query(Ingredient)
        .filter(
            Ingredient.user_id == user_id,
            func.lower(Ingredient.ingredient_name) == ingredient_name.lower(),
        )
        .first()
    )


def create_ingredient(db: Session, ingredient_name: str, category_id: int | None = None, user_id: int | None = None) -> Ingredient:
    ingredient = Ingredient(
        ingredient_name=ingredient_name,
        category_id=category_id,
        user_id=user_id
    )
    db.add(ingredient)
    db.flush()
    return ingredient


# ─── Owned Ingredients (Pantry) ──────────────────────────────────────────────

def find_owned_ingredients_by_user(db: Session, user_id: int) -> list[OwnedIngredient]:
    return db.query(OwnedIngredient).filter(OwnedIngredient.user_id == user_id).all()


def delete_owned_ingredients_by_user(db: Session, user_id: int) -> None:
    db.query(OwnedIngredient).filter(OwnedIngredient.user_id == user_id).delete()


def create_owned_ingredient(db: Session, user_id: int, ingredient_id: int) -> OwnedIngredient:
    owned = OwnedIngredient(user_id=user_id, ingredient_id=ingredient_id)
    db.add(owned)
    return owned


# ─── Disliked Ingredients ───────────────────────────────────────────────────

def find_disliked_ingredients_by_user(db: Session, user_id: int) -> list[DislikedIngredient]:
    return db.query(DislikedIngredient).filter(DislikedIngredient.user_id == user_id).all()


def delete_disliked_ingredients_by_user(db: Session, user_id: int) -> None:
    db.query(DislikedIngredient).filter(DislikedIngredient.user_id == user_id).delete()


def create_disliked_ingredient(db: Session, user_id: int, ingredient_id: int) -> DislikedIngredient:
    disliked = DislikedIngredient(user_id=user_id, ingredient_id=ingredient_id)
    db.add(disliked)
    return disliked
