# ingredient_nutrition_service.py — Toplu Besin Değeri Servisi

## Bu Dosya Ne İçin Var?

Besin değeri eksik olan malzemeleri toplu olarak Gemini AI ile doldurur. Tek malzeme senkronizasyonunu ve kolon varlığını garantiler.

## Mimarideki Yeri

**Katman:** Service (Bakım/Toplu İşlem)

- `recipe_service.py` → `ensure_ingredient_columns(db)` için her istek başında çağrılır
- `/api/ingredients/nutrition/sync-missing` endpoint'i → toplu backfill

## Temel İşlevler

### `ensure_ingredient_columns(db)`
`ensure_ingredient_inline_nutrition_columns(db)` ve `ensure_daily_log_macro_columns(db)` wrapper'ı. Her tarif endpoint'i başında çalışır ve kolon varlığını garanti eder.

### Toplu Besin Değeri Doldurma
`calorie_per_100g = 0` olan malzemeleri bulur ve Gemini AI ile besin değerlerini doldurur.

```python
missing = db.query(Ingredient).filter(
    Ingredient.calorie_per_100g == 0,
    Ingredient.user_id.is_(None)  # Sadece global malzemeler
).limit(limit).all()

for ingredient in missing:
    nutrition = await estimate_nutrition_with_gemini(ingredient.ingredient_name)
    if nutrition:
        upsert_ingredient_nutrition(db, ingredient, nutrition, "gemini", 0.7)
```

## Sıkça Sorulabilecek Hoca Soruları

- **S: Bu servis ne zaman çalıştırılıyor?**
  C: `POST /api/ingredients/nutrition/sync-missing` ile manuel tetiklenir. Başlangıçta veya yeni malzeme eklendikten sonra. Otomatik cron job değil.

- **S: Neden sadece global malzemelere uygulanıyor?**
  C: Kişisel malzemelerde kullanıcı zaten manuel değer girebilir. Global malzemelerin tutarlı besin değeri olması health score için önemli.
