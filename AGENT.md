# AGENT.md — ReciMatch Tam Teknik Referans

> Her oturum sonunda "Oturum Günlüğü" bölümüne yeni kayıt ekle (en yeni en üstte).
> Bu belge projeyi kodu okumadan anlayacak düzeyde yazılmıştır.

---

## 1. Proje Amacı

ReciMatch; kullanıcının elindeki malzemelere, beslenme hedeflerine ve sevilmeyen malzemelere göre
tarif öneren, besinsel kaliteyi puanlayan ve günlük/haftalık beslenme takibini destekleyen
bir web uygulamasıdır.

**GitHub:** `https://github.com/yavuzorhan/Reci_Match.git` | Branch: `main`

---

## 2. Teknoloji Stack

| Katman | Teknoloji |
|--------|-----------|
| Backend | Python 3.14, FastAPI, SQLAlchemy ORM, Pydantic v2 |
| Veritabanı | PostgreSQL (production), SQLite (geliştirme) |
| Kimlik doğrulama | bcrypt şifre hash, OTP e-posta doğrulama |
| AI Revizyonu | Google Gemini 2.5 Flash (`google-genai`) |
| Scraper | BeautifulSoup4, requests |
| Frontend | React 19, Vite, React Router v7, Context API |
| İkonlar | lucide-react |
| E-posta | Python smtplib, SMTP, marka: **ReciMatch** |

---

## 3. Klasör Yapısı

```
Reci_Match/
├── CLAUDE.md                          ← Claude Code proje kuralları
├── AGENT.md                           ← Bu dosya
├── backend/
│   ├── main.py                        ← FastAPI app, CORS, router include
│   ├── requirements.txt
│   ├── app/
│   │   ├── config/settings.py         ← Ortam değişkenleri (SMTP, DB URL, Gemini key)
│   │   ├── db/
│   │   │   ├── database.py            ← SQLAlchemy engine + SessionLocal
│   │   │   └── models.py              ← TÜM ORM modelleri (15 tablo)
│   │   ├── routers/
│   │   │   ├── auth.py                ← /api/register, /verify, /login, /forgot-password
│   │   │   ├── recipes.py             ← /api/recipes/*, /api/users/{id}/custom-recipes
│   │   │   ├── users.py               ← /api/users/{id}/profile, favorites, logs, ingredients
│   │   │   └── ingredients.py         ← /api/ingredients/categorized, /api/users/{id}/ingredients
│   │   ├── schemas/
│   │   │   ├── auth.py                ← RegisterRequest, LoginRequest, VerifyRequest...
│   │   │   ├── user.py                ← ProfileUpdateRequest, DailyLogCreateRequest...
│   │   │   ├── recipe.py              ← RecipeRecommendationRequest...
│   │   │   └── recipe_revision.py     ← RecipeRevisionRequest, RevisedRecipePayload
│   │   ├── services/
│   │   │   ├── auth_service.py        ← Kayıt, doğrulama, giriş, şifre sıfırlama
│   │   │   ├── recipe_service.py      ← Tarif listeleme, öneriler, CRUD
│   │   │   ├── recipe_revision_service.py ← Gemini revizyonu + kaydetme
│   │   │   ├── user_service.py        ← Profil, kalori, log, favori, öğün slotu
│   │   │   ├── ingredient_service.py  ← Malzeme CRUD, kategori, izolasyon
│   │   │   ├── ingredient_matching_service.py ← İsim normalizasyon + DB eşleştirme
│   │   │   ├── ingredient_resolver_service.py ← Alias/canonical yaklaşımıyla çözme
│   │   │   ├── ingredient_nutrition_service.py ← USDA besin değeri altyapısı
│   │   │   ├── unit_conversion_service.py ← Miktar → gram dönüşümü
│   │   │   ├── usda_client.py         ← USDA FoodData Central API
│   │   │   ├── usda_mapping_service.py ← USDA eşleştirme mantığı
│   │   │   └── healthy_recipe_service.py ← Sağlıklı tarif tablosu yönetimi
│   │   ├── repositories/
│   │   │   ├── recipe_repository.py   ← Tüm tarif SQL sorguları
│   │   │   ├── user_repository.py     ← Kullanıcı, favori, log SQL sorguları
│   │   │   └── ingredient_repository.py ← Malzeme SQL sorguları
│   │   └── utils/
│   │       ├── recipe_health.py       ← Health score algoritması (tek dosya, ~700 satır)
│   │       ├── mailer.py              ← SMTP e-posta (marka: ReciMatch)
│   │       ├── nutrition_fetcher.py   ← USDA veri çekme yardımcısı
│   │       └── recipe_helpers.py      ← Kalori hesaplama, gram dönüşüm yardımcıları
│   ├── scraper/
│   │   ├── yemekcom_scraper.py        ← yemek.com (per-serving kalori saklar)
│   │   └── import_yemekcom_recipes.py ← yemek.com tarif importu
│   └── scripts/
│       ├── backfill_health_scores.py  ← Mevcut tariflere skor hesapla
│       └── backfill_recipe_ingredient_grams.py ← Gram dönüşümlerini doldur
├── frontend/
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx                   ← React root, AppProvider sarmalı
│       ├── App.jsx                    ← Router tanımları, tüm route'lar
│       ├── config.js                  ← API_BASE URL (env'den alır)
│       ├── index.css                  ← CSS değişkenleri (:root, dark-mode)
│       ├── App.css                    ← Global stiller, layout, sidebar, auth-shell
│       ├── context/
│       │   └── AppContext.jsx         ← TÜM global state + tema + API çağrıları
│       ├── components/
│       │   ├── Layout.jsx             ← Sidebar + layout-content sarmalı
│       │   ├── RecipeCard.jsx         ← Tarif kart bileşeni
│       │   ├── IngredientPicker.jsx   ← Malzeme seçim widget'ı
│       │   ├── AddRecipeForm.jsx      ← Tarif ekleme/düzenleme formu
│       │   ├── RecipeRevisionModal.jsx ← Gemini revizyon modali
│       │   ├── ManualIngredientNutritionModal.jsx ← Besin değeri giriş modali
│       │   └── ProgressCircle.jsx     ← Dairesel progress göstergesi
│       ├── pages/
│       │   ├── Login.jsx / Login.css
│       │   ├── Register.jsx
│       │   ├── VerifyEmail.jsx
│       │   ├── ForgotPassword.jsx
│       │   ├── ResetPassword.jsx
│       │   ├── ProfileSetup.jsx       ← İlk profil kurulumu
│       │   ├── ProfileEdit.jsx / .css ← Profil düzenleme
│       │   ├── Dashboard.jsx / .css   ← Ana sayfa, günlük özet
│       │   ├── IngredientSelection.jsx / .css ← Malzeme seçim ekranı
│       │   ├── Recommendations.jsx / .css ← Tarif önerileri
│       │   ├── RecipeListDb.jsx / .css ← Tüm tarifler listesi
│       │   ├── RecipeDetailDb.jsx / .css ← Tarif detayı
│       │   ├── FavoritesDb.jsx / .css ← Favoriler
│       │   ├── Pantry.jsx / .css      ← Dolabım (owned ingredients)
│       │   ├── HealthyMenu.jsx / .css ← Sağlıklı tarifler (her zaman dark)
│       │   ├── HealthyResults.jsx / .css
│       │   ├── EditRecipe.jsx         ← Tarif düzenleme sayfası
│       │   ├── DailyLogs.jsx          ← Günlük kayıtlar
│       │   └── WeeklyLogs.jsx / .css  ← Haftalık kayıtlar
│       └── utils/
│           └── recipeInsights.js      ← Filtre, grade, renk, özet yardımcıları
```

