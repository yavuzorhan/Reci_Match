import os
import re
import sys
import time
import unicodedata
from collections import Counter, defaultdict

from sqlalchemy import func, text


base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(base_dir)

from app.db.database import SessionLocal
from app.db.models import Ingredient
from app.services.recipe_import_service import save_scraped_recipe
from app.utils.helpers import infer_ingredient_category, normalize_ingredient_name
from scraper.yemekcom_scraper import YemekComScraper


CATEGORY_TARGETS = {
    "Kahvaltı": 30,
    "Çorba": 15,
    "Tatlı": 35,
    "Meze": 20,
    "Un Mamulleri": 30,
    "Ana Yemek": 150,
}

CATEGORY_PATHS = {
    "Kahvaltı": [
        "/tarif/kahvaltiliklar/",
    ],
    "Çorba": [
        "/tarif/corba/",
        "/tarif/pratik-corba-tarifleri/",
    ],
    "Tatlı": [
        "/tarif/tatli/",
        "/tarif/serbetli-tatlilar/",
        "/tarif/sutlu-tatlilar/",
        "/tarif/kolay-tatli/",
    ],
    "Meze": [
        "/tarif/mezeler/",
        "/tarif/salata/",
        "/tarif/zeytinyaglilar/",
    ],
    "Un Mamulleri": [
        "/tarif/borek/",
        "/tarif/hamur-isi/",
        "/tarif/kahvaltiliklar/",
    ],
    "Ana Yemek": [
        "/tarif/tavuk/",
        "/tarif/et/",
        "/tarif/kofte/",
        "/tarif/sebze/",
        "/tarif/makarna/",
        "/tarif/pilav/",
        "/tarif/bakliyat/",
        "/tarif/dolma-sarma/",
    ],
}

TARGET_RECIPE_COUNT = sum(CATEGORY_TARGETS.values())
TARGET_LINK_COUNT = 1600
MAX_PAGES_PER_CATEGORY = 10
DELAY_SECONDS = 0.15
SIMILARITY_THRESHOLD = 0.82

TITLE_STOP_WORDS = {
    "tarifi", "yemegi", "yemek", "kolay", "pratik", "enfes", "tam", "kivaminda",
    "videolu", "resimli", "ev", "usulu", "usuluyle", "nefis", "kiymali", "terbiyeli",
}

TITLE_QUALIFIERS = {
    "lokanta", "usulu", "anne", "anneanne", "gercek", "orijinal", "tam", "tamolculu",
    "en", "iyi", "kolay", "pratik", "yumusacik", "cok", "daha", "hafif", "lezzetli",
    "nefis", "kivaminda", "videolu", "resimli", "evde", "ev", "yumusak", "sulu",
    "kivaminda", "tane", "tane tane", "tamolculu", "orjinal", "meyhane", "yalanci",
}

VARIATION_STOP_WORDS = {
    "firinda", "firin", "tavada", "tencerede",
    "kolay", "pratik", "tam", "lokanta", "usulu", "ev", "evde",
}

BREAKFAST_HAMUR_ISI_TOKENS = {
    "pogaca", "borek", "acma", "milfoy", "corek",
}

TRADITIONAL_BREAKFAST_TOKENS = {
    "menemen", "yumurta", "omlet", "muhlama", "kuymak", "kaygana",
    "cilbir", "gozleme", "pisi", "krep", "pankek", "sucuk",
}

POPULAR_DISHES = {
    "Kahvaltı": [
        "menemen",
        "sucuklu yumurta",
        "muhlama",
        "kaygana",
        "omlet",
        "sahanda yumurta",
        "patates kavurmasi",
        "gozleme",
        "krep",
        "pankek",
    ],
    "Çorba": [
        "mercimek corbasi",
        "yayla corbasi",
        "ezogelin corbasi",
        "sehriye corbasi",
        "domates corbasi",
        "tarhana corbasi",
        "dugun corbasi",
        "tavuk suyu corbasi",
    ],
    "Tatlı": [
        "baklava",
        "sutlac",
        "firin sutlac",
        "revani",
        "sekerpare",
        "profiterol",
        "kazandibi",
        "kalburabasti",
        "irmik helvasi",
        "lokma tatlisi",
    ],
    "Meze": [
        "kisir",
        "mercimek koftesi",
        "haydari",
        "cacik",
        "patlican salatasi",
        "kopoglu mezesi",
        "amerikan salatasi",
        "cerkez tavugu",
    ],
    "Un Mamulleri": [
        "su boregi",
        "kiymali borek",
        "peynirli borek",
        "patatesli borek",
        "pogaca",
        "acma",
        "lahmacun",
        "kiymali pide",
    ],
    "Ana Yemek": [
        "tavuk sote",
        "et sote",
        "tavuklu pilav",
        "pirinc pilavi",
        "bulgur pilavi",
        "karniyarik",
        "izmir kofte",
        "kuru kofte",
        "sulu kofte",
        "kuru fasulye",
        "etli nohut",
        "nohut yemegi",
        "turlu",
        "imam bayildi",
        "alinazik",
        "tas kebabi",
        "guvec",
        "yaprak sarma",
        "biber dolmasi",
        "patlican dolmasi",
        "tavuk doner",
        "menemen",
    ],
}

