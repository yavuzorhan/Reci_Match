from __future__ import annotations

import argparse
import os
import sys
from types import SimpleNamespace

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(base_dir)

from app.utils.recipe_health import calculate_health_score


CASES = [
    ("Mercimek Çorbası", 180, 10, 28, 3, {"A", "B"}),
    ("Şekersiz Badem Sütü", 40, 1.5, 1.5, 3, {"A"}),
    ("Sade Yoğurt", 65, 5, 4, 3, {"A"}),
    ("Tahinli Pekmez", 420, 8, 55, 20, {"C", "D"}),
    ("Beyaz Pirinç Pilavı", 360, 6, 75, 4, {"C"}),
    ("Bulgur Pilavı", 280, 8, 55, 3, {"B"}),
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", default=True)
    parser.parse_args()

    for name, calories, protein, carbs, fat, expected in CASES:
        result = calculate_health_score(calories, protein, carbs, fat, recipe_name=name)
        grade = result["health_grade"]
        ok = grade in expected
        print(f"{name}: score={result['health_score']} grade={grade} expected={sorted(expected)} ok={ok}")


if __name__ == "__main__":
    main()
