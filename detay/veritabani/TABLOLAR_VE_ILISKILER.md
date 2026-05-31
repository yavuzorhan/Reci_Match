# Veritabanı Tabloları ve İlişkileri

ReciMatch uygulaması PostgreSQL veritabanı kullanmaktadır. Toplam **13 tablo** bulunmaktadır.
Bu belge her tablonun ne işe yaradığını, sütunlarını ve tablolar arası ilişkileri açıklar.

---

## İlişki Diyagramı (Genel Bakış)

```
users (1) ──────────────────────────────────────────┐
   │                                                 │
   ├── (N) email_verification_codes                  │
   │                                                 │
   ├── (N) favorites ─────────────── (N) recipes ────┤
   │                                                 │
   ├── (N) owned_ingredients ──────── (N) ingredients│
   │         └─ ingredients (N) ──── ingredient_categories
   │                                 ingredient_aliases
   ├── (N) disliked_ingredients ──── (N) ingredients │
   │                                                 │
   ├── (N) daily_logs ─────────────── (N) recipes    │
   │                                                 │
   └── (N) [recipes (user_id = X)] ──────────────────┘

recipes (1) ──── (N) recipe_ingredients ──── (N) ingredients
recipes (1) ──── (0..1) healthy_recipes
recipes (1) ──── (N) revision_cache
```

---

## 1. `users` — Kullanıcılar

### Ne Zaman Oluşturulur?
Kullanıcı kayıt işlemini tamamlayıp e-posta doğrulamasını geçtikten sonra oluşturulur. Doğrulama olmadan satır eklenmez.

### Neden Gerekli?
Tüm kişisel veriler (favoriler, günlük loglar, kişisel dolap, profil) bu tabloya bağlıdır. Kimlik doğrulama için şifrelenmiş parola saklar.

### Sütunlar

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `user_id` | Integer (PK) | Her kullanıcının benzersiz kimliği. Otomatik artan. |
| `name_surname` | String(100) | Ad ve soyad |
| `email` | String(100) UNIQUE | Giriş için kullanılan e-posta. Tekil olmalı. |
| `password_hash` | String(255) | bcrypt ile şifrelenmiş parola. Asla düz metin değil. |
| `age` | Integer | Kullanıcı yaşı (kalori hesabı için) |
| `gender` | String(20) | "Erkek", "Kadın", "Diğer" |
| `height_cm` | Integer | Boy santimetre olarak |
| `weight_kg` | Numeric(5,2) | Kilo — örn: 70.50 |
| `objective` | String(50) | "Kilo Vermek", "Kilo Almak", "Kilo Korumak" |
| `activity` | String(50) | Aktivite seviyesi (Sedanter, Hafif aktif, vb.) |
| `meals` | Integer | Günlük öğün sayısı (2-5 arası) |
| `daily_calorie` | Integer | Hesaplanan günlük kalori hedefi |
| `created_at` | DateTime | Hesap oluşturulma zamanı |
| `is_verified` | Boolean | E-posta doğrulaması tamamlandı mı? |

### İlişkiler
- `favorites` (1:N) → Kullanıcının favori tarifleri
- `disliked_ingredients` (1:N) → Sevmediği malzemeler
- `owned_ingredients` (1:N) → Dolabındaki malzemeler
- `daily_logs` (1:N) → Yediği yemeklerin kaydı
- `verification_codes` (1:N) → E-posta doğrulama kodları
- `recipes` (1:N) → Kullanıcının eklediği kişisel tarifler (user_id = X)
- `ingredients` (1:N) → Kullanıcının eklediği kişisel malzemeler (user_id = X)

### Kritik Teknik Notlar
- `password_hash` → bcrypt hash içerir, `$2b$` ile başlar
- `daily_calorie` → Profil kurulumunda Harris-Benedict formülü ile hesaplanır
- `is_verified = False` → Giriş yapılamaz bile kayıt varsa

