from __future__ import annotations

import unicodedata
from app.utils.text_normalize import contains_any_word



UNIT_TO_GRAMS = {
    "g": (1.0, 1.0),
    "gr": (1.0, 1.0),
    "gram": (1.0, 1.0),
    "kg": (1000.0, 1.0),
    "mg": (0.001, 1.0),
    "ml": (1.0, 0.75),
    "lt": (1000.0, 0.75),
    "l": (1000.0, 0.75),
    "litre": (1000.0, 0.75),
    "yemek kasigi": (15.0, 0.55),
    "kasik": (15.0, 0.5),
    "tatli kasigi": (10.0, 0.55),
    "cay kasigi": (5.0, 0.55),
    "tbsp": (15.0, 0.55),
    "tsp": (5.0, 0.55),
    "su bardagi": (200.0, 0.45),
    "cay bardagi": (100.0, 0.45),
    "fincan": (90.0, 0.45),
    "kase": (150.0, 0.35),
    "adet": (50.0, 0.25),
    "tane": (50.0, 0.25),
    "dilim": (30.0, 0.25),
    "demet": (60.0, 0.20),
    "paket": (100.0, 0.15),
    "avucl": (30.0, 0.20),
    "handful": (30.0, 0.20),
}

RECIPE_NUMERIC_FIELDS = {
    "calories_per_100g": "calorie",
    "protein_per_100g": "protein",
    "carbs_per_100g": "carbohydrate",
    "fat_per_100g": "fat",
}

REQUIRED_HEALTH_FIELDS = (
    "calories_per_100g",
    "protein_per_100g",
    "carbs_per_100g",
    "fat_per_100g",
    "saturated_fat_per_100g",
    "fiber_per_100g",
    "sugar_per_100g",
    "sodium_mg_per_100g",
)

# Şeker kaynakları: (terimler, ağırlık faktörü) — öncelik sırasıyla
_SUGAR_SOURCE_FACTORS: list[tuple[frozenset, float]] = [
    (frozenset({"bal"}), 0.82),
    (frozenset({"pekmez"}), 0.60),
    (frozenset({"recel"}), 0.60),
    (frozenset({"surup", "şurup"}), 0.70),
    (frozenset({
        "seker", "toz seker", "pudra sekeri", "esmer seker",
        "glikoz", "fruktoz", "misir surubu", "agave", "maple syrup",
    }), 1.0),
]
# Bal/pekmez/reçel/şurup ailesi — _sugar_source_grams'ta farklı dönüşüm katsayısı uygulanır
_HONEY_LIKE_TERMS: frozenset = frozenset({t for terms, _ in _SUGAR_SOURCE_FACTORS[:-1] for t in terms})

REFINED_CARB_TERMS = {
    "pirinc", "beyaz pirinc", "nisasta", "beyaz un", "un", "makarna", "yufka",
    "milfoy", "irmik", "galeta unu",
}
WHOLE_FLOUR_EXCLUSIONS = {
    "tam bugday", "tam tahil", "yulaf", "nohut", "kepek",
    "cevdar", "arpa", "karabugday", "cavdar",
}
POSITIVE_INGREDIENT_TERMS = {
    "sebze", "domates", "kabak", "brokoli", "ispanak", "mercimek", "nohut",
    "fasulye", "yogurt", "yoğurt", "tavuk", "hindi", "balik", "balık",
    "yulaf", "bulgur", "tam bugday", "tam buğday",
}

_GRADE_BASES = {
    "A": "Dengeli ve saglikli bir tarif.",
    "B": "Genel olarak dengeli, dikkatli tuketilebilir.",
    "C": "Dengeli tuketilmeli.",
    "D": "Agir bir tarif.",
}



def _clamp(value: float) -> int:
    return max(0, min(100, round(value)))


def _safe_float(value) -> float:
    return float(value) if value is not None else 0.0


def _optional_float(value) -> float | None:
    return float(value) if value is not None else None


def _divide_optional(value: float | None, divisor: int) -> float | None:
    return round(value / divisor, 2) if value is not None else None


def _fold_text(value: str) -> str:
    if not value:
        return ""
    normalized = str(value).lower()
    for source, target in (
        ("ı", "i"), ("İ", "i"),
        ("ğ", "g"), ("Ğ", "g"),
        ("ş", "s"), ("Ş", "s"),
        ("ö", "o"), ("Ö", "o"),
        ("ü", "u"), ("Ü", "u"),
        ("ç", "c"), ("Ç", "c"),
    ):
        normalized = normalized.replace(source.lower(), target)
    normalized = unicodedata.normalize("NFKD", normalized)
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    return " ".join(normalized.split())