POPULARITY_PATTERNS = {
    "menemen": [{"menemen"}],
    "sucuklu yumurta": [{"sucuklu", "yumurta"}, {"sucuk", "yumurta"}],
    "muhlama": [{"muhlama"}, {"kuymak"}],
    "kaygana": [{"kaygana"}],
    "omlet": [{"omlet"}],
    "sahanda yumurta": [{"sahanda", "yumurta"}],
    "patates kavurmasi": [{"patates", "kavurma"}],
    "gozleme": [{"gozleme"}],
    "krep": [{"krep"}],
    "pankek": [{"pankek"}],
    "mercimek corbasi": [{"mercimek", "corba"}],
    "yayla corbasi": [{"yayla", "corba"}],
    "ezogelin corbasi": [{"ezogelin"}],
    "sehriye corbasi": [{"sehriye", "corba"}],
    "domates corbasi": [{"domates", "corba"}],
    "tarhana corbasi": [{"tarhana", "corba"}],
    "dugun corbasi": [{"dugun", "corba"}],
    "tavuk suyu corbasi": [{"tavuk", "suyu", "corba"}],
    "baklava": [{"baklava"}],
    "sutlac": [{"sutlac"}],
    "firin sutlac": [{"firin", "sutlac"}],
    "revani": [{"revani"}],
    "sekerpare": [{"sekerpare"}],
    "profiterol": [{"profiterol"}],
    "kazandibi": [{"kazandibi"}],
    "kalburabasti": [{"kalburabasti"}],
    "irmik helvasi": [{"irmik", "helva"}],
    "lokma tatlisi": [{"lokma"}],
    "kisir": [{"kisir"}],
    "mercimek koftesi": [{"mercimek", "kofte"}],
    "haydari": [{"haydari"}],
    "cacik": [{"cacik"}],
    "patlican salatasi": [{"patlican", "salata"}],
    "kopoglu mezesi": [{"kopoglu"}],
    "amerikan salatasi": [{"amerikan", "salata"}],
    "cerkez tavugu": [{"cerkez", "tavuk"}],
    "su boregi": [{"su", "boregi"}, {"suboregi"}],
    "kiymali borek": [{"borek", "kiyma"}],
    "peynirli borek": [{"borek", "peynir"}],
    "patatesli borek": [{"borek", "patates"}],
    "pogaca": [{"pogaca"}],
    "acma": [{"acma"}],
    "lahmacun": [{"lahmacun"}],
    "kiymali pide": [{"kiyma", "pide"}],
    "tavuk sote": [{"tavuk", "sote"}],
    "et sote": [{"et", "sote"}, {"dana", "sote"}],
    "tavuklu pilav": [{"tavuk", "pilav"}],
    "pirinc pilavi": [{"pirinc", "pilav"}],
    "bulgur pilavi": [{"bulgur", "pilav"}],
    "karniyarik": [{"karniyarik"}],
    "izmir kofte": [{"izmir", "kofte"}],
    "kuru kofte": [{"kuru", "kofte"}],
    "sulu kofte": [{"sulu", "kofte"}],
    "kuru fasulye": [{"kuru", "fasulye"}],
    "etli nohut": [{"etli", "nohut"}, {"et", "nohut"}],
    "nohut yemegi": [{"nohut", "yemegi"}, {"nohut"}],
    "turlu": [{"turlu"}],
    "imam bayildi": [{"imam", "bayildi"}],
    "alinazik": [{"alinazik"}],
    "tas kebabi": [{"tas", "kebabi"}],
    "guvec": [{"guvec"}],
    "yaprak sarma": [{"yaprak", "sarma"}],
    "biber dolmasi": [{"biber", "dolma"}],
    "patlican dolmasi": [{"patlican", "dolma"}],
    "tavuk doner": [{"tavuk", "doner"}],
    "menemen": [{"menemen"}],
}

