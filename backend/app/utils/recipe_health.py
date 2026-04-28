"""Recipe nutrition aggregation and health scoring helpers."""
from __future__ import annotations

import unicodedata


FDA_DAILY_VALUES = {
    "protein_g": 50.0,
    "fiber_g": 28.0,
    "saturated_fat_g": 20.0,
    "sodium_mg": 2300.0,
    "added_sugar_g": 50.0,
    "potassium_mg": 4700.0,
    "calcium_mg": 1300.0,
    "iron_mg": 18.0,
    "vitamin_d_mcg": 20.0,
}


RECIPE_NUMERIC_FIELDS = {
    "calories_per_100g": "calorie",
    "protein_per_100g": "protein",
    "carbs_per_100g": "carbohydrate",
    "fat_per_100g": "fat",
}


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

VEGETABLE_TERMS = {
    "domates", "sogan", "patlican", "kabak", "ispanak", "brokoli", "havuç", "havuc",
    "salata", "marul", "maydanoz", "dereotu", "mantar", "pırasa", "pirasa", "karnabahar",
}
LEGUME_TERMS = {"mercimek", "nohut", "fasulye", "barbunya", "bezelye", "bakla"}
WHOLE_GRAIN_TERMS = {"bulgur", "yulaf", "tam bugday", "karabuğday", "karabugday", "kinoa"}
LEAN_PROTEIN_TERMS = {"tavuk", "hindi", "balik", "balık", "yumurta", "ton baligi", "ton balığı"}
DAIRY_TERMS = {"yogurt", "yoğurt", "sut", "süt", "peynir", "kefir"}
ADDED_FAT_TERMS = {"zeytinyagi", "zeytinyağı", "sivi yag", "sıvı yağ", "aycicek yagi", "ayçiçek yağı"}
HEAVY_FAT_TERMS = {"tereyagi", "tereyağı", "krema", "kaymak", "kuyruk yagi", "margarin"}
SUGAR_TERMS = {"seker", "şeker", "bal", "pekmez", "cikolata", "çikolata", "recel", "reçel", "surup", "şurup"}
PROCESSED_MEAT_TERMS = {"sucuk", "salam", "sosis", "pastirma", "pastırma", "jambon"}
SALT_TERMS = {"tuz", "soya sosu", "bulyon"}
ADDED_SUGAR_TERMS = {
    "seker", "toz seker", "pudra sekeri", "esmer seker", "glikoz", "fruktoz",
    "misir surubu", "agave", "maple syrup",
}
HONEY_TERMS = {"bal"}
MOLASSES_TERMS = {"pekmez"}
JAM_TERMS = {"recel"}
SYRUP_TERMS = {"surup", "şurup"}
REFINED_CARB_TERMS = {
    "pirinc", "beyaz pirinc", "nisasta", "beyaz un", "un", "makarna", "yufka",
    "milfoy", "irmik", "galeta unu",
}
POSITIVE_INGREDIENT_TERMS = {
    "sebze", "domates", "kabak", "brokoli", "ispanak", "mercimek", "nohut",
    "fasulye", "yogurt", "yoğurt", "tavuk", "hindi", "balik", "balık",
    "yulaf", "bulgur", "tam bugday", "tam buğday",
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


def aggregate_recipe_nutrition(recipe) -> dict:
    ingredient_links = list(getattr(recipe, "ingredients", []) or [])
    servings = max(1, int(getattr(recipe, "serving", 1) or 1))
    totals = {field: 0.0 for field in _nutrition_fields()}
    coverage_counts = {field: 0 for field in _nutrition_fields()}
    nutrition_hits = 0
    conversion_scores: list[float] = []
    fallback_used = False

    for link in ingredient_links:
        ingredient = getattr(link, "ingredient", None)
        nutrition = getattr(ingredient, "nutrition_value", None) if ingredient else None
        if not nutrition:
            continue

        amount_grams, conversion_confidence = resolve_link_amount_grams(link)
        if amount_grams is None:
            continue

        nutrition_hits += 1
        conversion_scores.append(conversion_confidence)
        multiplier = amount_grams / 100.0

        for field in _nutrition_fields():
            value = getattr(nutrition, field, None)
            if value is None:
                continue
            totals[field] += float(value) * multiplier
            coverage_counts[field] += 1

    per_serving = {
        field: round(totals[field] / servings, 2) if coverage_counts[field] else None
        for field in _nutrition_fields()
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
    confidence = nutrition["confidence"]
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
        "confidence": confidence,
        "is_estimated": nutrition["is_estimated"],
        "safe_to_persist": bool(has_required_values and confidence >= min_confidence),
        "note": (
            "miktar_gram ve ingredient nutrition verileriyle hesaplandi."
            if has_required_values
            else "Eksik miktar_gram veya ingredient nutrition verisi nedeniyle mevcut recipe makrolari korunmali."
        ),
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
    score = min(raw_score, max_score)
    score = max(0, min(100, round(score)))
    grade = _health_grade(score)

    explanation = _build_weighted_explanation(
        score,
        grade,
        calories,
        protein_pct,
        carb_pct,
        fat_pct,
        applied_caps,
        name_adjustment,
    )
    health_band = {
        "A": "Cok Saglikli",
        "B": "Dengeli",
        "C": "Kontrollu",
        "D": "Daha Agir",
    }[grade]

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
    final_score = max(0, min(100, round(min(raw_score, max_score))))
    grade = _health_grade(final_score)
    explanation = _ingredient_adjusted_explanation(score_data.get("explanation"), ingredient_risk, ingredient_caps, grade, final_score)
    health_band = {
        "A": "Cok Saglikli",
        "B": "Dengeli",
        "C": "Kontrollu",
        "D": "Daha Agir",
    }[grade]
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

        if _contains_any(name, REFINED_CARB_TERMS) and grams is not None:
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


def _calorie_penalty(calories: float) -> int:
    if calories <= 150:
        return 0
    if calories <= 350:
        return 3
    if calories <= 650:
        return 8
    if calories <= 850:
        return 16
    if calories <= 1050:
        return 24
    return 30


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
    is_honey_like = _contains_any(normalized_name, HONEY_TERMS | MOLASSES_TERMS | JAM_TERMS | SYRUP_TERMS)
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


def _added_sugar_factor(normalized_name: str) -> float:
    if _contains_any(normalized_name, HONEY_TERMS):
        return 0.82
    if _contains_any(normalized_name, MOLASSES_TERMS):
        return 0.60
    if _contains_any(normalized_name, JAM_TERMS):
        return 0.60
    if _contains_any(normalized_name, SYRUP_TERMS):
        return 0.70
    if _contains_any(normalized_name, ADDED_SUGAR_TERMS):
        return 1.0
    return 0.0


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


def _ingredient_bonus_points(normalized_name: str) -> int:
    if _contains_any(normalized_name, POSITIVE_INGREDIENT_TERMS):
        return 3
    return 0


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


def _ingredient_adjusted_explanation(base_explanation: str | None, risk: dict, caps: list[dict], grade: str, score: int) -> str:
    added = risk["added_sugar_per_serving"]
    refined = risk["refined_carb_per_serving"]
    if added >= 25 and refined > 0:
        return "Bu tarif porsiyon başına yüksek miktarda eklenmiş şeker ve rafine karbonhidrat içerdiği için sağlık skoru düşürülmüştür."
    if added >= 10:
        return "Bu tarif eklenmiş şeker içerdiği için sağlık skoru düşürülmüştür."
    if refined >= 30:
        return "Bu tarif rafine karbonhidrat ağırlıklı olduğu için sağlık skoru düşürülmüştür."
    if risk["ingredient_bonus"]:
        return f"{grade} kalite ({score}/100). Olumlu malzemeler skoru destekledi."
    return base_explanation or f"{grade} kalite ({score}/100)."


def _calorie_subscore(calories: float) -> int:
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
    return max(0, min(100, score))


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
    if _contains_any(text, {"seker", "şeker", "balli", "ballı", "tatli", "tatlı"}) and carb_pct >= 75:
        adjustment -= 5
    if _contains_any(text, {"krema", "tereyagi", "tereyağı", "kuyruk yagi", "kuyruk yağı"}) and fat >= 30:
        adjustment -= 6
    if _contains_any(text, {"salata", "sebze", "haslama", "haşlama", "izgara", "firin", "fırın"}):
        adjustment += 4
    return adjustment


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
    if _contains_any(text, {"pilav", "pirinc", "pirinç"}) and carbs >= 50:
        raw_score = min(raw_score, 79)
    if calories >= 1000 and fat >= 70 and fat_pct >= 55 and protein >= 60:
        raw_score = max(raw_score, 54)
    return raw_score


def _protein_adjustment(calories: float, protein: float, category: str | None) -> int:
    if calories <= 0:
        return 0
    protein_per_100_kcal = protein / calories * 100
    if protein_per_100_kcal >= 7:
        return 6
    if protein_per_100_kcal >= 5:
        return 3
    if protein_per_100_kcal >= 3:
        return 0
    if protein_per_100_kcal >= 1:
        adjustment = -5
    else:
        adjustment = -10

    if calories <= 150 and _is_light_sweet_or_snack(category):
        return max(adjustment, -8)
    return adjustment


def _fat_pct_penalty(fat_pct: float) -> int:
    if fat_pct <= 25:
        return 0
    if fat_pct <= 35:
        return 4
    if fat_pct <= 45:
        return 10
    if fat_pct <= 55:
        return 16
    if fat_pct <= 65:
        return 22
    return 30


def _carb_pct_penalty(carb_pct: float, calories: float, category: str | None) -> int:
    if 20 <= carb_pct <= 60:
        penalty = 0
    elif 60 < carb_pct <= 75:
        penalty = 6
    elif 75 < carb_pct <= 90:
        penalty = 12
    elif carb_pct > 90:
        penalty = 18
    elif carb_pct < 10:
        penalty = 4
    else:
        penalty = 0

    if calories <= 150 and _is_light_sweet_or_snack(category):
        return min(penalty, 8)
    return penalty


def _macro_rule_bonus(calories: float, protein: float, carbs: float, fat: float, carb_pct: float, fat_pct: float) -> int:
    bonus = 0
    if calories <= 650 and protein >= 25 and fat_pct <= 35:
        bonus += 5
    if calories <= 150 and fat <= 2:
        bonus += 4
    if protein >= 30 and carb_pct <= 60 and fat_pct <= 35:
        bonus += 3
    return bonus


def _name_category_adjustment(recipe_name: str | None, category: str | None, carbs: float, carb_pct: float) -> int:
    text = _fold_text(f"{recipe_name or ''} {category or ''}")
    adjustment = 0
    if _contains_any(text, {"bal", "seker", "şeker", "tatli", "tatlı"}) and carb_pct > 80:
        adjustment -= 4
    if _contains_any(text, {"pilav", "pirinc", "pirinç"}) and carbs >= 50:
        adjustment -= 5
    if _contains_any(text, {"kizartma", "kızartma"}):
        adjustment -= 8
    if _contains_any(text, {"salata", "sebze", "izgara", "ızgara", "haslama", "haşlama"}):
        adjustment += 4
    return adjustment


def _calibrate_macro_score(
    score: float,
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
    if _contains_any(text, {"pilav", "pirinc", "pirinç"}) and carbs >= 50:
        score = min(score, 79)
    if calories <= 150 and _is_light_sweet_or_snack(category) and carb_pct > 90 and fat <= 2:
        score = min(score, 78)
    if calories > 1050 and fat_pct > 55:
        score = min(score + 3, 56)
    return score


def _health_grade(score: int) -> str:
    if score >= 80:
        return "A"
    if score >= 60:
        return "B"
    if score >= 50:
        return "C"
    return "D"


def _build_macro_explanation(
    score: int,
    grade: str,
    protein_pct: float,
    carb_pct: float,
    fat_pct: float,
    reasons: list[str],
) -> str:
    macro_text = f"P:{protein_pct:.0f}% K:{carb_pct:.0f}% Y:{fat_pct:.0f}%"
    if reasons:
        return f"{grade} kalite ({score}/100). {macro_text}. {', '.join(reasons[:3])}."
    return f"{grade} kalite ({score}/100). {macro_text}."


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
    parts = [
        f"{grade} kalite ({score}/100)",
        f"{round(calories)} kcal",
        f"makro dagilimi P:%{protein_pct:.0f} K:%{carb_pct:.0f} Y:%{fat_pct:.0f}",
    ]
    if applied_caps:
        parts.append("ust sinir: " + ", ".join(cap["reason"] for cap in applied_caps[:2]))
    if name_adjustment:
        parts.append(f"tarif tipi duzeltmesi {name_adjustment:+}")
    return ". ".join(parts) + "."


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


def _is_light_sweet_or_snack(category: str | None) -> bool:
    normalized = _fold_text(category or "")
    return _contains_any(normalized, {"dessert", "snack", "tatli", "tatlı", "atistirmalik", "atıştırmalık"})


def _resolve_general_macro_source(recipe, nutrition_rollup: dict) -> dict:
    recipe_macros = _recipe_macro_values_per_serving(recipe)
    if recipe_macros:
        recipe_macros["source"] = "recipe_fields"
        return recipe_macros

    nutrition = dict(nutrition_rollup["per_serving"])
    nutrition["source"] = "ingredient_rollup"
    return nutrition


def _recipe_macro_values_per_serving(recipe) -> dict | None:
    if recipe is None:
        return None

    calories = _optional_float(getattr(recipe, "calorie", None))
    protein = _optional_float(getattr(recipe, "protein", None))
    carbs = _optional_float(getattr(recipe, "carbohydrate", None))
    fat = _optional_float(getattr(recipe, "fat", None))
    if calories is None and protein is None and carbs is None and fat is None:
        return None

    servings = max(1, int(getattr(recipe, "serving", 1) or 1))
    should_divide = servings > 1 and any(value is not None and value > threshold for value, threshold in (
        (calories, 900),
        (protein, 70),
        (carbs, 120),
        (fat, 60),
    ))
    divisor = servings if should_divide else 1

    return {
        "calories_per_100g": _divide_optional(calories, divisor),
        "protein_per_100g": _divide_optional(protein, divisor),
        "carbs_per_100g": _divide_optional(carbs, divisor),
        "fat_per_100g": _divide_optional(fat, divisor),
        "saturated_fat_per_100g": None,
        "fiber_per_100g": None,
        "sugar_per_100g": None,
        "added_sugar_per_100g": None,
        "sodium_mg_per_100g": None,
        "trans_fat_per_100g": None,
        "potassium_mg_per_100g": None,
        "calcium_mg_per_100g": None,
        "iron_mg_per_100g": None,
        "vitamin_d_mcg_per_100g": None,
    }


def _build_ingredient_profile(recipe) -> dict:
    names = []
    categories = []
    for link in list(getattr(recipe, "ingredients", []) or []):
        ingredient = getattr(link, "ingredient", None)
        if not ingredient:
            continue
        names.append(_fold_text(getattr(ingredient, "ingredient_name", "") or ""))
        categories.append(_fold_text(getattr(ingredient, "category", "") or ""))

    joined = " ".join(names + categories)
    return {
        "names": names,
        "joined": joined,
        "has_vegetable": _contains_any(joined, VEGETABLE_TERMS),
        "has_legume": _contains_any(joined, LEGUME_TERMS),
        "has_whole_grain": _contains_any(joined, WHOLE_GRAIN_TERMS),
        "has_lean_protein": _contains_any(joined, LEAN_PROTEIN_TERMS),
        "has_dairy": _contains_any(joined, DAIRY_TERMS),
        "has_added_fat": _contains_any(joined, ADDED_FAT_TERMS),
        "has_heavy_fat": _contains_any(joined, HEAVY_FAT_TERMS),
        "has_sugar": _contains_any(joined, SUGAR_TERMS),
        "has_processed_meat": _contains_any(joined, PROCESSED_MEAT_TERMS),
        "has_salt": _contains_any(joined, SALT_TERMS),
    }


def _build_cooking_profile(recipe) -> dict:
    text = _fold_text(" ".join(str(getattr(recipe, field, "") or "") for field in (
        "recipe_name",
        "recipe_category",
        "cooking_type",
        "cooking_method",
        "explanation",
    )))
    return {
        "text": text,
        "fried": _contains_any(text, {"kizart", "fritoz", "deep fry"}),
        "baked": _contains_any(text, {"firin", "fırın"}),
        "boiled_or_pot": _contains_any(text, {"haslama", "tencere", "buhar"}),
        "dessert": _contains_any(text, {"tatli", "pasta", "kurabiye", "kek", "serbet"}),
    }


def _ingredient_positive_bonus(profile: dict, flags: list[str]) -> float:
    bonus = 0.0
    if profile["has_vegetable"]:
        bonus += 6.0
        flags.append("Sebze iceriyor")
    if profile["has_legume"]:
        bonus += 7.0
        flags.append("Bakliyat iceriyor")
    if profile["has_whole_grain"]:
        bonus += 4.0
        flags.append("Tam tahil dengesi")
    if profile["has_lean_protein"]:
        bonus += 4.0
        flags.append("Protein kaynagi var")
    if profile["has_dairy"]:
        bonus += 2.0
    return min(14.0, bonus)


def _ingredient_negative_penalty(profile: dict, flags: list[str]) -> float:
    penalty = 0.0
    if profile["has_sugar"]:
        penalty += 10.0
        flags.append("Sekerli icerik")
    if profile["has_processed_meat"]:
        penalty += 10.0
        flags.append("Islenmis et iceriyor")
    if profile["has_heavy_fat"]:
        penalty += 6.0
        flags.append("Yagli malzeme iceriyor")
    elif profile["has_added_fat"]:
        penalty += 2.0
    if profile["has_salt"]:
        penalty += 2.0
    return penalty


def _cooking_bonus(profile: dict, flags: list[str]) -> float:
    if profile["boiled_or_pot"] or profile["baked"]:
        flags.append("Pisirme yontemi dengeli")
        return 3.0
    return 0.0


def _cooking_penalty(profile: dict, flags: list[str]) -> float:
    penalty = 0.0
    if profile["fried"]:
        penalty += 12.0
        flags.append("Kizartma")
    if profile["dessert"]:
        penalty += 8.0
        flags.append("Tatli kategorisi")
    return penalty


def resolve_link_amount_grams(link) -> tuple[float | None, float]:
    amount_gram = getattr(link, "miktar_gram", None)
    if amount_gram is not None:
        confidence_label = (getattr(link, "donusum_guveni", None) or "").lower()
        confidence_score = {
            "high": 1.0,
            "medium": 0.75,
            "low": 0.4,
        }.get(confidence_label, 0.85)
        return float(amount_gram), confidence_score
    return estimate_amount_in_grams(link.amount, link.unit)


def _macro_balance_bonus(calories: float, protein: float, carbs: float, fat: float) -> float:
    reference_calories = calories or ((protein * 4) + (carbs * 4) + (fat * 9))
    if not reference_calories:
        return 0.0

    protein_ratio = (protein * 4) / reference_calories if protein else 0.0
    carb_ratio = (carbs * 4) / reference_calories if carbs else 0.0
    fat_ratio = (fat * 9) / reference_calories if fat else 0.0

    bonus = 0.0
    if 0.18 <= protein_ratio <= 0.40:
        bonus += 2.0
    if 0.30 <= carb_ratio <= 0.55:
        bonus += 2.0
    if 0.20 <= fat_ratio <= 0.35:
        bonus += 2.0
    return bonus


def _dv_bonus(value: float, daily_value: float, cap: float) -> float:
    if not value:
        return 0.0
    return min(cap, (value / daily_value) * cap)


def _resolve_meal_calorie_target(calorie_target: float | None, meal_count: int | None) -> float | None:
    if not calorie_target:
        return None
    meals = meal_count or 3
    if meals <= 0:
        meals = 3
    return float(calorie_target) / meals


def _health_summary(flags: list[str], health_band: str) -> str:
    for preferred in (
        "Trans yag iceriyor",
        "Doymus yag yuksek",
        "Sodyum yuksek",
        "Seker yuksek",
        "Makro dengesi iyi",
        "Yuksek protein",
        "Liften zengin",
        "Besin degeri tahmini",
    ):
        if preferred in flags:
            return preferred
    return health_band


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


def _nutrition_fields() -> tuple[str, ...]:
    return (
        "calories_per_100g",
        "protein_per_100g",
        "carbs_per_100g",
        "fat_per_100g",
        "saturated_fat_per_100g",
        "fiber_per_100g",
        "sugar_per_100g",
        "sodium_mg_per_100g",
        "added_sugar_per_100g",
        "trans_fat_per_100g",
        "cholesterol_mg_per_100g",
        "potassium_mg_per_100g",
        "calcium_mg_per_100g",
        "iron_mg_per_100g",
        "vitamin_d_mcg_per_100g",
    )


def _safe_float(value) -> float:
    return float(value) if value is not None else 0.0


def _optional_float(value) -> float | None:
    return float(value) if value is not None else None


def _divide_optional(value: float | None, divisor: int) -> float | None:
    return round(value / divisor, 2) if value is not None else None


def _contains_any(text: str, terms: set[str]) -> bool:
    folded_terms = {_fold_text(term) for term in terms}
    return any(term and term in text for term in folded_terms)


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
        ("Ä±", "i"), ("Ä°", "i"),
        ("ÄŸ", "g"), ("Ä", "g"),
        ("ÅŸ", "s"), ("Å", "s"),
        ("Ã¶", "o"), ("Ã–", "o"),
        ("Ã¼", "u"), ("Ãœ", "u"),
        ("Ã§", "c"), ("Ã‡", "c"),
    ):
        normalized = normalized.replace(source.lower(), target)
    normalized = unicodedata.normalize("NFKD", normalized)
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    return " ".join(normalized.split())


def _dedupe(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result
