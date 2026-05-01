"""
Yemek.com tariflerini kalite kriterlere göre denetler.
--dry-run: Sadece rapor üretir, DB'ye yazmaz.
--apply:   Şüpheli tarifleri is_active=False yapar.
"""
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


COMMON_INGREDIENT_KEYWORDS = [
    "soğan", "sogan", "sarımsak", "sarimsak", "domates", "biber",
    "yağ", "yag", "tuz", "su", "şeker", "seker", "un",
    "yumurta", "süt", "sut", "tereyağ", "tereyag", "zeytinyağı", "zeytinyagi",
    "limon", "maydanoz", "nane", "pirinç", "pirinc", "makarna",
    "tavuk", "et", "peynir", "yoğurt", "yogurt", "salça", "salca",
]


def audit_recipe(recipe, ingredient_keywords: list[str]) -> tuple[int, list[str], dict]:
    score = 0
    flags: list[str] = []
    details: dict = {}

    # Kriter A: Malzeme sayısı
    ingredient_count = len(recipe.ingredients)
    details["ingredient_count"] = ingredient_count
    if ingredient_count < 3:
        score += 1
        flags.append("az_malzeme")

    # Kriter B: Boş amount oranı
    total = len(recipe.ingredients)
    empty_amount = sum(
        1 for ri in recipe.ingredients
        if ri.amount is None or str(ri.amount).strip() == "" or float(ri.amount or 0) == 0
    )
    empty_ratio = empty_amount / total if total > 0 else 0
    details["empty_amount_ratio"] = round(empty_ratio, 2)
    if empty_ratio > 0.5:
        score += 1
        flags.append("bos_miktar_fazla")

    # Kriter C: Hazırlanış metni ile malzeme örtüşmesi
    preparation = (recipe.preparation or "").lower()
    ingredient_names = {
        (ri.ingredient.ingredient_name or "").lower()
        for ri in recipe.ingredients
        if ri.ingredient
    }
    missing_keywords: list[str] = []
    for keyword in ingredient_keywords:
        keyword_lower = keyword.lower()
        in_prep = keyword_lower in preparation
        in_ingredients = any(keyword_lower in name for name in ingredient_names)
        if in_prep and not in_ingredients:
            missing_keywords.append(keyword)

    details["missing_keywords"] = missing_keywords
    if len(missing_keywords) >= 3:
        score += 1
        flags.append("hazirlanis_malzeme_uyumsuz")

    return score, flags, details


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Yemek.com tariflerini kalite kriterlerine göre denetler."
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="Sadece rapor üretir, DB'ye yazmaz.")
    mode.add_argument("--apply", action="store_true", help="Şüpheli tarifleri is_active=False yapar.")
    parser.add_argument("--output", default=None, help="JSON çıktı dosyası yolu.")
    parser.set_defaults(dry_run=True)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        recipes = recipe_repository.get_yemekcom_recipes_for_audit(db)

        healthy_0 = 0
        warning_1 = 0
        suspicious_ids: list[int] = []
        suspicious_entries: list[dict] = []

        for recipe in recipes:
            score, flags, details = audit_recipe(recipe, COMMON_INGREDIENT_KEYWORDS)
            if score == 0:
                healthy_0 += 1
            elif score == 1:
                warning_1 += 1
            else:
                suspicious_ids.append(recipe.recipe_id)
                suspicious_entries.append({
                    "recipe_id": recipe.recipe_id,
                    "recipe_name": recipe.recipe_name,
                    "score": score,
                    "flags": flags,
                    "ingredient_count": details["ingredient_count"],
                    "empty_amount_ratio": details["empty_amount_ratio"],
                    "missing_keywords": details["missing_keywords"],
                })

        deactivated = 0
        if args.apply and suspicious_ids:
            deactivated = recipe_repository.deactivate_recipes(db, suspicious_ids)
            db.commit()

        output = {
            "summary": {
                "total": len(recipes),
                "healthy_0": healthy_0,
                "warning_1": warning_1,
                "suspicious_2plus": len(suspicious_ids),
                "deactivated": deactivated,
            },
            "suspicious": suspicious_entries,
        }

        output_path = args.output or str(Path(base_dir) / "audit_yemekcom_results.json")
        Path(output_path).write_text(
            json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        mode_label = "[--apply]" if args.apply else "[--dry-run]"
        print(f"{mode_label} Toplam tarif: {len(recipes)}")
        print(f"  Sağlıklı (skor=0):    {healthy_0}")
        print(f"  Uyarı    (skor=1):    {warning_1}")
        print(f"  Şüpheli  (skor>=2):   {len(suspicious_ids)}")
        if args.apply:
            print(f"  Devre dışı bırakıldı: {deactivated}")
        print(f"  Çıktı: {output_path}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
