"""
Mevcut DB'deki tariflerin health_score ve health_grade değerlerini
beklenen aralıklarla karşılaştırır.

Kullanım:
  python backend/scripts/health_score_validation.py
  python backend/scripts/health_score_validation.py --report health_validation.md
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from app.db.database import SessionLocal  # noqa: E402
from app.db.models import Recipe  # noqa: E402


# Grade sırası: A en iyi (4), D en kötü (1)
GRADE_ORDER = {"A": 4, "B": 3, "C": 2, "D": 1}

# (tarif adı arama terimi, beklenen min grade, beklenen max grade)
TEST_CASES = [
    # Sağlıklı/dengeli — A veya B beklenir
    ("Mercimek Çorbası",           "A", "B"),
    ("Bulgur Pilavı",              "A", "B"),
    ("Izgara Tavuk",               "A", "B"),
    ("Haşlama Tavuk",              "A", "B"),
    ("Zeytinyağlı Taze Fasulye",   "A", "B"),
    ("Mercimek Köftesi",           "A", "B"),
    ("Kısır",                      "A", "B"),

    # Orta — B veya C beklenir
    ("Tavuk Pilav",                "B", "B"),   # mevcut hedef B
    ("Menemen",                    "B", "C"),
    ("Mücver",                     "B", "C"),

    # Ağır — C beklenir
    ("Ali Nazik",                  "C", "C"),   # mevcut hedef C
    ("Sütlaç",                     "C", "C"),   # mevcut hedef C
    ("Ballı Tarçınlı Elma Cipsi",  "B", "B"),   # mevcut hedef B
    ("Patatesli Börek",            "C", "C"),

    # En ağır — C veya D beklenir
    ("Baklava",                    "C", "D"),
    ("Kızarmış Patates",           "C", "D"),
]


def grade_in_range(actual_grade: str, min_grade: str, max_grade: str) -> bool:
    """Aktüel grade beklenen aralıkta mı? A en iyi (4), D en kötü (1)."""
    actual = GRADE_ORDER.get(actual_grade, 0)
    min_val = GRADE_ORDER.get(min_grade, 0)
    max_val = GRADE_ORDER.get(max_grade, 0)
    # min_grade (üst sınır) >= actual >= max_grade (alt sınır)
    return max_val <= actual <= min_val


def find_recipe_by_name(db, name: str) -> Recipe | None:
    return (
        db.query(Recipe)
        .filter(Recipe.recipe_name.ilike(f"%{name}%"))
        .filter(Recipe.is_active.is_(True))
        .first()
    )


def run_validation(db) -> list[dict]:
    results = []
    for recipe_name, min_grade, max_grade in TEST_CASES:
        recipe = find_recipe_by_name(db, recipe_name)
        if not recipe:
            results.append({
                "name": recipe_name,
                "status": "SKIP",
                "actual_grade": None,
                "actual_score": None,
                "expected": f"[{min_grade}-{max_grade}]",
                "found_name": None,
            })
            continue

        actual_grade = recipe.health_grade
        actual_score = recipe.health_score

        if actual_grade and grade_in_range(actual_grade, min_grade, max_grade):
            status = "PASS"
        else:
            status = "FAIL"

        results.append({
            "name": recipe_name,
            "status": status,
            "actual_grade": actual_grade,
            "actual_score": actual_score,
            "expected": f"[{min_grade}-{max_grade}]",
            "found_name": recipe.recipe_name,
        })

    return results


def print_results(results: list[dict]) -> None:
    print("\n=== Health Score Validation ===\n")

    for r in results:
        icon = {"PASS": "✅", "FAIL": "❌", "SKIP": "⚠️ "}.get(r["status"], "   ")

        if r["status"] == "SKIP":
            print(f"{icon} {r['name']:40} → DB'de bulunamadı")
            continue

        score_str = str(r["actual_score"]) if r["actual_score"] is not None else "--"
        grade_str = r["actual_grade"] or "--"
        found_note = f"  (eşleşme: '{r['found_name']}')" if r["found_name"] != r["name"] else ""
        print(
            f"{icon} {r['name']:40}"
            f" score={score_str:>3}  grade={grade_str}"
            f"  beklenen={r['expected']}"
            f"{found_note}"
        )

    total = len(results)
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    skipped = sum(1 for r in results if r["status"] == "SKIP")
    tested = total - skipped

    print(f"\nSonuç: {passed}/{tested} PASS | {failed} FAIL | {skipped} SKIP")

    if tested > 0:
        rate = passed / tested * 100
        print(f"Başarı oranı: %{round(rate)}")
        if rate < 60:
            print(
                "\n⚠️  Başarı oranı düşük. "
                "recipe_health.py hard cap parametrelerini gözden geçir."
            )

    if failed:
        print("\nFAIL listesi:")
        for r in results:
            if r["status"] == "FAIL":
                score_str = str(r["actual_score"]) if r["actual_score"] is not None else "--"
                print(
                    f"  - {r['name']}: "
                    f"grade={r['actual_grade'] or '--'} score={score_str}"
                    f" → beklenen {r['expected']}"
                )


def generate_markdown_report(results: list[dict], path: str) -> None:
    total = len(results)
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    skipped = sum(1 for r in results if r["status"] == "SKIP")

    lines = [
        "# Health Score Validation Raporu",
        "",
        f"- Toplam test: {total}",
        f"- PASS: {passed}  FAIL: {failed}  SKIP: {skipped}",
        "",
        "| Tarif | Score | Grade | Beklenen | Sonuç |",
        "|-------|------:|------:|----------|-------|",
    ]
    for r in results:
        grade = r["actual_grade"] or "—"
        score = str(r["actual_score"]) if r["actual_score"] is not None else "—"
        icon = {"PASS": "✅", "FAIL": "❌", "SKIP": "⚠️"}.get(r["status"], "")
        lines.append(f"| {r['name']} | {score} | {grade} | {r['expected']} | {icon} {r['status']} |")

    Path(path).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nRapor yazıldı: {path}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="DB'deki tariflerin health_score/grade değerlerini doğrular."
    )
    parser.add_argument("--report", type=str, help="Markdown raporu kaydet (ör. health_validation.md)")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        results = run_validation(db)
        print_results(results)
        if args.report:
            generate_markdown_report(results, args.report)
    finally:
        db.close()


if __name__ == "__main__":
    main()
