from __future__ import annotations

import argparse
import asyncio
import os
import sys

# Windows terminallerde UTF-8 zorla
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(base_dir)

from app.db.database import SessionLocal
from app.services.ingredient_resolver_service import find_matching_ingredient
from app.utils.helpers import normalize_ingredient_name


# Eski basit çıktı listesi — dokunmadan korunuyor
TEST_INPUTS = [
    "pirinç unu",
    "pirinç kreması",
    "tam buğday unu",
    "beyaz un",
    "yulaf ezmesi",
    "yulaf unu",
    "şekersiz badem sütü",
    "süzme yoğurt",
]

# Beklenen eşleşmeli doğrulama test vakası
# (giriş adı, beklenen ingredient_name alt dizisi veya None = eşleşme olmamalı)
TEST_CASES = [
    ("pirinç unu",      "pirinç unu"),    # pirinç değil
    ("pirinç kreması",  None),            # eşleşme olmamalı
    ("tam buğday unu",  "tam buğday unu"),
    ("yulaf unu",       "yulaf unu"),     # yulaf değil
    ("bulgur",          "bulgur"),
    ("un",              "un"),            # tam eşleşmeli
    ("beyaz un",        "beyaz un"),
    ("zeytinyağı",      "zeytinyağı"),
]


def run_validation_tests(db, user_id: int = 0) -> int:
    """TEST_CASES üzerinden ✅/❌ rapor üretir; başarısız sayısını döner."""
    print("\n=== Validation Tests ===\n")
    failures = 0
    for input_name, expected in TEST_CASES:
        clean = normalize_ingredient_name(input_name)
        result = find_matching_ingredient(db, user_id=user_id, normalized_name=clean)
        found_name = result.ingredient_name if result else "YOK"
        ok = (
            (expected is None and result is None)
            or (expected and result and expected.lower() in result.ingredient_name.lower())
        )
        status = "✅" if ok else "❌"
        failures += 0 if ok else 1
        print(f"{status} '{input_name:25}' → '{found_name}' (beklenen: {expected})")

    total = len(TEST_CASES)
    print(f"\nSonuç: {total - failures}/{total} PASS | {failures} FAIL")
    return failures


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true", default=True)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        print("=== Basic Resolution ===\n")
        for name in TEST_INPUTS:
            ingredient = find_matching_ingredient(db, args.user_id, name)
            print(
                f"{name}: "
                f"ingredient_id={getattr(ingredient, 'ingredient_id', None)} "
                f"name={getattr(ingredient, 'ingredient_name', None)}"
            )

        failures = run_validation_tests(db, args.user_id)
        if failures:
            print("\n⚠️  Bazı testler başarısız. Skoru veya len_ratio ağırlığını ayarla.")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