def _contains_any(text: str, terms: set[str]) -> bool:
    folded_terms = {_fold_text(term) for term in terms}
    return any(term and term in text for term in folded_terms)


def _contains_any_health_word(text: str, terms: set[str]) -> bool:
    return contains_any_word(text, terms)


def _has_negated_health_term(text: str) -> bool:
    return contains_any_word(text, {"sekersiz", "şekersiz", "tuzsuz", "yagsiz", "yağsız"})


def _dedupe(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def _normalize_unit(value: str | None) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", str(value))
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    translation = str.maketrans({
        "ı": "i", "İ": "i",
        "ğ": "g", "Ğ": "g",
        "ş": "s", "Ş": "s",
        "ö": "o", "Ö": "o",
        "ü": "u", "Ü": "u",
        "ç": "c", "Ç": "c",
    })
    return " ".join(normalized.translate(translation).lower().split())


def _ingredient_inline_nutrition(ingredient, field: str):
    if field == "calories_per_100g":
        return getattr(ingredient, "calorie_per_100g", None)
    if field == "carbs_per_100g":
        return getattr(ingredient, "carbohydrate_per_100g", None)
    return getattr(ingredient, field, None)


def _is_light_sweet_or_snack(category: str | None) -> bool:
    normalized = _fold_text(category or "")
    return _contains_any(normalized, {"dessert", "snack", "tatli", "tatlı", "atistirmalik", "atıştırmalık"})


def _is_refined_carb(name: str) -> bool:
    """Malzeme adı rafine karbonhidrat mı? "un" içerenlerde tam tahıl kontrolü yapılır."""
    if not _contains_any_health_word(name, REFINED_CARB_TERMS):
        return False
    folded = _fold_text(name)
    if "un" in folded.split():
        for exclusion in WHOLE_FLOUR_EXCLUSIONS:
            if exclusion in folded:
                return False
    return True


def _added_sugar_factor(normalized_name: str) -> float:
    """Malzeme için eklenmiş şeker ağırlık faktörünü döner (0.0 = şeker değil, 1.0 = saf şeker)."""
    if _has_negated_health_term(normalized_name):
        return 0.0
    for terms, factor in _SUGAR_SOURCE_FACTORS:
        if _contains_any_health_word(normalized_name, terms):
            return factor
    return 0.0


def _ingredient_bonus_points(normalized_name: str) -> int:
    if _contains_any(normalized_name, POSITIVE_INGREDIENT_TERMS):
        return 3
    return 0



def _calorie_subscore(calories: float) -> int:
    """Porsiyon başı kalori miktarına göre 25–90 aralığında skor üretir."""
    if calories <= 150:
        return 90
    if calories <= 350:
        return 85
    if calories <= 550:
        return 78
    if calories <= 700:
        return 68
    if calories <= 850:
        return 58
    if calories <= 1000:
        return 45
    if calories <= 1200:
        return 35
    return 25


def _protein_subscore(protein_per_100_kcal: float, calories: float, category: str | None) -> int:
    """Her 100 kcal başına düşen protein gramına göre 20–100 arasında skor üretir."""
    if protein_per_100_kcal >= 8:
        score = 100
    elif protein_per_100_kcal >= 6:
        score = 90
    elif protein_per_100_kcal >= 4:
        score = 75
    elif protein_per_100_kcal >= 2.5:
        score = 60
    elif protein_per_100_kcal >= 1:
        score = 40
    else:
        score = 20
    if calories <= 180 and _is_light_sweet_or_snack(category):
        score = max(score, 35)
    return score


def _fat_subscore(fat_pct: float, fat: float) -> int:
    """Yağ oranı (%) ve mutlak yağ gramına göre 0–95 arasında skor üretir."""
    if fat_pct <= 20:
        score = 95
    elif fat_pct <= 30:
        score = 90
    elif fat_pct <= 40:
        score = 70
    elif fat_pct <= 50:
        score = 50
    elif fat_pct <= 60:
        score = 30
    else:
        score = 15
    if fat >= 80:
        score -= 20
    elif fat >= 60:
        score -= 15
    elif fat >= 40:
        score -= 8
    elif fat >= 25:
        score -= 3
    return max(0, score)


def _carb_subscore(carb_pct: float, calories: float, fat: float, category: str | None) -> int:
    """Karbonhidrat oranına göre 35–90 arasında skor üretir; düşük kalorili tatlılara tolerans tanır."""
    if 25 <= carb_pct <= 55:
        score = 90
    elif 55 < carb_pct <= 65:
        score = 75
    elif 65 < carb_pct <= 80:
        score = 55
    elif carb_pct > 80:
        score = 35
    elif 10 <= carb_pct < 25:
        score = 70
    else:
        score = 50
    if calories <= 180 and _is_light_sweet_or_snack(category) and fat <= 2:
        score = max(score, 65)
    return score


def _balance_subscore(
    calories: float,
    protein: float,
    carbs: float,
    fat_pct: float,
    carb_pct: float,
    protein_pct: float,
) -> int:
    """Makro dengesi ve toplam kalori uyumuna göre 0–100 arasında skor üretir."""
    score = 60
    if 20 <= protein_pct <= 35:
        score += 15
    if 25 <= carb_pct <= 60:
        score += 10
    if 15 <= fat_pct <= 35:
        score += 15
    if calories <= 650 and protein >= 25 and fat_pct <= 35:
        score += 10
    if fat_pct >= 55:
        score -= 25
    if calories >= 1000:
        score -= 20
    if carbs >= 70 and protein < 15:
        score -= 10
    if protein < 5 and calories > 300:
        score -= 10
    return _clamp(score)


def _health_grade(score: int) -> str:
    if score >= 80:
        return "A"
    if score >= 60:
        return "B"
    if score >= 50:
        return "C"
    return "D"



def _weighted_name_category_adjustment(
    recipe_name: str | None,
    category: str | None,
    carbs: float,
    carb_pct: float,
    fat: float,
) -> int:
    text = _fold_text(f"{recipe_name or ''} {category or ''}")
    adjustment = 0
    if _contains_any(text, {"kizartma", "kızartma"}):
        adjustment -= 10
    if _contains_any(text, {"pilav", "pirinc", "pirinç"}) and carbs >= 50:
        adjustment -= 5
    if (not _has_negated_health_term(text)) and _contains_any_health_word(text, {"seker", "şeker", "balli", "ballı", "tatli", "tatlı"}) and carb_pct >= 75:
        adjustment -= 5
    if _contains_any(text, {"krema", "tereyagi", "tereyağı", "kuyruk yagi", "kuyruk yağı"}) and fat >= 30:
        adjustment -= 6
    if _contains_any(text, {"salata", "sebze", "haslama", "haşlama", "izgara", "firin", "fırın"}):
        adjustment += 4
    return adjustment


def _weighted_calibration(
    raw_score: float,
    calories: float,
    protein: float,
    carbs: float,
    fat: float,
    carb_pct: float,
    fat_pct: float,
    recipe_name: str | None,
    category: str | None,
) -> float:
    text = _fold_text(f"{recipe_name or ''} {category or ''}")
    if _has_negated_health_term(text) and calories <= 90:
        raw_score = max(raw_score, 80)
    if _contains_any_health_word(text, {"pekmez"}) and carbs >= 45:
        raw_score = min(raw_score, 59)
    if _contains_any_health_word(text, {"makarna"}) and carbs >= 70:
        raw_score = min(raw_score, 59)
    if _contains_any(text, {"beyaz pirinc", "beyaz pirinç", "pirinc pilav", "pirinç pilav"}) and carbs >= 50:
        raw_score = min(raw_score, 59)
    elif _contains_any(text, {"pilav", "pirinc", "pirinç"}) and carbs >= 50:
        raw_score = min(raw_score, 79)
    if calories >= 1000 and fat >= 70 and fat_pct >= 55 and protein >= 60:
        raw_score = max(raw_score, 54)
    return raw_score


def _hard_caps(calories: float, fat: float, fat_pct: float, category: str | None) -> list[dict]:
    if calories <= 180 and fat <= 2 and _is_light_sweet_or_snack(category):
        return []
    caps = []
    if calories >= 1000:
        caps.append({"max_score": 59, "reason": "1000 kcal ve uzeri"})
    if fat >= 70:
        caps.append({"max_score": 59, "reason": "70 g ve uzeri yag"})
    if fat_pct >= 55:
        caps.append({"max_score": 59, "reason": "yag orani %55 ve uzeri"})
    if calories >= 1000 and fat_pct >= 55:
        caps.append({"max_score": 55, "reason": "cok yuksek kalori ve yag orani"})
    if calories >= 1000 and fat >= 70:
        caps.append({"max_score": 55, "reason": "cok yuksek kalori ve yag grami"})
    if calories >= 850 and fat >= 50:
        caps.append({"max_score": 65, "reason": "yuksek kalori ve yag"})
    return caps


def _build_weighted_explanation(
    score: int,
    grade: str,
    calories: float,
    protein_pct: float,
    carb_pct: float,
    fat_pct: float,
    applied_caps: list[dict],
    name_adjustment: int,
) -> str:
    base = _GRADE_BASES.get(grade, f"{grade} kalite ({score}/100).")
    if grade in {"A", "B"}:
        return base
    detail = (
        " Yag orani yuksek." if fat_pct > 55
        else " Karbonhidrat yogun." if carb_pct > 65
        else ""
    )
    return base + detail


def _macro_health_flags(
    calories: float,
    protein: float,
    protein_pct: float,
    carb_pct: float,
    fat_pct: float,
    grade: str,
) -> list[str]:
    flags = []
    if calories <= 400:
        flags.append("Dusuk kalorili")
    if protein >= 20 or protein_pct >= 25:
        flags.append("Yuksek protein")
    if 20 <= carb_pct <= 60 and fat_pct <= 35:
        flags.append("Makro dengesi iyi")
    flags.append(f"{grade} kalite")
    return _dedupe(flags)


def calculate_health_score(
    calories,
    protein,
    carbs,
    fat,
    recipe_name: str | None = None,
    category: str | None = None,
    servings: int = 1,
    values_are_per_serving: bool = True,
) -> dict:
    calories = _safe_float(calories)
    protein = _safe_float(protein)
    carbs = _safe_float(carbs)
    fat = _safe_float(fat)

    if not values_are_per_serving:
        resolved_servings = max(1, int(servings or 1))
        calories = calories / resolved_servings
        protein = protein / resolved_servings
        carbs = carbs / resolved_servings
        fat = fat / resolved_servings

    if calories <= 0:
        return {
            "health_score": None,
            "health_grade": None,
            "health_band": "Hesaplanamadi",
            "health_flags": ["Makro verisi eksik"],
            "health_summary": "Kalori degeri olmadigi icin saglik skoru hesaplanamadi.",
            "calorie_score": None,
            "protein_score": None,
            "fat_score": None,
            "carb_score": None,
            "balance_score": None,
            "protein_pct": 0.0,
            "carb_pct": 0.0,
            "fat_pct": 0.0,
            "protein_per_100_kcal": 0.0,
            "applied_caps": [],
            "explanation": "Kalori degeri olmadigi icin saglik skoru hesaplanamadi.",
        }

    protein_kcal = protein * 4
    carb_kcal = carbs * 4
    fat_kcal = fat * 9
    macro_total = protein_kcal + carb_kcal + fat_kcal

    if macro_total > 0:
        protein_pct = protein_kcal / macro_total * 100
        carb_pct = carb_kcal / macro_total * 100
        fat_pct = fat_kcal / macro_total * 100
    else:
        protein_pct = carb_pct = fat_pct = 0.0

    protein_per_100_kcal = protein / calories * 100
    calorie_score = _calorie_subscore(calories)
    protein_score = _protein_subscore(protein_per_100_kcal, calories, category)
    fat_score = _fat_subscore(fat_pct, fat)
    carb_score = _carb_subscore(carb_pct, calories, fat, category)
    balance_score = _balance_subscore(calories, protein, carbs, fat_pct, carb_pct, protein_pct)

    raw_score = (
        calorie_score * 0.30
        + protein_score * 0.25
        + fat_score * 0.25
        + carb_score * 0.10
        + balance_score * 0.10
    )
    name_adjustment = _weighted_name_category_adjustment(recipe_name, category, carbs, carb_pct, fat)
    raw_score += name_adjustment
    raw_score = _weighted_calibration(raw_score, calories, protein, carbs, fat, carb_pct, fat_pct, recipe_name, category)

    applied_caps = _hard_caps(calories, fat, fat_pct, category)
    max_score = min([100, *[cap["max_score"] for cap in applied_caps]]) if applied_caps else 100
    if _has_negated_health_term(_fold_text(f"{recipe_name or ''} {category or ''}")) and calories <= 90:
        max_score = 100
    score = _clamp(min(raw_score, max_score))
    grade = _health_grade(score)

    explanation = _build_weighted_explanation(
        score, grade, calories, protein_pct, carb_pct, fat_pct, applied_caps, name_adjustment,
    )
    health_band = {"A": "Cok Saglikli", "B": "Dengeli", "C": "Kontrollu", "D": "Daha Agir"}[grade]
    flags = _macro_health_flags(calories, protein, protein_pct, carb_pct, fat_pct, grade)

    return {
        "health_score": int(score),
        "health_grade": grade,
        "health_band": health_band,
        "health_flags": flags,
        "health_summary": explanation,
        "calorie_score": round(calorie_score, 2),
        "protein_score": round(protein_score, 2),
        "fat_score": round(fat_score, 2),
        "carb_score": round(carb_score, 2),
        "balance_score": round(balance_score, 2),
        "protein_pct": round(protein_pct, 2),
        "carb_pct": round(carb_pct, 2),
        "fat_pct": round(fat_pct, 2),
        "protein_per_100_kcal": round(protein_per_100_kcal, 2),
        "applied_caps": [cap["reason"] for cap in applied_caps],
        "explanation": explanation,
    }



def _risk_unit_key(unit: str | None) -> str | None:
    normalized = _fold_text(unit or "")
    if not normalized:
        return None
    if normalized in {"g", "gr", "gram"}:
        return "gram"
    if normalized in {"kg", "kilogram"}:
        return "kilogram"
    if normalized in {"ml", "mililitre"}:
        return "ml"
    if normalized in {"l", "lt", "litre"}:
        return "liter"
    if normalized in {"su bardagi", "bardak", "cup"}:
        return "cup"
    if normalized in {"yemek kasigi", "corba kasigi", "yk", "tbsp", "tablespoon"}:
        return "tablespoon"
    if normalized in {"tatli kasigi", "tk", "dessert spoon"}:
        return "dessert_spoon"
    if normalized in {"cay kasigi", "tsp", "teaspoon"}:
        return "teaspoon"
    return None


def _sugar_source_grams(amount: float, unit_key: str | None, normalized_name: str) -> float | None:
    is_honey_like = _contains_any(normalized_name, _HONEY_LIKE_TERMS)
    if unit_key == "cup":
        return amount * 200
    if unit_key == "tablespoon":
        return amount * (20 if is_honey_like else 13)
    if unit_key == "dessert_spoon":
        return amount * (13 if is_honey_like else 8)
    if unit_key == "teaspoon":
        return amount * (7 if is_honey_like else 4)
    if unit_key == "gram":
        return amount
    if unit_key == "kilogram":
        return amount * 1000
    return None


def _risk_amount_grams(link, normalized_name: str) -> float | None:
    amount_gram = getattr(link, "miktar_gram", None)
    if amount_gram is not None:
        return float(amount_gram)

    amount = _optional_float(getattr(link, "amount", None))
    if amount is None or amount <= 0:
        return None

    unit_key = _risk_unit_key(getattr(link, "unit", None))
    if unit_key == "gram":
        return amount
    if unit_key == "kilogram":
        return amount * 1000

    if _added_sugar_factor(normalized_name):
        return _sugar_source_grams(amount, unit_key, normalized_name)

    if unit_key == "cup":
        if _contains_any(normalized_name, {"pirinc", "pirinç"}):
            return amount * 190
        return amount * 200
    if unit_key == "tablespoon":
        return amount * 15
    if unit_key in {"dessert_spoon", "teaspoon"}:
        return amount * 5
    if unit_key == "ml":
        return amount
    if unit_key == "liter":
        return amount * 1000
    return None


def _ingredient_penalty(added_sugar_per_serving: float, refined_carb_per_serving: float) -> int:
    penalty = 0
    if added_sugar_per_serving >= 50:
        penalty += 35
    elif added_sugar_per_serving >= 35:
        penalty += 28
    elif added_sugar_per_serving >= 25:
        penalty += 22
    elif added_sugar_per_serving >= 15:
        penalty += 14
    elif added_sugar_per_serving >= 10:
        penalty += 8
    elif added_sugar_per_serving >= 5:
        penalty += 4

    if refined_carb_per_serving >= 80:
        penalty += 12
    elif refined_carb_per_serving >= 50:
        penalty += 8
    elif refined_carb_per_serving >= 30:
        penalty += 5

    if added_sugar_per_serving >= 15 and refined_carb_per_serving >= 30:
        penalty += 6
    return penalty


def _ingredient_hard_caps(
    added_sugar_per_serving: float,
    refined_carb_per_serving: float,
    fat_per_serving: float,
    fat_pct: float,
    calories_per_serving: float,
) -> list[dict]:
    caps = []
    if added_sugar_per_serving >= 50:
        caps.append({"max_score": 49, "reason": "porsiyon basina 50 g ve uzeri eklenmis seker"})
    elif added_sugar_per_serving >= 35:
        caps.append({"max_score": 54, "reason": "porsiyon basina 35 g ve uzeri eklenmis seker"})
    elif added_sugar_per_serving >= 25:
        caps.append({"max_score": 59, "reason": "porsiyon basina 25 g ve uzeri eklenmis seker"})
    elif added_sugar_per_serving >= 15:
        caps.append({"max_score": 69, "reason": "porsiyon basina 15 g ve uzeri eklenmis seker"})
    elif added_sugar_per_serving >= 10:
        caps.append({"max_score": 79, "reason": "porsiyon basina 10 g ve uzeri eklenmis seker"})

    if added_sugar_per_serving >= 15 and refined_carb_per_serving >= 30:
        caps.append({"max_score": 59, "reason": "eklenmis seker ve rafine karbonhidrat birlikte yuksek"})
    if fat_per_serving >= 70:
        caps.append({"max_score": 59, "reason": "porsiyon basina 70 g ve uzeri yag"})
    if fat_pct >= 55:
        caps.append({"max_score": 59, "reason": "yag orani %55 ve uzeri"})
    if calories_per_serving >= 1000:
        caps.append({"max_score": 59, "reason": "porsiyon basina 1000 kcal ve uzeri"})
    return caps


def _ingredient_adjusted_explanation(
    base_explanation: str | None,
    risk: dict,
    caps: list[dict],
    grade: str,
    score: int,
) -> str:
    added = risk["added_sugar_per_serving"]
    refined = risk["refined_carb_per_serving"]
    if added >= 25 and refined > 0:
        return _GRADE_BASES.get(grade, f"{grade} kalite.") + " Seker icerigi fazla, rafine karbonhidrat yuksek."
    if added >= 10:
        return _GRADE_BASES.get(grade, f"{grade} kalite.") + " Seker icerigi fazla."
    if refined >= 30:
        return _GRADE_BASES.get(grade, f"{grade} kalite.") + " Karbonhidrat yogun."
    if risk["ingredient_bonus"]:
        return f"{_GRADE_BASES.get(grade, '')} Olumlu malzemeler skoru destekledi."
    return base_explanation or _GRADE_BASES.get(grade, f"{grade} kalite ({score}/100).")


def apply_ingredient_health_adjustments(
    recipe,
    score_data: dict,
    calories: float,
    fat: float,
    fat_pct: float,
) -> dict:
    ingredient_risk = analyze_recipe_ingredient_risks(recipe)
    score = score_data.get("health_score")
    if score is None:
        return {**score_data, **ingredient_risk}

    raw_score = float(score) - ingredient_risk["ingredient_penalty"] + ingredient_risk["ingredient_bonus"]
    ingredient_caps = _ingredient_hard_caps(
        ingredient_risk["added_sugar_per_serving"],
        ingredient_risk["refined_carb_per_serving"],
        fat,
        fat_pct,
        calories,
    )
    existing_caps = list(score_data.get("applied_caps") or [])
    cap_values = [cap["max_score"] for cap in ingredient_caps]
    max_score = min([100, *cap_values]) if cap_values else 100
    final_score = _clamp(min(raw_score, max_score))
    grade = _health_grade(final_score)
    explanation = _ingredient_adjusted_explanation(
        score_data.get("explanation"), ingredient_risk, ingredient_caps, grade, final_score,
    )
    health_band = {"A": "Cok Saglikli", "B": "Dengeli", "C": "Kontrollu", "D": "Daha Agir"}[grade]
    flags = list(score_data.get("health_flags") or [])
    if ingredient_risk["added_sugar_per_serving"] >= 10:
        flags.append("Eklenmis seker yuksek")
    if ingredient_risk["refined_carb_per_serving"] >= 30:
        flags.append("Rafine karbonhidrat yuksek")
    flags.append(f"{grade} kalite")

    return {
        **score_data,
        **ingredient_risk,
        "health_score": int(final_score),
        "health_grade": grade,
        "health_band": health_band,
        "health_flags": _dedupe(flags),
        "health_summary": explanation,
        "explanation": explanation,
        "applied_caps": existing_caps + [cap["reason"] for cap in ingredient_caps],
    }


def analyze_recipe_ingredient_risks(recipe) -> dict:
    servings = max(1, int(getattr(recipe, "serving", 1) or 1))
    added_sugar_total = 0.0
    refined_carb_total = 0.0
    bonus = 0

    for link in list(getattr(recipe, "ingredients", []) or []):
        ingredient = getattr(link, "ingredient", None)
        name = _fold_text(getattr(ingredient, "ingredient_name", "") if ingredient else "")
        grams = _risk_amount_grams(link, name)

        sugar_factor = _added_sugar_factor(name)
        if sugar_factor and grams is not None:
            added_sugar_total += grams * sugar_factor

        if _is_refined_carb(name) and grams is not None:
            refined_carb_total += grams

        bonus += _ingredient_bonus_points(name)

    added_sugar_per_serving = added_sugar_total / servings
    refined_carb_per_serving = refined_carb_total / servings
    ingredient_penalty = _ingredient_penalty(added_sugar_per_serving, refined_carb_per_serving)
    ingredient_bonus = min(12, bonus)

    return {
        "recipe_added_sugar_total": round(added_sugar_total, 2),
        "added_sugar_per_serving": round(added_sugar_per_serving, 2),
        "refined_carb_total": round(refined_carb_total, 2),
        "refined_carb_per_serving": round(refined_carb_per_serving, 2),
        "ingredient_penalty": ingredient_penalty,
        "ingredient_bonus": ingredient_bonus,
    }



def estimate_amount_in_grams(amount, unit) -> tuple[float | None, float]:
    if amount is None:
        return None, 0.0
    amount_value = float(amount)
    if amount_value <= 0:
        return None, 0.0
    normalized_unit = _normalize_unit(unit)
    if not normalized_unit:
        return amount_value, 0.35
    for known_unit, (factor, confidence) in UNIT_TO_GRAMS.items():
        if known_unit in normalized_unit:
            return amount_value * factor, confidence
    return amount_value, 0.2


def resolve_link_amount_grams(link) -> tuple[float | None, float]:
    amount_gram = getattr(link, "miktar_gram", None)
    if amount_gram is not None:
        confidence_label = (getattr(link, "donusum_guveni", None) or "").lower()
        confidence_score = {"high": 1.0, "medium": 0.75, "low": 0.4}.get(confidence_label, 0.85)
        return float(amount_gram), confidence_score
    return estimate_amount_in_grams(link.amount, link.unit)


def aggregate_recipe_nutrition(recipe) -> dict:
    ingredient_links = list(getattr(recipe, "ingredients", []) or [])
    servings = max(1, int(getattr(recipe, "serving", 1) or 1))
    totals = {field: 0.0 for field in REQUIRED_HEALTH_FIELDS}
    coverage_counts = {field: 0 for field in REQUIRED_HEALTH_FIELDS}
    nutrition_hits = 0
    conversion_scores: list[float] = []
    fallback_used = False

    for link in ingredient_links:
        ingredient = getattr(link, "ingredient", None)
        if not ingredient or not float(getattr(ingredient, "calorie_per_100g", 0) or 0):
            continue

        amount_grams, conversion_confidence = resolve_link_amount_grams(link)
        if amount_grams is None:
            continue

        nutrition_hits += 1
        conversion_scores.append(conversion_confidence)
        multiplier = amount_grams / 100.0

        for field in REQUIRED_HEALTH_FIELDS:
            value = _ingredient_inline_nutrition(ingredient, field)
            if value is None:
                continue
            totals[field] += float(value) * multiplier
            coverage_counts[field] += 1

    per_serving = {
        field: round(totals[field] / servings, 2) if coverage_counts[field] else None
        for field in REQUIRED_HEALTH_FIELDS
    }

    for nutrition_field, recipe_attr in RECIPE_NUMERIC_FIELDS.items():
        if per_serving[nutrition_field] is None:
            recipe_value = getattr(recipe, recipe_attr, None)
            if recipe_value is not None:
                per_serving[nutrition_field] = round(float(recipe_value), 2)
                fallback_used = True

    ingredient_coverage = (nutrition_hits / len(ingredient_links)) if ingredient_links else 0.0
    conversion_confidence = sum(conversion_scores) / len(conversion_scores) if conversion_scores else 0.0
    field_completeness = (
        sum(1 for field in REQUIRED_HEALTH_FIELDS if per_serving.get(field) is not None) / len(REQUIRED_HEALTH_FIELDS)
    )
    confidence = round(min(1.0, (ingredient_coverage * 0.5) + (conversion_confidence * 0.2) + (field_completeness * 0.3)), 2)
    if fallback_used and confidence < 0.45:
        confidence = 0.45

    return {
        "per_serving": per_serving,
        "confidence": confidence,
        "is_estimated": fallback_used or confidence < 0.85,
    }


def recalculate_recipe_macros_from_grams(recipe, min_confidence: float = 0.75) -> dict:
    """Calculate recipe totals from recipe_ingredients.miktar_gram without mutating recipe rows."""
    nutrition = aggregate_recipe_nutrition(recipe)
    per_serving = nutrition["per_serving"]
    calculated = {
        "calorie": per_serving.get("calories_per_100g"),
        "protein": per_serving.get("protein_per_100g"),
        "carbohydrate": per_serving.get("carbs_per_100g"),
        "fat": per_serving.get("fat_per_100g"),
    }
    has_required_values = all(value is not None for value in calculated.values())
    return {
        "calculated": calculated,
        "confidence": nutrition["confidence"],
        "is_estimated": nutrition["is_estimated"],
        "safe_to_persist": bool(has_required_values and nutrition["confidence"] >= min_confidence),
        "note": (
            "miktar_gram ve ingredient nutrition verileriyle hesaplandi."
            if has_required_values
            else "Eksik miktar_gram veya ingredient nutrition verisi nedeniyle mevcut recipe makrolari korunmali."
        ),
    }



def _resolve_general_macro_source(recipe, nutrition_rollup: dict) -> dict:
    recipe_macros = recipe_macro_values_per_serving(recipe)
    if recipe_macros:
        recipe_macros["source"] = "recipe_fields"
        return recipe_macros
    nutrition = dict(nutrition_rollup["per_serving"])
    nutrition["source"] = "ingredient_rollup"
    return nutrition


def recipe_macro_values_per_serving(recipe) -> dict | None:
    if recipe is None:
        return None
    calories = _optional_float(getattr(recipe, "calorie", None))
    protein = _optional_float(getattr(recipe, "protein", None))
    carbs = _optional_float(getattr(recipe, "carbohydrate", None))
    fat = _optional_float(getattr(recipe, "fat", None))
    if calories is None and protein is None and carbs is None and fat is None:
        return None
    divisor = max(1, int(getattr(recipe, "serving", 1) or 1))
    return {
        "calories_per_100g": _divide_optional(calories, divisor),
        "protein_per_100g": _divide_optional(protein, divisor),
        "carbs_per_100g": _divide_optional(carbs, divisor),
        "fat_per_100g": _divide_optional(fat, divisor),
        "saturated_fat_per_100g": None,
        "fiber_per_100g": None,
        "sugar_per_100g": None,
        "sodium_mg_per_100g": None,
    }


def build_recipe_health_profile(recipe, calorie_target: float | None = None, meal_count: int | None = None) -> dict:
    nutrition = aggregate_recipe_nutrition(recipe)
    macro_source = _resolve_general_macro_source(recipe, nutrition)
    score_data = calculate_health_score(
        calories=macro_source.get("calories_per_100g"),
        protein=macro_source.get("protein_per_100g"),
        carbs=macro_source.get("carbs_per_100g"),
        fat=macro_source.get("fat_per_100g"),
        recipe_name=getattr(recipe, "recipe_name", None),
        category=getattr(recipe, "recipe_category", None),
    )
    score_data = apply_ingredient_health_adjustments(
        recipe=recipe,
        score_data=score_data,
        calories=_safe_float(macro_source.get("calories_per_100g")),
        fat=_safe_float(macro_source.get("fat_per_100g")),
        fat_pct=_safe_float(score_data.get("fat_pct")),
    )
    return {
        **score_data,
        "nutrition_per_serving": nutrition["per_serving"],
        "recipe_nutrition_confidence": nutrition["confidence"],
        "nutrition_is_estimated": nutrition["is_estimated"],
        "nutrition_quality_score": score_data["health_score"],
    }
