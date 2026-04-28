"""Backfill recipe_ingredients.miktar_gram from original amount/unit data.

Run from backend directory:
    python scripts/backfill_recipe_ingredient_grams.py --dry-run
    python scripts/backfill_recipe_ingredient_grams.py --apply

Take a PostgreSQL backup before running --apply.
"""
from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from sqlalchemy import text  # noqa: E402

from app.db.database import SessionLocal  # noqa: E402
from app.services.unit_conversion_service import (  # noqa: E402
    convert_recipe_ingredient_amount,
    ensure_unit_conversion_schema,
    normalize_unit_key,
    seed_default_unit_conversions,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Normalize recipe ingredient amounts to grams.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="Calculate and report without updating recipe_ingredients.")
    mode.add_argument("--apply", action="store_true", help="Persist amount_gram conversion updates.")
    parser.add_argument("--cup-ml", type=int, choices=[200, 240], default=200, help="Cup profile in ml. Default: 200.")
    parser.add_argument(
        "--unit-profile",
        choices=["yemek_com_profile", "tr_200ml_profile", "us_fda_profile"],
        default="yemek_com_profile",
        help="Volume profile for spoon/cup fallback conversions.",
    )
    parser.add_argument("--log-file", default="recipe_ingredient_gram_backfill_unconverted.log")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    print("UYARI: --apply calistirmadan once PostgreSQL backup aldiginizdan emin olun.")

    stats = Counter()
    unconverted_units = Counter()
    unconverted_lines: list[str] = []

    with SessionLocal() as db:
        ensure_unit_conversion_schema(db)
        inserted = seed_default_unit_conversions(
            db,
            cup_ml=args.cup_ml,
            commit=False,
            unit_profile=args.unit_profile,
        )
        if inserted:
            print(f"Seed conversion satiri eklendi: {inserted}")

        rows = db.execute(text("""
            SELECT
                ri.recipe_ingredient_id,
                ri.recipe_id,
                ri.ingredient_id,
                ri.amount,
                ri.unit,
                i.ingredient_name
            FROM recipe_ingredients ri
            JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
            ORDER BY ri.recipe_ingredient_id ASC
        """)).mappings().all()

        for row in rows:
            stats["total"] += 1
            result = convert_recipe_ingredient_amount(
                db=db,
                ingredient_id=row["ingredient_id"],
                ingredient_name=row["ingredient_name"],
                amount=row["amount"],
                unit=row["unit"],
                unit_profile=args.unit_profile,
            )
            confidence = result.confidence or "null"
            if result.grams is not None:
                stats["converted"] += 1
                stats[confidence] += 1
                if args.apply:
                    db.execute(
                        text("""
                            UPDATE recipe_ingredients
                            SET miktar_gram = :miktar_gram,
                                donusum_kaynagi = :donusum_kaynagi,
                                donusum_guveni = :donusum_guveni,
                                donusum_notu = :donusum_notu
                            WHERE recipe_ingredient_id = :recipe_ingredient_id
                        """),
                        {
                            "miktar_gram": result.grams,
                            "donusum_kaynagi": result.source,
                            "donusum_guveni": result.confidence,
                            "donusum_notu": result.note,
                            "recipe_ingredient_id": row["recipe_ingredient_id"],
                        },
                    )
            else:
                stats["unconverted"] += 1
                stats["null"] += 1
                unit_key = result.unit_key or normalize_unit_key(row["unit"]) or "UNKNOWN"
                unconverted_units[unit_key] += 1
                unconverted_lines.append(
                    "|".join(
                        [
                            f"recipe_ingredient_id={row['recipe_ingredient_id']}",
                            f"recipe_id={row['recipe_id']}",
                            f"ingredient={row['ingredient_name']}",
                            f"amount={row['amount']}",
                            f"unit={row['unit']}",
                            f"unit_key={unit_key}",
                            f"note={result.note}",
                        ]
                    )
                )
                if args.apply:
                    db.execute(
                        text("""
                            UPDATE recipe_ingredients
                            SET miktar_gram = NULL,
                                donusum_kaynagi = :donusum_kaynagi,
                                donusum_guveni = :donusum_guveni,
                                donusum_notu = :donusum_notu
                            WHERE recipe_ingredient_id = :recipe_ingredient_id
                        """),
                        {
                            "donusum_kaynagi": result.source,
                            "donusum_guveni": result.confidence,
                            "donusum_notu": result.note,
                            "recipe_ingredient_id": row["recipe_ingredient_id"],
                        },
                    )

        if args.apply:
            db.commit()
        else:
            db.rollback()

    if unconverted_lines:
        Path(args.log_file).write_text("\n".join(unconverted_lines), encoding="utf-8")

    print_report(stats, unconverted_units, args)
    return 0


def print_report(stats: Counter, unconverted_units: Counter, args: argparse.Namespace) -> None:
    print("\nBackfill raporu")
    print(f"Mod: {'APPLY' if args.apply else 'DRY-RUN'}")
    print(f"Birim profili: {args.unit_profile}")
    print(f"Toplam recipe_ingredients kaydi: {stats['total']}")
    print(f"Gram'a cevrilen kayit sayisi: {stats['converted']}")
    print(f"High confidence sayisi: {stats['high']}")
    print(f"Medium confidence sayisi: {stats['medium']}")
    print(f"Low confidence sayisi: {stats['low']}")
    print(f"Donusturulemeyen kayit sayisi: {stats['unconverted']}")
    print("En cok donusturulemeyen birimler:")
    if not unconverted_units:
        print("  Yok")
    for unit, count in unconverted_units.most_common(10):
        print(f"  {unit}: {count}")
    if stats["unconverted"]:
        print(f"Log dosyasi: {args.log_file}")


if __name__ == "__main__":
    raise SystemExit(main())