---

## 4. Veritabanı Şeması

### 4.1 Tablo Listesi

```
ingredient_categories      → Malzeme kategorileri
ingredients                → Malzemeler (global: user_id=NULL, özel: user_id=X)
ingredient_aliases         → Malzeme takma adları (eşleştirme için)
ingredient_usda_mappings   → USDA FDC eşleştirme kayıtları
ingredient_nutrition_values→ 100g başı besin değerleri (15 alan)
ingredient_unit_conversions→ Birim→gram dönüşüm tablosu
recipes                    → Tarifler (global: user_id=NULL, özel: user_id=X)
recipe_ingredients         → Tarif-malzeme ilişkisi + gram dönüşüm
unmatched_ingredients      → Eşleşemeyen malzeme kayıtları
healthy_recipes            → Sağlıklı tarif işaret tablosu
users                      → Kullanıcı profili + kalori hedefi
email_verification_codes   → OTP kodları (kayıt + şifre sıfırlama)
favorites                  → Kullanıcı-tarif favorileri
disliked_ingredients       → Sevilmeyen malzemeler
owned_ingredients          → Dolaptaki malzemeler
daily_logs                 → Günlük beslenme kayıtları
revision_cache             → Gemini revizyon cache'i (24 saat)
```

### 4.2 Kritik Alan Açıklamaları

**`recipes` tablosu:**
```
recipe_id       PK
user_id         NULL = tüm kullanıcılara görünür (global)
                X    = sadece kullanıcı X'e görünür
calorie         PER SERVING değeri (1 porsiyon başı)
protein         PER SERVING
carbohydrate    PER SERVING
fat             PER SERVING
serving         Kaç kişilik (tarif tanımında, hesaplamada kullanılır)
health_score    0-100 arası (backfill scripti ile doldurulur)
health_grade    A/B/C/D
source          yemekcom | yemekcom_diet | custom
is_active       Soft delete için
```

**`recipe_ingredients` tablosu:**
```
amount          Orijinal miktar (örn: 2)
unit            Orijinal birim (örn: "su bardağı")
miktar_gram     Hesaplanan gram karşılığı (backfill ile doldurulur)
donusum_guveni  high / medium / low (dönüşüm güven skoru)
```

**`ingredients` tablosu:**
```
user_id=NULL     → Global malzeme (tüm kullanıcılara görünür)
user_id=X        → Kullanıcı X'in özel malzemesi
calorie_per_100g → Basit besin değeri (eski alan, nutrition_value ilişkisi tercih edilir)
```

**`ingredient_nutrition_values` tablosu (15 besin alanı):**
```
calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g
saturated_fat, fiber, sugar, sodium_mg, added_sugar
trans_fat, cholesterol_mg, potassium_mg, calcium_mg, iron_mg, vitamin_d_mcg
source: USDA_FDC | manual
```

**`daily_logs` tablosu:**
```
meal_type       Kahvaltı | Öğle Yemeği | Akşam Yemeği | Ara Öğün | Ek Öğün 2...
entry_source    daily | weekly
calorie_intake  Gerçek tüketilen kalori (serving_multiplier ile çarpılmış)
serving_count   Kaç porsiyon yendi
```

**`email_verification_codes` tablosu:**
```
purpose         register | password_reset | email_change
expires_at      10 dakika
temp_name       Kayıt aşamasında geçici kullanıcı adı
temp_password   Kayıt aşamasında geçici şifreli hash
```

### 4.3 Kritik Kısıtlamalar

```sql
-- Malzeme benzersizliği
UNIQUE INDEX: ingredient_name WHERE user_id IS NULL     -- global malzeme ismi tekrar edemez
UNIQUE INDEX: (user_id, ingredient_name) WHERE user_id IS NOT NULL -- özel malzeme tekrar edemez

-- Revizyon cache
UNIQUE CONSTRAINT: (recipe_id, modifications_hash)

-- Sağlıklı tarif işareti
UNIQUE: recipe_id (healthy_recipes tablosunda her tarif bir kez)

-- daily_logs: UNIQUE KISIT YOK → sınırsız kayıt mümkün
```

---

## 5. API Endpoint Haritası

### Kimlik Doğrulama (`auth.py`)
```
POST /api/register              → register_user() → OTP e-posta gönder
POST /api/verify                → verify_email()  → OTP doğrula, kullanıcı oluştur
POST /api/login                 → login_user()    → bcrypt kontrol, profil döndür
POST /api/forgot-password       → OTP gönder
POST /api/reset-password        → OTP doğrula, şifre güncelle
POST /api/users/{id}/request-otp          → Güvenlik güncellemesi için OTP
POST /api/users/{id}/update-password      → Şifre değiştir (OTP ile)
POST /api/users/{id}/update-email         → E-posta değiştir (OTP ile)
```

