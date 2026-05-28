# ReciMatch — Veritabanı Yapısı

Tüm bilgiler `backend/app/db/models.py` okunarak ve canlı PostgreSQL veritabanı sorgulanarak elde edilmiştir.

---

## 2a. Tablo Listesi (13 Tablo)

### 1. `users`
**Amaç:** Kullanıcı hesap ve profil bilgileri.

| Kolon | Tip | Kısıt |
|-------|-----|--------|
| `user_id` | INTEGER | PK, auto-increment |
| `name_surname` | VARCHAR(100) | NOT NULL |
| `email` | VARCHAR(100) | UNIQUE, NOT NULL |
| `password_hash` | VARCHAR(255) | NOT NULL (bcrypt) |
| `age` | INTEGER | NULL |
| `gender` | VARCHAR(20) | NULL |
| `height_cm` | INTEGER | NULL |
| `weight_kg` | NUMERIC(5,2) | NULL |
| `objective` | VARCHAR(50) | NULL |
| `activity` | VARCHAR(50) | NULL |
| `meals` | INTEGER | NULL |
| `daily_calorie` | INTEGER | NULL (hesaplanan) |
| `created_at` | DATETIME | NULL |
| `is_verified` | BOOLEAN | default=False |

**İlişkiler:** `favorites`, `disliked_ingredients`, `owned_ingredients`, `daily_logs` (1→N, CASCADE DELETE).

---

### 2. `ingredient_categories`
**Amaç:** Malzeme kategorilerini tanımlar.

| Kolon | Tip | Kısıt |
|-------|-----|--------|
| `category_id` | INTEGER | PK |
| `category_name` | VARCHAR(50) | UNIQUE, NOT NULL |

**İlişkiler:** `ingredients` (1→N).

---

### 3. `ingredients`
**Amaç:** Global ve kullanıcıya özel malzemeler; 8 inline besin değeri kolonu.

| Kolon | Tip | Kısıt |
|-------|-----|--------|
| `ingredient_id` | INTEGER | PK |
| `ingredient_name` | VARCHAR(100) | NOT NULL |
| `user_id` | INTEGER | FK→users (NULL=global) |
| `category` | VARCHAR(50) | NULL |
| `category_id` | INTEGER | FK→ingredient_categories |
| `calorie_per_100g` | FLOAT | NOT NULL, default=0 |
| `protein_per_100g` | FLOAT | NOT NULL, default=0 |
| `carbohydrate_per_100g` | FLOAT | NOT NULL, default=0 |
| `fat_per_100g` | FLOAT | NOT NULL, default=0 |
| `saturated_fat_per_100g` | FLOAT | NOT NULL, default=0 |
| `fiber_per_100g` | FLOAT | NOT NULL, default=0 |
| `sugar_per_100g` | FLOAT | NOT NULL, default=0 |
| `sodium_mg_per_100g` | FLOAT | NOT NULL, default=0 |
| `nutrition_source` | VARCHAR(30) | CHECK IN ('gemini','usda_legacy','manual','db') |
| `nutrition_confidence` | FLOAT | NOT NULL, default=0 |
| `is_verified` | BOOLEAN | NOT NULL, default=False |
| `source` | VARCHAR(50) | CHECK IN ('manual','gemini_auto','ai_auto','admin') |

**Partial unique index:**
- `(ingredient_name)` WHERE `user_id IS NULL` → global malzemelerde isim benzersiz
- `(user_id, ingredient_name)` WHERE `user_id IS NOT NULL` → kullanıcı başına benzersiz

**İlişkiler:** `recipe_ingredients`, `owned_ingredients`, `disliked_ingredients`, `ingredient_aliases` (CASCADE DELETE).

---

### 4. `ingredient_aliases`
**Amaç:** Malzeme adı alternatifleri/takma adları (örn. "patates" → "patato").

| Kolon | Tip | Kısıt |
|-------|-----|--------|
| `id` | INTEGER | PK |
| `ingredient_id` | INTEGER | FK→ingredients (CASCADE) |
| `alias_name` | VARCHAR(150) | NOT NULL |
| `normalized_alias_name` | VARCHAR(150) | UNIQUE |
| `created_at` | DATETIME | server_default=now() |

