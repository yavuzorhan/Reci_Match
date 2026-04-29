"""Batch sync ingredient nutrition values from USDA FoodData Central."""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.services.ingredient_nutrition_service import sync_missing_ingredient_nutrition


def main() -> None:
    db = SessionLocal()
    try:
        result = sync_missing_ingredient_nutrition(limit=50, db=db)
        print(result)
    finally:
        db.close()


if __name__ == "__main__":
    main()
