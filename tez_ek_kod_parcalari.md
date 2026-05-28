# ReciMatch Tez Ekleri Ä°Ã§in GÃ¼ncel Kod ParÃ§alarÄ±

Bu dosya, tezdeki `EKLER` bÃ¶lÃ¼mÃ¼nde yer alan EK-1 ile EK-8 arasÄ±ndaki kod parÃ§alarÄ±nÄ± gÃ¼ncel proje mimarisine gÃ¶re tamamlamak iÃ§in hazÄ±rlanmÄ±ÅŸtÄ±r. USDA tabanlÄ± eski besin deÄŸeri akÄ±ÅŸÄ± kaldÄ±rÄ±ldÄ±ÄŸÄ± iÃ§in Ã¶zellikle EK-5, EK-6 ve EK-7 baÅŸlÄ±klarÄ± gÃ¼ncel Gemini ve inline nutrition yapÄ±sÄ±na gÃ¶re dÃ¼zenlenmiÅŸtir.

Kod parÃ§alarÄ± tezde tam dosya dÃ¶kÃ¼mÃ¼ yerine temsilÃ® ve aÃ§Ä±klayÄ±cÄ± bÃ¶lÃ¼m olarak kullanÄ±labilir. Her ek baÅŸlÄ±ÄŸÄ±nÄ±n altÄ±na dosya adÄ± yazÄ±lmasÄ± Ã¶nerilir.

---

## EK-1: KayÄ±t ve E-posta DoÄŸrulama Kod ParÃ§asÄ±

**Dosya ve satırlar:** `backend/app/services/auth_service.py:15` (`register_user`), `backend/app/services/auth_service.py:46` (`verify_email`)

```python
def register_user(name: str, email: str, password: str, db: Session) -> dict:
    user = db.query(User).filter(User.email == email).first()
    if user:
        raise HTTPException(status_code=400, detail="Bu email zaten kayÄ±tlÄ±.")

    hashed_pw = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    code = generate_otp()
    verification = EmailVerificationCode(
        email=email,
        code=code,
        purpose="register",
        expires_at=datetime.utcnow() + timedelta(minutes=10),
        temp_name=name,
        temp_password=hashed_pw,
    )
    db.add(verification)
    db.commit()

    send_verification_email(email, code)
    return {
        "message": "DoÄŸrulama kodu mail adresinize gÃ¶nderildi."
    }
```

```python
def verify_email(email: str, code: str, db: Session) -> dict:
    record = (
        db.query(EmailVerificationCode)
        .filter(
            EmailVerificationCode.email == email,
            EmailVerificationCode.code == code,
            EmailVerificationCode.purpose == "register",
        )
        .order_by(EmailVerificationCode.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=400, detail="GeÃ§ersiz doÄŸrulama kodu.")

    if record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Kodun sÃ¼resi dolmuÅŸ.")

    new_user = User(
        name_surname=record.temp_name,
        email=record.email,
        password_hash=record.temp_password,
        is_verified=True,
    )
    db.add(new_user)
    db.delete(record)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "HesabÄ±nÄ±z baÅŸarÄ±yla oluÅŸturuldu ve doÄŸrulandÄ±.",
        "user": {
            "id": new_user.user_id,
            "name": new_user.name_surname,
            "email": new_user.email,
        },
    }
```

Bu kod parÃ§asÄ±, kullanÄ±cÄ± hesabÄ±nÄ±n doÄŸrudan oluÅŸturulmadÄ±ÄŸÄ±nÄ±; Ã¶nce geÃ§ici doÄŸrulama kaydÄ± oluÅŸturulduÄŸunu ve e-posta kodu doÄŸrulandÄ±ktan sonra gerÃ§ek kullanÄ±cÄ± kaydÄ±nÄ±n aÃ§Ä±ldÄ±ÄŸÄ±nÄ± gÃ¶stermektedir.

---

## EK-2: GiriÅŸ ve Åifre SÄ±fÄ±rlama Kod ParÃ§asÄ±

