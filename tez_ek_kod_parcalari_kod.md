# Tez Ek Kod Parçaları

---

## EK-1: Gemini ile Besin Değeri Alma

```python
# Malzeme adından Gemini 2.5 Flash ile 8 besin alanı tahmin eder; sonucu DB kolon adlarına dönüştürür.
# gemini_client.py — estimate_nutrition_with_gemini
# Dönen alanlar: calorie_per_100g, protein_per_100g, carbohydrate_per_100g, fat_per_100g,
#                saturated_fat_per_100g, fiber_per_100g, sugar_per_100g, sodium_mg_per_100g

def estimate_nutrition_with_gemini(name: str) -> dict:
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    prompt = (
        "Detayli besin degerleri ver: kalori, protein, karbonhidrat, yag, doymus yag, "
        "lif, seker, sodyum. Bilinmiyorsa 0 yaz. Sadece JSON don. "
        f"Malzeme: {name}. Turk mutfagi baglamini dikkate al."
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
        "calorie_per_100g":       data.get("calories_per_100g", 0),
        "protein_per_100g":       data.get("protein_per_100g", 0),
        "carbohydrate_per_100g":  data.get("carbs_per_100g", 0),
        "fat_per_100g":           data.get("fat_per_100g", 0),
        "saturated_fat_per_100g": data.get("saturated_fat_per_100g", 0),
        "fiber_per_100g":         data.get("fiber_per_100g", 0),
        "sugar_per_100g":         data.get("sugar_per_100g", 0),
        "sodium_mg_per_100g":     data.get("sodium_mg_per_100g", 0),
    }
```
**EK-1 satır sayısı: 30**

---

## EK-2: İki Katmanlı Besin Çözümleme

```python
# Besin verisi önce yerel DB'den aranır; kalori değeri sıfırsa Gemini ile tahmin edilir.
# nutrition_resolver_service.py — resolve_ingredient_nutrition

NUTRITION_FIELDS = ("calorie_per_100g", "protein_per_100g", "carbohydrate_per_100g", "fat_per_100g", "saturated_fat_per_100g", "fiber_per_100g", "sugar_per_100g", "sodium_mg_per_100g")

async def resolve_ingredient_nutrition(db, user_id, ingredient_name):
    normalized = normalize_turkish_text(ingredient_name)
    local = ingredient_repository.find_local_nutrition_match(db, user_id, normalized)
    if local and float(getattr(local, "calorie_per_100g", 0) or 0) > 0:
        return NutritionResult(
            source="db",
            confidence_score=1.0,
            nutrition={f: float(getattr(local, f, 0) or 0) for f in NUTRITION_FIELDS},
        )
    nutrition = estimate_nutrition_with_gemini(normalized)
    if nutrition:
        return NutritionResult(source="gemini", confidence_score=0.7, nutrition=nutrition)
    return None
```
**EK-2 satır sayısı: 17**

---

## EK-3: Tarif Öneri Skoru

```python
# Seçili ve dolap malzeme eşleşmelerinden skor üretir; sevilmeyen malzeme ceza keser, sıralama skora göre yapılır.
# recipe_service.py — get_recommendations (skor hesaplama döngüsü)

results = []
for recipe in recipes:
    ingredient_links = sorted(recipe.ingredients, key=lambda i: i.recipe_ingredient_id)
    if not ingredient_links:
        continue
    matched_links, missing_links, disliked_links = [], [], []
    matched_selected_ids, matched_pantry_ids = set(), set()
    for item in ingredient_links:
        item_keys = ingredient_keys(item.ingredient.ingredient_name)
        sel = any(k and item_keys & k for k in selected_keys_by_id.values())
        pan = any(k and item_keys & k for k in pantry_keys_by_id.values())
        if sel:
            matched_selected_ids |= {iid for iid, k in selected_keys_by_id.items() if k and item_keys & k}
        if pan:
            matched_pantry_ids |= {iid for iid, k in pantry_keys_by_id.items() if k and item_keys & k}
        (matched_links if sel or pan else missing_links).append(item)
        if item_keys & disliked_keys:
            disliked_links.append(item)
    if not matched_links or (exclude_disliked and disliked_links):
        continue
    selected_score   = (len(matched_selected_ids) / len(selected_ids))    * 75 if selected_ids    else 0
    pantry_score     = (len(matched_pantry_ids)   / len(pantry_only_ids)) * 15 if pantry_only_ids else 0
    recipe_bonus     = min(10, (len(matched_links) / len(ingredient_links)) * 20)
    matched_bonus    = min(10, len(matched_links) * 2)
    disliked_penalty = len(disliked_links) * 35
    score = round(max(5, min(100, selected_score + pantry_score + recipe_bonus + matched_bonus - disliked_penalty)))
    results.append({"score": score, "matched": matched_links, "missing": missing_links})

results.sort(key=lambda r: (r["score"], len(r["matched"]), -len(r["missing"])), reverse=True)
```
**EK-3 satır sayısı: 30**

