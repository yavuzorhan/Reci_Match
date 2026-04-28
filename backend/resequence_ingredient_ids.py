"""Resequence ingredient ids while preserving related records."""
from __future__ import annotations

import os
import sys

from sqlalchemy import insert, text


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal


def main() -> None:
    db = SessionLocal()
    try:
        ingredients = db.execute(
            text(
                """
                SELECT ingredient_id, ingredient_name, user_id, category, category_id
                FROM ingredients
                ORDER BY ingredient_id ASC
                """
            )
        ).mappings().all()

        id_map = {row["ingredient_id"]: index for index, row in enumerate(ingredients, start=1)}
        already_sequential = all(old_id == new_id for old_id, new_id in id_map.items())
        if already_sequential:
            print({"message": "ingredient_id degerleri zaten sirali.", "count": len(ingredients)})
            return

        recipe_ingredients = db.execute(
            text(
                """
                SELECT recipe_ingredient_id, recipe_id, ingredient_id, amount, unit
                FROM recipe_ingredients
                ORDER BY recipe_ingredient_id ASC
                """
            )
        ).mappings().all()
        owned_ingredients = db.execute(
            text(
                """
                SELECT owned_id, user_id, ingredient_id, added_at
                FROM owned_ingredients
                ORDER BY owned_id ASC
                """
            )
        ).mappings().all()
        disliked_ingredients = db.execute(
            text(
                """
                SELECT disliked_id, user_id, ingredient_id
                FROM disliked_ingredients
                ORDER BY disliked_id ASC
                """
            )
        ).mappings().all()
        ingredient_usda_mappings = db.execute(
            text(
                """
                SELECT mapping_id, ingredient_id, fdc_id, usda_description, data_type, match_query,
                       match_confidence, match_status, is_verified, created_at, updated_at
                FROM ingredient_usda_mappings
                ORDER BY mapping_id ASC
                """
            )
        ).mappings().all()
        ingredient_nutrition_values = db.execute(
            text(
                """
                SELECT nutrition_id, ingredient_id, fdc_id, calories_per_100g, protein_per_100g,
                       carbs_per_100g, fat_per_100g, saturated_fat_per_100g, fiber_per_100g,
                       sugar_per_100g, sodium_mg_per_100g, added_sugar_per_100g, trans_fat_per_100g,
                       cholesterol_mg_per_100g, potassium_mg_per_100g, calcium_mg_per_100g,
                       iron_mg_per_100g, vitamin_d_mcg_per_100g, source, confidence_score,
                       created_at, updated_at
                FROM ingredient_nutrition_values
                ORDER BY nutrition_id ASC
                """
            )
        ).mappings().all()

        transformed_ingredients = [
            {
                "ingredient_id": id_map[row["ingredient_id"]],
                "ingredient_name": row["ingredient_name"],
                "user_id": row["user_id"],
                "category": row["category"],
                "category_id": row["category_id"],
            }
            for row in ingredients
        ]
        transformed_recipe_ingredients = [
            {
                "recipe_ingredient_id": row["recipe_ingredient_id"],
                "recipe_id": row["recipe_id"],
                "ingredient_id": id_map[row["ingredient_id"]],
                "amount": row["amount"],
                "unit": row["unit"],
            }
            for row in recipe_ingredients
        ]
        transformed_owned = [
            {
                "owned_id": row["owned_id"],
                "user_id": row["user_id"],
                "ingredient_id": id_map[row["ingredient_id"]],
                "added_at": row["added_at"],
            }
            for row in owned_ingredients
        ]
        transformed_disliked = [
            {
                "disliked_id": row["disliked_id"],
                "user_id": row["user_id"],
                "ingredient_id": id_map[row["ingredient_id"]],
            }
            for row in disliked_ingredients
        ]
        transformed_mappings = [
            {
                "mapping_id": row["mapping_id"],
                "ingredient_id": id_map[row["ingredient_id"]],
                "fdc_id": row["fdc_id"],
                "usda_description": row["usda_description"],
                "data_type": row["data_type"],
                "match_query": row["match_query"],
                "match_confidence": row["match_confidence"],
                "match_status": row["match_status"],
                "is_verified": row["is_verified"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }
            for row in ingredient_usda_mappings
        ]
        transformed_nutrition = [
            {
                "nutrition_id": row["nutrition_id"],
                "ingredient_id": id_map[row["ingredient_id"]],
                "fdc_id": row["fdc_id"],
                "calories_per_100g": row["calories_per_100g"],
                "protein_per_100g": row["protein_per_100g"],
                "carbs_per_100g": row["carbs_per_100g"],
                "fat_per_100g": row["fat_per_100g"],
                "saturated_fat_per_100g": row["saturated_fat_per_100g"],
                "fiber_per_100g": row["fiber_per_100g"],
                "sugar_per_100g": row["sugar_per_100g"],
                "sodium_mg_per_100g": row["sodium_mg_per_100g"],
                "added_sugar_per_100g": row["added_sugar_per_100g"],
                "trans_fat_per_100g": row["trans_fat_per_100g"],
                "cholesterol_mg_per_100g": row["cholesterol_mg_per_100g"],
                "potassium_mg_per_100g": row["potassium_mg_per_100g"],
                "calcium_mg_per_100g": row["calcium_mg_per_100g"],
                "iron_mg_per_100g": row["iron_mg_per_100g"],
                "vitamin_d_mcg_per_100g": row["vitamin_d_mcg_per_100g"],
                "source": row["source"],
                "confidence_score": row["confidence_score"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
            }
            for row in ingredient_nutrition_values
        ]

        db.execute(text("DELETE FROM recipe_ingredients"))
        db.execute(text("DELETE FROM owned_ingredients"))
        db.execute(text("DELETE FROM disliked_ingredients"))
        db.execute(text("DELETE FROM ingredient_usda_mappings"))
        db.execute(text("DELETE FROM ingredient_nutrition_values"))
        db.execute(text("DELETE FROM ingredients"))

        if transformed_ingredients:
            db.execute(
                insert_sql(
                    "ingredients",
                    ["ingredient_id", "ingredient_name", "user_id", "category", "category_id"],
                ),
                transformed_ingredients,
            )
        if transformed_recipe_ingredients:
            db.execute(
                insert_sql(
                    "recipe_ingredients",
                    ["recipe_ingredient_id", "recipe_id", "ingredient_id", "amount", "unit"],
                ),
                transformed_recipe_ingredients,
            )
        if transformed_owned:
            db.execute(
                insert_sql(
                    "owned_ingredients",
                    ["owned_id", "user_id", "ingredient_id", "added_at"],
                ),
                transformed_owned,
            )
        if transformed_disliked:
            db.execute(
                insert_sql(
                    "disliked_ingredients",
                    ["disliked_id", "user_id", "ingredient_id"],
                ),
                transformed_disliked,
            )
        if transformed_mappings:
            db.execute(
                insert_sql(
                    "ingredient_usda_mappings",
                    [
                        "mapping_id", "ingredient_id", "fdc_id", "usda_description", "data_type",
                        "match_query", "match_confidence", "match_status", "is_verified",
                        "created_at", "updated_at",
                    ],
                ),
                transformed_mappings,
            )
        if transformed_nutrition:
            db.execute(
                insert_sql(
                    "ingredient_nutrition_values",
                    [
                        "nutrition_id", "ingredient_id", "fdc_id", "calories_per_100g",
                        "protein_per_100g", "carbs_per_100g", "fat_per_100g",
                        "saturated_fat_per_100g", "fiber_per_100g", "sugar_per_100g",
                        "sodium_mg_per_100g", "added_sugar_per_100g", "trans_fat_per_100g",
                        "cholesterol_mg_per_100g", "potassium_mg_per_100g",
                        "calcium_mg_per_100g", "iron_mg_per_100g", "vitamin_d_mcg_per_100g",
                        "source", "confidence_score", "created_at", "updated_at",
                    ],
                ),
                transformed_nutrition,
            )

        reset_sequence(db, "ingredients", "ingredient_id")
        reset_sequence(db, "recipe_ingredients", "recipe_ingredient_id")
        reset_sequence(db, "owned_ingredients", "owned_id")
        reset_sequence(db, "disliked_ingredients", "disliked_id")
        reset_sequence(db, "ingredient_usda_mappings", "mapping_id")
        reset_sequence(db, "ingredient_nutrition_values", "nutrition_id")
        db.commit()

        print(
            {
                "message": "ingredient_id degerleri yeniden siralandi.",
                "ingredient_count": len(transformed_ingredients),
                "max_ingredient_id": max(row["ingredient_id"] for row in transformed_ingredients),
            }
        )
    finally:
        db.close()


def insert_sql(table_name: str, columns: list[str]):
    column_sql = ", ".join(columns)
    value_sql = ", ".join(f":{column}" for column in columns)
    return text(f"INSERT INTO {table_name} ({column_sql}) VALUES ({value_sql})")


def reset_sequence(db, table_name: str, column_name: str) -> None:
    db.execute(
        text(
            """
            SELECT setval(
                pg_get_serial_sequence(:table_name, :column_name),
                COALESCE((SELECT MAX(""" + column_name + """) FROM """ + table_name + """), 1),
                true
            )
            """
        ),
        {"table_name": table_name, "column_name": column_name},
    )


if __name__ == "__main__":
    main()
