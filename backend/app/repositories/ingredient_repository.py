from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Ingredient


def find_global_ingredient_by_name(db: Session, ingredient_name: str) -> Ingredient | None:
    return (
        db.query(Ingredient)
        .filter(
            Ingredient.user_id.is_(None),
            func.lower(Ingredient.ingredient_name) == ingredient_name.lower(),
        )
        .first()
    )


def create_global_ingredient(db: Session, ingredient_name: str) -> Ingredient:
    ingredient = Ingredient(ingredient_name=ingredient_name)
    db.add(ingredient)
    db.flush()
    return ingredient
