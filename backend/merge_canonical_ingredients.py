import os
import sys

from sqlalchemy import text


base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(base_dir)

from app.db.database import SessionLocal
from app.db.models import Ingredient
from app.utils.helpers import canonicalize_ingredient_name


def merge_duplicate_links(db, table_name: str, keeper_id: int, duplicate_id: int, unique_owner_column: str):
    db.execute(
        text(
            f"""
            DELETE FROM {table_name} a
            USING {table_name} b
            WHERE a.ingredient_id = :duplicate_id
              AND b.ingredient_id = :keeper_id
              AND a.{unique_owner_column} = b.{unique_owner_column}
            """
        ),
        {"duplicate_id": duplicate_id, "keeper_id": keeper_id},
    )
    db.execute(
        text(f"UPDATE {table_name} SET ingredient_id = :keeper_id WHERE ingredient_id = :duplicate_id"),
        {"duplicate_id": duplicate_id, "keeper_id": keeper_id},
    )


def merge_recipe_ingredients(db, keeper_id: int, duplicate_id: int):
    db.execute(
        text(
            """
            DELETE FROM recipe_ingredients a
            USING recipe_ingredients b
            WHERE a.ingredient_id = :duplicate_id
              AND b.ingredient_id = :keeper_id
              AND a.recipe_id = b.recipe_id
            """
        ),
        {"duplicate_id": duplicate_id, "keeper_id": keeper_id},
    )
    db.execute(
        text("UPDATE recipe_ingredients SET ingredient_id = :keeper_id WHERE ingredient_id = :duplicate_id"),
        {"duplicate_id": duplicate_id, "keeper_id": keeper_id},
    )


def choose_keeper(group: list[Ingredient], canonical_name: str) -> Ingredient:
    for ingredient in group:
        if ingredient.ingredient_name == canonical_name and ingredient.user_id is None:
            return ingredient
    for ingredient in group:
        if ingredient.user_id is None:
            return ingredient
    for ingredient in group:
        if ingredient.ingredient_name == canonical_name:
            return ingredient
    return sorted(group, key=lambda item: item.ingredient_id)[0]


def main():
    db = SessionLocal()
    try:
        ingredients = db.query(Ingredient).order_by(Ingredient.ingredient_id.asc()).all()
        before_count = len(ingredients)

        grouped: dict[str, list[Ingredient]] = {}
        for ingredient in ingredients:
            canonical_name = canonicalize_ingredient_name(ingredient.ingredient_name)
            if not canonical_name:
                canonical_name = ingredient.ingredient_name.strip().lower()
            grouped.setdefault(canonical_name, []).append(ingredient)

        merged_groups = 0
        renamed_count = 0
        deleted_count = 0

        for canonical_name, group in grouped.items():
            keeper = choose_keeper(group, canonical_name)
            if keeper.ingredient_name != canonical_name:
                keeper.ingredient_name = canonical_name
                renamed_count += 1

            for duplicate in group:
                if duplicate.ingredient_id == keeper.ingredient_id:
                    continue

                merge_recipe_ingredients(db, keeper.ingredient_id, duplicate.ingredient_id)
                merge_duplicate_links(db, "owned_ingredients", keeper.ingredient_id, duplicate.ingredient_id, "user_id")
                merge_duplicate_links(db, "disliked_ingredients", keeper.ingredient_id, duplicate.ingredient_id, "user_id")

                db.delete(duplicate)
                deleted_count += 1

            if len(group) > 1:
                merged_groups += 1

        db.commit()

        after_count = db.query(Ingredient).count()
        print(
            f"Malzeme birlestirme tamamlandi. Once={before_count} Sonra={after_count} "
            f"Silinen={deleted_count} Yeniden adlandirilan={renamed_count} Birlestirilen grup={merged_groups}"
        )

        sample_rows = db.execute(
            text(
                """
                SELECT ingredient_id, ingredient_name
                FROM ingredients
                ORDER BY ingredient_name ASC
                LIMIT 120
                """
            )
        ).fetchall()
        for row in sample_rows[:40]:
            print(row)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
