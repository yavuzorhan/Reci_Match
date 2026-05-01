from __future__ import annotations

import argparse
import asyncio
import os
import sys

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(base_dir)

from app.db.database import SessionLocal
from app.services.ingredient_resolver_service import find_matching_ingredient


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


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", type=int, default=0)
    parser.add_argument("--dry-run", action="store_true", default=True)
    args = parser.parse_args()

    db = SessionLocal()
    try:
        for name in TEST_INPUTS:
            ingredient = find_matching_ingredient(db, args.user_id, name)
            print(f"{name}: ingredient_id={getattr(ingredient, 'ingredient_id', None)} name={getattr(ingredient, 'ingredient_name', None)}")
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
