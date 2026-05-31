# recipe_helpers.py — Tarif Yardımcı Fonksiyonları

## Bu Dosya Ne İçin Var?

Tarif işleme sırasında kullanılan hesaplama ve dönüşüm yardımcıları içerir: besin değeri toplama, birim-gram dönüşümü, pişirme tipi normalleştirme.

## Mimarideki Yeri

**Katman:** Utility

- `recipe_service.py` → `calculate_recipe_nutrition()`, `unit_to_grams()` için
- `recipe_health.py` → iç yardımcıları (örtüşen bazı fonksiyonlar)

## Fonksiyonlar

### `unit_to_grams(amount, unit, ingredient_name) -> float | None`
**Ne yapar:** Miktar ve birimi gram cinsine dönüştürür.
**Örnekler:**
- `(2, "su bardağı", "pirinç")` → 400g (bardak = 200ml, pirinç için yoğunluk faktörü)
- `(1, "gram", "domates")` → 1g
- `(3, "adet", "yumurta")` → 150g (her yumurta ≈ 50g)

**Neden gerekli:** Malzeme miktarları tarife özgü birimlerle verilir. Health score hesabı gram gerektirir.

### `calculate_recipe_nutrition(resolved_items) -> dict`
**Ne yapar:** Tarif malzeme listesinden toplam kalori, protein, karbonhidrat, yağ hesaplar.

```python
totals = {"calorie": 0, "protein": 0, "carbohydrate": 0, "fat": 0}
for item in resolved_items:
    grams = item["grams"]
    ingredient = item["ingredient"]
    multiplier = grams / 100.0
    totals["calorie"] += ingredient.calorie_per_100g * multiplier
    ...
```

### `ingredient_keys(name: str) -> set[str]`
**Ne yapar:** Malzeme adını lowercase token set'ine dönüştürür.
**Örnek:** "Tavuk Göğsü" → {"tavuk", "gogsu"}
**Neden:** Öneri algoritmasındaki eşleşme için.

### `normalize_cooking_type_name(value: str) -> str`
**Ne yapar:** Pişirme tipi adını normalleştirir.
**Örnek:** "Fırında pişirme" → "firin"

### `ascii_fold(text: str) -> str`
**Ne yapar:** Türkçe karakterleri ASCII'ye dönüştürür (ğ→g, ş→s vb.).
**Neden:** Hallüsinasyon filtresinde malzeme adı karşılaştırması için.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Birimi bilinmeyen malzeme için gram nasıl hesaplanıyor?**
  C: `unit_to_grams()` bilinmeyen birim için `None` döner. Health score hesabında bu malzeme es geçilir; güven skoru düşer.
