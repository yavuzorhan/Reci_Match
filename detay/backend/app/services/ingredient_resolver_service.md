# ingredient_resolver_service.py — Malzeme Çözümleme Servisi

## Bu Dosya Ne İçin Var?

Kullanıcının yazdığı malzeme adını (ör: "tavuk", "Tavuk Göğsü (derisiz)") veritabanında bulur; bulamazsa Gemini AI ile besin değeri alır ve yeni kayıt oluşturur. "Çözümleme" — bir malzeme adından gerçek bir veritabanı kaydına ulaşma sürecidir.

## Mimarideki Yeri

**Katman:** Service (Karmaşık İş Mantığı)

- `recipe_service.py` → tarif eklerken her malzeme için çağırır
- `ingredient_service.py` → kullanıcı kişisel malzeme eklerken kullanır
- `ingredient_repository.py` → veritabanı aramaları için
- `gemini_client.py` / `nutrition_resolver_service.py` → besin değeri için

## Veri Yapısı

```python
@dataclass
class ResolveResult:
    status: str                 # "resolved" | "manual_required"
    ingredient: Ingredient | None  # Bulunan/oluşturulan malzeme nesnesi
    ingredient_name: str | None    # Çözümlenemeyince orijinal isim
```

## Ana Fonksiyon: `resolve_ingredient_for_user`

```python
async def resolve_ingredient_for_user(
    db: Session, user_id: int, ingredient_name: str, try_ai: bool = True
) -> ResolveResult
```

**Adım adım akış:**

1. **İsim normalleştirme:** "  Tavuk Göğsü  " → "tavuk göğsü" (trim, küçük harf, Türkçe normalize)
2. **Veritabanında ara:** `find_matching_ingredient()` çağrılır
3. **Bulunursa:** `ensure_nutrition_for_ingredient()` ile besin değerini kontrol et/al
4. **Bulunamazsa ve `try_ai=True`:** `resolve_ingredient_nutrition()` → Gemini AI çağrısı
5. **Gemini başarılı:** Yeni malzeme kaydı oluştur, besin değerini yaz, "resolved" dön
6. **Gemini de başarısız:** `manual_required` döndür — kullanıcıdan manuel giriş istenir

---

## `find_matching_ingredient(db, user_id, normalized_name)`

**Üç katmanlı eşleşme mekanizması:**

### Katman 1 — SQL Exact Match
```python
ingredient_repository.find_accessible_ingredients_by_name(db, user_id, normalized_name)
```
SQL `LOWER()` ile büyük/küçük harf duyarsız arama. `user_id IS NULL OR user_id = user_id` filtresiyle hem global hem kişisel malzemelere bakılır.

### Katman 2 — Alias Tablosu
```python
ingredient_repository.find_accessible_ingredient_alias(db, user_id, normalized_key)
```
`ingredient_aliases` tablosunda normalize edilmiş ad aranır. "Tomates" → "domates" gibi takma adlar.

### Katman 3 — Python Fuzzy Match (rapidfuzz)
```python
from rapidfuzz import fuzz
direct = fuzz.ratio(normalized_key, candidate_key)
token_sort = fuzz.token_sort_ratio(normalized_key, candidate_key)
len_ratio = min(len_a, len_b) / max(len_a, len_b)
score = max(direct, token_sort) * (0.5 + 0.5 * len_ratio)
if score >= 85:
    return best_match
```

- `fuzz.ratio()` → Genel benzerlik (Levenshtein mesafesi bazlı)
- `fuzz.token_sort_ratio()` → Kelime sırasından bağımsız benzerlik ("domates taze" = "taze domates")
- `len_ratio` → Çok uzun/kısa eşleşmeleri cezalandırır
- 85 eşiği → "domates" ↔ "domates (taze)" = %89 → eşleşir; "domates" ↔ "turp" = %20 → eşleşmez

**Neden SQL'de değil Python'da fuzzy?** PostgreSQL `LIKE` veya `ILIKE` fuzzy matching yapmaz. `pg_trgm` extension gerektirir ki bu kurulum karmaşıklığı demek. rapidfuzz Python'da son derece hızlı.

---

## `ensure_nutrition_for_ingredient(db, ingredient, query_name, try_ai)`

Malzeme bulundu ama `calorie_per_100g = 0` ise:
1. `try_ai=True` → Gemini ile dene
2. Gemini başarılı → besin değerlerini yaz, "resolved" dön
3. Gemini başarısız → malzeme DB'de bilinen ama 0 besinli → yine "resolved" döner (bloklamaz)

**Tasarım kararı:** DB'de var olan bir malzeme "manual_required" vermez. Bu, mevcut tarifler için gereksiz engellemeyi önler.

---

## `upsert_ingredient_nutrition(db, ingredient, nutrition, source, confidence)`

```python
for field in NUTRITION_FIELDS:
    setattr(ingredient, field, float(nutrition.get(field) or 0))

ingredient.nutrition_source = source   # "gemini", "manual", "db"
ingredient.nutrition_confidence = confidence
# Güven skoru: db=1.0, gemini=0.7, manual=0.4
```

`NUTRITION_FIELDS` = 8 alan: calorie, protein, carbohydrate, fat, saturated_fat, fiber, sugar, sodium.

---

## `create_or_get_user_ingredient(db, user_id, ingredient_name, source, flush)`

Kullanıcıya özel yeni malzeme oluşturur. Zaten varsa mevcut kaydı döndürür (duplicate önleme).

`infer_ingredient_category()` → Malzeme adından kategori tahmin eder ("tavuk" → "Et", "domates" → "Sebze").

---

## Kritik Kod Parçaları

```python
best_score = 0.0
for ingredient in ingredient_repository.list_accessible_ingredients(db, user_id):
    candidate_key = normalize_turkish_text(ingredient.ingredient_name)
    direct = fuzz.ratio(normalized_key, candidate_key)
    token_sort = fuzz.token_sort_ratio(normalized_key, candidate_key)
    raw = max(direct, token_sort)
    len_ratio = min(len(normalized_key), len(candidate_key)) / max(...)
    score = raw * (0.5 + 0.5 * len_ratio)
    if score > best_score:
        best_match = ingredient
        best_score = score

if best_match is not None and best_score >= 85:
    return best_match
```

## Sıkça Sorulabilecek Hoca Soruları

- **S: Fuzzy matching neden gerekli?**
  C: Kullanıcı "domates" yazabilir, DB'de "Domates (Taze)" olabilir. Exact match başarısız. Fuzzy matching %92 benzerlik bulur ve eşleştirir.

- **S: `manual_required` ne zaman döner?**
  C: Malzeme DB'de yok VE Gemini de başarısız. Kullanıcıya "Bu malzemenin besin değerini manuel girin" formu gösterilir. Kullanıcı kalori, protein, karbonhidrat, yağ değerlerini elle girer.

- **S: Kullanıcı özel malzemesi ile global malzeme çakışırsa hangisi seçilir?**
  C: `_pick_best_match()` kullanıcının kendi malzemesine öncelik verir. `owner_rank = 0 if ingredient.user_id == user_id else 1` — kendi malzemesi her zaman önce gelir.

- **S: 85 eşiği neden bu değer?**
  C: Test edilerek belirlendi. %80'de "tavuk" ile "turp" eşleşebiliyordu (benzer uzunluk + harf). %85 bu yanlış eşleşmeleri engeller ama "domates taze" ↔ "taze domates" gibi gerçek eşleşmeleri yakalar.