**Dosya ve satırlar:** `backend/app/services/auth_service.py:97` (`login_user`), `backend/app/services/auth_service.py:151` (`forgot_password`), `backend/app/services/auth_service.py:173` (`reset_password`)

```python
def login_user(email: str, password: str, db: Session) -> dict:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="GeÃ§ersiz e-posta veya ÅŸifre.")

    is_valid_password = bcrypt.checkpw(
        password.encode("utf-8"),
        user.password_hash.encode("utf-8")
    )
    if not is_valid_password:
        raise HTTPException(status_code=401, detail="GeÃ§ersiz e-posta veya ÅŸifre.")

    if not user.is_verified:
        raise HTTPException(
            status_code=401,
            detail="LÃ¼tfen Ã¶nce e-posta adresinizi doÄŸrulayÄ±n.",
        )

    return {
        "message": "GiriÅŸ baÅŸarÄ±lÄ±!",
        "user": {
            "id": user.user_id,
            "name": user.name_surname,
            "email": user.email,
        },
        "profile": {
            "age": user.age or "",
            "gender": user.gender or "Erkek",
            "height": user.height_cm or "",
            "weight": float(user.weight_kg) if user.weight_kg else "",
            "daily_calorie": user.daily_calorie,
        },
    }
```

```python
def forgot_password(email: str, db: Session) -> dict:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {
            "message": "EÄŸer bu e-posta sistemde kayÄ±tlÄ±ysa sÄ±fÄ±rlama kodu gÃ¶nderildi."
        }

    code = generate_otp()
    reset_record = EmailVerificationCode(
        user_id=user.user_id,
        email=user.email,
        code=code,
        purpose="reset_password",
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db.add(reset_record)
    db.commit()

    send_password_reset_email(user.email, code)
    return {"message": "Åifre sÄ±fÄ±rlama kodu e-postanÄ±za gÃ¶nderildi."}
```

```python
def reset_password(email: str, code: str, new_password: str, db: Session) -> dict:
    record = (
        db.query(EmailVerificationCode)
        .filter(
            EmailVerificationCode.email == email,
            EmailVerificationCode.code == code,
            EmailVerificationCode.purpose == "reset_password",
        )
        .order_by(EmailVerificationCode.created_at.desc())
        .first()
    )
    if not record or record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="GeÃ§ersiz veya sÃ¼resi dolmuÅŸ kod.")

    user = db.query(User).filter(User.user_id == record.user_id).first()
    user.password_hash = bcrypt.hashpw(
        new_password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    db.delete(record)
    db.commit()
    return {"message": "Åifreniz baÅŸarÄ±yla gÃ¼ncellendi."}
```

---

## EK-3: Ã–neri Skoru Hesaplama Kod ParÃ§asÄ±

**Dosya ve satır:** `backend/app/services/recipe_service.py:388` (`get_recommendations`)

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
    pantry_ids = set(pantry_ingredient_ids)
    pantry_only_ids = pantry_ids - selected_ids
    disliked_ids = set(disliked_ingredient_ids) if exclude_disliked else set()
    available_ids = selected_ids | pantry_ids

    if not available_ids:
        return []

    recipes = recipe_repository.get_all_recipes(
        db=db,
        user_id=user_id,
        source=source,
        healthy_only=healthy_only,
    )

    results = []
    for recipe in recipes:
        matched_links = []
        missing_links = []
        disliked_links = []

        for item in recipe.ingredients:
            item_keys = ingredient_keys(item.ingredient.ingredient_name)

            selected_match = any(
                item_keys & ingredient_keys_by_id
                for ingredient_keys_by_id in selected_keys_by_id.values()
            )
            pantry_match = any(
                item_keys & ingredient_keys_by_id
                for ingredient_keys_by_id in pantry_keys_by_id.values()
            )

            if selected_match or pantry_match:
                matched_links.append(item)
            else:
                missing_links.append(item)

            if item_keys & disliked_keys:
                disliked_links.append(item)

        if not matched_links:
            continue
        if exclude_disliked and disliked_links:
            continue

        selected_score = (selected_hit_count / len(selected_ids)) * 75 if selected_ids else 0
        pantry_score = (pantry_hit_count / len(pantry_only_ids)) * 15 if pantry_only_ids else 0
        recipe_bonus = min(10, recipe_match_ratio * 20)
        matched_bonus = min(10, matched_count * 2)
        disliked_penalty = disliked_count * 35

        score = selected_score + pantry_score + recipe_bonus + matched_bonus - disliked_penalty
        score = round(max(5 if matched_count else 0, min(100, score)))
