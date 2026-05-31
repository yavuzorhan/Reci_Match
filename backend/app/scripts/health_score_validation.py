"""Validate persisted recipe health scores against expected grade ranges."""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from app.db.database import SessionLocal  # noqa: E402
from app.repositories import recipe_repository  # noqa: E402


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


TEST_CASES = [
    ("Mercimek Çorbası", "A", "B"),
    ("Bulgur Pilavı", "A", "B"),
    ("Zeytinyağlı Taze Fasulye", "A", "B"),
    ("Sade Yoğurt", "A", "A"),
    ("Domates Çorbası", "A", "B"),
    ("Menemen", "B", "C"),
    ("Tavuk Pilav", "B", "B"),
    ("Ballı Tarçınlı Elma Cipsi", "B", "B"),
    ("Ali Nazik", "C", "C"),
    ("Sütlaç", "C", "C"),
    ("Patatesli Börek", "C", "D"),
    ("Kızarmış Patates", "C", "D"),
    ("Baklava", "C", "D"),
    ("Çikolatalı Kek", "D", "D"),
]

GRADE_ORDER = {"A": 4, "B": 3, "C": 2, "D": 1}
REPORT_PATH = Path.cwd() / "health_score_validation_report.md"


def grade_in_range(actual: str | None, min_g: str, max_g: str) -> bool:
    if actual not in GRADE_ORDER:
        return False
    return GRADE_ORDER[min_g] >= GRADE_ORDER[actual] >= GRADE_ORDER[max_g]


def ingredient_names(recipe: Any) -> list[str]:
    names = []
    for link in recipe.ingredients or []:
        ingredient = getattr(link, "ingredient", None)
        if ingredient and ingredient.ingredient_name:
            names.append(ingredient.ingredient_name)
    return names


def build_result(search_term: str, min_grade: str, max_grade: str, recipe: Any | None) -> dict[str, Any]:
    if recipe is None:
        return {
            "search_term": search_term,
            "status": "SKIP",
            "expected_min": min_grade,
            "expected_max": max_grade,
            "expected": f"{min_grade}-{max_grade}",
            "recipe": None,
        }

    status = "PASS" if grade_in_range(recipe.health_grade, min_grade, max_grade) else "FAIL"
    return {
        "search_term": search_term,
        "status": status,
        "expected_min": min_grade,
        "expected_max": max_grade,
        "expected": f"{min_grade}-{max_grade}",
        "recipe": recipe,
        "recipe_id": recipe.recipe_id,
        "recipe_name": recipe.recipe_name,
        "health_score": recipe.health_score,
        "health_grade": recipe.health_grade,
        "ingredients": ingredient_names(recipe),
        "applied_caps": recipe.health_explanation or "",
    }


def run_validation(db: Any) -> list[dict[str, Any]]:
    results = []
    for search_term, min_grade, max_grade in TEST_CASES:
        recipe = recipe_repository.find_active_recipe_by_name_for_health_validation(db, search_term)
        results.append(build_result(search_term, min_grade, max_grade, recipe))
    return results


def summarize(results: list[dict[str, Any]]) -> dict[str, Any]:
    pass_count = sum(1 for result in results if result["status"] == "PASS")
    fail_count = sum(1 for result in results if result["status"] == "FAIL")
    skip_count = sum(1 for result in results if result["status"] == "SKIP")
    tested_count = pass_count + fail_count
    success_rate = round((pass_count / tested_count) * 100) if tested_count else 0
    fail_rate = (fail_count / tested_count) * 100 if tested_count else 0
    return {
        "pass": pass_count,
        "fail": fail_count,
        "skip": skip_count,
        "tested": tested_count,
        "success_rate": success_rate,
        "fail_rate": fail_rate,
    }


def print_result_line(result: dict[str, Any]) -> None:
    if result["status"] == "SKIP":
        print(f"⚠️  {result['search_term']:<28} beklenen=[{result['expected']}] → SKIP (DB'de yok)")
        return

    icon = "✅" if result["status"] == "PASS" else "❌"
    print(
        f"{icon} {result['search_term']:<28} "
        f"score={result['health_score']}  grade={result['health_grade']}  "
        f"beklenen=[{result['expected']}] → {result['status']}"
    )


def print_summary(results: list[dict[str, Any]]) -> None:
    summary = summarize(results)
    for result in results:
        print_result_line(result)

    print()
    print("========================")
    print(f"PASS: {summary['pass']}  FAIL: {summary['fail']}  SKIP: {summary['skip']}")
    print(f"Başarı oranı: %{summary['success_rate']} (SKIP hariç)")

    failed_results = [result for result in results if result["status"] == "FAIL"]
    if not failed_results:
        return

    print()
    print("FAIL olan tarifler:")
    for result in failed_results:
        print(f"recipe_id={result['recipe_id']}  \"{result['recipe_name']}\"")
        print(f"  Mevcut: score={result['health_score']}, grade={result['health_grade']}")
        print(f"  Beklenen: {result['expected']}")
        print(f"  Malzemeler: [{', '.join(result['ingredients'])}]")
        print(f"  applied_caps: {result['applied_caps']}")


def observation_for_fail_rate(fail_rate: float) -> str:
    if fail_rate > 30:
        return "Hard cap eşikleri gözden geçirilmeli"
    if fail_rate >= 10:
        return "Bazı edge case'ler var, elle incelenmeli"
    return "Algoritma tutarlı çalışıyor"


def write_markdown_report(results: list[dict[str, Any]]) -> None:
    summary = summarize(results)
    failed_results = [result for result in results if result["status"] == "FAIL"]
    lines = [
        "# Health Score Validation Raporu",
        f"Tarih: {date.today().isoformat()}",
        "",
        "## Özet",
        f"PASS: {summary['pass']}  FAIL: {summary['fail']}  SKIP: {summary['skip']}",
        f"Başarı oranı: %{summary['success_rate']} (SKIP hariç)",
        "",
        "## FAIL Listesi",
        "| Tarif | Score | Grade | Beklenen | Recipe ID |",
        "|---|---:|:---:|:---:|---:|",
    ]

    if failed_results:
        for result in failed_results:
            lines.append(
                f"| {result['recipe_name']} | {result['health_score']} | "
                f"{result['health_grade']} | {result['expected']} | {result['recipe_id']} |"
            )
    else:
        lines.append("| - | - | - | - | - |")

    lines.extend([
        "",
        "## Gözlemler",
        observation_for_fail_rate(summary["fail_rate"]),
        "",
    ])

    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    db = SessionLocal()
    try:
        results = run_validation(db)
        print_summary(results)
        write_markdown_report(results)
        print()
        print(f"Markdown rapor: {REPORT_PATH}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