### Profil & Kullanıcı (`users.py`)
```
GET  /api/users/{id}/profile              → Profil + kalori hedefi
PUT  /api/users/{id}/profile              → Profil güncelle + kalori yeniden hesapla

GET  /api/users/{id}/favorites            → Favori tarif ID listesi
POST /api/users/{id}/favorites            → Favoriye ekle
DELETE /api/users/{id}/favorites/{rid}   → Favoriden çıkar

GET  /api/users/{id}/daily-logs          → Günlük kayıtlar
POST /api/users/{id}/daily-logs          → Yeni öğün kaydı
PUT  /api/users/{id}/daily-logs/{lid}    → Kayıt güncelle
DELETE /api/users/{id}/daily-logs/{lid}  → Kayıt sil

GET  /api/users/{id}/ingredients         → Dolaptaki malzemeler
POST /api/users/{id}/ingredients         → Dolap güncelle (tümünü değiştir)

GET  /api/users/{id}/disliked-ingredients → Sevilmeyen malzemeler
POST /api/users/{id}/disliked-ingredients → Sevilmeyen güncelle
```

### Tarifler (`recipes.py`)
```
GET  /api/recipes                         → Tarif listesi (user_id ile filtre)
GET  /api/recipes/{recipe_id}             → Tarif detayı (malzemeler + skor)
POST /api/recipes/recommendations         → Öneri hesapla (malzeme bazlı skor)
GET  /api/recipe-image?url=...            → Harici resim proxy

POST /api/recipes/{id}/revise             → Gemini revizyonu (önizleme)
POST /api/recipes/{id}/revise/save        → Revize tarifi kaydet

POST /api/users/{id}/custom-recipes       → Özel tarif ekle
PUT  /api/users/{id}/custom-recipes/{rid} → Özel tarif güncelle
DELETE /api/users/{id}/custom-recipes/{rid} → Özel tarif sil
POST /api/recipes/{id}/image              → Tarif resmi yükle
```

### Malzemeler (`ingredients.py`)
```
GET  /api/ingredients/categorized         → Kategorili malzeme listesi (user_id ile filtre)
POST /api/users/{id}/custom-ingredients   → Özel malzeme ekle
POST /api/users/{id}/ingredients/manual   → Besin değeriyle manuel malzeme ekle
```

---

## 6. Temel Algoritmalar

### 6.1 Kullanıcı Kalori Hedefi Hesabı

**Dosya:** `backend/app/services/user_service.py → _calculate_daily_calorie()`

```
Mifflin-St Jeor formülü (Türk standart):

Erkek:  BMR = (10 × kilo) + (6.25 × boy) - (5 × yaş) + 5
Kadın:  BMR = (10 × kilo) + (6.25 × boy) - (5 × yaş) - 161

Aktivite çarpanları:
  Hareketsiz  → × 1.200
  Az Aktif    → × 1.375
  Orta Aktif  → × 1.550
  Çok Aktif   → × 1.725
  Ekstra      → × 1.900

Hedef ayarı:
  Kilo Vermek → - 500 kcal
  Kilo Almak  → + 500 kcal
  Korumak     → ±  0 kcal
```

**Frontend makro hesabı** (`AppContext.jsx`):
```
protein_hedef = (günlük_kalori × 0.25) / 4   (gram)
karb_hedef    = (günlük_kalori × 0.45) / 4   (gram)
yağ_hedef     = (günlük_kalori × 0.30) / 9   (gram)
```

---

### 6.2 Tarif Öneri (Match) Skoru

**Dosya:** `backend/app/services/recipe_service.py → get_recommendations()`  
**Endpoint:** `POST /api/recipes/recommendations`

**İstek payload:**
```json
{
  "selected_ingredient_ids": [1, 5, 12],
  "pantry_ingredient_ids": [3, 7],
  "disliked_ingredient_ids": [8, 9],
  "exclude_disliked": true,
  "cooking_types": ["Tavada"],
  "healthy_only": false,
  "user_id": 42
}
```

**Algoritma:**
```
1. Seçili + dolap malzemeleri birleştir → kullanıcı_malzemeleri
2. Her tarif için:
   a. Sevilmeyen malzeme varsa → atla (exclude_disliked=true ise)
   b. match_score = eşleşen_tarif_malzemeleri / tarif_toplam_malzeme × 100
   c. Pişirme türü filtresi (varsa)
   d. Healthy flag filtresi (varsa)
3. Skor > eşik → listeye al
4. Skor'a göre azalan sıralama
5. user_id ile kullanıcı izolasyonu uygula
```

---

### 6.3 Health Score Algoritması

**Dosya:** `backend/app/utils/recipe_health.py`  
**Fonksiyon:** `calculate_health_score()` → `apply_ingredient_health_adjustments()`

#### Adım 1: Makro Alt Skorlar (0-100)

```
calorie_score  = kalorisine göre: ≤150→90, ≤350→85, ≤550→78, ≤700→68, ≤850→58, >1000→35
protein_score  = 100kcal başına protein gramına göre: ≥8g→100, ≥6g→90, ≥4g→75, ≥2.5g→60
fat_score      = yağ oranına göre: ≤%20→95, ≤%30→90, ≤%40→70, ≤%50→50, ≤%60→30
carb_score     = karb oranına göre: %25-55→90, %55-65→75, %65-80→55, >%80→35
balance_score  = protein/karb/yağ dengesi: 20≤protein%≤35+15, 25≤karb%≤60+10...
```

#### Adım 2: Ağırlıklı Toplam
```
raw_score = calorie×0.30 + protein×0.25 + fat×0.25 + carb×0.10 + balance×0.10
```

#### Adım 3: İsim/Kategori Düzeltmesi
```
"kızartma"            → -10 puan
"pilav" + karb≥50     → -5 puan
"krema"/"tereyağı"    → -6 puan
"salata"/"ızgara"     → +4 puan
```

#### Adım 4: Malzeme Risk Analizi
```
Şeker grubu (bal, pekmez, şeker):
  ≥50g/porsiyon → -35 puan, max=49
  ≥35g          → -28 puan, max=54
  ≥15g          → -14 puan, max=69
  ≥10g          → -8 puan,  max=79

Rafine karbonhidrat (un, pirinç, makarna):
  ≥50g/porsiyon → -8 puan
  ≥30g          → -5 puan

Şeker+Rafine birlikte → ek -6 puan

Pozitif malzemeler (sebze, baklagil, tam tahıl, tavuk): +3 puan/malzeme (max +12)
```

