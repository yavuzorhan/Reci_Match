"""Batch import USDA nutrition values into local PostgreSQL."""
from __future__ import annotations

import json

from app.db.database import SessionLocal
from app.services.usda_client import UsdaClient
from app.services.usda_mapping_service import import_all_missing_nutrition


def main() -> None:
    db = SessionLocal()
    try:
        client = UsdaClient()
        report = import_all_missing_nutrition(db, client)
        summary = report["summary"]
        print(f"Total ingredients: {summary['Total ingredients']}")
        print(f"Matched: {summary['Matched']}")
        print(f"Manual review: {summary['Manual review']}")
        print(f"No result: {summary['No result']}")
        print(f"Nutrition saved: {summary['Nutrition saved']}")
        print(f"Nutrition missing: {summary['Nutrition missing']}")
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
