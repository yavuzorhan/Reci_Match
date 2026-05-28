# ReciMatch — Scraper ve Veri

Bu belge güncel kod durumunu yansıtır. Eski BBC Good Food, EatingWell ve Skinnytaste scraper dosyaları temizlenmiştir; aktif scraper hattı yemek.com üzerindedir.

---

## 6a. Scraper Yapısı

### `backend/scraper/yemekcom_scraper.py`

`YemekComScraper` sınıfı `yemekcom_scraper.py:10` satırında tanımlıdır. HTML almak için `requests.Session`, parse etmek için `BeautifulSoup(..., "html.parser")` kullanır (`yemekcom_scraper.py:146`).

Ana fonksiyonlar:

- `collect_recipe_links()` (`yemekcom_scraper.py:24`): kategori sayfalarından tarif linklerini toplar.
- `parse_recipe_detail()` (`yemekcom_scraper.py:69`): tek tarif sayfasından detay çıkarır.

Parse edilen alanlar:

- `title`
- `description`
- `recipe_category`
- `cooking_type`
- `cooking_method`
- `total_time_minutes`
- `serving`
- `calorie`, `protein`, `carbohydrate`, `fat`
- `ingredients`
- `instructions`
- `image_url`
- `source_url`
- `source = "yemekcom"` (`yemekcom_scraper.py:134`)

### `backend/scraper/import_yemekcom_recipes.py`

Normal yemek.com tarif import scriptidir. `YemekComScraper` ile link toplar, detay parse eder ve `recipe_import_service.save_scraped_recipe()` ile DB’ye kaydeder.

### `backend/scripts/import_yemekcom_diet_healthy_recipes.py`

Diyet/healthy yemek.com kategorisini çeker. Parse edilen tariflere `source = "yemekcom_diet"` atanır (`import_yemekcom_diet_healthy_recipes.py:104`) ve import sonrası `sync_healthy_recipes()` çağrılır.

### `backend/app/services/recipe_import_service.py`

Scraper çıktısını uygulama verisine dönüştürür. `save_scraped_recipe()` `recipe_import_service.py:65` satırındadır. Import sırasında:

1. `source_url` ile mevcut tarif aranır.
2. Macro alanları `_macro_for_storage()` ile kaynak tipine göre hazırlanır.
3. `seed_default_ingredient_aliases()` çalışır.
4. Malzemeler `match_ingredient()` ile eşleşir.
5. `recipes` ve `recipe_ingredients` tabloları güncellenir.

---

## 6b. Veri Kaynakları

Güncel aktif kaynaklar:

| Kaynak | Durum | Açıklama |
|---|---|---|
| yemek.com | Aktif | Türkçe normal tarifler, `source="yemekcom"` |
| yemek.com diyet | Aktif | Healthy menü için `source="yemekcom_diet"` |
| EatingWell | Kaldırıldı | DB’de aktif veri yoktu, scraper temizlendi |
| BBC Good Food | Kaldırıldı | DB’de aktif veri yoktu, scraper temizlendi |
| SkinnyTaste | Kaldırıldı | DB’de aktif veri yoktu, scraper temizlendi |

DB kaynak dağılımı gerçek sorgu sonucudur:

```text
SELECT source, COUNT(*) FROM recipes GROUP BY source;

yemekcom       271
yemekcom_diet 196
custom          17
```

---

## 6c. Malzeme Eşleştirme

Ana dosya `backend/app/services/ingredient_matching_service.py` dosyasıdır.

Akış:

```text
Ham malzeme metni
  -> normalize_raw_ingredient() (satır 112)
  -> exact ingredient match
  -> alias match
  -> fuzzy match
  -> güvenli değilse reject
```

Önemli fonksiyonlar:

- `normalize_raw_ingredient()` (`ingredient_matching_service.py:112`): miktar, parantez, noktalama ve gereksiz ifadeleri temizler.
- `_ingredient_key()` (`ingredient_matching_service.py:144`): ingredient için normalize key üretir.
- `_best_fuzzy_candidate()` (`ingredient_matching_service.py:175`): benzerlik skoru ile aday seçer.
- `match_ingredient()` (`ingredient_matching_service.py:198`): tam eşleşme, alias ve fuzzy kararını birleştirir.
- `seed_default_ingredient_aliases()` (`ingredient_matching_service.py:249`): default alias kayıtlarını DB’ye ekler.

Türkçe karakter normalizasyonu `helpers.py` ve `text_normalize.py` içindeki yardımcılarla yapılır. Böylece `pirinç/pirinc`, `yoğurt/yogurt` gibi yazımlar aynı canonical forma yaklaşır.

---

## 6d. Veri İstatistikleri

Gerçek DB sorguları:

```text
SELECT COUNT(*) FROM recipes;                  -- 484
SELECT COUNT(*) FROM ingredients;              -- 241
SELECT COUNT(*) FROM recipe_ingredients;       -- 3569
SELECT COUNT(DISTINCT ingredient_id)
FROM recipe_ingredients;                       -- 112
```

Besin değeri kapsamı:

```text
ingredients calorie_per_100g > 0 : 237
ingredients calorie_per_100g = 0 : 4
```

0 kalorili kalan kayıtlar gerçek 0 kalorili olarak işaretlenen `tuz`, `su`, `soda`, `kabartma tozu` gibi kayıtlardır.

---

## Güncel Temizlik Notu

Mayıs 2026 temizliğinde kullanılmayan scraper dosyaları kaldırıldı:

```text
bbcgoodfood_scraper.py
eatingwell_scraper.py
skinnytaste_scraper.py
import_bbcgoodfood_healthy_recipes.py
import_eatingwell_healthy_recipes.py
import_skinnytaste_healthy_recipes.py
```

Bu nedenle yeni geliştirmede aktif scraper kapsamı yemek.com ile sınırlıdır.