#### Adım 5: Hard Cap'ler
```
Kalori ≥1000 kcal   → max 59
Yağ ≥70g            → max 59
Yağ oranı ≥%55      → max 59
İkisi birlikte       → max 55
```

#### Adım 6: Grade
```
≥80 → A (Çok Sağlıklı)
≥60 → B (Dengeli)
≥50 → C (Kontrollü)
<50 → D (Daha Ağır)
```

**Önemli Kararlar:**
- Protein bonusu, yüksek kalori/yağ riskini TAM olarak kapatamaz
- Eklenmiş şeker, USDA verisi olmasa bile malzeme adından tespit edilir
- Şeker+rafine karb birlikte daha sert ceza alır
- "Şekersiz", "tuzsuz" gibi negatif sağlık kelimeleri pozitif malzeme gibi işlenir

---

### 6.4 Besin Değeri Toplama (Aggregate)

**Dosya:** `backend/app/utils/recipe_health.py → aggregate_recipe_nutrition()`

```
1. Her RecipeIngredient için:
   a. miktar_gram varsa → kullan (yüksek güven)
   b. yoksa estimate_amount_in_grams(amount, unit) ile tahmin et
2. 100g başı besin değeri × (gram / 100) = malzeme katkısı
3. Tüm malzemeleri topla → tarif toplam
4. Toplam / serving_count = per-serving değer
5. Bazı alanlar için recipe.calorie doğrudan fallback

Güven skoru:
  ingredient_coverage × 0.5
  + conversion_confidence × 0.2
  + field_completeness × 0.3
  = 0.0 - 1.0 arası
```

---

### 6.5 Birim → Gram Dönüşümü

**Dosya:** `backend/app/services/unit_conversion_service.py`  
**Yardımcı:** `backend/app/utils/recipe_health.py → estimate_amount_in_grams()`

```python
UNIT_TO_GRAMS = {
  "g" / "gr" / "gram":  1.0 gram,  güven: 1.00
  "kg":                1000g,       güven: 1.00
  "ml":                   1g,       güven: 0.75
  "yemek kaşığı":        15g,       güven: 0.55
  "çay kaşığı":           5g,       güven: 0.55
  "su bardağı":         200g,       güven: 0.45
  "çay bardağı":        100g,       güven: 0.45
  "adet":                50g,       güven: 0.25
  "demet":               60g,       güven: 0.20
  ...
}
```

Malzeme özel dönüşümler `ingredient_unit_conversions` tablosunda saklanır.  
Tabloda bulunamazsa fallback genel tabloya gider.

---

### 6.6 Malzeme Eşleştirme (Resolver)

**Dosya:** `backend/app/services/ingredient_resolver_service.py`

Scraper'dan gelen ham malzeme adı → DB'deki `Ingredient` kaydı:

```
1. Normalize et: Türkçe karakter flatten, küçük harf, trim
2. Doğrudan isim eşleştirme (exact match)
3. Alias tablosunda ara (ingredient_aliases)
4. USDA API'ye isim bazlı arama yap (try_usda=True ise)
5. Hâlâ bulunamazsa → "manual_required" durumu
   → scraper: unmatched_ingredients tablosuna yaz
   → revizyon kaydetme: HTTP 422 döndür
```

---

### 6.7 Tarif Revizyonu (Gemini AI)

**Dosya:** `backend/app/services/recipe_revision_service.py`

```
Akış:
1. revise_recipe(recipe_id, modifications) çağrılır
2. modifications_hash hesapla (SHA256)
3. revision_cache tablosunda bak → varsa cache'den döndür
4. Gemini 2.5 Flash'a prompt gönder:
   - Orijinal tarif JSON
   - İstenen değişiklikler (ekle/çıkar/miktar/serbest metin)
   - Kural listesi (halüsinasyon yapma, min. değişiklik, vs.)
5. JSON yanıtı parse et → RevisedRecipePayload
6. Cache'e yaz (24 saat)
7. Önizleme olarak frontend'e döndür

save_revised_recipe():
1. RevisedRecipePayload al
2. create_custom_recipe() çağır (user_id ile)
3. Malzeme bulunamazsa → HTTP 422 (sessiz hata yok)
4. Başarılıysa yeni recipe_id döndür
```

---

### 6.8 Kullanıcı Tema Sistemi

**Dosya:** `frontend/src/context/AppContext.jsx`

```javascript
// localStorage key: kullanıcı bazlı
`reciMatch_theme_${userId}` = 'light' | 'dark'

// Öncelik sırası (başlangıçta):
1. Kullanıcı girişi → localStorage['reciMatch_theme_${userId}'] oku
2. Yoksa eski global key → localStorage['reciMatch_theme'] oku + sil
3. Hâlâ yoksa → 'light' (default açık tema)

// Tema değiştiğinde:
localStorage.setItem(`reciMatch_theme_${userId}`, 'light'|'dark')
body.classList.add/remove('dark-mode')

// Çıkış yapıldığında:
body.classList.remove('dark-mode')
setIsDarkMode(false)
```

**Auth sayfaları (Login, Register, ForgotPassword, vb.):**
```jsx
import { useApp } from '../context/AppContext';
const { isDarkMode } = useApp();
<div className="auth-shell" data-theme={isDarkMode ? 'dark' : 'light'}>
```

---

### 6.9 Günlük Öğün Slotu

**Dosya:** `backend/app/services/user_service.py → _resolve_daily_meal_slot()`

```python
def _resolve_daily_meal_slot(user_id, requested_meal_type, log_date, db):
    used = find_daily_log_meal_types(db, user_id, log_date)  # O gün kullanılan öğün tipleri

    if requested_meal_type not in used:
        return requested_meal_type  # İstenen müsait, direkt kullan

    # Standart sıra
    for slot in ["Kahvaltı", "Öğle Yemeği", "Akşam Yemeği", "Ara Öğün"]:
        if slot not in used:
            return slot

    # Hepsi doluysa sınırsız devam
    counter = 2
    while True:
        candidate = f"Ek Öğün {counter}"
        if candidate not in used:
            return candidate
        counter += 1
    # NOT: Artık hiçbir zaman HTTP 400 fırlatılmıyor
```

---

### 6.10 Kullanıcı İzolasyonu

**Her repository sorgusunda zorunlu:**