---

## 2. `email_verification_codes` — E-posta Doğrulama Kodları

### Ne Zaman Oluşturulur?
- Kullanıcı kayıt formu doldurduğunda (purpose: "register")
- "Şifremi unuttum" isteğinde (purpose: "reset_password")
- Profilde şifre/e-posta değiştirmek istendiğinde (purpose: "security_update")

### Neden Gerekli?
Kullanıcının gerçekten o e-postaya sahip olduğunu kanıtlamak için 6 haneli geçici kod gönderilir. Kod 10 dakika sonra geçersizleşir.

### Sütunlar

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `id` | Integer (PK) | Kayıt kimliği |
| `user_id` | Integer (FK → users, nullable) | Kayıtlı kullanıcı; kayıt sırasında NULL |
| `email` | String(255) | Koda ait e-posta adresi |
| `code` | String(6) | 6 haneli OTP kodu (örn: "483921") |
| `purpose` | String(30) | "register", "reset_password", "security_update" |
| `expires_at` | DateTime | Kodun son geçerlilik zamanı |
| `created_at` | DateTime | Oluşturulma zamanı |
| `temp_name` | String(100) | Kayıtta geçici ad soyad (doğrulama bekleniyor) |
| `temp_password` | String(255) | Kayıtta geçici bcrypt hash (doğrulama bekleniyor) |

### Önemli Tasarım Kararı
Kayıt akışında kullanıcı `users` tablosuna doğrulama **sonrasında** eklenir. `temp_name` ve `temp_password`, onay gelene kadar bu tabloda bekler. Doğrulama tamamlanınca `User` satırı eklenir ve bu kod kaydı silinir.

---

## 3. `ingredient_categories` — Malzeme Kategorileri

### Ne Zaman Oluşturulur?
Seed scripti ile önceden doldurulur. Değişmez sabit veriler.

### Neden Gerekli?
Malzemeleri kategorilere ayırmak filtrele ve arama kolaylığı sağlar. Frontend'de kategori bazlı listeleme yapılır.

### Sütunlar

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `category_id` | Integer (PK) | Kategori kimliği |
| `category_name` | String(50) UNIQUE | Kategori adı (Et, Sebze, Tahıl vb.) |

### İlişkiler
- `ingredients` (1:N) → Bu kategoriye ait malzemeler

---

## 4. `ingredients` — Malzemeler

### Ne Zaman Oluşturulur?
- Yemek.com scraper verisi içe aktarımıyla (global, `user_id = NULL`)
- Kullanıcı özel malzeme eklediğinde (`user_id = kullanıcı_id`)
- Gemini AI yeni bir malzeme besin değeri hesapladığında

### Neden Gerekli?
Hem global hem kişisel malzemelerin besin değerlerini saklar. Health score ve öneri algoritması bu verilere dayanır.

### Sütunlar

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `ingredient_id` | Integer (PK) | Malzeme kimliği |
| `ingredient_name` | String(100) | Malzeme adı |
| `user_id` | Integer (FK → users, nullable) | NULL = global, değer varsa kişisel |
| `category` | String(50) | Kategori adı (metin) |
| `category_id` | Integer (FK → ingredient_categories) | Kategori referansı |
| `calorie_per_100g` | Float | 100 gramda kalori |
| `protein_per_100g` | Float | 100 gramda protein (gram) |
| `carbohydrate_per_100g` | Float | 100 gramda karbonhidrat (gram) |
| `fat_per_100g` | Float | 100 gramda yağ (gram) |
| `saturated_fat_per_100g` | Float | 100 gramda doymuş yağ |
| `fiber_per_100g` | Float | 100 gramda lif |
| `sugar_per_100g` | Float | 100 gramda şeker |
| `sodium_mg_per_100g` | Float | 100 gramda sodyum (miligram) |
| `nutrition_source` | String(30) | "gemini", "manual", "db", "usda_legacy" |
| `nutrition_confidence` | Float | Güven skoru 0-1 arası |
| `is_verified` | Boolean | Admin doğrulaması |
| `source` | String(50) | "manual", "gemini_auto", "admin" |

