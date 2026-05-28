"""Complete missing ingredient nutrition values using Gemini AI."""
from __future__ import annotations

import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.services.ingredient_nutrition_service import complete_missing_ingredient_nutrition


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Complete missing ingredient nutrition values.")
    parser.add_argument("--limit", type=int, default=50)
    parser.add_argument(
        "--global-only",
        action="store_true",
        help="Only scan global ingredients; by default user ingredients are included too.",
    )
    return parser.parse_args()


async def run() -> None:
    args = parse_args()
    db = SessionLocal()
    try:
        result = await complete_missing_ingredient_nutrition(
            limit=args.limit,
            db=db,
            include_user_ingredients=not args.global_only,
        )
        print(result)
    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(run())