```python
# Tarifler
query.filter(
    (Recipe.user_id.is_(None)) | (Recipe.user_id == user_id)
)

# Malzemeler
query.filter(
    (Ingredient.user_id.is_(None)) | (Ingredient.user_id == user_id)
)
```

**Frontend'de `user_id` her zaman gönderilmeli:**
```javascript
// AppContext - tüm çağrılarda user_id var:
fetchAllRecipes:      /api/recipes?user_id=${user.id}
fetchHealthyRecipes:  /api/recipes?healthy_only=true&user_id=${user.id}
fetchRecommendedRecipes: body.user_id = user.id
```

---

### 6.11 Frontend State Yönetimi (AppContext)

**Dosya:** `frontend/src/context/AppContext.jsx`

```javascript
// Global State
user                  // { id, name, email }
profile               // { height, weight, age, daily_calorie, meals, objective... }
selectedIngredients   // Seçili malzeme ID listesi
pantryIngredients     // Dolaptaki malzeme listesi
dislikedIngredients   // Sevilmeyen malzeme ID listesi
favorites             // Favori tarif ID listesi
dailyLogs             // Günlük kayıt listesi
recipeCache           // { [recipe_id]: recipe } — API çağrısını azaltır
isDarkMode            // boolean

// Computed (dashboardData memo)
dailyCalorieTarget    // profile.daily_calorie || 2000
consumedCalories      // Bugünkü toplam kalori
macros                // { protein, carb, fat } tüketilen
macroTargets          // { protein, carb, fat } hedef
```

**recipeCache mantığı:**
```javascript
// Önce cache'e bak, varsa API çağırmaz
fetchRecipeById(id):
  if (recipeCache[id] && ingredients.length > 0) return cached
  else → API çağır → cache'e yaz

// Loglar için cache kullanımı:
addDailyLog():
  const cached = recipeCache[recipeId]
  // Eğer cache'de varsa besin değerlerini buradan al
  // Yoksa backend hesaplar (recipe.calorie × serving)
```

---

### 6.12 Besin Değeri Depolama ve Porsiyon Kuralı

```
DB'de SAKLA:   tarifin toplam besin değeri (source porsiyon sayısının tamamı)
API'de DÖNDÜR: calorie/protein/carbohydrate/fat = 1 porsiyon başı değer
API'de EKLE:   total_calorie/total_protein/total_carbohydrate/total_fat = DB'deki toplam değer
UI'da GÖSTER:  porsiyon başı değer × seçilen porsiyon
LOG'A YAZAR:   porsiyon başı değer × serving_count (backend tarafında)

yemekcom scraper:
  Kaynak "1 porsiyon için" besin değeri verir.
  save_scraped_recipe() bu değeri serving ile çarpıp DB'ye toplam tarif değeri olarak kaydeder.

Mevcut DB durumu:
  yemekcom, yemekcom_diet ve custom tariflerde macro alanları toplam tarif değeridir.
  recipe_macro_values_per_serving() tüm serving > 1 tariflerde bu toplamı porsiyon sayısına böler.

Tavuklu Pilav doğrulaması:
  Kaynak: https://yemek.com/tarif/tavuklu-pilav/
  serving=6, 1 porsiyon=336 kcal, toplam=2016 kcal
  tavuk göğsü miktarı 500 gramdır.
```

---

### 6.13 E-posta Sistemi

**Dosya:** `backend/app/utils/mailer.py`

```python
send_email(subject, recipient, body)
  → SMTP ayarları varsa gerçek gönderim
  → Yoksa sadece konsol/dosya log (backend/emails.txt)

send_verification_email(email, code)
  Konu: "Mail Doğrulama Kodu - ReciMatch"
  Renk: #10b981

send_password_reset_email(email, code)
  Konu: "Şifre Sıfırlama Kodu - ReciMatch"
  Renk: #10b981

From header: "ReciMatch <{settings.FROM_EMAIL}>"
```

OTP akışı:
```
Kayıt:
  1. /register → hash şifre → EmailVerificationCode oluştur → OTP gönder
  2. /verify   → OTP kontrol → User oluştur → Profil yoksa /setup'a yönlendir

Şifre sıfırlama:
  1. /forgot-password → OTP gönder
  2. /reset-password  → OTP kontrol → şifre güncelle
```

---

## 7. CSS Tema Sistemi

### 7.1 CSS Değişkenleri

**Dosya:** `frontend/src/index.css`

```css
:root {                                  /* Açık tema */
  --bg-main: #fbf7ef;
  --card-bg: rgba(255,253,248,0.9);
  --text-primary: #1f332d;
  --text-secondary: #66756d;
  --border-color: rgba(120,86,35,0.16);
  --primary-color: #10b981;
  --noct-accent: #4edea3;
  --noct-accent-hover: #10b981;
  --noct-dark-bg: #0c0814;
  --noct-mid-green: #006c49;
  --noct-text-primary: #d4e4fa;
  --noct-text-secondary: #bbcabf;
  --noct-border: rgba(255,255,255,0.08);
}

[data-theme="dark"], body.dark-mode {    /* Karanlık tema */
  --bg-main: #00150f;
  --card-bg: rgba(2,26,22,0.88);
  --text-primary: #d4e4fa;
  --text-secondary: #b8af9b;
  --border-color: rgba(16,185,129,0.42);
  --card-border: rgba(16,185,129,0.42);
}
```

### 7.2 Layout Yapısı

```
.layout-shell[data-theme="light|dark"]
  .sidebar
  .layout-content
    <Page Component>
```

Tema, `Layout.jsx` tarafından `data-theme` attribute ile `layout-shell`'e yazılır.

### 7.3 Açık Tema Override Standartı

Sayfalar karanlık arka plana hardcode sahipse, açık temada override gerekir:

```css
/* Her zaman bu iki selector birlikte */
.layout-shell[data-theme="light"] .sinif,
.layout-shell:not([data-theme="dark"]) .sinif {
  background: rgba(255, 255, 255, 0.88) !important;
  color: #1f332d !important;
  border-color: rgba(16, 185, 129, 0.15) !important;
}
```

### 7.4 Sayfa Özel Tema Kuralları

| Sayfa | Tema Davranışı |
|-------|---------------|
| HealthyMenu | Her zaman karanlık (`background: #050b14`) — açık tema override YAZMA |
| Pantry | `layout-content:has(.pantry-noct)` dark bg zorluyor — override şart |
| FavoritesDb | `layout-content:has(.fav-wrapper)` dark bg zorluyor — override şart |
| RecipeListDb | `layout-content:has(.recipes-noct)` dark bg zorluyor — override şart |
| Auth sayfaları | `useApp()` + `data-theme` attribute ZORUNLU |