### Kritik Tasarım: `user_id = NULL`
- `user_id = NULL` → Global malzeme, tüm kullanıcılara görünür
- `user_id = X` → Sadece kullanıcı X'e ait özel malzeme

Bu pattern gereksiz veri kopyalamasını önler. Ortak bilgi paylaşılır.

### Unique Constraint Açıklaması
```sql
-- Global malzemelerde sadece isim tekil:
CREATE UNIQUE INDEX WHERE user_id IS NULL ON (ingredient_name)

-- Kişisel malzemelerde kullanıcı + isim tekil:
CREATE UNIQUE INDEX WHERE user_id IS NOT NULL ON (user_id, ingredient_name)
```

### İlişkiler
- `ingredient_categories` (N:1) — Kategorisi
- `ingredient_aliases` (1:N) — Takma adları
- `recipe_ingredients` (1:N) — Hangi tariflerde kullanılıyor
- `disliked_ingredients` (1:N) — Hangi kullanıcılar sevmiyor
- `owned_ingredients` (1:N) — Hangi kullanıcıların dolabında var

---

## 5. `ingredient_aliases` — Malzeme Takma Adları

### Ne Zaman Oluşturulur?
Bir malzemenin birden fazla yazılış şekli olduğunda. Hem otomatik (scraper) hem manuel olarak eklenir.

### Neden Gerekli?
Kullanıcı "tavuk" diye arama yaptığında "Tavuk Göğsü (Derisiz)" gibi varyantları da bulmasını sağlar. Fuzzy matching'e ek olarak kesin eşleme.

### Sütunlar

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `id` | Integer (PK) | Kayıt kimliği |
| `ingredient_id` | Integer (FK → ingredients, CASCADE) | Ana malzeme |
| `alias_name` | String(150) | Takma ad (orijinal yazım) |
| `normalized_alias_name` | String(150) UNIQUE | Türkçe normalleştirilmiş (ğ→g, ş→s vb.) |
| `created_at` | DateTime | Oluşturulma tarihi |

---

## 6. `recipes` — Tarifler

### Ne Zaman Oluşturulur?
- Scraper ile yemek.com'dan içe aktarımda (global, `user_id = NULL`)
- Kullanıcı kendi tarifi eklediğinde (`user_id = kullanıcı_id`)
- Revizyon kaydedildiğinde (yeni `source="revision"` satırı oluşturulur)

### Neden Gerekli?
Sistemin temel varlığı. Tüm tarif bilgileri, besin değerleri ve sağlık skoru burada saklanır.

