# ReciMatch — Test ve Doğrulama

Bu belge kod taramaları, import testleri ve gerçek DB sorguları ile hazırlanmıştır.

---

## 7a. Yapılan Test ve Doğrulamalar

### USDA → Gemini Migration Doğrulaması

Kontrol edilenler:

- `IngredientNutritionValue` ve `IngredientUsdaMapping` model sınıfları kaldırıldı.
- `nutrition_value` relationship referansı `recipe_health.py` içinde kalmadı.
- USDA client/mapping/fetcher dosyaları aktif backend kodundan kaldırıldı.
- `nutrition_resolver_service.py:13` içindeki `NUTRITION_FIELDS` 8 alanla sınırlandı.
- `gemini_client.py:15` içindeki schema 8 alanlıdır.

Güncel akış:

```text
DB local inline nutrition
  -> Gemini 2.5 Flash
  -> manual fallback
```

### 7 Alan Kod Temizleme

Kaldırılan mikro besin kolonları:

```text
added_sugar_per_100g
trans_fat_per_100g
cholesterol_mg_per_100g
potassium_mg_per_100g
calcium_mg_per_100g
iron_mg_per_100g
vitamin_d_mcg_per_100g
```

Neden: `recipe_health.py` health score hesabında bu alanları kullanmıyordu. Güncel hesap 8 temel alanla yapılır.

### DB Bütünlük Kontrolleri

Gerçek DB sonuçları:

| Sorgu | Sonuç |
|---|---:|
| `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'` | 13 |
| `SELECT COUNT(*) FROM ingredients` | 241 |
| `SELECT COUNT(*) FROM recipes` | 484 |
| `SELECT COUNT(*) FROM recipe_ingredients` | 3569 |
| `SELECT COUNT(*) FROM users` | 4 |
| `SELECT COUNT(*) FROM ingredient_categories` | 14 |
| `SELECT COUNT(DISTINCT ingredient_id) FROM recipe_ingredients` | 112 |
| `SELECT COUNT(*) FROM ingredients WHERE calorie_per_100g > 0` | 237 |
| `SELECT COUNT(*) FROM ingredients WHERE calorie_per_100g = 0` | 4 |

### Scraper Temizliği

Aktif backend referanslarında `bbcgoodfood`, `eatingwell`, `skinnytaste` kaynakları kalmadı. Kalan scraper import testi:

```text
from scraper.yemekcom_scraper import YemekComScraper
import scraper.import_yemekcom_recipes
import scripts.import_yemekcom_diet_healthy_recipes
OK ('yemekcom_diet',)
```

### Import Zinciri

Doğrulanan import:

```text
from app.db.models import *
from app.services.recipe_import_service import save_scraped_recipe
from app.services.healthy_recipe_service import sync_healthy_recipes, HEALTHY_SOURCES
```

Sonuç: `OK ('yemekcom_diet',)`.

---

## 7b. Bilinen Kısıtlamalar

| Kısıtlama | Açıklama |
|---|---|
| Gemini free tier | `gemini-2.5-flash` için ücretsiz kullanımda günlük istek limiti vardır; hata durumunda backend `429` döndürür. |
| Besin değerleri yaklaşık | 179 malzeme manuel yaklaşık değerlerle dolduruldu, genelde `nutrition_confidence = 0.85`. |
| Gemini nutrition tahmini | Model çıktısı structured JSON olsa da medikal kesinlik taşımaz. |
| Scraper kapsamı | Aktif scraper yalnızca yemek.com kaynaklıdır. |
| Auth modeli | Token tabanlı JWT yerine frontend localStorage kullanıcı objesi kullanılır; tezde prototip mimarisi olarak açıklanmalıdır. |
| Health score | Karşılaştırma ve öneri kalitesi içindir; tıbbi tavsiye değildir. |

`google.generativeai` deprecated uyarısı giderilmiştir; kod `from google import genai` ve `google-genai` paketiyle çalışır (`gemini_client.py:7`, `recipe_revision_service.py:17`).

---

## 7c. Performans

### Recipe Recommendation

Öneri endpoint’i DB’den tarifleri ve ilişkili malzemeleri çekip Python tarafında skorlar. Mevcut DB boyutu:

```text
484 recipes
3569 recipe_ingredients
241 ingredients
```

Bu ölçek için response süresi geliştirme ortamında düşük/orta düzeydedir. Daha büyük veri setlerinde index ve pagination önem kazanır.

### Gemini API

Gemini çağrısı dış servise bağlıdır. Tahmini gecikme bağlantı ve quota durumuna göre değişir. Backend rate limit/quota durumlarını `429` olarak kullanıcıya döndürür (`gemini_client.py:61`, `recipe_revision_service.py:208`).

### DB Query Performansı

Önemli performans kararları:

- Nutrition artık ayrı 1:1 tabloda değil, `ingredients` inline kolonlarında tutulur.
- `recipe_ingredients` many-to-many ilişkisi selectinload ile detay response’unda kullanılabilir.
- `healthy_recipes` ayrı tablo ile healthy-only filtreyi basitleştirir.
- `ingredient_aliases.normalized_alias_name` unique index ile hızlı alias eşleşmesi sağlar.

---

## Master Test Özeti

Tez açısından doğrulanmış ana senaryolar:

1. Kullanıcı kayıt ve e-posta doğrulama.
2. Login ve profil oluşturma.
3. Malzeme seçimi ve kiler yönetimi.
4. Tarif önerisi üretme.
5. Tarif detayında gerçek ingredient listesinin korunması.
6. Favoriye ekleme/çıkarma.
7. Daily log ve weekly log akışı.
8. Gemini tarif revizyonu.
9. Gemini/manual nutrition altyapısı.
10. Health score ve grade gösterimi.
