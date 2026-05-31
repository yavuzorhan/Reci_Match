# Tez Ek Kod Parcalari

Bu secimde her EK tek fonksiyon olarak korunmustur. Fonksiyonlarin ana akisi degistirilmeden; yalnizca tez icin kritik olan prompt, API cagrisi, eslestirme, skor, filtre ve donus kisimlari birakilmistir.

## EK-1: Gemini ile Besin Degeri Alma

Dosya: `backend/app/services/gemini_client.py`

```python
def estimate_nutrition_with_gemini(name: str) -> dict | None:
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    prompt = (
        "Detayli besin degerleri ver: kalori, protein, karbonhidrat, yag, doymus yag, "
        "lif, seker, sodyum. Bilinmiyorsa 0 yaz. Sadece JSON don, aciklama yapma. "
        f"Malzeme: {name}. Turkce yerel urunler icin Turk mutfagi baglamini dikkate al."
    )
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=genai_types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=NUTRITION_SCHEMA,
        ),
    )
    data = json.loads(response.text)
    return {
        "calorie_per_100g": data.get("calories_per_100g", 0),
        "protein_per_100g": data.get("protein_per_100g", 0),
        "carbohydrate_per_100g": data.get("carbs_per_100g", 0),
        "fat_per_100g": data.get("fat_per_100g", 0),
        "saturated_fat_per_100g": data.get("saturated_fat_per_100g", 0),
        "fiber_per_100g": data.get("fiber_per_100g", 0),
        "sugar_per_100g": data.get("sugar_per_100g", 0),
        "sodium_mg_per_100g": data.get("sodium_mg_per_100g", 0),
    }
```

## EK-2: Iki Katmanli Besin Cozumleme

Dosya: `backend/app/services/nutrition_resolver_service.py`

```python
async def resolve_ingredient_nutrition(db: Session, user_id: int, ingredient_name: str) -> NutritionResult | None:
    normalized_name = normalize_turkish_text(ingredient_name)
    local = ingredient_repository.find_local_nutrition_match(db, user_id, normalized_name)
    if local and float(getattr(local, "calorie_per_100g", 0) or 0) > 0:
        return NutritionResult(
            source="db",
            confidence_score=1.0,
            nutrition={field: float(getattr(local, field, 0) or 0) for field in NUTRITION_FIELDS},
        )
    nutrition = estimate_nutrition_with_gemini(normalized_name)
    if nutrition:
        return NutritionResult(source="gemini", confidence_score=0.7, nutrition=nutrition)
    return None
```

## EK-3: Tarif Oneri Skoru

Dosya: `backend/app/services/recipe_service.py`

```python
def get_recommendations(
    selected_ingredient_ids: list[int],
    pantry_ingredient_ids: list[int],
    disliked_ingredient_ids: list[int],
    cooking_types: list[str],
    exclude_disliked: bool,
    user_id: int | None,
    source: str | None,
    healthy_only: bool,
    db: Session,
) -> list[dict]:
    selected_ids = set(selected_ingredient_ids)
    pantry_only_ids = set(pantry_ingredient_ids) - selected_ids
    disliked_ids = set(disliked_ingredient_ids) if exclude_disliked else set()
    recipes = recipe_repository.get_all_recipes(db=db, user_id=user_id, source=source, healthy_only=healthy_only)

    results = []
    for recipe in recipes:
        matched_links, missing_links, disliked_links = [], [], []
        matched_selected_input_ids, matched_pantry_input_ids = set(), set()
        ingredient_links = sorted(recipe.ingredients, key=lambda item: item.recipe_ingredient_id)

        for item in ingredient_links:
            item_keys = ingredient_keys(item.ingredient.ingredient_name)
            selected_match = any(keys and item_keys & keys for keys in selected_keys_by_id.values())
            pantry_match = any(keys and item_keys & keys for keys in pantry_keys_by_id.values())
            matched_selected_input_ids |= {i for i, k in selected_keys_by_id.items() if k and item_keys & k}
            matched_pantry_input_ids |= {i for i, k in pantry_keys_by_id.items() if k and item_keys & k}
            (matched_links if selected_match or pantry_match else missing_links).append(item)
            if item_keys & disliked_keys:
                disliked_links.append(item)

        if not matched_links or (exclude_disliked and disliked_links):
            continue

        selected_score = (len(matched_selected_input_ids) / len(selected_ids)) * 75 if selected_ids else 0
        pantry_score = (len(matched_pantry_input_ids) / len(pantry_only_ids)) * 15 if pantry_only_ids else 0
        recipe_bonus = min(10, (len(matched_links) / len(ingredient_links)) * 20)
        matched_bonus = min(10, len(matched_links) * 2)
        disliked_penalty = len(disliked_links) * 35
        score = round(max(5, min(100, selected_score + pantry_score + recipe_bonus + matched_bonus - disliked_penalty)))

        results.append({"recipe": recipe.recipe_name, "score": score, "matched": matched_links, "missing": missing_links})

    results.sort(key=lambda item: (item["score"], len(item["matched"]), -len(item["missing"])), reverse=True)
    return results
```

