# nutrition_resolver_service.py — Besin Değeri Çözümleme Servisi

## Bu Dosya Ne İçin Var?

Bir malzeme için besin değerini nerede arayacağına karar verir: önce veritabanında, yoksa Gemini AI'da. İki katmanlı çözümleme stratejisini uygular.

## Mimarideki Yeri

**Katman:** Service (Strateji/Koordinatör)

- `ingredient_resolver_service.py` → `resolve_ingredient_nutrition()` çağırır
- `gemini_client.py` → Gemini AI istekleri için

## Çözümleme Mantığı (2 Katman)

```
Katman 1: DB'de malzeme var ve calorie_per_100g > 0?
    → Evet: Direkt kullan (güven=1.0, kaynak="db")
    
Katman 2: Gemini AI'a sor
    → Başarılı: Değerleri kaydet (güven=0.7, kaynak="gemini")
    → Başarısız: None döner → çağıran "manual_required" işler
```

## `NUTRITION_FIELDS` Sabiti

```python
NUTRITION_FIELDS = (
    "calorie_per_100g",
    "protein_per_100g",
    "carbohydrate_per_100g",
    "fat_per_100g",
    "saturated_fat_per_100g",
    "fiber_per_100g",
    "sugar_per_100g",
    "sodium_mg_per_100g",
)
```

Health score hesaplamak için tam bu 8 alan gereklidir. Bu sabit birçok yerde referans alınır.

## Döndürülen Veri Yapısı

```python
@dataclass
class NutritionResult:
    nutrition: dict      # 8 alanı içeren sözlük
    source: str          # "gemini" | "db" | "manual"
    confidence_score: float  # 0-1 arası
```

## Sıkça Sorulabilecek Hoca Soruları

- **S: Neden DB'de zaten olan malzeme yine Gemini'ye gidilebilir?**
  C: Gitmez. `calorie_per_100g > 0` kontrolü geçerse direkt DB kullanılır. 0 ise Gemini denenir.

- **S: `confidence_score` 0.7 neden 1.0 değil?**
  C: Gemini değerleri tahmindir. Doğrulanmamış AI tahminine 0.7 güven verilir. İlerde kullanıcı arayüzünde "tahmini değer" uyarısı gösterilebilir.
