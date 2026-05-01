from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(base_dir)

from app.utils.recipe_health import calculate_health_score


CASES = [
    ("Mercimek Corbasi", 180, 10, 28, 3, "A"), ("Ezogelin Corbasi", 220, 9, 35, 5, "A"),
    ("Bulgur Pilavi", 280, 8, 55, 3, "B"), ("Beyaz Pirinc Pilavi", 360, 6, 75, 4, "C"),
    ("Izgara Tavuk", 320, 38, 8, 12, "A"), ("Tavuk Sote", 420, 35, 20, 18, "B"),
    ("Kuru Fasulye", 380, 18, 52, 8, "A"), ("Nohut Yemegi", 390, 16, 55, 9, "A"),
    ("Menemen", 260, 12, 14, 16, "C"), ("Sebze Yemegi", 220, 6, 24, 8, "B"),
    ("Zeytinyagli Yaprak Sarma", 430, 7, 52, 20, "B"), ("Karniyarik", 520, 20, 28, 34, "C"),
    ("Izmir Kofte", 610, 28, 42, 34, "B"), ("Lahmacun", 480, 22, 58, 16, "B"),
    ("Su Boregi", 650, 22, 62, 32, "B"), ("Pogaca", 430, 9, 48, 22, "B"),
    ("Baklava", 720, 9, 95, 32, "C"), ("Sutlac", 310, 8, 58, 6, "B"),
    ("Sekersiz Badem Sutu", 40, 1.5, 1.5, 3, "A"), ("Sade Yogurt", 65, 5, 4, 3, "A"),
    ("Tahinli Pekmez", 420, 8, 55, 20, "C"), ("Kisir", 330, 8, 60, 7, "B"),
    ("Humus", 350, 12, 35, 18, "B"), ("Haydari", 240, 10, 8, 18, "C"),
    ("Patates Kizartmasi", 520, 7, 65, 25, "C"), ("Makarna", 430, 12, 78, 7, "C"),
    ("Ton Balikli Salata", 300, 30, 18, 11, "A"), ("Kinoa Salatasi", 340, 12, 48, 10, "A"),
    ("Kremali Makarna", 760, 18, 82, 38, "D"), ("Sucuklu Yumurta", 620, 28, 4, 54, "D"),
    ("Etli Nohut", 460, 24, 52, 15, "B"), ("Tavuklu Salata", 260, 32, 12, 8, "A"),
    ("Kabak Mucver", 390, 13, 34, 22, "B"), ("Profiterol", 690, 12, 88, 32, "C"),
    ("Tarhana Corbasi", 190, 7, 30, 5, "B"), ("Coban Salata", 120, 4, 18, 5, "A"),
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", default=True)
    parser.parse_args()

    rows = ["| Tarif | Beklenen | Gercek | Skor | Durum |", "|---|---:|---:|---:|---|"]
    failures = 0
    distribution = {"A": 0, "B": 0, "C": 0, "D": 0}
    for name, calories, protein, carbs, fat, expected in CASES:
        result = calculate_health_score(calories, protein, carbs, fat, recipe_name=name)
        actual = result["health_grade"]
        distribution[actual] = distribution.get(actual, 0) + 1
        ok = actual == expected
        failures += 0 if ok else 1
        rows.append(f"| {name} | {expected} | {actual} | {result['health_score']} | {'OK' if ok else 'FAIL'} |")
    rows.append("")
    rows.append(f"Toplam: {len(CASES)}, Fail: {failures}")
    rows.append(f"Dagilim: A={distribution['A']}, B={distribution['B']}, C={distribution['C']}, D={distribution['D']}")
    output = Path(base_dir) / "health_score_validation_report.md"
    output.write_text("\n".join(rows), encoding="utf-8")
    print(f"report={output} failures={failures}")


if __name__ == "__main__":
    main()