## EK-4: Saglik Puani

Dosya: `backend/app/utils/recipe_health.py`

```python
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
    protein_kcal = protein * 4
    carb_kcal = carbs * 4
    fat_kcal = fat * 9
    macro_total = protein_kcal + carb_kcal + fat_kcal

    protein_pct = protein_kcal / macro_total * 100 if macro_total else 0.0
    carb_pct = carb_kcal / macro_total * 100 if macro_total else 0.0
    fat_pct = fat_kcal / macro_total * 100 if macro_total else 0.0
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
    raw_score += _weighted_name_category_adjustment(recipe_name, category, carbs, carb_pct, fat)
    raw_score = _weighted_calibration(raw_score, calories, protein, carbs, fat, carb_pct, fat_pct, recipe_name, category)

    applied_caps = _hard_caps(calories, fat, fat_pct, category)
    max_score = min([100, *[cap["max_score"] for cap in applied_caps]]) if applied_caps else 100
    score = _clamp(min(raw_score, max_score))
    grade = _health_grade(score)

    return {
        "health_score": int(score),
        "health_grade": grade,
        "protein_pct": round(protein_pct, 2),
        "carb_pct": round(carb_pct, 2),
        "fat_pct": round(fat_pct, 2),
    }
```

## EK-5: Gemini Tarif Revizyonu

Dosya: `backend/app/services/recipe_revision_service.py`

```python
def _revise_with_gemini(recipe_json: dict, modifications: dict) -> dict:
    client = genai.Client(api_key=getenv("GEMINI_API_KEY"))
    original_ingredient_names = [item.get("name") for item in recipe_json.get("ingredients", []) if item.get("name")]
    requested_additions = [item.get("name") for item in modifications.get("add_ingredients", []) if item.get("name")]
    requested_removals = modifications.get("remove_ingredients", [])

    prompt = f"""Asagidaki tarifi verilen degisikliklere gore revize et.
Tarifin kimligini bozma. Sadece gerekli minimum degisiklikleri yap.
Halusinasyon yapma: Orijinal tarifte olmayan bilgileri kesin bilgi gibi uydurma.

Orijinal tarif:
{json.dumps(recipe_json, ensure_ascii=False)}
Istenen degisiklikler:
{json.dumps(modifications, ensure_ascii=False)}
Orijinal malzemeler:
{json.dumps(original_ingredient_names, ensure_ascii=False)}
Kullanicinin eklemek istedigi malzemeler:
{json.dumps(requested_additions, ensure_ascii=False)}
Kullanicinin cikarmak istedigi malzemeler:
{json.dumps(requested_removals, ensure_ascii=False)}

Su kurallara uy:
- Sadece orijinal malzemeleri ve kullanicinin ekledigi malzemeleri kullan.
- Yeni ve alakasiz malzeme uydurma.
- Gramajlari kullanicinin miktar degisikliklerine gore orantili ayarla.
- JSON dondur, baska aciklama ekleme.

Donmen gereken JSON semasi:
{json.dumps(REVISION_RESPONSE_SCHEMA, ensure_ascii=False)}
"""
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=genai_types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=REVISION_RESPONSE_SCHEMA,
        ),
    )
    parsed = _parse_json_response(getattr(response, "text", "") or "")

    removed_norms = {ascii_fold(r) for r in requested_removals if r}
    allowed_norms = {ascii_fold(n) for n in original_ingredient_names if n} - removed_norms
    allowed_norms |= {ascii_fold(n) for n in requested_additions if n}
    filtered = [item for item in parsed["ingredients"] if ascii_fold(item.get("ingredient_name", "")) in allowed_norms]
    if filtered:
        parsed["ingredients"] = filtered

    return parsed
```

Toplam kod satiri: 181. Her EK tek fonksiyon olarak kalmistir; fonksiyon icindeki kritik algoritmik kisimlar korunmustur.