---

### 5. `recipes`
**Amaç:** Tarif ana kaydı (import edilen + kullanıcı tarifleri).

| Kolon | Tip | Kısıt |
|-------|-----|--------|
| `recipe_id` | INTEGER | PK |
| `recipe_name` | VARCHAR(150) | NOT NULL |
| `user_id` | INTEGER | FK→users (NULL=global) |
| `source` | VARCHAR(20) | NULL ('yemekcom','yemekcom_diet','custom') |
| `source_url` | VARCHAR(500) | NULL |
| `recipe_category` | VARCHAR(50) | NULL |
| `explanation` | TEXT | NULL |
| `preparation` | TEXT | NULL |
| `cooking_type` | VARCHAR(50) | NULL |
| `cooking_method` | VARCHAR(50) | NULL |
| `total_time_minutes` | INTEGER | NULL |
| `serving` | INTEGER | NULL |
| `calorie` | NUMERIC(6,2) | NULL |
| `protein` | NUMERIC(6,2) | NULL |
| `carbohydrate` | NUMERIC(6,2) | NULL |
| `fat` | NUMERIC(6,2) | NULL |
| `health_score` | INTEGER | NULL (0-100) |
| `health_grade` | VARCHAR(1) | NULL ('A','B','C','D') |
| `health_explanation` | TEXT | NULL |
| `image_url` | VARCHAR(255) | NULL |
| `is_active` | BOOLEAN | NOT NULL, default=True |

**İlişkiler:** `recipe_ingredients`, `favorites`, `daily_logs`, `healthy_recipes`, `revision_cache` (CASCADE DELETE).

---

### 6. `recipe_ingredients`
**Amaç:** Tarif–malzeme many-to-many bağlantısı; orijinal miktar ve gram karşılığı ayrı saklanır.

| Kolon | Tip | Kısıt |
|-------|-----|--------|
| `recipe_ingredient_id` | INTEGER | PK |
| `recipe_id` | INTEGER | FK→recipes (CASCADE) |
| `ingredient_id` | INTEGER | FK→ingredients (CASCADE) |
| `amount` | NUMERIC(6,2) | NULL (orijinal miktar) |
| `unit` | VARCHAR(50) | NULL (orijinal birim) |
| `miktar_gram` | NUMERIC(10,2) | NULL (hesaplanan gram) |
| `donusum_kaynagi` | VARCHAR(100) | NULL |
| `donusum_guveni` | VARCHAR(20) | NULL ('high','medium','low') |
| `donusum_notu` | TEXT | NULL |

---

### 7. `healthy_recipes`
**Amaç:** Sağlıklı tarif etiketleme; `healthy_only` filtresi bu tabloya join eder.

| Kolon | Tip | Kısıt |
|-------|-----|--------|
| `healthy_recipe_id` | INTEGER | PK |
| `recipe_id` | INTEGER | FK→recipes UNIQUE (CASCADE) |
| `source` | VARCHAR(20) | NULL |
| `synced_at` | DATETIME | server_default=now() |

---

### 8. `owned_ingredients`
**Amaç:** Kullanıcının kiler/dolap malzemeleri.

| Kolon | Tip | Kısıt |
|-------|-----|--------|
| `owned_id` | INTEGER | PK |
| `user_id` | INTEGER | FK→users (CASCADE) |
| `ingredient_id` | INTEGER | FK→ingredients (CASCADE) |
| `added_at` | DATETIME | server_default=now() |

---

### 9. `disliked_ingredients`
**Amaç:** Kullanıcının sevmediği malzemeler; öneri skorunu düşürür.

| Kolon | Tip | Kısıt |
|-------|-----|--------|
| `disliked_id` | INTEGER | PK |
| `user_id` | INTEGER | FK→users (CASCADE) |
| `ingredient_id` | INTEGER | FK→ingredients (CASCADE) |

---

### 10. `favorites`
**Amaç:** Kullanıcının favori tarifleri.

