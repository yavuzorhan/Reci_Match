import os
import sys


base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(base_dir)

from sqlalchemy import text

from app.db.database import SessionLocal
from app.db.models import Ingredient, Recipe, RecipeIngredient
from app.utils.helpers import infer_ingredient_category, normalize_ingredient_name


HEALTHY_SOURCES = ("bbcgoodfood", "eatingwell", "skinnytaste")


def _find_or_create_global_ingredient(db, normalized_name: str) -> Ingredient:
    ingredient = (
        db.query(Ingredient)
        .filter(Ingredient.user_id.is_(None), Ingredient.ingredient_name == normalized_name)
        .first()
    )
    if ingredient is not None:
        return ingredient

    category_name, category_id = infer_ingredient_category(normalized_name)
    ingredient = Ingredient(
        ingredient_name=normalized_name,
        category=category_name,
        category_id=category_id,
    )
    db.add(ingredient)
    db.flush()
    return ingredient


def _dedupe_recipe_ingredients(db) -> int:
    deleted = db.execute(
        text(
            """
            WITH duplicates AS (
                SELECT
                    recipe_ingredient_id,
                    ROW_NUMBER() OVER (
                        PARTITION BY recipe_id, ingredient_id
                        ORDER BY recipe_ingredient_id
                    ) AS rn
                FROM recipe_ingredients
            )
            DELETE FROM recipe_ingredients ri
            USING duplicates d
            WHERE ri.recipe_ingredient_id = d.recipe_ingredient_id
              AND d.rn > 1
            """
        )
    ).rowcount or 0
    db.commit()
    return deleted


def main():
    db = SessionLocal()
    try:
        before_count = db.query(Ingredient).count()
        links = db.execute(
            text(
                """
                SELECT
                    ri.recipe_ingredient_id,
                    ri.recipe_id,
                    ri.ingredient_id,
                    i.ingredient_name
                FROM recipe_ingredients ri
                JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
                JOIN recipes r ON r.recipe_id = ri.recipe_id
                WHERE r.source = ANY(:sources)
                ORDER BY ri.recipe_ingredient_id ASC
                """
            ),
            {"sources": list(HEALTHY_SOURCES)},
        ).fetchall()

        updated_links = 0

        for recipe_ingredient_id, recipe_id, ingredient_id, ingredient_name in links:
            normalized_name = normalize_ingredient_name(ingredient_name or "")
            if not normalized_name:
                continue

            target = _find_or_create_global_ingredient(db, normalized_name)
            existing_link = db.execute(
                text(
                    """
                    SELECT recipe_ingredient_id
                    FROM recipe_ingredients
                    WHERE recipe_id = :recipe_id
                      AND ingredient_id = :ingredient_id
                      AND recipe_ingredient_id <> :recipe_ingredient_id
                    LIMIT 1
                    """
                ),
                {
                    "recipe_id": recipe_id,
                    "ingredient_id": target.ingredient_id,
                    "recipe_ingredient_id": recipe_ingredient_id,
                },
            ).fetchone()

            if existing_link is not None:
                db.execute(
                    text(
                        """
                        DELETE FROM recipe_ingredients
                        WHERE recipe_ingredient_id = :recipe_ingredient_id
                        """
                    ),
                    {"recipe_ingredient_id": recipe_ingredient_id},
                )
                updated_links += 1
                continue

            if target.ingredient_id != ingredient_id:
                db.execute(
                    text(
                        """
                        UPDATE recipe_ingredients
                        SET ingredient_id = :ingredient_id
                        WHERE recipe_ingredient_id = :recipe_ingredient_id
                        """
                    ),
                    {
                        "ingredient_id": target.ingredient_id,
                        "recipe_ingredient_id": recipe_ingredient_id,
                    },
                )
                updated_links += 1
            if target.ingredient_id == ingredient_id and target.ingredient_name != normalized_name:
                target.ingredient_name = normalized_name
                updated_links += 1

            if target.category_id is None:
                category_name, category_id = infer_ingredient_category(target.ingredient_name)
                target.category = category_name
                target.category_id = category_id

            if target.ingredient_id == ingredient_id and ingredient_name == normalized_name:
                continue

        db.commit()
        after_count = db.query(Ingredient).count()
        created_ingredients = max(after_count - before_count, 0)

        deleted_duplicates = _dedupe_recipe_ingredients(db)
        print(f"Guncellenen iliski: {updated_links}")
        print(f"Yeni global malzeme: {created_ingredients}")
        print(f"Silinen duplicate iliski: {deleted_duplicates}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
