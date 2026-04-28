import os
import sys
import time


base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(base_dir)

from app.db.database import SessionLocal
from app.db.models import Recipe
from app.services.recipe_import_service import save_scraped_recipe
from scraper.yemekcom_scraper import YemekComScraper


def main():
    db = SessionLocal()
    scraper = YemekComScraper()

    try:
        recipes = (
            db.query(Recipe)
            .filter(Recipe.source == "yemekcom", Recipe.source_url.is_not(None))
            .order_by(Recipe.recipe_id.asc())
            .all()
        )
        print(f"Güncellenecek yemek.com tarif sayısı: {len(recipes)}")

        for index, recipe in enumerate(recipes, start=1):
            print(f"[{index}/{len(recipes)}] {recipe.recipe_name}")
            try:
                recipe_data = scraper.parse_recipe_detail(recipe.source_url)
                if not recipe_data:
                    print("  -> [SKIP] Tarif ayristirilamadi.")
                    continue
                save_scraped_recipe(db, recipe_data)
                time.sleep(0.15)
            except Exception as exc:
                db.rollback()
                print(f"  -> [SKIP] Güncelleme başarısız: {exc}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
