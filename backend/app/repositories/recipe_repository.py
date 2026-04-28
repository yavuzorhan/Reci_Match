from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Recipe, RecipeIngredient


def find_recipe_by_source_url(db: Session, source_url: str) -> Recipe | None:
    return db.query(Recipe).filter(Recipe.source_url == source_url).first()


def find_recipe_by_name(db: Session, recipe_name: str) -> Recipe | None:
    return (
        db.query(Recipe)
        .filter(func.lower(Recipe.recipe_name) == recipe_name.lower())
        .first()
    )


def create_recipe(db: Session, **recipe_fields) -> Recipe:
    recipe = Recipe(**recipe_fields)
    db.add(recipe)
    db.flush()
    return recipe


def replace_recipe_ingredients(
    db: Session,
    recipe_id: int,
    ingredient_rows: list[dict],
) -> None:
    db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe_id).delete()

    for row in ingredient_rows:
        db.add(
            RecipeIngredient(
                recipe_id=recipe_id,
                ingredient_id=row["ingredient_id"],
                amount=row.get("amount"),
                unit=row.get("unit"),
            )
        )
