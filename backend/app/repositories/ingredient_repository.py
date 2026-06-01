from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import (
    DislikedIngredient,
    Ingredient,
    IngredientAlias,
    IngredientCategory,
    OwnedIngredient,
)
from app.utils.text_normalize import normalize_turkish_text

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

def find_accessible_ingredients_by_name(db: Session, user_id: int, ingredient_name: str) -> list[Ingredient]:
    return (
        db.query(Ingredient)
        .filter(
            func.lower(Ingredient.ingredient_name) == ingredient_name.lower(),
            (Ingredient.user_id == user_id) | Ingredient.user_id.is_(None),
        )
        .all()
    )

def find_accessible_ingredient_alias(db: Session, user_id: int, normalized_alias_name: str) -> IngredientAlias | None:
    return (
        db.query(IngredientAlias)
        .join(Ingredient, Ingredient.ingredient_id == IngredientAlias.ingredient_id)
        .filter(
            func.lower(IngredientAlias.normalized_alias_name) == normalized_alias_name.lower(),
            (Ingredient.user_id == user_id) | Ingredient.user_id.is_(None),
        )
        .first()
    )

def list_accessible_ingredients(db: Session, user_id: int) -> list[Ingredient]:
    return (
        db.query(Ingredient)
        .filter((Ingredient.user_id == user_id) | Ingredient.user_id.is_(None))
        .all()
    )

def find_local_nutrition_match(db: Session, user_id: int, normalized_name: str) -> Ingredient | None:
    normalized_key = normalize_turkish_text(normalized_name)
    matches = [
        ingredient
        for ingredient in list_accessible_ingredients(db, user_id)
        if normalize_turkish_text(ingredient.ingredient_name) == normalized_key
    ]
    if matches:
        return sorted(matches, key=lambda item: (0 if item.user_id == user_id else 1, item.ingredient_name))[0]

    alias = find_accessible_ingredient_alias(db, user_id, normalized_name)
    return alias.ingredient if alias else None

def find_owned_ingredients_by_user(db: Session, user_id: int) -> list[OwnedIngredient]:
    return db.query(OwnedIngredient).filter(OwnedIngredient.user_id == user_id).all()

def delete_owned_ingredients_by_user(db: Session, user_id: int) -> None:
    db.query(OwnedIngredient).filter(OwnedIngredient.user_id == user_id).delete()

def create_owned_ingredient(db: Session, user_id: int, ingredient_id: int) -> OwnedIngredient:
    owned = OwnedIngredient(user_id=user_id, ingredient_id=ingredient_id)
    db.add(owned)
    return owned

def find_disliked_ingredients_by_user(db: Session, user_id: int) -> list[DislikedIngredient]:
    return db.query(DislikedIngredient).filter(DislikedIngredient.user_id == user_id).all()

def delete_disliked_ingredients_by_user(db: Session, user_id: int) -> None:
    db.query(DislikedIngredient).filter(DislikedIngredient.user_id == user_id).delete()

def create_disliked_ingredient(db: Session, user_id: int, ingredient_id: int) -> DislikedIngredient:
    disliked = DislikedIngredient(user_id=user_id, ingredient_id=ingredient_id)
    db.add(disliked)
    return disliked