### 7.5 Renk Referansı (Açık Tema)

| Kullanım | Renk |
|----------|------|
| Ana metin | `#1f332d` |
| İkincil metin | `#4b6358` |
| Kart arka planı | `rgba(255,255,255,0.88)` |
| Border | `rgba(16,185,129,0.15)` |
| Badge arka planı | `rgba(16,185,129,0.10)` |
| Accent / buton | `#10b981` / `#0f766e` |
| Hata metni | `#ba1a1a` |

### 7.6 HealthyMenu İçerik Renkleri (Her Zaman Dark)

```css
/* Ana metin */ color: #cfe8dc;
/* İkincil */  color: rgba(207, 232, 220, 0.56);
/* Accent */   color: var(--noct-accent-hover);  /* #10b981 */
/* Besin item */color: #cfe8dc;  /* KOYU RENK KULLANMA — sayfa dark */
/* Besin span */color: #e8f7f2;
/* Besin small */color: rgba(207,232,220,0.58);
```

---

## 8. Frontend Sayfa Rehberi

### 8.1 Auth Akışı

```
/login         → Giriş → profil doluysa /dashboard, yoksa /setup
/register      → Kayıt → OTP → /verify-email
/verify-email  → OTP doğrulama → /login
/forgot-password → OTP gönder → /reset-password
/setup         → İlk profil kurulumu (zorunlu)
```

### 8.2 Ana Akış

```
/dashboard           → Günlük özet, kalori halkası, bugünkü öğünler
/select-ingredients  → Malzeme seçimi → /recommendations
/recommendations     → Öneri listesi → /recipe/:id
/recipes             → Tüm tarifler (filtre + arama)
/recipe/:id          → Tarif detayı (malzemeler, adımlar, besin, revizyon)
/pantry              → Dolabım (owned ingredients yönetimi)
/favorites           → Favoriler
/healthy-menu        → Sağlıklı tarifler (her zaman dark, TopBar YOK)
/profile-edit        → Profil düzenleme + şifre/e-posta güncelleme
/daily-logs          → Günlük kayıtlar
/weekly-logs         → Haftalık kayıtlar
/recipe/:id/edit     → Özel tarif düzenleme
```

### 8.3 Önemli Bileşen Davranışları

**RecipeDetailDb.jsx:**
- `markAsDone()` → `addDailyLog({ recipeId: Number(recipe.id || recipe.recipe_id || id), ... })`
- Bell + AI Assistant butonları YOK
- Tarif revizyonu için `RecipeRevisionModal` kullanır

**IngredientPicker (bileşen):**
- Hem Pantry hem RecipeDetail'de kullanılır
- Kategori bazlı görünüm + arama + seçim

**AppContext.addDailyLog():**
- `recipeCache`'den tarif bilgisini okur
- Besin değerlerini multiplier ile çarpar
- Backend'e `recipe_id`, `serving_count`, `calorie_intake` gönderir

---

## 9. Scraper & Import Sistemi

### 9.1 Scraper Kaynakları

| Scraper | Kaynak | Dil | Per-serving? |
|---------|--------|-----|--------------|
| yemekcom_scraper.py | yemek.com | Türkçe | EVET (düzeltildi) |

BBC Good Food, EatingWell ve Skinnytaste scraper/import dosyaları kullanılmayan kaynaklar olduğu için temizlendi.

### 9.2 Import Çıktısı

Her scraper şu alanları döndürür:
```python
{
  "title": str,
  "description": str,
  "recipe_category": str,
  "cooking_type": str,
  "cooking_method": str,
  "total_time_minutes": int,
  "serving": int,
  "calorie": float,          # PER SERVING
  "protein": float,          # PER SERVING
  "carbohydrate": float,     # PER SERVING
  "fat": float,              # PER SERVING
  "ingredients": [...],
  "instructions": str,
  "image_url": str,
  "source_url": str,
  "source": "yemekcom|yemekcom_diet",
}
```

### 9.3 Malzeme Eşleştirme Süreci

```
Ham isim → normalize (Türkçe flatten + küçük harf)
         → exact match (DB)
         → alias match (ingredient_aliases)
         → USDA API (try_usda=True)
         → başarısız → unmatched_ingredients tablosuna yaz
```

### 9.4 Backfill Scriptleri

```bash
# Her zaman önce dry-run!
python backend/scripts/backfill_health_scores.py --dry-run
python backend/scripts/backfill_health_scores.py --apply

python backend/scripts/backfill_recipe_ingredient_grams.py --dry-run
python backend/scripts/backfill_recipe_ingredient_grams.py --apply
```

---

## 10. Geliştirme Ortamı

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev

