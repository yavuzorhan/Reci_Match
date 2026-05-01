from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(base_dir)

from app.db.database import SessionLocal
from app.repositories import recipe_repository
from app.utils.text_normalize import normalize_turkish_text


COMMON_INGREDIENT_WORDS = {
    "un", "pirinc", "bulgur", "seker", "tuz", "yag", "zeytinyagi", "tereyagi",
    "sut", "yogurt", "yumurta", "domates", "sogan", "sarimsak", "biber",
    "patates", "havuç", "havuc", "tavuk", "et", "kiyma", "peynir", "maydanoz",
    "mercimek", "nohut", "fasulye", "makarna",
}


def audit_recipe(recipe) -> dict:
    links = list(getattr(recipe, "ingredients", []) or [])
    ingredient_names = [
        normalize_turkish_text(getattr(link.ingredient, "ingredient_name", ""))
        for link in links
        if getattr(link, "ingredient", None)
    ]
    ingredient_tokens = {token for name in ingredient_names for token in name.split()}
    empty_amount_unit = sum(1 for link in links if link.amount is None or not link.unit)
    empty_ratio = empty_amount_unit / len(links) if links else 1.0

    prep_text = normalize_turkish_text(f"{recipe.explanation or ''} {recipe.preparation or ''}")
    prep_tokens = {token for token in prep_text.split() if token in COMMON_INGREDIENT_WORDS}
    overlap = len(prep_tokens & ingredient_tokens) / len(prep_tokens) if prep_tokens else 1.0

    criteria = {
        "few_ingredients": len(links) < 3,
        "empty_amount_unit_ratio": empty_ratio > 0.5,
        "low_preparation_overlap": overlap < 0.5,
    }
    failed = [name for name, failed in criteria.items() if failed]
    return {
        "recipe_id": recipe.recipe_id,
        "recipe_name": recipe.recipe_name,
        "source_url": recipe.source_url,
        "is_active": bool(getattr(recipe, "is_active", True)),
        "ingredient_count": len(links),
        "empty_amount_unit_ratio": round(empty_ratio, 3),
        "preparation_overlap": round(overlap, 3),
        "failed_criteria": failed,
        "should_deactivate": len(failed) >= 2,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    parser.set_defaults(dry_run=True)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        results = [audit_recipe(recipe) for recipe in recipe_repository.get_yemekcom_recipes_for_audit(db)]
        output_path = Path(base_dir) / "audit_yemekcom_results.json"
        output_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

        deactivated = 0
        if args.apply:
            deactivated = recipe_repository.deactivate_recipes(
                db,
                [item["recipe_id"] for item in results if item["should_deactivate"]],
            )
            db.commit()
        print(json.dumps({"audited": len(results), "would_deactivate": sum(1 for item in results if item["should_deactivate"]), "deactivated": deactivated, "output": str(output_path)}, ensure_ascii=False))
    finally:
        db.close()


if __name__ == "__main__":
    main()