---

## EK-4: Sağlık Puanı

```python
# Porsiyon başı makrolardan 5 alt skor hesaplar, ağırlıklı toplar, hard cap uygular ve harf notu atar.
# recipe_health.py — calculate_health_score

def calculate_health_score(calories, protein, carbs, fat, recipe_name=None, category=None):
    macro_total = protein * 4 + carbs * 4 + fat * 9
    protein_pct = (protein * 4) / macro_total * 100 if macro_total else 0.0
    carb_pct    = (carbs   * 4) / macro_total * 100 if macro_total else 0.0
    fat_pct     = (fat     * 9) / macro_total * 100 if macro_total else 0.0
    protein_per_100_kcal = protein / calories * 100

    calorie_score = _calorie_subscore(calories)
    protein_score = _protein_subscore(protein_per_100_kcal, calories, category)
    fat_score     = _fat_subscore(fat_pct, fat)
    carb_score    = _carb_subscore(carb_pct, calories, fat, category)
    balance_score = _balance_subscore(calories, protein, carbs, fat_pct, carb_pct, protein_pct)

    raw_score = calorie_score * 0.30 + protein_score * 0.25 + fat_score * 0.25 + carb_score * 0.10 + balance_score * 0.10
    raw_score += _weighted_name_category_adjustment(recipe_name, category, carbs, carb_pct, fat)
    raw_score  = _weighted_calibration(raw_score, calories, protein, carbs, fat, carb_pct, fat_pct, recipe_name, category)
    caps       = _hard_caps(calories, fat, fat_pct, category)
    score      = _clamp(min(raw_score, min([100, *[c["max_score"] for c in caps]]) if caps else 100))

    if score >= 80:   grade = "A"
    elif score >= 60: grade = "B"
    elif score >= 50: grade = "C"
    else:             grade = "D"

    return {"health_score": int(score), "health_grade": grade, "protein_pct": round(protein_pct, 2), "carb_pct": round(carb_pct, 2), "fat_pct": round(fat_pct, 2)}
```
**EK-4 satır sayısı: 26**

---

## EK-5: Gemini Tarif Revizyonu

```python
# Değişiklik hash'i ile önbellekten döner; cache yoksa Gemini'ye revize ettirir, halüsinasyonları filtreler ve kaydeder.
# recipe_revision_service.py — revise_recipe / _revise_with_gemini

modifications_hash = _hash_modifications(normalized_modifications)
cached = recipe_repository.find_revision_cache(db, recipe_id, modifications_hash)
if cached:
    return {"status": "success", "cached": True, "revised_recipe": RevisedRecipePayload.model_validate_json(cached.response_json).model_dump()}

prompt = (
    f"Asagidaki tarifi verilen degisikliklere gore revize et. Halucinasyon yapma.\n"
    f"Orijinal tarif: {json.dumps(recipe_json, ensure_ascii=False)}\n"
    f"Istenen degisiklikler: {json.dumps(modifications, ensure_ascii=False)}\n"
    f"Orijinal malzemeler: {json.dumps(original_ingredient_names, ensure_ascii=False)}\n"
    f"Eklenecek: {json.dumps(requested_additions, ensure_ascii=False)}\n"
    f"Cikarilacak: {json.dumps(requested_removals, ensure_ascii=False)}\n"
    "Sadece orijinal + eklenen malzemeleri kullan. JSON don."
)
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt,
    config=genai_types.GenerateContentConfig(response_mime_type="application/json", response_schema=REVISION_RESPONSE_SCHEMA),
)
parsed = json.loads(response.text)

removed_norms = {ascii_fold(r) for r in requested_removals if r}
allowed_norms = {ascii_fold(n) for n in original_ingredient_names if n} - removed_norms | {ascii_fold(n) for n in requested_additions if n}
if allowed_norms:
    filtered = [item for item in parsed["ingredients"] if ascii_fold(item.get("ingredient_name", "")) in allowed_norms]
    if filtered:
        parsed["ingredients"] = filtered

recipe_repository.create_revision_cache(db, recipe_id, modifications_hash, json.dumps(parsed))
db.commit()
return {"status": "success", "cached": False, "revised_recipe": parsed}
```
**EK-5 satır sayısı: 32**

---

> **Toplam kod satırı: 30 + 17 + 30 + 26 + 32 = 135 ≤ 200** ✓