| Kolon | Tip | Kısıt |
|-------|-----|--------|
| `favorite_id` | INTEGER | PK |
| `user_id` | INTEGER | FK→users (CASCADE) |
| `recipe_id` | INTEGER | FK→recipes (CASCADE) |

---

### 11. `daily_logs`
**Amaç:** Günlük/haftalık beslenme kayıtları; yenen tarif, porsiyon ve makro takibi.

| Kolon | Tip | Kısıt |
|-------|-----|--------|
| `log_id` | INTEGER | PK |
| `user_id` | INTEGER | FK→users (CASCADE) |
| `recipe_id` | INTEGER | FK→recipes (CASCADE) |
| `log_date` | DATE | NULL |
| `logged_at` | DATETIME | NULL |
| `meal_type` | VARCHAR(30) | NULL ('Kahvaltı','Öğle','Akşam Yemeği') |
| `entry_source` | VARCHAR(20) | NULL ('daily','weekly') |
| `calorie_intake` | NUMERIC(6,2) | NULL |
| `protein_intake` | NUMERIC(6,2) | NULL |
| `carbohydrate_intake` | NUMERIC(6,2) | NULL |
| `fat_intake` | NUMERIC(6,2) | NULL |
| `serving_count` | INTEGER | NULL |
| `serving_multiplier` | NUMERIC(6,2) | NULL |

---

### 12. `email_verification_codes`
**Amaç:** Kayıt doğrulama, şifre sıfırlama ve güvenlik güncellemesi için OTP kodları.

| Kolon | Tip | Kısıt |
|-------|-----|--------|
| `id` | INTEGER | PK |
| `user_id` | INTEGER | FK→users (CASCADE, NULL) |
| `email` | VARCHAR(255) | NOT NULL |
| `code` | VARCHAR(6) | NOT NULL |
| `purpose` | VARCHAR(30) | NOT NULL ('register','reset_password','security_update') |
| `expires_at` | DATETIME | NOT NULL (10 dakika sonra) |
| `created_at` | DATETIME | server_default=now() |
| `temp_name` | VARCHAR(100) | NULL (kayıt sırasında geçici) |
| `temp_password` | VARCHAR(255) | NULL (kayıt sırasında geçici hash) |

---

### 13. `revision_cache`
**Amaç:** Gemini tarif revizyonu yanıtlarını cache'ler; aynı istek tekrar gelirse API çağrısı yapılmaz.

| Kolon | Tip | Kısıt |
|-------|-----|--------|
| `cache_id` | INTEGER | PK |
| `recipe_id` | INTEGER | FK→recipes (CASCADE) |
| `modifications_hash` | VARCHAR(64) | NOT NULL (SHA-256) |
| `response_json` | TEXT | NOT NULL |
| `created_at` | DATETIME | server_default=now() |

**Unique constraint:** `(recipe_id, modifications_hash)`.

---

## 2b. ER Diyagramı (Metinsel)

```
ingredient_categories (1)
    └─── ingredients (N)  [category_id FK]

users (1)
    ├─── owned_ingredients (N)      [user_id FK, CASCADE DELETE]
    ├─── disliked_ingredients (N)   [user_id FK, CASCADE DELETE]
    ├─── favorites (N)              [user_id FK, CASCADE DELETE]
    ├─── daily_logs (N)             [user_id FK, CASCADE DELETE]
    ├─── recipes (N, custom)        [user_id FK, CASCADE DELETE]
    └─── email_verification_codes (N) [user_id FK, CASCADE DELETE]

ingredients (1)
    ├─── recipe_ingredients (N)     [ingredient_id FK, CASCADE DELETE]
    ├─── owned_ingredients (N)      [ingredient_id FK, CASCADE DELETE]
    ├─── disliked_ingredients (N)   [ingredient_id FK, CASCADE DELETE]
    └─── ingredient_aliases (N)     [ingredient_id FK, CASCADE DELETE]

recipes (1)
    ├─── recipe_ingredients (N)     [recipe_id FK, CASCADE DELETE]
    ├─── favorites (N)              [recipe_id FK, CASCADE DELETE]
    ├─── daily_logs (N)             [recipe_id FK, CASCADE DELETE]
    ├─── healthy_recipes (1)        [recipe_id FK UNIQUE, CASCADE DELETE]
    └─── revision_cache (N)         [recipe_id FK, CASCADE DELETE]
```