```

Bu algoritmada seÃ§ili malzeme eÅŸleÅŸmeleri ana skoru, dolap malzemeleri destekleyici skoru, sevilmeyen malzemeler ise ceza puanÄ±nÄ± oluÅŸturur.

---

## EK-4: SaÄŸlÄ±k PuanÄ± AlgoritmasÄ± Kod ParÃ§asÄ±

**Dosya ve satırlar:** `backend/app/utils/recipe_health.py:232` (`calculate_health_score`), `backend/app/utils/recipe_health.py:914` (`_health_grade`)

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
    calories = _safe_float(calories)
    protein = _safe_float(protein)
    carbs = _safe_float(carbs)
    fat = _safe_float(fat)

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
    balance_score = _balance_subscore(
        calories, protein, carbs, fat_pct, carb_pct, protein_pct
    )

    raw_score = (
        calorie_score * 0.30
        + protein_score * 0.25
        + fat_score * 0.25
        + carb_score * 0.10
        + balance_score * 0.10
    )

    score = max(0, min(100, round(raw_score)))
    grade = _health_grade(score)

    return {
        "health_score": int(score),
        "health_grade": grade,
        "protein_pct": round(protein_pct, 2),
        "carb_pct": round(carb_pct, 2),
        "fat_pct": round(fat_pct, 2),
    }
```

```python
def _health_grade(score: int) -> str:
    if score >= 80:
        return "A"
    if score >= 60:
        return "B"
    if score >= 50:
        return "C"
    return "D"
```

SaÄŸlÄ±k puanÄ± yalnÄ±zca kaloriye gÃ¶re deÄŸil, protein yoÄŸunluÄŸu, yaÄŸ oranÄ±, karbonhidrat dengesi ve genel makro daÄŸÄ±lÄ±mÄ±na gÃ¶re hesaplanmaktadÄ±r.

---

## EK-5: Gemini Tarif Revizyonu Kod ParÃ§asÄ±

**Dosya ve satırlar:** `backend/app/services/recipe_revision_service.py:24` (`REVISION_RESPONSE_SCHEMA`), `backend/app/services/recipe_revision_service.py:138` (`_revise_with_gemini`)

```python
REVISION_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "recipe_name": {"type": "string"},
        "explanation": {"type": "string"},
        "preparation": {"type": "string"},
        "recipe_category": {"type": "string"},
        "cooking_type": {"type": "string"},
        "cooking_method": {"type": "string"},
        "total_time_minutes": {"type": "integer"},
        "serving": {"type": "integer"},
        "ingredients": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ingredient_name": {"type": "string"},
                    "amount": {"type": "number"},
                    "unit": {"type": "string"},
                },
                "required": ["ingredient_name"],
            },
        },
    },
    "required": ["recipe_name", "ingredients", "preparation"],
}
```

```python
def _revise_with_gemini(recipe_json: dict, modifications: dict) -> dict:
    client = genai.Client(api_key=getenv("GEMINI_API_KEY"))

    prompt = f"""
    AÅŸaÄŸÄ±daki tarifi verilen deÄŸiÅŸikliklere gÃ¶re revize et.
    Tarifin kimliÄŸini bozma.
    Yeni ve alakasÄ±z malzeme uydurma.
    JSON dÃ¶ndÃ¼r, baÅŸka aÃ§Ä±klama ekleme.

    Orijinal tarif:
    {json.dumps(recipe_json, ensure_ascii=False)}

    Ä°stenen deÄŸiÅŸiklikler:
    {json.dumps(modifications, ensure_ascii=False)}
    """

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=genai_types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=REVISION_RESPONSE_SCHEMA,
        ),
    )
    return _parse_json_response(getattr(response, "text", "") or "")
```

