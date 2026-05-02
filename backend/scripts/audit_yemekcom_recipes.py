"""Audit Yemek.com recipes with repository-backed reads/writes."""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Any

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

from app.db.database import SessionLocal  # noqa: E402
from app.repositories import recipe_repository  # noqa: E402
from app.utils.text_normalize import normalize_turkish_text  # noqa: E402


CONTROL_KEYWORDS = [
    "sogan",
    "sarimsak",
    "domates",
    "biber",
    "yag",
    "tuz",
    "su",
    "seker",
    "un",
    "yumurta",
    "sut",
    "tereyag",
    "zeytinyagi",
    "limon",
    "maydanoz",
    "nane",
    "pirinc",
    "makarna",
    "tavuk",
    "et",
    "peynir",
    "yogurt",
    "havuc",
    "ispanak",
]

RESULTS_PATH = Path.cwd() / "audit_yemekcom_results.json"


def contains_normalized_word(text: str, word: str) -> bool:
    normalized_word = re.escape(normalize_turkish_text(word))
    return bool(re.search(rf"(?<![a-z0-9]){normalized_word}(?![a-z0-9])", text))


def find_missing_keywords_in_preparation(recipe: Any) -> list[str]:
    preparation = normalize_turkish_text(recipe.preparation)
    ingredient_names = [
        normalize_turkish_text(link.ingredient.ingredient_name)
        for link in recipe.ingredients
        if link.ingredient is not None
    ]

    missing_keywords = []
    for keyword in CONTROL_KEYWORDS:
        in_preparation = contains_normalized_word(preparation, keyword)
        in_ingredients = any(contains_normalized_word(name, keyword) for name in ingredient_names)
        if in_preparation and not in_ingredients:
            missing_keywords.append(keyword)

    return missing_keywords


def audit_recipe(recipe: Any) -> dict[str, Any]:
    flags = []
    ingredients = list(recipe.ingredients)
    ingredient_count = len(ingredients)

    if ingredient_count < 3:
        flags.append("low_ingredient_count")

    empty_amount_count = sum(1 for link in ingredients if link.amount is None)
    empty_amount_ratio = empty_amount_count / ingredient_count if ingredient_count else 0.0
    if empty_amount_ratio > 0.5:
        flags.append("high_empty_amount_ratio")

    missing_keywords = find_missing_keywords_in_preparation(recipe)
    if len(missing_keywords) >= 3:
        flags.append("missing_in_text")

    return {
        "recipe_id": recipe.recipe_id,
        "recipe_name": recipe.recipe_name,
        "source_url": recipe.source_url,
        "total_score": len(flags),
        "flags": flags,
        "ingredient_count": ingredient_count,
        "empty_amount_ratio": round(empty_amount_ratio, 3),
        "missing_keywords_in_prep": missing_keywords,
    }


def print_report(results: list[dict[str, Any]]) -> None:
    healthy_count = sum(1 for result in results if result["total_score"] == 0)
    warning_count = sum(1 for result in results if result["total_score"] == 1)
    suspicious_results = [result for result in results if result["total_score"] >= 2]

    print("=== Yemek.com Tarif Audit Raporu ===")
    print(f"Taranan tarif: {len(results)}")
    print(f"Sağlıklı (0 puan):  {healthy_count}")
    print(f"Uyarı (1 puan):     {warning_count}")
    print(f"Şüpheli (2-3 puan): {len(suspicious_results)}")
    print()
    print("İlk 10 şüpheli tarif:")
    for result in suspicious_results[:10]:
        print(f"{result['recipe_id']} {result['recipe_name']} — flags: {result['flags']}")


def write_results(results: list[dict[str, Any]]) -> None:
    RESULTS_PATH.write_text(
        json.dumps(results, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def usage() -> str:
    return (
        "Kullanım:\n"
        "  python backend/scripts/audit_yemekcom_recipes.py --dry-run\n"
        "  python backend/scripts/audit_yemekcom_recipes.py --apply"
    )


def main() -> int:
    if len(sys.argv) != 2 or sys.argv[1] not in {"--dry-run", "--apply"}:
        print(usage())
        return 1

    should_apply = sys.argv[1] == "--apply"
    db = SessionLocal()
    try:
        recipes = recipe_repository.get_yemekcom_recipes_for_audit(db)
        results = [audit_recipe(recipe) for recipe in recipes]
        suspicious_ids = [
            result["recipe_id"]
            for result in results
            if result["total_score"] >= 2
        ]

        write_results(results)
        print_report(results)
        print()
        print(f"JSON rapor: {RESULTS_PATH}")

        if should_apply:
            input(f"{len(suspicious_ids)} tarif deaktif edilecek. Devam etmek için Enter'a bas.")
            deactivated_count = recipe_repository.deactivate_recipes(db, suspicious_ids)
            db.commit()
            print(f"Deaktif edilen tarif: {deactivated_count}")

        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
