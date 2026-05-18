"""
Ensure Tavuklu Pilav contains a chicken breast ingredient relation.

This script is idempotent and does not rely on hardcoded recipe ids:
  python backend/scripts/ensure_tavuklu_pilav_chicken.py
"""
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.database import SessionLocal
from app.db.models import Ingredient, Recipe, RecipeIngredient
from app.utils.text_normalize import normalize_turkish_text


TARGET_RECIPE_NAME = "tavuklu pilav"
TARGET_INGREDIENT_NAMES = {"tavuk göğsü", "tavuk gogsu", "tavuk göğüs", "tavuk gogus"}


def _find_tavuklu_pilav(db):
    normalized_target = normalize_turkish_text(TARGET_RECIPE_NAME)
    recipes = db.query(Recipe).all()
    matches = [
        recipe
        for recipe in recipes
        if normalize_turkish_text(recipe.recipe_name) == normalized_target
        or normalized_target in normalize_turkish_text(recipe.recipe_name)
    ]
    return sorted(matches, key=lambda item: len(item.recipe_name or ""))[0] if matches else None


def _find_chicken_breast(db):
    ingredients = db.query(Ingredient).all()
    for ingredient in ingredients:
        normalized = normalize_turkish_text(ingredient.ingredient_name)
        if normalized in {normalize_turkish_text(name) for name in TARGET_INGREDIENT_NAMES}:
            return ingredient

    for ingredient in ingredients:
        normalized = normalize_turkish_text(ingredient.ingredient_name)
        if "tavuk" in normalized and ("gogsu" in normalized or "gogus" in normalized):
            return ingredient

    chicken = Ingredient(
        ingredient_name="tavuk göğsü",
        category="Protein",
        calorie_per_100g=120,
        protein_per_100g=22.5,
        carbohydrate_per_100g=0,
        fat_per_100g=2.6,
        is_verified=True,
        source="admin",
    )
    db.add(chicken)
    db.flush()
    return chicken


def main() -> None:
    with SessionLocal() as db:
        recipe = _find_tavuklu_pilav(db)
        if not recipe:
            raise SystemExit("Tavuklu Pilav tarifi normalize isimle bulunamadı.")

        chicken = _find_chicken_breast(db)
        existing = (
            db.query(RecipeIngredient)
            .filter(
                RecipeIngredient.recipe_id == recipe.recipe_id,
                RecipeIngredient.ingredient_id == chicken.ingredient_id,
            )
            .first()
        )

        if existing:
            changed = False
            if float(existing.amount or 0) != 500:
                existing.amount = 500
                changed = True
            if (existing.unit or "").strip().lower() != "gram":
                existing.unit = "gram"
                changed = True
            if float(existing.miktar_gram or 0) != 500:
                existing.miktar_gram = 500
                changed = True
            if changed:
                db.commit()
                print(f"[OK] {recipe.recipe_name} tarifindeki {chicken.ingredient_name} miktarı 500 gram olarak güncellendi.")
                return

            print(
                f"[OK] {recipe.recipe_name} tarifinde {chicken.ingredient_name} zaten var "
                f"({existing.amount or '-'} {existing.unit or ''})."
            )
            db.commit()
            return

        db.add(
            RecipeIngredient(
                recipe_id=recipe.recipe_id,
                ingredient_id=chicken.ingredient_id,
                amount=500,
                unit="gram",
                miktar_gram=500,
                donusum_kaynagi="ensure_tavuklu_pilav_chicken",
                donusum_guveni="high",
                donusum_notu="Tavuklu Pilav tarifindeki eksik tavuk göğsü ilişkisi idempotent olarak eklendi.",
            )
        )
        db.commit()
        print(f"[OK] {recipe.recipe_name} tarifine {chicken.ingredient_name} eklendi: 500 gram.")


if __name__ == "__main__":
    main()