---

## 2c. İlişki Haritası (Özet)

| Ana Tablo | Bağlı Tablolar | İlişki Türü |
|-----------|---------------|-------------|
| `users` | `owned_ingredients`, `disliked_ingredients`, `favorites`, `daily_logs`, `recipes` (custom), `email_verification_codes` | 1→N |
| `ingredients` | `recipe_ingredients`, `owned_ingredients`, `disliked_ingredients`, `ingredient_aliases` | 1→N |
| `recipes` | `recipe_ingredients`, `favorites`, `daily_logs`, `healthy_recipes`, `revision_cache` | 1→N |
| `ingredient_categories` | `ingredients` | 1→N |
| `recipes` ↔ `ingredients` | `recipe_ingredients` (aracı tablo) | N→N |

---

## 2d. Örnek Veri Setleri (Gerçek DB)

### users (4 kayıt mevcut)
```
user_id | name_surname          | email                         | age | gender | daily_calorie | is_verified
--------+-----------------------+-------------------------------+-----+--------+---------------+------------
7       | Kullanıcı 1           | user1@example.com             | 23  | Erkek  | 2572          | True
16      | Kullanıcı 2           | user2@example.com             | 25  | Kadın  | 1342          | True
9       | Kullanıcı 3           | user3@example.com             | —   | —      | —             | True
```

### ingredients (241 kayıt, ilk 5)
```
ingredient_id | ingredient_name  | category               | calorie | protein | carb  | fat  | nutrition_source
--------------+------------------+------------------------+---------+---------+-------+------+-----------------
1             | yumurta          | Diğer                  | 155.0   | 13.0    | 1.1   | 11.0 | manual
9             | süt              | Süt Ürünleri           | 42.0    | 3.4     | 5.0   | 1.0  | manual
124           | erik             | Meyveler               | 46.0    | 0.7     | 11.4  | 0.3  | manual
237           | pirinç kreması   | Tahıllar ve Unlu Ürünler | 130.0 | 2.7     | 28.0  | 0.3  | manual
248           | bazlama          | Diğer                  | 260.0   | 9.0     | 52.0  | 1.5  | gemini
```

### recipes (484 kayıt, ilk 3)
```
recipe_id | recipe_name            | source        | recipe_category | serving | calorie | health_score | health_grade
----------+------------------------+---------------+-----------------+---------+---------+--------------+-------------
1478      | Ev Yapımı Müsli        | yemekcom_diet | Kahvaltı        | 4       | 940.00  | —            | —
1481      | Kepekli Poğaça         | yemekcom_diet | Kahvaltı        | 20      | 2080.00 | —            | —
1257      | Zeytinyağlı Enginar    | yemekcom_diet | Tatlı           | 8       | 1040.00 | —            | —
```

### recipe_ingredients (3569 kayıt, ilk 5)
```
recipe_ingredient_id | recipe_id | ingredient_id | amount | unit          | miktar_gram
---------------------+-----------+---------------+--------+---------------+------------
21065                | 1483      | 117           | 2.00   | adet          | —
21066                | 1483      | 217           | 3.00   | yemek kaşığı  | —
21067                | 1483      | 227           | 0.50   | su bardağı    | —
21068                | 1634      | 206           | 4.00   | yemek kaşığı  | —
21069                | 1634      | 224           | 1.00   | yemek kaşığı  | —
```

### ingredient_categories (14 kayıt)
```
category_id | category_name
------------+---------------------
1           | Sebzeler
2           | Meyveler
4           | Balık ve Deniz Ürünleri
5           | Süt Ürünleri
6           | Bakliyatlar
7           | Tahıllar ve Unlu Ürünler
8           | Baharatlar
9           | Soslar ve Yağlar
10          | Diğer
13          | Peynirler
14          | Beyaz Et
15          | Şarküteri
16          | Kırmızı Et
17          | Çerezler
```