REQUIRED_INGREDIENTS = [
    "karbonat",
    "nisasta",
    "vanilin",
    "krem santi",
    "biskuvi",
    "kadayif",
    "tarhana",
    "eriste",
    "margarin",
    "feslegen",
    "misir unu",
]


def _ascii_fold(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    normalized = normalized.replace("ı", "i").replace("İ", "i")
    return " ".join(normalized.lower().split())


def _load_existing_ingredient_map(db) -> dict[str, int]:
    rows = (
        db.query(Ingredient.ingredient_id, Ingredient.ingredient_name)
        .filter(Ingredient.user_id.is_(None))
        .all()
    )
    ingredient_map: dict[str, int] = {}
    for ingredient_id, ingredient_name in rows:
        if not ingredient_name:
            continue
        ingredient_map[_ascii_fold(ingredient_name)] = ingredient_id
    return ingredient_map


def _ensure_required_ingredients(db):
    added = 0
    for raw_name in REQUIRED_INGREDIENTS:
        normalized_name = normalize_ingredient_name(raw_name)
        existing = (
            db.query(Ingredient)
            .filter(
                Ingredient.user_id.is_(None),
                func.lower(Ingredient.ingredient_name) == normalized_name.lower(),
            )
            .first()
        )
        if existing is not None:
            continue

        category_name, category_id = infer_ingredient_category(normalized_name)
        db.add(
            Ingredient(
                ingredient_name=normalized_name,
                category=category_name,
                category_id=category_id,
            )
        )
        added += 1

    if added:
        db.commit()
        print(f"Tamamlayici malzeme eklendi: {added}")


def _normalize_recipe_ingredients(recipe_data: dict, ingredient_map: dict[str, int]) -> tuple[list[dict], list[str]]:
    normalized_rows: list[dict] = []
    missing: list[str] = []
    seen_keys: set[str] = set()

    for item in recipe_data.get("ingredients", []):
        raw_name = (item.get("name") or "").strip(" -)")
        unit = item.get("unit")
        raw_folded = _ascii_fold(raw_name)
        if raw_folded in {"sicak", "kaynar"} and _ascii_fold(unit or "") == "su":
            raw_name = "su"
        elif raw_folded in {"yumurt sarisi", "yumurta sarisi", "yumurta beyazi"}:
            raw_name = "yumurta"
        elif "bugday nisastasi" in raw_folded:
            raw_name = "nisasta"
        elif raw_folded == "seker":
            raw_name = "toz seker"
        elif "vanilya" in raw_folded:
            raw_name = "vanilin"
        elif "krem santi" in raw_folded:
            raw_name = "krem santi"
        elif any(token in raw_folded for token in ["petibor", "bebe biskuvisi", "biskuvi"]):
            raw_name = "biskuvi"
        elif "tel kadayif" in raw_folded:
            raw_name = "kadayif"
        elif any(token in raw_folded for token in ["spagetti", "penne", "fettucine", "tagliatelle", "linguine", "dirsek makarna", "burgu makarna", "boncuk makarna"]):
            raw_name = "makarna"
        elif "taze feslegen" in raw_folded or "feslegen yapragi" in raw_folded:
            raw_name = "feslegen"
        elif "toz tarhana" in raw_folded:
            raw_name = "tarhana"
        elif "eriste" in raw_folded:
            raw_name = "eriste"

        normalized_name = normalize_ingredient_name(raw_name)
        folded_name = _ascii_fold(normalized_name)
        if not folded_name or folded_name in seen_keys:
            continue

        seen_keys.add(folded_name)
        if folded_name not in ingredient_map:
            missing.append(normalized_name)
            continue

        normalized_rows.append(
            {
                "ingredient_id": ingredient_map[folded_name],
                "name": normalized_name,
                "amount": item.get("amount"),
                "unit": item.get("unit"),
            }
        )

    return normalized_rows, sorted(set(missing))


def _should_skip_forced_category(recipe_data: dict, forced_category: str) -> bool:
    if forced_category != "Kahvaltı":
        return False

    tokens = _title_tokens(recipe_data["title"])
    if tokens & BREAKFAST_HAMUR_ISI_TOKENS and not tokens & TRADITIONAL_BREAKFAST_TOKENS:
        return True
    return False


def _title_tokens(title: str) -> set[str]:
    tokens = [
        _normalize_title_token(token)
        for token in re.split(r"[^a-z0-9]+", _ascii_fold(title))
        if token and token not in TITLE_STOP_WORDS and len(token) > 1
    ]
    return set(tokens)


def _canonical_dish_key(title: str) -> str:
    tokens = [
        _normalize_title_token(token)
        for token in re.split(r"[^a-z0-9]+", _ascii_fold(title))
        if token and token not in TITLE_STOP_WORDS and token not in TITLE_QUALIFIERS
    ]
    token_set = set(tokens)

    for canonical_name, pattern_groups in POPULARITY_PATTERNS.items():
        if any(pattern <= token_set for pattern in pattern_groups):
            return canonical_name

    filtered = []
    for token in tokens:
        if token in {"firinda", "firin", "tavada", "tava", "tencerede", "tencere"}:
            continue
        filtered.append(token)

    if not filtered:
        return _ascii_fold(title)

    return " ".join(filtered[:4])


def _normalize_title_token(token: str) -> str:
    replacements = {
        "corbalar": "corba",
        "corbasi": "corba",
        "kofteler": "kofte",
        "koftesi": "kofte",
        "pilavlar": "pilav",
        "pilavi": "pilav",
        "dolmasi": "dolma",
        "sarmasi": "sarma",
        "kebabi": "kebap",
        "yemegi": "yemek",
        "pogacasi": "pogaca",
        "boregi": "borek",
        "tatlisi": "tatli",
        "kavurmasi": "kavurma",
        "yumurtasi": "yumurta",
        "yumurtali": "yumurta",
        "tavuklu": "tavuk",
        "etli": "et",
        "kiymali": "kiyma",
        "peynirli": "peynir",
        "patatesli": "patates",
        "sebzeli": "sebze",
        "mantarli": "mantar",
    }
    return replacements.get(token, token)


def _title_similarity(left: str, right: str) -> float:
    left_tokens = _title_tokens(left)
    right_tokens = _title_tokens(right)
    if not left_tokens or not right_tokens:
        return 0.0
    intersection = len(left_tokens & right_tokens)
    union = len(left_tokens | right_tokens)
    return intersection / union if union else 0.0


def _variation_signature(title: str) -> tuple[str, ...]:
    tokens = [
        _normalize_title_token(token)
        for token in re.split(r"[^a-z0-9]+", _ascii_fold(title))
        if token
    ]
    reduced = [
        token for token in tokens
        if token not in TITLE_STOP_WORDS
        and token not in TITLE_QUALIFIERS
        and token not in VARIATION_STOP_WORDS
        and len(token) > 1
    ]
    return tuple(sorted(dict.fromkeys(reduced))[:4])


def _is_near_duplicate(recipe_data: dict, selected: list[dict]) -> bool:
    variation_signature = _variation_signature(recipe_data["title"])
    for existing in selected:
        if recipe_data["canonical_dish_key"] == existing["canonical_dish_key"]:
            return True
        left_prefix = " ".join(sorted(_title_tokens(recipe_data["title"]))[:3])
        right_prefix = " ".join(sorted(_title_tokens(existing["title"]))[:3])
        if left_prefix and left_prefix == right_prefix:
            return True
        if variation_signature and variation_signature == _variation_signature(existing["title"]):
            return True
        if _title_similarity(recipe_data["title"], existing["title"]) >= SIMILARITY_THRESHOLD:
            return True
    return False


def _popularity_score(recipe_data: dict) -> int:
    category_name = recipe_data["recipe_category"]
    canonical_name = recipe_data["canonical_dish_key"]
    score = 0

    if canonical_name in POPULAR_DISHES.get(category_name, []):
        score += 100

    title_key = _ascii_fold(recipe_data["title"])
    for item in POPULAR_DISHES.get(category_name, []):
        if item in title_key:
            score += 30

    return score


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


def _delete_all_recipes(db):
    db.execute(text("DELETE FROM daily_logs"))
    db.execute(text("DELETE FROM favorites"))
    db.execute(text("DELETE FROM recipe_ingredients"))
    db.execute(text("DELETE FROM recipes"))
    db.commit()


def _selection_priority(recipe_data: dict, ingredient_coverage: Counter, category_counts: Counter) -> tuple:
    coverage_need = sum(max(0, 2 - ingredient_coverage[item["ingredient_id"]]) for item in recipe_data["normalized_ingredients"])
    unique_coverage_need = sum(1 for item in recipe_data["normalized_ingredients"] if ingredient_coverage[item["ingredient_id"]] < 2)
    category_gap = CATEGORY_TARGETS[recipe_data["recipe_category"]] - category_counts[recipe_data["recipe_category"]]
    diversity_penalty = recipe_data["total_time_minutes"] or 9999
    popularity = recipe_data["popularity_score"]

    return (
        category_gap > 0,
        popularity,
        coverage_need,
        unique_coverage_need,
        len(recipe_data["normalized_ingredients"]),
        -diversity_penalty,
        -recipe_data["missing_count"],
    )


def _select_recipes(candidates: list[dict]) -> tuple[list[dict], Counter]:
    selected: list[dict] = []
    category_counts: Counter = Counter()
    ingredient_coverage: Counter = Counter()

    by_category: dict[str, list[dict]] = defaultdict(list)
    for candidate in candidates:
        by_category[candidate["recipe_category"]].append(candidate)

    for category_name, target in CATEGORY_TARGETS.items():
        pool = by_category.get(category_name, [])
        while category_counts[category_name] < target:
            best_candidate = None
            best_priority = None

            for candidate in pool:
                if candidate.get("selected"):
                    continue
                if _is_near_duplicate(candidate, selected):
                    continue

                priority = _selection_priority(candidate, ingredient_coverage, category_counts)
                if best_candidate is None or priority > best_priority:
                    best_candidate = candidate
                    best_priority = priority

            if best_candidate is None:
                raise RuntimeError(f"{category_name} kategorisi için yeterli çeşitli tarif bulunamadı.")

            best_candidate["selected"] = True
            selected.append(best_candidate)
            category_counts[category_name] += 1
            for ingredient in best_candidate["normalized_ingredients"]:
                ingredient_coverage[ingredient["ingredient_id"]] += 1

    if len(selected) != TARGET_RECIPE_COUNT:
        raise RuntimeError(f"Toplam seçilen tarif sayısı hedefe ulaşmadı: {len(selected)}/{TARGET_RECIPE_COUNT}")

    return selected, ingredient_coverage


def _collect_candidates(scraper: YemekComScraper, ingredient_map: dict[str, int]) -> list[dict]:
    candidates: list[dict] = []
    seen_titles: set[str] = set()
    total_index = 0

    for forced_category, paths in CATEGORY_PATHS.items():
        per_category_target = max(CATEGORY_TARGETS[forced_category] * 6, 80)
        category_links: list[str] = []
        seen_links: set[str] = set()

        for category_path in paths:
            links = scraper.collect_recipe_links(
                category_paths=[category_path],
                target_link_count=per_category_target,
                max_pages_per_category=MAX_PAGES_PER_CATEGORY,
            )
            for link in links:
                if link in seen_links:
                    continue
                seen_links.add(link)
                category_links.append(link)
                if len(category_links) >= per_category_target:
                    break
            if len(category_links) >= per_category_target:
                break

        print(f"{forced_category} için toplanan link sayısı: {len(category_links)}")

        for link in category_links:
            total_index += 1
            print(f"[{total_index}] Tarif okunuyor: {link}")
            try:
                recipe_data = scraper.parse_recipe_detail(link)
            except Exception as exc:
                print(f"  -> [SKIP] Okunamadı: {exc}")
                continue

            if recipe_data:
                recipe_data["recipe_category"] = forced_category

            if not recipe_data or not _is_valid_recipe(recipe_data):
                print("  -> [SKIP] Zorunlu alanlar eksik veya kategori hedef dışı.")
                continue

            if _should_skip_forced_category(recipe_data, forced_category):
                print("  -> [SKIP] Kahvaltı kotasında hamur işi çakışması engellendi.")
                continue

            title_key = _ascii_fold(recipe_data["title"])
            if title_key in seen_titles:
                print("  -> [SKIP] Aynı başlıkta tarif zaten var.")
                continue

            normalized_ingredients, missing_ingredients = _normalize_recipe_ingredients(recipe_data, ingredient_map)
            recipe_data["normalized_ingredients"] = normalized_ingredients
            recipe_data["missing_ingredients"] = missing_ingredients
            recipe_data["missing_count"] = len(missing_ingredients)
            recipe_data["matched_count"] = len(normalized_ingredients)
            recipe_data["canonical_dish_key"] = _canonical_dish_key(recipe_data["title"])
            recipe_data["popularity_score"] = _popularity_score(recipe_data)

            if missing_ingredients:
                print(f"  -> [SKIP] DB dışı malzeme var: {', '.join(missing_ingredients[:4])}")
                continue
            if len(normalized_ingredients) < 3:
                print("  -> [SKIP] DB ile eşleşen malzeme sayısı düşük.")
                continue

            candidates.append(recipe_data)
            seen_titles.add(title_key)
            print(
                f"  -> [OK] kategori={recipe_data['recipe_category']} "
                f"eşleşen={recipe_data['matched_count']} süre={recipe_data['total_time_minutes']}dk "
                f"pop={recipe_data['popularity_score']} "
                f"pişirme={recipe_data['cooking_type']} / {recipe_data['cooking_method']}"
            )
            time.sleep(DELAY_SECONDS)

    return candidates


def _print_summary(selected: list[dict], ingredient_coverage: Counter, db):
    category_counts = Counter(item["recipe_category"] for item in selected)
    print("Kategori dağılımı:", dict(category_counts))

    uncovered_rows = (
        db.query(Ingredient.ingredient_name, Ingredient.ingredient_id)
        .filter(Ingredient.user_id.is_(None))
        .order_by(Ingredient.ingredient_name.asc())
        .all()
    )
    uncovered = [name for name, ingredient_id in uncovered_rows if ingredient_coverage[ingredient_id] < 2]
    print(f"En az 2 tarifte geçmeyen malzeme sayısı: {len(uncovered)}")
    if uncovered:
        print("İlk eksik malzemeler:", uncovered[:20])

    summary_rows = db.execute(
        text(
            """
            SELECT
                COUNT(*) AS recipe_count,
                COUNT(*) FILTER (WHERE source = 'yemekcom') AS yemekcom_count,
                COUNT(*) FILTER (WHERE calorie IS NOT NULL) AS with_calorie,
                COUNT(*) FILTER (WHERE protein IS NOT NULL AND carbohydrate IS NOT NULL AND fat IS NOT NULL) AS with_macros,
                COUNT(*) FILTER (WHERE total_time_minutes IS NOT NULL) AS with_time,
                COUNT(*) FILTER (WHERE cooking_type IS NOT NULL) AS with_cooking_type,
                COUNT(*) FILTER (WHERE cooking_method IS NOT NULL) AS with_cooking_method,
                COUNT(*) FILTER (WHERE recipe_category IS NOT NULL) AS with_category,
                COUNT(*) FILTER (WHERE image_url IS NOT NULL) AS with_image
            FROM recipes
            """
        )
    ).mappings().one()
    print("DB özeti:", dict(summary_rows))


def main():
    scraper = YemekComScraper()
    db = SessionLocal()

    try:
        _ensure_recipe_columns(db)
        _ensure_required_ingredients(db)
        ingredient_map = _load_existing_ingredient_map(db)
        print(f"Mevcut malzeme sayısı: {len(ingredient_map)}")

        candidates = _collect_candidates(scraper, ingredient_map)
        print(f"Geçerli aday sayısı: {len(candidates)}")

        minimum_required = TARGET_RECIPE_COUNT
        if len(candidates) < minimum_required:
            raise RuntimeError(
                f"Yeterli nitelikli tarif bulunamadı. Geçerli aday={len(candidates)} hedef={minimum_required}"
            )

        selected, ingredient_coverage = _select_recipes(candidates)
        print("Eski tarifler temizleniyor...")
        _delete_all_recipes(db)

        imported = 0
        for index, recipe_data in enumerate(selected, start=1):
            recipe_data["ingredients"] = recipe_data["normalized_ingredients"]
            print(
                f"[IMPORT {index}/{len(selected)}] {recipe_data['title']} | "
                f"kategori={recipe_data['recipe_category']} eşleşen={recipe_data['matched_count']}"
            )
            try:
                save_scraped_recipe(db, recipe_data)
                imported += 1
            except Exception as exc:
                db.rollback()
                raise RuntimeError(f"Kayıt başarısız: {recipe_data['title']} -> {exc}") from exc

        if imported != TARGET_RECIPE_COUNT:
            raise RuntimeError(f"Hedeflenen {TARGET_RECIPE_COUNT} tarif tamamlanamadı. Başarılı import={imported}")

        print(f"Import tamamlandı. Toplam eklenen tarif: {imported}")
        _print_summary(selected, ingredient_coverage, db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