### Sütunlar

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `recipe_id` | Integer (PK) | Tarif kimliği |
| `recipe_name` | String(150) | Tarif adı |
| `user_id` | Integer (FK → users, nullable) | NULL = global, değer = kişisel |
| `source` | String(20) | "yemekcom", "custom", "revision" |
| `source_url` | String(500) | Kaynak URL (scraper'dan) |
| `recipe_category` | String(50) | "Çorba", "Ana Yemek", "Tatlı" vb. |
| `explanation` | Text | Tarif açıklaması |
| `preparation` | Text | Hazırlık adımları |
| `cooking_type` | String(50) | "Fırında", "Tavada", "Tencerede" |
| `cooking_method` | String(50) | Pişirme yöntemi |
| `total_time_minutes` | Integer | Toplam süre (dakika) |
| `serving` | Integer | Kaç kişilik |
| `calorie` | Numeric(6,2) | Toplam kalori (TÜM porsiyonlar için) |
| `protein` | Numeric(6,2) | Toplam protein (TÜM porsiyonlar) |
| `carbohydrate` | Numeric(6,2) | Toplam karbonhidrat (TÜM porsiyonlar) |
| `fat` | Numeric(6,2) | Toplam yağ (TÜM porsiyonlar) |
| `health_score` | Integer | 0-100 arası sağlık skoru |
| `health_grade` | String(1) | A/B/C/D |
| `health_explanation` | Text | Skoru açıklayan metin |
| `image_url` | String(255) | Tarif resmi URL'si |
| `is_active` | Boolean | False = soft-delete (görünmez ama silinmez) |

### Önemli: Kalori Nasıl Saklanır?
`calorie`, `protein`, `carbohydrate`, `fat` → **TÜM porsiyonların toplamı**

Frontend'de porsiyon başına gösterim: `calorie / serving`

Neden böyle? Scraper yemek.com'dan toplam değerleri çekiyor. Porsiyon sayısı değişebilir; toplam üzerinden hesap daha güvenilir.

### İlişkiler
- `recipe_ingredients` (1:N) — Malzeme bağlantıları
- `healthy_recipes` (1:0..1) — Sağlıklı tarif işareti
- `favorites` (1:N) — Bu tarifi favorileyen kullanıcılar
- `daily_logs` (1:N) — Bu tarifi yiyen kayıtlar
- `revision_cache` (1:N) — Önbelleğe alınmış revizyonlar

---

## 7. `recipe_ingredients` — Tarif-Malzeme Bağlantısı

### Ne Zaman Oluşturulur?
Bir tarif oluşturulduğunda, her malzeme için bir satır eklenir.

### Neden Gerekli?
Tarif ve malzeme arasındaki çoktan-çoğa (N:N) ilişkiyi çözer. Bir tarif birçok malzeme içerebilir; bir malzeme birçok tarifte kullanılabilir.

### Sütunlar

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `recipe_ingredient_id` | Integer (PK) | Bağlantı kimliği |
| `recipe_id` | Integer (FK → recipes, CASCADE) | Hangi tarif |
| `ingredient_id` | Integer (FK → ingredients, CASCADE) | Hangi malzeme |
| `amount` | Numeric(6,2) | Miktar (ör: 2.00) |
| `unit` | String(50) | Birim (ör: "su bardağı", "gram") |
| `miktar_gram` | Numeric(10,2) | Gram cinsinden miktar (dönüştürülmüş) |
| `donusum_kaynagi` | String(100) | Dönüşüm kaynağı (ör: "yemekcom") |
| `donusum_guveni` | String(20) | "high", "medium", "low" |
| `donusum_notu` | Text | Dönüşüm notları |

### Neden `miktar_gram` Ayrı Saklanıyor?
Health score hesaplamak için tüm malzemelerin gram cinsinden ağırlığı gerekir.
"2 su bardağı pirinç" → 400 gram dönüşümü karmaşıktır ve her seferinde hesaplamak yavaşlatır.
Bu dönüşüm bir kez yapılır ve saklanır.

---

## 8. `healthy_recipes` — Sağlıklı Tarif İşaretleri

### Ne Zaman Oluşturulur?
Health grade B veya üstü olan tarifler senkronizasyon scripti ile bu tabloya eklenir.

### Neden Gerekli?
"Sağlıklı Tarif" filtresinin hızlı çalışmasını sağlar. Her seferinde health score hesaplamak yerine bu tabloda hazır liste var.

### Sütunlar

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `healthy_recipe_id` | Integer (PK) | Kayıt kimliği |
| `recipe_id` | Integer (FK → recipes, UNIQUE, CASCADE) | Tarif — bir tarif bir kez olabilir |
| `source` | String(20) | Kaynak |
| `synced_at` | DateTime | Senkronizasyon zamanı |

---

## 9. `owned_ingredients` — Kullanıcı Dolabı

### Ne Zaman Oluşturulur?
Kullanıcı "Malzeme Seçimi" sayfasında dolabına malzeme eklediğinde.

### Neden Gerekli?
"Dolabımdaki malzemelere göre tarif öner" özelliği için. Öneri algoritması dolap malzemelerini bonus olarak değerlendirir.

### Sütunlar

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `owned_id` | Integer (PK) | Kayıt kimliği |
| `user_id` | Integer (FK → users, CASCADE) | Kullanıcı |
| `ingredient_id` | Integer (FK → ingredients, CASCADE) | Malzeme |
| `added_at` | DateTime | Eklenme tarihi |

---

## 10. `disliked_ingredients` — Sevilmeyen Malzemeler

### Ne Zaman Oluşturulur?
Kullanıcı "Sevilmeyen Malzemeler" sayfasında bir malzemeyi listeye eklediğinde.

### Neden Gerekli?
Tarif önerisinde sevilmeyen malzeme içeren tariflere her biri için -35 ceza puanı verilir. "Sevilmeyenleri çıkar" seçeneğiyle bu tarifler tamamen hariç tutulur.

### Sütunlar

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `disliked_id` | Integer (PK) | Kayıt kimliği |
| `user_id` | Integer (FK → users, CASCADE) | Kullanıcı |
| `ingredient_id` | Integer (FK → ingredients, CASCADE) | Sevilmeyen malzeme |

---

## 11. `favorites` — Favori Tarifler

### Ne Zaman Oluşturulur?
Kullanıcı tarif detay sayfasında kalp ikonuna bastığında.

### Neden Gerekli?
Kullanıcının beğendiği tarifleri "Favorilerim" sayfasında listelemek için. Toggle işlemi (ekle/çıkar) ile çalışır.

### Sütunlar

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `favorite_id` | Integer (PK) | Kayıt kimliği |
| `user_id` | Integer (FK → users, CASCADE) | Kullanıcı |
| `recipe_id` | Integer (FK → recipes, CASCADE) | Favori tarif |

---

## 12. `daily_logs` — Günlük Öğün Kayıtları

### Ne Zaman Oluşturulur?
- Kullanıcı tarif detay sayfasında "Yedim" butonuna bastığında
- Tarifi haftalık plana eklediğinde

### Neden Gerekli?
Kullanıcının günlük kalori alımını takip etmek için. Dashboard'daki kalori çubuğu ve haftalık grafikler bu tablodan hesaplanır.

### Sütunlar

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `log_id` | Integer (PK) | Kayıt kimliği |
| `user_id` | Integer (FK → users, CASCADE) | Kullanıcı |
| `recipe_id` | Integer (FK → recipes, CASCADE) | Yenen tarif |
| `log_date` | Date | Hangi gün (ör: 2026-05-31) |
| `logged_at` | DateTime | Tam kayıt zamanı |
| `meal_type` | String(30) | "Kahvaltı", "Öğle Yemeği", "Akşam Yemeği", "Ara Öğün" |
| `entry_source` | String(20) | "daily" veya "weekly" |
| `calorie_intake` | Numeric(6,2) | O öğünde tüketilen kalori |
| `protein_intake` | Numeric(6,2) | Tüketilen protein |
| `carbohydrate_intake` | Numeric(6,2) | Tüketilen karbonhidrat |
| `fat_intake` | Numeric(6,2) | Tüketilen yağ |
| `serving_count` | Integer | Kaç porsiyon |
| `serving_multiplier` | Numeric(6,2) | Porsiyon çarpanı |

### Hesaplama Mantığı
`calorie_intake = recipe.calorie_per_serving × serving_count`

Kaydedilirken hesaplanır ve saklanır. Tarif sonradan değişse bile log değerleri korunur (tarihsel doğruluk).

---

## 13. `revision_cache` — Tarif Revizyon Önbelleği

### Ne Zaman Oluşturulur?
Kullanıcı bir tarifte Gemini AI ile revizyon yaptığında. Her tarif+değişiklik kombinasyonu bir kez saklanır.

### Neden Gerekli?
Gemini API çağrısı hem maliyetli hem yavaş. Aynı revizyon talebi önbellekten saniyeler içinde yanıtlanabilir.

### Sütunlar

| Sütun | Tip | Açıklama |
|-------|-----|----------|
| `cache_id` | Integer (PK) | Kayıt kimliği |
| `recipe_id` | Integer (FK → recipes, CASCADE) | Hangi tarif |
| `modifications_hash` | String(64) | SHA-256 hash (değişiklik listesinin özeti) |
| `response_json` | Text | Gemini'den gelen tam JSON yanıt |
| `created_at` | DateTime | Önbellek oluşturulma zamanı |

### Nasıl Çalışır?
1. Kullanıcı "Tarifi şekersiz yap + az yağlı" ister
2. Bu talep SHA-256 hash'e çevrilir
3. `recipe_id + hash` veritabanında aranır
4. Varsa → önbellekten döner (Gemini çağrısı yapılmaz)
5. Yoksa → Gemini'ye sorulur → yanıt DB'ye kaydedilir → döner

---

## CASCADE Silme Davranışı

Tüm yabancı anahtar (FK) ilişkileri `ondelete="CASCADE"` ile tanımlanmıştır.

### Ne Anlama Gelir?

Üst satır silinince alt satırlar **otomatik** silinir:

| Silinirse | Otomatik Silinen |
|---|---|
| Kullanıcı | favorites, disliked_ingredients, owned_ingredients, daily_logs, verification_codes |
| Tarif | recipe_ingredients, favorites, daily_logs, revision_cache |
| Malzeme | recipe_ingredients, disliked_ingredients, owned_ingredients, aliases |

Bu veri tutarlılığını sağlar. Silinen bir tarife ait "ölü" favoriler kalmaz.

---

## Önemli Teknik Kararlar

### 1. `user_id = NULL` = Global Kayıt

Hem `ingredients` hem `recipes` tablosunda `user_id = NULL` olan satırlar tüm kullanıcılara görünür. Kişisel veriler `user_id = X` ile izole edilir.

Bu pattern gereksiz veri kopyalamasını önler. 1000 kullanıcı aynı global tarifi kullanıyorsa tek bir satır yeterli.

### 2. `is_active = False` = Soft Delete

`recipes` tablosunda `is_active = False` yaparak tarifleri "gizleyebiliriz". Satır silinmez. Bu sayede:
- Silinen tariflere ait loglar bozulmaz
- Kullanıcı istatistikleri korunur
- Gerektiğinde tarif geri alınabilir

### 3. Kalori Toplam mı, Porsiyon mu?

`recipes.calorie` → Toplam (TÜM porsiyonlar)
Frontend → `calorie / serving` ile porsiyon hesaplar
`daily_logs.calorie_intake` → Zaten porsiyon × serving_count değeri (hesaplanmış)

### 4. `revision_cache` Neden Ayrı Tablo?

`revision_cache` başlangıçta recipe kolonuna JSON olarak yazılabilirdi. Ancak:
- Önbellek verisinin tarif verisiyle karışmaması için ayrı tablo
- Farklı değişiklik kombinasyonları aynı tarif için farklı satırlar
- Temizleme/geçerliliği süresi aşılmış kayıt silme kolaylaşır

### 5. `nutrition_source` ve `nutrition_confidence`

Her malzemenin besin değerinin nereden geldiği ve ne kadar güvenilir olduğu saklanır:
- `"db"` + confidence=1.0 → Doğrulanmış veri
- `"gemini"` + confidence=0.7 → AI tahmini, güvenilir ama mükemmel değil
- `"manual"` + confidence=0.4 → Kullanıcı girişi, doğrulanmamış

Bu sayede health score'un güvenilirlik düzeyi kullanıcıya gösterilebilir.
