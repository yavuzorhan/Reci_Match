from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.db.models import (
    DailyLog,
    Favorite,
    HealthyRecipe,
    Ingredient,
    Recipe,
    RecipeIngredient,
    User,
)


def find_recipe_by_source_url(db: Session, source_url: str) -> Recipe | None:
    return db.query(Recipe).filter(Recipe.source_url == source_url).first()


def find_recipe_by_name(db: Session, recipe_name: str) -> Recipe | None:
    return (
        db.query(Recipe)
        .filter(func.lower(Recipe.recipe_name) == recipe_name.lower())
        .first()
    )


def find_recipe_by_id(db: Session, recipe_id: int) -> Recipe | None:
    return db.query(Recipe).filter(Recipe.recipe_id == recipe_id).first()


def find_recipe_by_id_with_relations(db: Session, recipe_id: int) -> Recipe | None:
    return (
        db.query(Recipe)
        .options(
            selectinload(Recipe.ingredients)
            .selectinload(RecipeIngredient.ingredient)
            .selectinload(Ingredient.nutrition_value)
        )
        .filter(Recipe.recipe_id == recipe_id)
        .first()
    )


def create_recipe(db: Session, **recipe_fields) -> Recipe:
    recipe = Recipe(**recipe_fields)
    db.add(recipe)
    db.flush()
    return recipe


def delete_recipe(db: Session, recipe: Recipe) -> None:
    db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe.recipe_id).delete()
    db.query(Favorite).filter(Favorite.recipe_id == recipe.recipe_id).delete()
    db.query(DailyLog).filter(DailyLog.recipe_id == recipe.recipe_id).delete()
    db.delete(recipe)


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
                miktar_gram=row.get("miktar_gram"),
                donusum_kaynagi=row.get("donusum_kaynagi"),
                donusum_guveni=row.get("donusum_guveni"),
                donusum_notu=row.get("donusum_notu"),
            )
        )


def find_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.user_id == user_id).first()


def get_all_recipes(
    db: Session,
    user_id: int | None = None,
    ids: list[int] | None = None,
    source: str | None = None,
    recipe_category: str | None = None,
    healthy_only: bool = False,
) -> list[Recipe]:
    query = db.query(Recipe).options(
        selectinload(Recipe.ingredients)
        .selectinload(RecipeIngredient.ingredient)
        .selectinload(Ingredient.nutrition_value)
    )
    query = query.filter((Recipe.user_id.is_(None)) | (Recipe.user_id == user_id))

    if healthy_only:
        query = query.join(HealthyRecipe, HealthyRecipe.recipe_id == Recipe.recipe_id)

    if ids:
        query = query.filter(Recipe.recipe_id.in_(ids))
    if source:
        query = query.filter(Recipe.source == source)
    if recipe_category:
        query = query.filter(Recipe.recipe_category == recipe_category)

    return query.order_by(Recipe.recipe_name.asc()).all()


def find_ingredient_by_id(db: Session, ingredient_id: int, user_id: int) -> Ingredient | None:
    return (
        db.query(Ingredient)
        .filter(
            Ingredient.ingredient_id == ingredient_id,
            (Ingredient.user_id == user_id) | Ingredient.user_id.is_(None),
        )
        .first()
    )


def get_ingredients_by_ids(db: Session, ingredient_ids: list[int]) -> list[Ingredient]:
    if not ingredient_ids:
        return []
    return db.query(Ingredient).filter(Ingredient.ingredient_id.in_(ingredient_ids)).all()
