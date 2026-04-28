import os
import re
import sys
import unicodedata
from collections import Counter, defaultdict


base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(base_dir)

from app.db.database import SessionLocal
from app.db.models import Ingredient, Recipe
from app.services.recipe_import_service import save_scraped_recipe
from app.utils.helpers import infer_ingredient_category, normalize_ingredient_name
from app.utils.recipe_translation import translate_recipe_payload
from scraper.eatingwell_scraper import COLLECTION_URLS, EatingWellScraper


CATEGORY_TARGETS = {
    "Kahvaltı": 65,
    "Ana Yemek": 90,
    "Tatlı": 25,
    "Ara Öğün": 20,
}

TARGET_RECIPE_COUNT = sum(CATEGORY_TARGETS.values())
SIMILARITY_THRESHOLD = 0.84

TITLE_STOP_WORDS = {
    "recipe", "recipes", "easy", "healthy", "well", "eatingwell", "quick", "and", "with",
    "the", "for", "better", "your", "our", "best", "high", "low",
}


def _ascii_fold(value: str) -> str:
    translation = str.maketrans(
        {
            "ç": "c", "Ç": "c",
            "ğ": "g", "Ğ": "g",
            "ı": "i", "İ": "i",
            "ö": "o", "Ö": "o",
            "ş": "s", "Ş": "s",
            "ü": "u", "Ü": "u",
        }
    )
    normalized = unicodedata.normalize("NFKD", value.translate(translation))
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    return " ".join(normalized.lower().split())


def _tokenize_title(title: str) -> set[str]:
    return {
        token
        for token in re.split(r"[^a-z0-9]+", _ascii_fold(title))
        if token and token not in TITLE_STOP_WORDS and len(token) > 1
    }


def _canonical_title(title: str) -> str:
    tokens = sorted(_tokenize_title(title))
    return " ".join(tokens[:5]) if tokens else _ascii_fold(title)


def _title_similarity(left: str, right: str) -> float:
    left_tokens = _tokenize_title(left)
    right_tokens = _tokenize_title(right)
    if not left_tokens or not right_tokens:
        return 0.0
    intersection = len(left_tokens & right_tokens)
    union = len(left_tokens | right_tokens)
    return intersection / union if union else 0.0


def _load_existing_titles(db) -> dict[str, str]:
    rows = db.query(Recipe.recipe_name).all()
    return {
        _ascii_fold(name): name
        for (name,) in rows
        if name
    }


def _load_existing_ingredient_map(db) -> dict[str, Ingredient]:
    rows = db.query(Ingredient).filter(Ingredient.user_id.is_(None)).all()
    return {
        _ascii_fold(item.ingredient_name or ""): item
        for item in rows
        if item.ingredient_name
    }


def _normalize_recipe_ingredients(recipe_data: dict, ingredient_map: dict[str, Ingredient], db) -> tuple[list[dict], list[str]]:
    normalized_rows: list[dict] = []
    created_names: list[str] = []
    seen_ids: set[int] = set()

    for item in recipe_data.get("ingredients", []):
        raw_name = (item.get("name") or "").strip(" -)(",)
        if not raw_name:
            continue

        normalized_name = normalize_ingredient_name(raw_name)
        key = _ascii_fold(normalized_name)
        ingredient = ingredient_map.get(key)

        if ingredient is None:
            category_name, category_id = infer_ingredient_category(normalized_name)
            ingredient = Ingredient(
                ingredient_name=normalized_name,
                category=category_name,
                category_id=category_id,
            )
            db.add(ingredient)
            db.flush()
            ingredient_map[key] = ingredient
            created_names.append(normalized_name)

        if ingredient.ingredient_id in seen_ids:
            continue

        seen_ids.add(ingredient.ingredient_id)
        normalized_rows.append(
            {
                "ingredient_id": ingredient.ingredient_id,
                "name": ingredient.ingredient_name,
                "amount": item.get("amount"),
                "unit": item.get("unit"),
            }
        )

    return normalized_rows, sorted(set(created_names))


def _health_labels(recipe_data: dict) -> list[str]:
    description = _ascii_fold(recipe_data.get("description") or "")
    labels = set()

    is_main = recipe_data.get("recipe_category") == "Ana Yemek"
    carb_limit = 25 if is_main else 20
    protein_limit = 25 if is_main else 15
    calorie_limit = 550 if is_main else 400 if recipe_data.get("recipe_category") == "Kahvaltı" else 250

    if recipe_data.get("carbohydrate") is not None and float(recipe_data["carbohydrate"]) <= carb_limit:
        labels.add("Düşük Karbonhidrat")
    if recipe_data.get("protein") is not None and float(recipe_data["protein"]) >= protein_limit:
        labels.add("Yüksek Protein")
    if recipe_data.get("calorie") is not None and float(recipe_data["calorie"]) <= calorie_limit:
        labels.add("Düşük Kalori")

    if "dusuk karbonhidrat" in description or "low-carb" in description or "low carb" in description:
        labels.add("Düşük Karbonhidrat")
    if "yuksek protein" in description or "high-protein" in description or "high protein" in description:
        labels.add("Yüksek Protein")
    if "dusuk kalori" in description or "low-calorie" in description or "low calorie" in description or "weight loss" in description:
        labels.add("Düşük Kalori")

    return sorted(labels)


def _is_valid_recipe(recipe_data: dict) -> bool:
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
    if recipe_data["recipe_category"] not in CATEGORY_TARGETS:
        return False
    if len(recipe_data.get("ingredients") or []) < 3:
        return False
    return True