# .env (backend kökü)
DATABASE_URL=postgresql://...
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=...
SMTP_PASSWORD=...
FROM_EMAIL=...
GEMINI_API_KEY=...
```

---

## 11. Model Seçim Kuralları (Claude Code İçin)

| Görev | Model |
|-------|-------|
| CSS ekleme, sabit metin değiştirme | `haiku` |
| Import ekle/çıkar, tek fonksiyon düzelt | `haiku` |
| JSX bileşen refactor, Python servis | `sonnet` |
| Birden fazla dosya, state yönetimi | `sonnet` |
| Algoritma tasarımı, mimari, debug | `opus` |

**Paralel çalışma:** Bağımsız CSS dosyaları için sub-agent'ları aynı anda çalıştır.  
**Çakışma önleme:** Aynı dosyayı değiştiren görevleri tek agent'ta birleştir.

---

## 12. Bilinen Teknik Kararlar

1. Health score ≠ öneri skoru (farklı algoritmalar, farklı amaçlar)
2. Tarif miktar/birim orijinal haliyle saklanır, gram ayrı `miktar_gram` alanında
3. Protein bonusu yüksek kalori/yağ riskini tamamen kapatamaz (tasarım kararı)
4. Eklenen şeker, USDA verisi olmasa bile malzeme adından tespit edilir
5. Şeker + rafine karb birlikte varsa skor daha sert ceza alır
6. `daily_logs.meal_type` unique kısıtı yok → gün içinde sınırsız kayıt mümkün
7. Revizyon cache `recipe_id + modifications_hash` ile unique → aynı değişiklik tekrar Gemini'ye gitmez
8. Frontend `recipeCache` → aynı tarif için tekrar API çağrısı yapılmaz
9. `.env` ve veritabanı dosyaları GitHub'a gönderilmez

---

---
# 13. Oturum Günlüğü
---

## [2026-05-28] Oturum 6 — 4 Bug Fix + Repo Senkronizasyon + CLAUDE.md Güncellemesi

**Model:** `claude-sonnet-4-6`

**Değiştirilen Dosyalar:**
- `backend/app/services/ingredient_resolver_service.py` — BUG 2: `ensure_nutrition_for_ingredient` son satırı `manual_required` yerine `resolved` döndürüyor; DB'de bulunan malzeme için Gemini de başarısız olsa bile tarif oluşturma bloklanmıyor
- `backend/app/services/recipe_revision_service.py` — BUG 4: `_revise_with_gemini` çıktısındaki malzemeler artık orijinal tarif + kullanıcı eklentilerine göre filtreleniyor; Gemini halüsinasyon malzemeleri kaydedilmiyor
- `frontend/src/components/AddRecipeForm.jsx` — BUG 3: Malzeme satırındaki birim alanı serbest text input → `<select>` dropdown (Gram/ml/Adet); `handleAddIngredient` varsayılan birimi 'Adet'→'Gram' olarak düzeltildi
- `frontend/src/components/AddRecipeForm.css` — `.arf-chip-select` stili eklendi
- `CLAUDE.md` — Yapılmaması gerekenler + Besin değeri resolve davranışı bölümü güncellendi

**Doğrulamalar:**
- BUG 0 (repo sync): gemini_client.py + recipe_revision_service.py zaten `from google import genai` kullanıyor ✓; requirements.txt `google-genai` ✓
- BUG 1 (tarif silme): `delete_custom_recipe` → `recipe_repository.delete_recipe` → soft delete (is_active=False) + cascade temizleme + `db.commit()` ✓; frontend `deleteCustomRecipe` doğru DELETE request ✓

**Notlar:**
- BUG 2 kök nedeni: ALTER TABLE ile eklenen kolon mevcut satırları DEFAULT 0 olarak doldurdu; global malzemeler (yumurta vb.) calorie=0 ile kaldı; Gemini çalışıyorsa otomatik doldurur; başarısız olursa artık bloklamaz
- BUG 3: unit_to_grams fonksiyonu "Gram","ml","Adet" karşılıklarına zaten sahip ✓
- BUG 4: `ascii_fold` recipe_helpers.py'den inline import edildi; filtre `(original - removed) | additions` mantığıyla çalışıyor; yapısal alternatifleri korumak istiyorsan kullanıcı `add_ingredients`'e eklemeli
- Backfill gerekiyorsa: `POST /api/ingredients/nutrition/sync-missing` body: `{"limit": 200}`

## [2026-05-18] Oturum 5 — tarif porsiyon sistemi, tüm tarif macro normalizasyonu, porsiyon UI

**Model:** `codex`

**Değiştirilen Dosyalar:**
- `backend/app/utils/recipe_health.py` — `recipe_macro_values_per_serving()` public helper haline getirildi; tüm `serving > 1` tariflerde DB'deki toplam macro değerleri porsiyon sayısına bölünerek 1 porsiyon değeri hesaplanıyor.
- `backend/app/services/recipe_service.py` — API `calorie/protein/carbohydrate/fat` alanlarını porsiyon başı döndürüyor; denetim için `total_calorie/total_protein/total_carbohydrate/total_fat` alanları eklendi.
- `backend/app/services/user_service.py` — daily log ekleme/güncelleme/toplam hesapları porsiyon başı macro helper üzerinden çalışıyor; `serving_count` ile doğru ölçekleniyor.
- `backend/app/services/recipe_import_service.py` — yemek.com kaynaklı importlarda kaynak porsiyon başı besin değerleri `serving` ile çarpılıp DB'ye toplam tarif değeri olarak kaydediliyor.
- `backend/scripts/ensure_tavuklu_pilav_chicken.py` — Tavuklu Pilav tavuk göğsü miktarı kaynakla uyumlu şekilde 500 gram olacak biçimde idempotent güncellendi.
- `frontend/src/pages/RecipeDetailDb.jsx` — porsiyon kontrolü elle yazılabilir hale getirildi; `+` / `-` butonları eklendi. Malzeme miktarı `seçilen porsiyon / tarif serving` oranıyla ölçekleniyor.
- `frontend/src/pages/RecipeDetailDb.css` — yeni porsiyon kontrolü için input ve buton stilleri eklendi.

**Tarif / Porsiyon Kararı:**
- DB macro alanları (`recipes.calorie`, `protein`, `carbohydrate`, `fat`) tarifin toplam değeridir.
- API summary/detail response içinde `calorie/protein/carbohydrate/fat` her zaman 1 porsiyon değeridir.
- API response içinde `total_*` alanları toplam tarif değerini taşır.
- UI seçili porsiyonu porsiyon başı değerle çarpar.
- Malzeme miktarları kaynak tarifin toplam porsiyon miktarıdır; detayda `ingredient.amount * (selectedServing / recipe.serving)` ile gösterilir.

**Doğrulama:**
- 424 adet `serving > 1` tarif kontrol edildi; porsiyon başı API değeri ile `DB toplam / serving` karşılaştırmasında `bad_count=0`.
- Tavuklu Pilav kaynak doğrulaması: https://yemek.com/tarif/tavuklu-pilav/ — `serving=6`, 1 porsiyon `336 kcal`, toplam `2016 kcal`, tavuk göğsü `500 g`.
- HTTP doğrulaması yeni backend üzerinde:
  - `/api/recipes/1484` → Brokoli Çorbası `serving=4`, `calorie=97`, `total_calorie=388`
  - `/api/recipes/1232` → Tavuklu Pilav `serving=6`, `calorie=336`, `total_calorie=2016`
- `npm run lint` geçti.
- `npm run build` geçti.
- Backend syntax kontrolü geçti.

**Operasyon Notu:**
- `localhost:8000` üzerinde eski backend süreci bazen eski kodu servis ediyor olabilir. Değişiklikleri uygulamada görmek için backend process tamamen kapatılıp yeniden başlatılmalı.

---

## [2026-05-18] Oturum 4 — daily_logs macro sütunları, kalite renkleri, açık tema, porsiyon

**Model:** `claude-sonnet-4-6`

**Değiştirilen Dosyalar:**
- `backend/scripts/migrate_daily_logs_macros.py` — daily_logs protein/carbohydrate/fat_intake sütunları için manuel DB düzeltme scripti
- `frontend/src/utils/recipeInsights.js` — getHealthTone: B bandı rengi teal (#14b8a6) → mavi (#2563eb/bg #dbeafe/text #1e40af), C bandı chip #f97316 → #ea580c
- `frontend/src/pages/RecipeDetailDb.css` — hero overlay gradient güçlendirildi (rgba(0,0,0,0.82)), stat-row badge arka planı rgba(0,0,0,0.5), hero içerik metni rgba(255,255,255,0.95); açık tema için recipe-quality-card p → var(--text-secondary)
- `frontend/src/pages/RecipeDetailDb.jsx` — fetchRecipeById'dan dönen data.serving ile setServingCount başlatıldı (porsiyon dropdown tarifin orijinal porsiyonuyla açılıyor)

**Notlar:**
- models.py DailyLog + user_service.py add_daily_log daha önce eklenmişti; mevcut tek PC kurulumunda DB düzeltmeleri runtime guard/script yaklaşımıyla yönetiliyor
- Overlay hardcoded siyah-transparan kullanabilir çünkü position:absolute, her zaman görsel üzerine oturuyor
- Porsiyon state useEffect içinde data yüklendikten sonra set ediliyor (normalizePortion sınırlaması korunuyor: 1-20 arası)

---

## [2026-05-09] Oturum 3 — HealthyMenu, Pantry, Favorites, Log Hatası

**Model:** `claude-haiku` (CSS) + `claude-sonnet` (backend/JSX)

**Değiştirilen Dosyalar:**
- `frontend/src/pages/HealthyMenu.jsx` — TopBar bileşeni ve render çağrısı tamamen silindi
- `frontend/src/pages/HealthyMenu.css` — Kart içerik renkleri dark-bg uyumlu (#e8f7f2, #cfe8dc)
- `frontend/src/pages/Pantry.css` — pantry-title-row span açık temada okunabilir renk (#0f766e)
- `frontend/src/pages/FavoritesDb.css` — Kapsamlı açık tema: kart, metrik, arama, filtre, butonlar
- `backend/app/services/user_service.py` — _resolve_daily_meal_slot sınırsız öğün (Ek Öğün 2/3...); IntegrityError mesajı güncellendi
- `frontend/src/pages/RecipeDetailDb.jsx` — markAsDone recipeId doğrulama ve alert mesajı güncellendi

**Notlar:**
- HealthyMenu her zaman dark (#050b14) — açık tema override gereksiz, kart renkleri de dark arka plan için açık tutulmalı
- Pantry span: karanlık temada rgba(28,43,60,0.64) dark bg korundu, açık temada rgba(16,185,129,0.12) override eklendi
- Günlük kayıt hatası: _resolve_daily_meal_slot'ta raise HTTPException kaldırıldı, artık sonsuz Ek Öğün slotu açılıyor
- Push: 67a669c → f132626

---

## [2026-05-09] Oturum 2 — UI Hataları & Öğün Sınırı & AGENT.md Yeniden Tasarım

**Model:** `claude-sonnet-4-6`

**Değiştirilen Dosyalar:**

`frontend/src/pages/HealthyMenu.jsx`
- `TopBar` bileşeni + `<TopBar />` render tamamen kaldırıldı
- `healthy-topbar` CSS sınıfı artık kullanılmıyor

`frontend/src/pages/HealthyMenu.css`
- `.healthy-card-nutrition` ve `.healthy-nutrition-item` renkleri dark-bg uyumlu yapıldı
- Hata: `color: #1f332d` (koyu) → karanlık sayfada görünmüyordu
- Düzeltme: `#cfe8dc`, `#e8f7f2`, `rgba(207,232,220,0.58)` — sayfa her zaman dark

