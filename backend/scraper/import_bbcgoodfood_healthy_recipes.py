import os
import re
import sys
import unicodedata
from collections import Counter, defaultdict

from sqlalchemy import text


base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(base_dir)

from app.db.database import SessionLocal
from app.db.models import Ingredient, Recipe
from app.services.recipe_import_service import save_scraped_recipe
from app.utils.helpers import infer_ingredient_category, normalize_ingredient_name
from app.utils.recipe_translation import translate_recipe_payload
from scraper.bbcgoodfood_scraper import BBCGoodFoodScraper, HEALTHY_COLLECTION_PATHS


CATEGORY_TARGETS = {
    "Kahvaltı": 30,
    "Ana Yemek": 55,
    "Tatlı": 15,
}

SIMILARITY_THRESHOLD = 0.84
DELAY_SECONDS = 0.25
MAX_INGREDIENT_NAME_LENGTH = 100

TITLE_STOP_WORDS = {
    "recipe", "recipes", "easy", "healthy", "good", "food", "quick", "simple",
    "the", "and", "for", "with", "low", "calorie", "high", "protein",
}

INGREDIENT_STOP_PHRASES = [
    "to serve",
    "for the sauce",
    "for the dressing",
    "for the topping",
    "for garnish",
    "plus extra",
    "optional",
]


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


def _load_existing_title_index(db) -> dict[str, str]:
    rows = db.query(Recipe.recipe_name).all()
    return {
        _ascii_fold(recipe_name): recipe_name
        for (recipe_name,) in rows
        if recipe_name
    }


def _load_existing_ingredient_map(db) -> dict[str, Ingredient]:
    rows = db.query(Ingredient).filter(Ingredient.user_id.is_(None)).all()
    ingredient_map: dict[str, Ingredient] = {}
    for ingredient in rows:
        key = _ascii_fold(ingredient.ingredient_name or "")
        if key:
            ingredient_map[key] = ingredient
    return ingredient_map


def _ensure_recipe_columns(db):
    statements = [
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'recipes' AND column_name = 'recipe_category'
            ) THEN
                ALTER TABLE recipes ADD COLUMN recipe_category VARCHAR(50);
            END IF;
        END $$;
        """,
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'recipes' AND column_name = 'cooking_method'
            ) THEN
                ALTER TABLE recipes ADD COLUMN cooking_method VARCHAR(50);
            END IF;
        END $$;
        """,
    ]
    for statement in statements:
        db.execute(text(statement))
    db.commit()


def _load_existing_source_category_counts(db) -> Counter:
    rows = db.execute(
        text(
            """
            SELECT recipe_category, COUNT(*)
            FROM recipes
            WHERE source = 'bbcgoodfood'
            GROUP BY recipe_category
            """
        )
    ).fetchall()
    return Counter({category: count for category, count in rows if category})