GÃ¼ncel sistemde eski `google-generativeai` paketi yerine `google-genai` paketi kullanÄ±lmaktadÄ±r. Gemini cevabÄ± yapÄ±landÄ±rÄ±lmÄ±ÅŸ JSON ÅŸemasÄ±yla sÄ±nÄ±rlandÄ±rÄ±lmÄ±ÅŸtÄ±r.

---

## EK-6: Malzeme EÅŸleÅŸtirme ve Alias Kod ParÃ§asÄ±

**Dosya ve satırlar:** `backend/app/services/ingredient_resolver_service.py:100` (`find_matching_ingredient`), `backend/app/utils/recipe_helpers.py:22` (`ingredient_keys`)

```python
def find_matching_ingredient(db: Session, user_id: int, normalized_name: str) -> Ingredient | None:
    normalized_key = normalize_turkish_text(normalized_name)

    exact_matches = [
        ingredient
        for ingredient in ingredient_repository.find_accessible_ingredients_by_name(
            db, user_id, normalized_name
        )
        if normalize_turkish_text(ingredient.ingredient_name) == normalized_key
    ]
    if exact_matches:
        return _pick_best_match(exact_matches, user_id, normalized_key)

    alias = ingredient_repository.find_accessible_ingredient_alias(
        db, user_id, normalized_key
    )
    if alias:
        return alias.ingredient

    best_match = None
    best_score = 0.0
    for ingredient in ingredient_repository.list_accessible_ingredients(db, user_id):
        candidate_key = normalize_turkish_text(ingredient.ingredient_name)
        if not candidate_key or candidate_key == normalized_key:
            continue

        direct = fuzz.ratio(normalized_key, candidate_key)
        token_sort = fuzz.token_sort_ratio(normalized_key, candidate_key)
        score = max(direct, token_sort)

        if score > best_score:
            best_match = ingredient
            best_score = score

    if best_match is not None and best_score >= 85:
        return best_match
    return None
```

```python
def ingredient_keys(value: str) -> set[str]:
    canonical = ascii_fold(normalize_ingredient_name(value or ""))
    if not canonical:
        return set()
    return {
        f"exact:{canonical}",
        f"exact:{canonical.replace(' ', '')}",
    }
```

Bu yapÄ±, TÃ¼rkÃ§e karakter farklÄ±lÄ±klarÄ±nÄ± ve yazÄ±m Ã§eÅŸitliliÄŸini azaltmak iÃ§in normalize edilmiÅŸ anahtarlar Ã¼retir. Alias tablosu dolu olduÄŸunda farklÄ± yazÄ±mlar aynÄ± malzemeye baÄŸlanabilir.

---

## EK-7: Gram DÃ¶nÃ¼ÅŸÃ¼m YardÄ±mcÄ±larÄ± Kod ParÃ§asÄ±

**Not:** Ã–nceki sÃ¼rÃ¼mdeki `unit_conversion_service.py` kaldÄ±rÄ±lmÄ±ÅŸtÄ±r. GÃ¼ncel projede gram dÃ¶nÃ¼ÅŸÃ¼mÃ¼ ayrÄ± servis dosyasÄ± yerine `recipe_helpers.py` ve `recipe_health.py` iÃ§indeki yardÄ±mcÄ± fonksiyonlarla yapÄ±lmaktadÄ±r.

**Dosya ve satır:** `backend/app/utils/recipe_helpers.py:59` (`unit_to_grams`)

```python
def unit_to_grams(amount, unit: str | None, ingredient_name: str | None = None) -> float | None:
    if amount is None:
        return None
    try:
        amount_value = float(amount)
    except (TypeError, ValueError):
        return None
    if amount_value <= 0:
        return None

    normalized_unit = ascii_fold(unit or "g")
    normalized_unit = normalized_unit.replace(".", "")
    unit_map = {
        "g": 1,
        "gr": 1,
        "gram": 1,
        "kg": 1000,
        "ml": 1,
        "litre": 1000,
        "adet": 50,
        "tane": 50,
        "yemek kasigi": 15,
        "tatli kasigi": 10,
        "cay kasigi": 5,
        "su bardagi": 200,
    }

    multiplier = (
        piece_gram_for_ingredient(ingredient_name)
        if normalized_unit in {"adet", "tane"}
        else unit_map.get(normalized_unit)
    )
    if multiplier is None:
        return None
    return round(amount_value * multiplier, 2)
```

