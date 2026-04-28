"""Backfill recipes.health_score and recipes.health_grade.

Run from backend directory:
    python scripts/backfill_health_scores.py --dry-run
    python scripts/backfill_health_scores.py --apply
"""
from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from sqlalchemy import text  # noqa: E402
from sqlalchemy.orm import selectinload  # noqa: E402

from app.db.database import SessionLocal  # noqa: E402
from app.db.models import Ingredient, Recipe, RecipeIngredient  # noqa: E402
from app.utils.recipe_health import build_recipe_health_profile  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill macro-based recipe health scores.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="Calculate and report without updating recipes.")
    mode.add_argument("--apply", action="store_true", help="Persist health_score, health_grade and health_explanation.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    stats = Counter()
    high_calorie_rows = []
    high_fat_pct_rows = []

    with SessionLocal() as db:
        ensure_health_columns(db)
        recipes = (
            db.query(Recipe)
            .options(
                selectinload(Recipe.ingredients)
                .selectinload(RecipeIngredient.ingredient)
                .selectinload(Ingredient.nutrition_value)
            )
            .order_by(Recipe.recipe_id.asc())
            .all()
        )

        for recipe in recipes:
            result = build_recipe_health_profile(recipe)
            stats["total"] += 1
            grade = result["health_grade"] or "NA"
            stats[grade] += 1
            if result.get("applied_caps"):
                stats["capped"] += 1

            calories = float(recipe.calorie or 0)
            fat_pct = float(result.get("fat_pct") or 0)
            high_calorie_rows.append((calories, recipe.recipe_id, recipe.recipe_name, grade, result["health_score"]))
            high_fat_pct_rows.append((fat_pct, recipe.recipe_id, recipe.recipe_name, grade, result["health_score"]))

            if args.apply:
                db.execute(
                    text("""
                        UPDATE recipes
                        SET health_score = :health_score,
                            health_grade = :health_grade,
                            health_explanation = :health_explanation
                        WHERE recipe_id = :recipe_id
                    """),
                    {
                        "health_score": result["health_score"],
                        "health_grade": result["health_grade"],
                        "health_explanation": result["explanation"],
                        "recipe_id": recipe.recipe_id,
                    },
                )

        if args.apply:
            db.commit()
        else:
            db.rollback()

    print_report(stats, high_calorie_rows, high_fat_pct_rows, args)
    return 0


def ensure_health_columns(db) -> None:
    db.execute(text("ALTER TABLE recipes ADD COLUMN IF NOT EXISTS health_score INTEGER"))
    db.execute(text("ALTER TABLE recipes ADD COLUMN IF NOT EXISTS health_grade VARCHAR(1)"))
    db.execute(text("ALTER TABLE recipes ADD COLUMN IF NOT EXISTS health_explanation TEXT"))
    db.commit()


def print_report(stats: Counter, high_calorie_rows: list, high_fat_pct_rows: list, args: argparse.Namespace) -> None:
    total = stats["total"] or 1
    print("\nHealth score backfill raporu")
    print(f"Mod: {'APPLY' if args.apply else 'DRY-RUN'}")
    print(f"Toplam tarif sayisi: {stats['total']}")
    for grade in ["A", "B", "C", "D", "NA"]:
        if stats[grade]:
            pct = stats[grade] / total * 100
            print(f"{grade}: {stats[grade]} (%{pct:.1f})")
    print(f"Hard cap uygulanan tarif sayisi: {stats['capped']}")

    ab_pct = (stats["A"] + stats["B"]) / total * 100
    if ab_pct > 80:
        print("UYARI: Tariflerin %80'den fazlasi A/B cikti. Algoritma fazla yumusak olabilir.")

    print("\nEn yuksek kalorili 10 tarif:")
    for calories, recipe_id, name, grade, score in sorted(high_calorie_rows, reverse=True)[:10]:
        print(f"  #{recipe_id} | {calories:.0f} kcal | {grade} {score} | {name}")

    print("\nEn yuksek yag oranina sahip 10 tarif:")
    for fat_pct, recipe_id, name, grade, score in sorted(high_fat_pct_rows, reverse=True)[:10]:
        print(f"  #{recipe_id} | yag %{fat_pct:.1f} | {grade} {score} | {name}")


if __name__ == "__main__":
    raise SystemExit(main())