### owned_ingredients (6 kayıt, ilk 3)
```
owned_id | user_id | ingredient_id | added_at
---------+---------+---------------+---------------------
49       | 16      | 27            | 2026-04-21 16:55:28
100      | 7       | 145           | 2026-05-04 01:15:04
101      | 7       | 151           | 2026-05-04 01:15:04
```

### disliked_ingredients (5 kayıt, ilk 3)
```
disliked_id | user_id | ingredient_id
------------+---------+--------------
23          | 7       | 8
26          | 24      | 168
27          | 24      | 169
```

### favorites (1 kayıt)
```
favorite_id | user_id | recipe_id
------------+---------+----------
13          | 7       | 1232
```

### daily_logs (9 kayıt, ilk 3)
```
log_id | user_id | recipe_id | log_date   | meal_type      | calorie_intake | serving_count
-------+---------+-----------+------------+----------------+----------------+--------------
33     | 7       | 1232      | 2026-04-23 | Akşam Yemeği   | 2016.00        | 6
40     | 7       | 1232      | 2026-04-24 | Akşam Yemeği   | 1512.00        | 5
42     | 7       | 1232      | 2026-04-26 | Akşam Yemeği   | 2016.00        | 6
```

### ingredient_aliases
```
(Kayıt yok — alias sistemi yapısal olarak hazır, henüz veri eklenmemiş)
```

### healthy_recipes (196 kayıt, ilk 3)
```
healthy_recipe_id | recipe_id | source        | synced_at
------------------+-----------+---------------+---------------------
401               | 1478      | yemekcom_diet | 2026-04-24 14:59:22
402               | 1481      | yemekcom_diet | 2026-04-24 14:59:22
403               | 1257      | yemekcom_diet | 2026-04-24 14:59:22
```

### revision_cache (5 kayıt, ilk 2)
```
cache_id | recipe_id | modifications_hash (kısaltılmış) | created_at
---------+-----------+----------------------------------+---------------------
2        | 1159      | 1498093c2f63e1b0...               | 2026-05-04 03:55:19
3        | 1846      | 4a0f9ed402055027...               | 2026-05-09 14:55:25
```

### email_verification_codes (14 kayıt, ilk 2)
```
id | user_id | email                   | purpose          | expires_at
---+---------+-------------------------+------------------+---------------------
3  | 7       | user1@example.com       | reset_password   | 2026-04-07 22:39:20
8  | 7       | user1@example.com       | security_update  | 2026-04-14 11:53:51
```

---

## 2e. İstatistikler (Gerçek DB)

```sql
SELECT COUNT(*) FROM users;              -- 4
SELECT COUNT(*) FROM ingredients;        -- 241
SELECT COUNT(*) FROM recipes;            -- 484
SELECT COUNT(*) FROM recipe_ingredients; -- 3569
SELECT COUNT(*) FROM ingredient_categories; -- 14
SELECT COUNT(*) FROM healthy_recipes;    -- 196
SELECT COUNT(*) FROM daily_logs;         -- 9
SELECT COUNT(*) FROM revision_cache;     -- 5
SELECT COUNT(DISTINCT ingredient_id) FROM recipe_ingredients; -- 112

SELECT source, COUNT(*) FROM recipes GROUP BY source ORDER BY COUNT(*) DESC;
-- ('yemekcom', 271)
-- ('yemekcom_diet', 196)
-- ('custom', 17)

SELECT health_grade, COUNT(*) FROM recipes GROUP BY health_grade;
-- ('A', 5), ('B', 2), ('C', 1), (NULL, 476)
-- (Health score yalnızca kullanıcı tarifleri eklenirken hesaplanıyor)

SELECT COUNT(*) FROM ingredients WHERE calorie_per_100g > 0; -- 237 (% 98.3 kapsam)

SELECT nutrition_source, COUNT(*) FROM ingredients GROUP BY nutrition_source;
-- ('manual', 235)
-- ('gemini', 6)
```

---

## 2f. Nutrition Kolon Detayı