**Dosya ve satır:** `backend/app/utils/recipe_health.py:1125` (`resolve_link_amount_grams`)

```python
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
```

Bu kodlar tarifteki miktar ve birim bilgisini gram cinsinden yaklaÅŸÄ±k deÄŸere Ã§evirir. Gram karÅŸÄ±lÄ±ÄŸÄ±, tarif makro hesaplamasÄ± ve saÄŸlÄ±k puanÄ± hesabÄ± iÃ§in kullanÄ±lÄ±r.

---

## EK-8: Favori ve GÃ¼nlÃ¼k KayÄ±t Ä°ÅŸlemleri Kod ParÃ§asÄ±

**Dosya ve satırlar:** `backend/app/services/user_service.py:111` (`add_favorite`), `backend/app/services/user_service.py:124` (`remove_favorite`), `backend/app/services/user_service.py:220` (`add_daily_log`)

```python
def add_favorite(user_id: int, recipe_id: int, db: Session) -> dict:
    _ensure_user_exists(user_id, db)
    _ensure_recipe_exists(recipe_id, db)

    existing = user_repository.find_favorite(db, user_id, recipe_id)
    if existing:
        return {"message": "Tarif zaten favorilerde.", "recipe_id": recipe_id}

    user_repository.create_favorite(db, user_id, recipe_id)
    db.commit()
    return {"message": "Favorilere eklendi.", "recipe_id": recipe_id}
```

```python
def remove_favorite(user_id: int, recipe_id: int, db: Session) -> dict:
    favorite = user_repository.find_favorite(db, user_id, recipe_id)
    if not favorite:
        raise HTTPException(status_code=404, detail="Favori kaydÄ± bulunamadÄ±.")

    db.delete(favorite)
    db.commit()
    return {"message": "Favorilerden kaldÄ±rÄ±ldÄ±.", "recipe_id": recipe_id}
```

```python
def add_daily_log(
    user_id: int,
    recipe_id: int,
    meal_type: str,
    serving_count: int | None,
    serving_multiplier: float | None,
    db: Session,
    log_date: str | None = None,
) -> dict:
    _ensure_user_exists(user_id, db)
    recipe = _ensure_recipe_exists(recipe_id, db)

    normalized_meal_type = _normalize_meal_type(meal_type)
    resolved_serving_count = _normalize_serving_count(serving_count)
    resolved_multiplier = float(resolved_serving_count)

    recipe_macros = _recipe_macros_per_serving(recipe)
    adjusted_calorie = recipe_macros["calorie"] * resolved_multiplier
    adjusted_protein = recipe_macros["protein"] * resolved_multiplier
    adjusted_carbohydrate = recipe_macros["carbohydrate"] * resolved_multiplier
    adjusted_fat = recipe_macros["fat"] * resolved_multiplier

    log = user_repository.create_daily_log(
        db,
        user_id=user_id,
        recipe_id=recipe_id,
        meal_type=normalized_meal_type,
        calorie_intake=round(adjusted_calorie, 2),
        protein_intake=round(adjusted_protein, 2),
        carbohydrate_intake=round(adjusted_carbohydrate, 2),
        fat_intake=round(adjusted_fat, 2),
        serving_count=resolved_serving_count,
        serving_multiplier=round(resolved_multiplier, 2),
    )

    db.commit()
    db.refresh(log)
    return {"message": "GÃ¼nlÃ¼k kayda eklendi.", "log_id": log.log_id}
```

Bu ek, kullanÄ±cÄ±nÄ±n beÄŸendiÄŸi tarifleri favorilere almasÄ±nÄ± ve tÃ¼kettiÄŸi tarifleri gÃ¼nlÃ¼k beslenme kaydÄ±na eklemesini gÃ¶stermektedir.