def _simplify_ingredient_name(raw_name: str) -> str:
    text = " ".join((raw_name or "").split())
    if not text:
        return ""

    text = re.sub(r"\([^)]*\)", " ", text)
    for phrase in INGREDIENT_STOP_PHRASES:
        text = re.sub(rf"\b{re.escape(phrase)}\b.*$", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\b(?:x\s+)?\d+\s*(?:g|kg|ml|l)\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\b(?:can|cans|jar|jars|pack|packs)\b", "", text, flags=re.IGNORECASE)
    text = re.sub(
        r"\b(chopped|finely chopped|roughly chopped|halved|sliced|diced|peeled|crushed|grated|beaten|drained|rinsed|cooked|uncooked|fresh)\b",
        "",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"\s+", " ", text).strip(" ,.-")

    for separator in [" or ", ",", " using ", " with "]:
        if separator in text.lower():
            parts = re.split(re.escape(separator), text, maxsplit=1, flags=re.IGNORECASE)
            text = parts[0].strip(" ,.-")
            break

    return text


def _safe_normalized_name(raw_name: str) -> str:
    simplified = _simplify_ingredient_name(raw_name)
    normalized_name = normalize_ingredient_name(simplified or raw_name)
    normalized_name = " ".join((normalized_name or "").split()).strip(" ,.-")

    if len(normalized_name) <= MAX_INGREDIENT_NAME_LENGTH:
        return normalized_name

    truncated = normalized_name[:MAX_INGREDIENT_NAME_LENGTH].rsplit(" ", 1)[0].strip(" ,.-")
    return truncated or normalized_name[:MAX_INGREDIENT_NAME_LENGTH].strip(" ,.-")


def _normalize_recipe_ingredients(
    recipe_data: dict,
    ingredient_map: dict[str, Ingredient],
    db,
) -> tuple[list[dict], list[str], list[str]]:
    normalized_rows: list[dict] = []
    missing_created: list[str] = []
    skipped_rows: list[str] = []
    seen_ids: set[int] = set()

    for item in recipe_data.get("ingredients", []):
        raw_name = (item.get("name") or "").strip(" -)(,")
        if not raw_name:
            continue

        normalized_name = _safe_normalized_name(raw_name)
        if not normalized_name:
            skipped_rows.append(raw_name)
            continue

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
            missing_created.append(normalized_name)

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

    return normalized_rows, sorted(set(missing_created)), skipped_rows


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


def _selection_priority(recipe_data: dict, category_counts: Counter, active_targets: dict[str, int]) -> tuple:
    category_gap = active_targets[recipe_data["recipe_category"]] - category_counts[recipe_data["recipe_category"]]
    return (
        category_gap > 0,
        recipe_data.get("protein") or 0,
        -(recipe_data.get("carbohydrate") or 999),
        -(recipe_data.get("calorie") or 9999),
        -(recipe_data.get("total_time_minutes") or 9999),
    )


def _is_duplicate_candidate(candidate: dict, existing_titles: dict[str, str], selected: list[dict]) -> bool:
    folded = _ascii_fold(candidate["title"])
    canonical = _canonical_title(candidate["title"])
    if folded in existing_titles:
        return True

    for item in selected:
        if _ascii_fold(item["title"]) == folded:
            return True
        if item["canonical_title"] == canonical:
            return True
        if _title_similarity(item["title"], candidate["title"]) >= SIMILARITY_THRESHOLD:
            return True

    return False


def _collect_candidates(scraper: BBCGoodFoodScraper, ingredient_map: dict[str, Ingredient], db) -> tuple[list[dict], Counter]:
    candidates: list[dict] = []
    created_ingredients: Counter = Counter()

    for forced_category, paths in HEALTHY_COLLECTION_PATHS.items():
        per_category_target = max(CATEGORY_TARGETS.get(forced_category, 0) * 4, 40)
        links = scraper.collect_recipe_links(
            collection_paths=paths,
            target_link_count=per_category_target,
            delay_seconds=DELAY_SECONDS,
        )
        print(f"{forced_category} için toplanan link sayısı: {len(links)}")

        for index, link in enumerate(links, start=1):
            print(f"[{forced_category} {index}/{len(links)}] okunuyor: {link}")
            try:
                recipe_data = scraper.parse_recipe_detail(link, forced_category=forced_category)
            except Exception as exc:
                db.rollback()
                print(f"  -> [SKIP] okunamadı: {exc}")
                continue

            recipe_data = translate_recipe_payload(recipe_data)

            if not recipe_data or not _is_valid_recipe(recipe_data):
                print("  -> [SKIP] tarif kriterleri karşılanmadı.")
                continue

            try:
                normalized_ingredients, created_names, skipped_rows = _normalize_recipe_ingredients(
                    recipe_data,
                    ingredient_map,
                    db,
                )
            except Exception as exc:
                db.rollback()
                print(f"  -> [SKIP] malzeme eşleştirme hatası: {exc}")
                continue

            if len(normalized_ingredients) < 3:
                db.rollback()
                print("  -> [SKIP] kullanılabilir malzeme sayısı düşük.")
                continue

            for name in created_names:
                created_ingredients[name] += 1

            if skipped_rows:
                print(f"  -> [INFO] atlanan ham malzeme: {', '.join(skipped_rows[:3])}")

            recipe_data["ingredients"] = normalized_ingredients
            recipe_data["canonical_title"] = _canonical_title(recipe_data["title"])
            candidates.append(recipe_data)
            print(
                f"  -> [OK] kategori={recipe_data['recipe_category']} "
                f"kalori={recipe_data['calorie']} protein={recipe_data['protein']} karbonhidrat={recipe_data['carbohydrate']}"
            )

    return candidates, created_ingredients


def _select_recipes(candidates: list[dict], existing_titles: dict[str, str], active_targets: dict[str, int]) -> list[dict]:
    selected: list[dict] = []
    category_counts: Counter = Counter()
    by_category: dict[str, list[dict]] = defaultdict(list)

    for candidate in candidates:
        by_category[candidate["recipe_category"]].append(candidate)

    for category_name, target in active_targets.items():
        pool = sorted(
            by_category.get(category_name, []),
            key=lambda item: _selection_priority(item, category_counts, active_targets),
            reverse=True,
        )

        for candidate in pool:
            if category_counts[category_name] >= target:
                break
            if _is_duplicate_candidate(candidate, existing_titles, selected):
                continue
            selected.append(candidate)
            category_counts[category_name] += 1

        if category_counts[category_name] < target:
            raise RuntimeError(
                f"{category_name} kategorisi için hedefe ulaşılamadı: {category_counts[category_name]}/{target}"
            )

    target_recipe_count = sum(active_targets.values())
    if len(selected) != target_recipe_count:
        raise RuntimeError(f"Toplam seçilen tarif hedefe ulaşılamadı: {len(selected)}/{target_recipe_count}")

    return selected


def _print_summary(selected: list[dict], created_ingredients: Counter, inserted: int):
    category_counts = Counter(item["recipe_category"] for item in selected)
    print("BBC Good Food sağlıklı import özeti")
    print("  Eklenen tarif:", inserted)
    print("  Kategori dağılımı:", dict(category_counts))
    print("  Yeni oluşturulan malzemeler:", len(created_ingredients))
    if created_ingredients:
        print("  İlk yeni malzemeler:", list(created_ingredients.keys())[:20])


def main():
    scraper = BBCGoodFoodScraper()
    db = SessionLocal()

    try:
        _ensure_recipe_columns(db)
        existing_titles = _load_existing_title_index(db)
        existing_source_counts = _load_existing_source_category_counts(db)
        active_targets = {
            category: max(target - existing_source_counts.get(category, 0), 0)
            for category, target in CATEGORY_TARGETS.items()
        }
        ingredient_map = _load_existing_ingredient_map(db)
        print(f"DB tarif sayısı: {len(existing_titles)}")
        print(f"DB malzeme sayısı: {len(ingredient_map)}")
        print(f"Mevcut BBC Good Food dağılımı: {dict(existing_source_counts)}")
        print(f"Kalan hedef dağılımı: {dict(active_targets)}")

        if not any(active_targets.values()):
            print("BBC Good Food hedefi zaten tamamlanmış.")
            return

        candidates, created_ingredients = _collect_candidates(scraper, ingredient_map, db)
        print(f"Toplam aday: {len(candidates)}")
        db.commit()

        selected = _select_recipes(candidates, existing_titles, active_targets)

        inserted = 0
        skipped_duplicates = 0
        for index, recipe_data in enumerate(selected, start=1):
            print(f"[IMPORT {index}/{len(selected)}] {recipe_data['title']}")
            try:
                _, created = save_scraped_recipe(db, recipe_data)
                if created:
                    inserted += 1
                else:
                    skipped_duplicates += 1
            except Exception as exc:
                db.rollback()
                print(f"  -> [FAIL] {exc}")

        _print_summary(selected, created_ingredients, inserted)
        print("  Tekrar atlanan tarif:", skipped_duplicates)
    finally:
        db.close()


if __name__ == "__main__":
    main()