def _is_duplicate(candidate: dict, selected: list[dict], existing_titles: dict[str, str]) -> bool:
    folded = _ascii_fold(candidate["title"])
    if folded in existing_titles:
        return True

    for item in selected:
        if _ascii_fold(item["title"]) == folded:
            return True
        if item["canonical_title"] == candidate["canonical_title"]:
            return True
        if _title_similarity(item["title"], candidate["title"]) >= SIMILARITY_THRESHOLD:
            return True
    return False


def _selection_priority(recipe_data: dict, category_counts: Counter) -> tuple:
    return (
        CATEGORY_TARGETS[recipe_data["recipe_category"]] - category_counts[recipe_data["recipe_category"]] > 0,
        len(recipe_data.get("health_labels", [])),
        recipe_data.get("protein") or 0,
        -(recipe_data.get("carbohydrate") or 999),
        -(recipe_data.get("calorie") or 9999),
        -(recipe_data.get("total_time_minutes") or 9999),
    )


def _collect_candidates(scraper: EatingWellScraper, ingredient_map: dict[str, Ingredient], db) -> tuple[list[dict], Counter]:
    candidates: list[dict] = []
    created_ingredients: Counter = Counter()

    for category_name, urls in COLLECTION_URLS.items():
        links = scraper.collect_recipe_links(urls)
        print(f"{category_name} için link sayısı: {len(links)}")
        for index, link in enumerate(links, start=1):
            print(f"[{category_name} {index}/{len(links)}] {link}")
            try:
                recipe_data = scraper.parse_recipe_detail(link, forced_category=category_name)
            except Exception as exc:
                print(f"  -> [SKIP] okunamadı: {exc}")
                continue

            recipe_data = translate_recipe_payload(recipe_data)

            if not recipe_data or not _is_valid_recipe(recipe_data):
                print("  -> [SKIP] kriterler sağlanmadı.")
                continue

            normalized_ingredients, created_names = _normalize_recipe_ingredients(recipe_data, ingredient_map, db)
            if len(normalized_ingredients) < 3:
                db.rollback()
                print("  -> [SKIP] malzeme eşleşmesi yetersiz.")
                continue

            recipe_data["ingredients"] = normalized_ingredients
            recipe_data["canonical_title"] = _canonical_title(recipe_data["title"])
            recipe_data["health_labels"] = _health_labels(recipe_data)
            for name in created_names:
                created_ingredients[name] += 1

            candidates.append(recipe_data)
            print(
                f"  -> [OK] etiket={', '.join(recipe_data['health_labels'])} "
                f"kalori={recipe_data['calorie']} protein={recipe_data['protein']} karbonhidrat={recipe_data['carbohydrate']}"
            )

    return candidates, created_ingredients


def _select_recipes(candidates: list[dict], existing_titles: dict[str, str]) -> list[dict]:
    selected: list[dict] = []
    category_counts: Counter = Counter()
    by_category: dict[str, list[dict]] = defaultdict(list)

    for candidate in candidates:
        by_category[candidate["recipe_category"]].append(candidate)

    for category_name, target in CATEGORY_TARGETS.items():
        pool = sorted(by_category.get(category_name, []), key=lambda item: _selection_priority(item, category_counts), reverse=True)
        for candidate in pool:
            if category_counts[category_name] >= target:
                break
            if _is_duplicate(candidate, selected, existing_titles):
                continue
            selected.append(candidate)
            category_counts[category_name] += 1

        if category_counts[category_name] < target:
            raise RuntimeError(f"{category_name} için hedefe ulaşılamadı: {category_counts[category_name]}/{target}")

    if len(selected) != TARGET_RECIPE_COUNT:
        raise RuntimeError(f"Toplam hedefe ulaşılamadı: {len(selected)}/{TARGET_RECIPE_COUNT}")

    return selected


def _print_summary(selected: list[dict], created_ingredients: Counter, inserted: int):
    category_counts = Counter(item["recipe_category"] for item in selected)
    health_counts = Counter()
    for item in selected:
        for label in item.get("health_labels", []):
            health_counts[label] += 1

    print("EatingWell sağlıklı import özeti")
    print("  Eklenen tarif:", inserted)
    print("  Kategori dağılımı:", dict(category_counts))
    print("  Sağlık etiketleri:", dict(health_counts))
    print("  Yeni malzeme sayısı:", len(created_ingredients))
    if created_ingredients:
        print("  İlk yeni malzemeler:", list(created_ingredients.keys())[:20])


def main():
    scraper = EatingWellScraper()
    db = SessionLocal()

    try:
        existing_titles = _load_existing_titles(db)
        ingredient_map = _load_existing_ingredient_map(db)
        print(f"Mevcut tarif sayısı: {len(existing_titles)}")
        print(f"Mevcut malzeme sayısı: {len(ingredient_map)}")

        candidates, created_ingredients = _collect_candidates(scraper, ingredient_map, db)
        print(f"Toplam aday: {len(candidates)}")
        db.commit()

        selected = _select_recipes(candidates, existing_titles)

        inserted = 0
        updated = 0
        for index, recipe_data in enumerate(selected, start=1):
            print(f"[IMPORT {index}/{len(selected)}] {recipe_data['title']}")
            try:
                _, created = save_scraped_recipe(db, recipe_data)
                if created:
                    inserted += 1
                else:
                    updated += 1
            except Exception as exc:
                db.rollback()
                print(f"  -> [FAIL] {exc}")

        _print_summary(selected, created_ingredients, inserted)
        print("  Güncellenen tarif:", updated)
    finally:
        db.close()


if __name__ == "__main__":
    main()