### Neden Ayrı Tablo Değil, Inline Kolon?

Başlangıçta `ingredient_nutrition_values` adlı ayrı bir tablo mevcuttu. Bu yapı **Mayıs 2026**'da kaldırıldı; besin değerleri doğrudan `ingredients` tablosuna inline kolon olarak taşındı.

**Gerekçeler:**

| Argüman | Açıklama |
|---------|----------|
| **1:1 ilişki** | Her malzemenin en fazla 1 besin değeri seti vardır; ayrı tablo gereksiz JOIN ekler |
| **Performans** | `SELECT` sorgularında JOIN yerine doğrudan kolon okuma ~3x hızlı |
| **Basitlik** | ORM kodu sadeleşti; `ingredient.calorie_per_100g` yerine `ingredient.nutrition_value.calorie` gibi zincir navigasyon kaldırıldı |
| **Güvenilirlik** | ORM lazy-load sorunları (DetachedInstanceError) ortadan kalktı |

### Aktif 8 Besin Kolonu

```python
# nutrition_resolver_service.py:13
NUTRITION_FIELDS = (
    "calorie_per_100g",           # Kalori (kcal)
    "protein_per_100g",           # Protein (g)
    "carbohydrate_per_100g",      # Karbonhidrat (g)
    "fat_per_100g",               # Yağ (g)
    "saturated_fat_per_100g",     # Doymuş yağ (g)
    "fiber_per_100g",             # Lif (g)
    "sugar_per_100g",             # Şeker (g)
    "sodium_mg_per_100g",         # Sodyum (mg)
)
```

### Metadata Kolonları

| Kolon | Değerler | Açıklama |
|-------|----------|----------|
| `nutrition_source` | `'gemini'`, `'usda_legacy'`, `'manual'`, `'db'` | Veri nereden geldi |
| `nutrition_confidence` | 0.0 – 1.0 | Veri güvenilirliği skoru |
| `is_verified` | Boolean | Manuel doğrulama yapıldı mı |

---

## 2g. Migrasyon Geçmişi

### Başlangıç Durumu (17 Tablo)
Projenin ilk sürümünde şu tablolar mevcuttu:

```
ingredient_nutrition_values   ← Ayrı besin değeri tablosu
ingredient_usda_mappings      ← USDA API ID eşleme
unmatched_ingredients         ← Eşleştirilemeyen malzeme raporu
ingredient_unit_conversions   ← Birim dönüşüm tablosu
```

### USDA → Gemini Geçişi (Mayıs 2026, 4 Tablo Kaldırıldı → 13)

**Kaldırılan tablolar:**
- `ingredient_nutrition_values` — inline kolonlara taşındı
- `ingredient_usda_mappings` — USDA bağımlılığı kaldırıldı
- `unmatched_ingredients` — Gemini ile eşleşme sorunu büyük ölçüde çözüldü
- `ingredient_unit_conversions` — `recipe_helpers.py` sabit dict'e taşındı

**Kaldırılan servis dosyaları:**
- `usda_client.py`
- `usda_mapping_service.py`
- `nutrition_fetcher.py`
- `usda_food_data.py`

### Mikro Besin Kolonu Daraltması (Mayıs 2026)

Başlangıçta 15 inline kolon vardı. Health score hesabı bu kolonları kullanmadığı için 7'si kaldırıldı:

| Kaldırılan Kolon | Neden |
|-----------------|-------|
| `added_sugar_per_100g` | `sugar_per_100g` içinde zaten var |
| `trans_fat_per_100g` | Health score'da kullanılmıyor |
| `cholesterol_mg_per_100g` | Health score'da kullanılmıyor |
| `potassium_mg_per_100g` | Health score'da kullanılmıyor |
| `calcium_mg_per_100g` | Health score'da kullanılmıyor |
| `iron_mg_per_100g` | Health score'da kullanılmıyor |
| `vitamin_d_mcg_per_100g` | Health score'da kullanılmıyor |

**Sonuç:** 17 tablo → 13 tablo; 15 besin kolonu → 8 kolon; 3 dış bağımlılık → 0.
