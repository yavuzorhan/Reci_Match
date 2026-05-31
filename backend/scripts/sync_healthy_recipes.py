import os
import sys


base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(base_dir)

from app.db.database import SessionLocal
from app.services.healthy_recipe_service import sync_healthy_recipes


def main():
    db = SessionLocal()
    try:
        result = sync_healthy_recipes(db)
        print(result["message"])
        print(f"Upsert edilen: {result['upserted']}")
        print(f"Silinen: {result['deleted']}")
        print(f"Toplam healthy_recipes: {result['total']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
