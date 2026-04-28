import os
import sys
import time

from sqlalchemy import text


base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(base_dir)

from app.db.database import SessionLocal
from app.services.healthy_recipe_service import sync_healthy_recipes
from app.services.recipe_import_service import save_scraped_recipe
from scraper.yemekcom_scraper import YemekComScraper


DIET_CATEGORY_PATH = "/tarif/diyet/"
MAX_PAGES = 113
DELAY_SECONDS = 0.1


def _fallback_cooking_method(cooking_type: str | None) -> str | None:
    mapping = {
        "Fırın": "Fırınlama",
        "Tava": "Tavada Pişirme",
        "Tencere": "Haşlama",
        "Airfryer": "Airfryer",
        "Düdüklü": "Düdüklü Pişirme",
    }
    return mapping.get(cooking_type or "")


def _is_complete_recipe(recipe_data: dict | None) -> bool:
    if not recipe_data:
        return False

    required_fields = [
        "title",
        "recipe_category",
        "image_url",
        "instructions",
        "serving",
        "calorie",
        "protein",
        "carbohydrate",
        "fat",
        "total_time_minutes",
        "cooking_type",
        "cooking_method",
    ]
    if any(recipe_data.get(field) in (None, "", []) for field in required_fields):
        return False
    if len(recipe_data.get("ingredients") or []) < 3:
        return False
    return True


def _delete_existing_healthy_set(db) -> dict:
    recipe_ids = [
        recipe_id
        for (recipe_id,) in db.execute(text("SELECT recipe_id FROM healthy_recipes")).fetchall()
    ]
    if not recipe_ids:
        return {"deleted_recipes": 0}

    db.execute(text("DELETE FROM healthy_recipes WHERE recipe_id = ANY(:ids)"), {"ids": recipe_ids})
    db.execute(text("DELETE FROM daily_logs WHERE recipe_id = ANY(:ids)"), {"ids": recipe_ids})
    db.execute(text("DELETE FROM favorites WHERE recipe_id = ANY(:ids)"), {"ids": recipe_ids})
    db.execute(text("DELETE FROM recipe_ingredients WHERE recipe_id = ANY(:ids)"), {"ids": recipe_ids})
    db.execute(text("DELETE FROM recipes WHERE recipe_id = ANY(:ids)"), {"ids": recipe_ids})
    db.commit()
    return {"deleted_recipes": len(recipe_ids)}


def main():
    scraper = YemekComScraper()
    db = SessionLocal()

    try:
        cleanup = _delete_existing_healthy_set(db)
        print(f"Silinen eski saglikli tarif: {cleanup['deleted_recipes']}")

        links = scraper.collect_recipe_links(
            category_paths=[DIET_CATEGORY_PATH],
            target_link_count=5000,
            max_pages_per_category=MAX_PAGES,
        )
        print(f"Toplanan diyet tarif linki: {len(links)}")

        imported = 0
        skipped_incomplete = 0
        failed = 0

        for index, link in enumerate(links, start=1):
            print(f"[{index}/{len(links)}] {link}")
            try:
                recipe_data = scraper.parse_recipe_detail(link)
            except Exception as exc:
                failed += 1
                print(f"  -> [FAIL] okunamadi: {exc}")
                continue

            if recipe_data:
                recipe_data["source"] = "yemekcom_diet"
                if not recipe_data.get("cooking_method"):
                    recipe_data["cooking_method"] = _fallback_cooking_method(recipe_data.get("cooking_type"))

            if not _is_complete_recipe(recipe_data):
                skipped_incomplete += 1
                print("  -> [SKIP] zorunlu alanlar eksik.")
                continue

            try:
                save_scraped_recipe(db, recipe_data)
                imported += 1
                print(
                    f"  -> [OK] {recipe_data['title']} | "
                    f"{recipe_data['recipe_category']} | "
                    f"{recipe_data['total_time_minutes']}dk | "
                    f"{recipe_data['cooking_type']} / {recipe_data['cooking_method']}"
                )
            except Exception as exc:
                db.rollback()
                failed += 1
                print(f"  -> [FAIL] kaydedilemedi: {exc}")

            time.sleep(DELAY_SECONDS)

        sync_result = sync_healthy_recipes(db)
        print(f"Import edilen: {imported}")
        print(f"Eksik alan yuzunden atlanan: {skipped_incomplete}")
        print(f"Hata alan: {failed}")
        print(sync_result["message"])
        print(f"Healthy total: {sync_result['total']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