`frontend/src/pages/Pantry.css`
- `.pantry-title-row span` açık temada koyu gri arka plan kaldırıldı
- Açık tema: `rgba(16,185,129,0.12)` bg, `#0f766e` metin
- `layout-content:has(.pantry-noct)` açık temada düzgün arka plan

`frontend/src/pages/FavoritesDb.css`
- Kapsamlı açık tema: `fav-card`, `fav-metric`, `fav-search-input`, `fav-filter-btn`, `fav-badge-type`, `fav-btn-remove`

`backend/app/services/user_service.py`
- `_resolve_daily_meal_slot()` yeniden yazıldı
- Önce: 3 öğün dolunca HTTP 400
- Sonra: Ara Öğün → Ek Öğün 2/3/... sınırsız

**Teknik Notlar:**
- HealthyMenu'de açık tema override yazmak gerekmez — sayfa her zaman dark (`background: #050b14 !important`)
- Pantry/Favorites `layout-content:has()` dark bg zorluyor, her ikisinde açık tema override şart
- Öğün kayıt sınırı model seviyesinde değil, servis seviyesindeydi — kaldırıldı

---

## [2026-05-09] Oturum 1 — 17 Maddelik Düzeltme

**Model:** `claude-sonnet-4-6`

**Backend:** `mailer.py` (ReciMatch), `yemekcom_scraper.py` (per-serving), `recipe_revision_service.py` (HTTP 422)

**AppContext:** Per-user tema, default açık, `fetchHealthyRecipes` user_id

**JSX:** `Register.jsx` (data-theme), `Dashboard.jsx` (header kaldır), `RecipeDetailDb.jsx` (Bell+AI kaldır, markAsDone), `HealthyMenu.jsx` (Bell+AI kaldır, nutrition card)

**CSS:** `Login`, `Pantry`, `RecipeListDb`, `FavoritesDb`, `ProfileEdit`, `IngredientSelection`, `Recommendations`, `RecipeDetailDb`, `HealthyMenu` — açık tema override'ları

| Issue | Durum |
|-------|-------|
| 1-17 tümü | ✅ Oturum 1 |
| 18 Pantry span | ✅ Oturum 2 |
| 19 Favs kapsamlı | ✅ Oturum 2 |
| 20 Öğün kayıt hatası | ✅ Oturum 2 |
