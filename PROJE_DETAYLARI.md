# Akilli Tarif ve Beslenme Sistemi - Teknik Proje Ozeti

Bu dokuman, projeyi baska bir AI asistani veya gelistirici hizlica anlayabilsin diye guncel teknik durumu aciklar. Proje; malzemeye gore tarif onerisi, kullanici profili, gunluk kalori takibi, tarif detaylari ve makro/malzeme bazli saglik derecelendirmesi iceren React + FastAPI + PostgreSQL uygulamasidir.

---

## 1. Genel Amac

Uygulama kullanicinin elindeki malzemelere, kiler/dolap listesine, sevmedigi malzemelere ve beslenme profiline gore tarif onerir. Tarifler detay ekraninda malzeme listesi, hazirlanis, besin degerleri ve `A/B/C/D` kalite bilgisiyle gosterilir.

Temel hedefler:

- Malzeme secimine gore tarif onerisi uretmek.
- Kullanicinin gunluk kalori ve makro takibini yapmak.
- Tarifleri kalori, makro denge ve malzeme risklerine gore yaklasik saglik derecesine ayirmak.
- Orijinal tarif verisini kaybetmeden olcu birimlerini gram cinsine normalize edebilmek.
- Frontend tarafinda acik/koyu tema, tarif listeleri, detay sayfalari ve kiler yonetimini saglamak.

Bu sistem tibbi teshis veya kesin diyet onerisi degildir. Health score yalnizca tarifleri yaklasik olarak siniflandirmak icindir.

---

## 2. Proje Takvimi ve Mevcut Durum

Proje su an 12 haftalik genisletilmis takvime gore ilerlemektedir. Eski plan daha kisa sureliydi; sure uzadigi icin proje artik 12 haftalik teslim akisiyle degerlendirilmelidir.

Guncel durum:

- Toplam proje suresi: 12 hafta
- Bulunulan hafta: 10. hafta
- Kalan sure: 2 hafta
- 10. hafta odagi: gram donusumu, health score algoritmasi, tarif detay dogrulugu, frontend kalite gosterimi ve dokumantasyon stabilizasyonu
- 11. hafta odagi: sistem testi, hata duzeltmeleri, backfill sonuclari, UI/UX son kontrolleri ve rapor/tez icerigi
- 12. hafta odagi: final demo, sunum hazirligi, kurulum adimlari, son veri dogrulamasi ve teslim paketi

### 2.1 12 Haftalik Genel Plan

```text
1. hafta  -> Proje konusu, kapsam ve temel gereksinimler
2. hafta  -> Veritabani tasarimi, temel backend mimarisi
3. hafta  -> FastAPI endpointleri, auth ve kullanici modeli
4. hafta  -> React frontend iskeleti, routing ve temel sayfalar
5. hafta  -> Tarif listeleme, detay sayfasi ve malzeme secimi
6. hafta  -> Kullanici profili, kalori hedefi ve gunluk log sistemi
7. hafta  -> Kiler/dolap sistemi ve tarif onerisi algoritmasi
8. hafta  -> USDA/ingredient nutrition entegrasyonu ve veri eslestirme
9. hafta  -> Olcu birimi normalizasyonu, gram donusumu ve backfill altyapisi
10. hafta -> Health score revizyonu, malzeme risk analizi, frontend kalite gosterimi
11. hafta -> Entegrasyon testleri, hata duzeltmeleri, performans ve dokumantasyon
12. hafta -> Final demo, sunum, rapor tamamlama ve teslim
```

### 2.2 10. Hafta Sonu Teknik Durum

10. hafta itibariyla sistemin ana islevleri calisir durumdadir:

- Tarif onerisi, tarif detaylari ve kullanici profili akisi mevcut.
- `recipe_ingredients` icin gram normalizasyon sistemi eklendi.
- Orijinal `miktar` ve `birim` alanlari korunuyor; gram sonucu `miktar_gram` alanina yaziliyor.
- Health score sistemi sadece makro degil, malzeme bazli seker/rafine karbonhidrat/yag risklerini de hesaba katiyor.
- `health_score`, `health_grade` ve `health_explanation` alanlari backend ve frontend akisi icinde kullaniliyor.
- Frontend detay ekraninda kalite bilgisi gosteriliyor.
- Tavuk Pilav, Ali Nazik, Balli Tarcinli Elma Cipsi ve Sutlac testleriyle algoritma kalibre edildi.

11. ve 12. haftalarda yeni buyuk ozellik eklemek yerine stabilizasyon, test, raporlama ve demo hazirligi onceliklidir.

---

## 3. Teknoloji Stack

Backend:

- Python
- FastAPI
- SQLAlchemy ORM
- PostgreSQL
- Bcrypt ile sifre hashleme
- SMTP tabanli OTP/e-posta dogrulama

Frontend:

- React
- Vite
- React Router
- React Context API (`frontend/src/context/AppContext.jsx`)
- CSS tabanli tema ve layout sistemi
- `lucide-react` ikonlari

Veri/yardimci scriptler:

- Alembic-style migration dosyalari: `backend/alembic/versions/`
- Backfill scriptleri: `backend/scripts/`
- USDA nutrition destek tablolari ve import servisleri

---

## 4. Ana Klasorler

```text
backend/
  app/
    db/
      database.py
      models.py
    routers/
      auth.py
      ingredients.py
      recipes.py
      users.py
    services/
      recipe_service.py
      ingredient_service.py
      unit_conversion_service.py
      ingredient_nutrition_service.py
      ...
    utils/
      recipe_health.py
      helpers.py
      mailer.py
  alembic/versions/
  scripts/
    backfill_recipe_ingredient_grams.py
    backfill_health_scores.py

frontend/
  src/
    context/AppContext.jsx
    pages/
      Dashboard.jsx
      IngredientSelection.jsx
      Recommendations.jsx
      RecipeDetailDb.jsx
      RecipeListDb.jsx
      ...
    components/
      IngredientPicker.jsx
      IngredientPicker.css
      Layout.jsx
    utils/
      recipeInsights.js
```

---

## 5. Veritabani Semasi

### 5.1 users

Kullanici hesabi ve profil bilgileri.

Onemli alanlar:

- `user_id`
- `name_surname`
- `email`
- `password_hash`
- `age`
- `gender`
- `height_cm`
- `weight_kg`
- `objective`
- `activity`
- `meals`
- `daily_calorie`
- `is_verified`

### 5.2 ingredients

Global veya kullaniciya ozel malzemeler.

Onemli alanlar:

- `ingredient_id`
- `ingredient_name`
- `category`
- `category_id`
- `user_id`

### 5.3 ingredient_categories

Malzeme kategorileri.

Onemli alanlar:

- `category_id`
- `category_name`

### 5.4 recipes

Tarif ana kaydi.

Onemli alanlar:

- `recipe_id`
- `recipe_name`
- `recipe_category`
- `explanation`
- `preparation`
- `cooking_type`
- `cooking_method`
- `total_time_minutes`
- `serving`
- `calorie`
- `protein`
- `carbohydrate`
- `fat`
- `health_score`
- `health_grade`
- `health_explanation`
- `image_url`
- `source`
- `source_url`
- `user_id`

Not: `health_score`, `health_grade`, `health_explanation` alanlari sonradan eklendi. Migration: `backend/alembic/versions/20260427_02_add_recipe_health_score_fields.py`.

### 5.5 recipe_ingredients

Tarif-malzemeler many-to-many iliskisi.

Orijinal tarif verisi:

- `recipe_ingredient_id`
- `recipe_id`
- `ingredient_id`
- `amount`
- `unit`

Gram normalize alanlari:

- `miktar_gram`
- `donusum_kaynagi`
- `donusum_guveni`
- `donusum_notu`

Kritik not: `amount` ve `unit` orijinal tarif verisi olarak kalir. Bunlar silinmez, ezilmez, dogrudan grama cevrilmez. Gram karsiligi varsa `miktar_gram` alanina yazilir.

Migration: `backend/alembic/versions/20260427_01_add_recipe_ingredient_gram_conversions.py`.

### 5.6 ingredient_unit_conversions

Malzeme ve birim bazli gram/ml/density donusum tablosu.

Alanlar:

- `conversion_id`
- `ingredient_id`
- `unit_key`
- `unit_aliases`
- `grams_per_unit`
- `ml_per_unit`
- `density_g_per_ml`
- `source`
- `confidence`
- `note`

Bu tablo, `recipe_ingredients.miktar_gram` backfill islemi icin kullanilir.

### 5.7 ingredient_nutrition_values

USDA veya baska kaynaklardan gelen 100 gram bazli nutrition bilgileri.

Onemli alanlar:

- `ingredient_id`
- `calories_per_100g`
- `protein_per_100g`
- `carbs_per_100g`
- `fat_per_100g`
- `saturated_fat_per_100g`
- `fiber_per_100g`
- `sugar_per_100g`
- `sodium_mg_per_100g`
- `confidence_score`

Health score su an esas olarak recipe makrolari ve malzeme riskleriyle hesaplanir. Ingredient nutrition gelecekte daha detayli hesap icin destek verisi olarak kullanilabilir.

### 5.8 Iliski ve Kullanici Tablolari

- `owned_ingredients`: Kullanici dolabi/kileri.
- `disliked_ingredients`: Kullanici sevilmeyen malzemeleri.
- `favorites`: Favori tarifler.
- `daily_logs`: Gunluk/haftalik yemek kayitlari.
- `email_verification_codes`: Kayit, dogrulama, sifre/e-posta islemleri icin OTP kodlari.
- `ingredient_aliases`: Malzeme alias eslestirmeleri.
- `unmatched_ingredients`: Import sirasinda eslesmeyen malzemeler.
- `healthy_recipes`: Fit/saglikli tarif secimleri icin yardimci tablo.

---

## 6. Olcu Birimi ve Gram Donusum Sistemi

Dosya: `backend/app/services/unit_conversion_service.py`

Amac: Tariflerdeki `amount` + `unit` bilgisinden, orijinal veriyi bozmadan `miktar_gram` hesaplamak.

### 6.1 Unit normalizer

Birimler Turkce karakter, buyuk/kucuk harf, nokta, fazla bosluk, typo ve kisaltmalardan arindirilir.

Ornek aliaslar:

```text
yemek kasigi, yemek kasigi varyantlari, y.k., yk, tbsp, tablespoon -> tablespoon
tatli kasigi, t.k., tk, dessert spoon -> dessert_spoon
cay kasigi, tsp, teaspoon -> teaspoon
su bardagi, bardak, cup -> cup
cay bardagi -> tea_glass
adet, tane -> piece
gram, gr, g -> gram
kilogram, kg -> kilogram
ml, mililitre -> ml
litre, l -> liter
tutam, biraz, goz karari -> uncertain
```

### 6.2 Profil destekleri

Volume profile secilebilir:

```text
yemek_com_profile:
  tablespoon=15 ml
  dessert_spoon=5 ml
  teaspoon=5 ml
  cup=200 ml

tr_200ml_profile:
  tablespoon=10 ml
  dessert_spoon=5 ml
  teaspoon=5 ml
  cup=200 ml

us_fda_profile:
  tablespoon=15 ml
  teaspoon=5 ml
  cup=240 ml
```

### 6.3 Seed conversion ornekleri

Ornek gram karsiliklari:

```text
su: cup=200 g, tablespoon=15 g
sut: yaklasik 1 ml = 1 g
zeytinyagi/sivi yag: tablespoon=13.5 g, teaspoon=4.5 g
un: tablespoon=9 g, cup=130 g
toz seker: tablespoon=13 g, cup=200 g
yogurt: tablespoon=15 g, cup=230 g
bal/pekmez: tablespoon=20 g
pirinc: cup=190 g
bulgur: cup=170 g
yumurta: piece=50 g
domates: piece=115 g
sogan: piece=100 g
patates: piece=150 g
tereyagi: tablespoon=14 g
tuz: teaspoon/dessert_spoon=6 g
karabiber: teaspoon=2.3 g
```

### 6.4 Gram backfill script

Dosya:

```text
backend/scripts/backfill_recipe_ingredient_grams.py
```

Komutlar:

```bash
python backend/scripts/backfill_recipe_ingredient_grams.py --dry-run
python backend/scripts/backfill_recipe_ingredient_grams.py --apply
```

Opsiyonel:

```bash
--unit-profile yemek_com_profile
--unit-profile tr_200ml_profile
--unit-profile us_fda_profile
--cup-ml 200
--cup-ml 240
```

Rapor:

- Toplam recipe_ingredients kaydi
- Grama cevrilen kayit sayisi
- High/medium/low confidence sayilari
- Donusturulemeyen kayit sayisi
- En cok donusturulemeyen birimler

`--apply` olmadan recipe_ingredients satirlari kalici guncellenmez.

---

## 7. Health Score Sistemi

Ana dosya:

```text
backend/app/utils/recipe_health.py
```

Frontend yardimci:

```text
frontend/src/utils/recipeInsights.js
```

### 7.1 Derecelendirme

```text
80-100 -> A
60-79  -> B
50-59  -> C
0-49   -> D
```

Frontend renkleri:

```text
A -> yesil
B -> turkuaz/acik yesil
C -> sari/turuncu
D -> kirmizi
```

### 7.2 Makro tabanli temel skor

Reusable fonksiyon:

```python
calculate_health_score(
    calories,
    protein,
    carbs,
    fat,
    recipe_name=None,
    category=None,
    servings=1,
    values_are_per_serving=True,
)
```

Eger `values_are_per_serving=False` verilirse `calories/protein/carbs/fat`, `servings` degerine bolunur. Normal API akisinda recipe makrolari genelde porsiyon basina cozumlenmis kaynak olarak kullanilir.

Makro kalorileri:

```text
protein_kcal = protein * 4
carb_kcal = carbs * 4
fat_kcal = fat * 9
macro_total = protein_kcal + carb_kcal + fat_kcal
```

Yuzdeler:

```text
protein_pct = protein_kcal / macro_total * 100
carb_pct = carb_kcal / macro_total * 100
fat_pct = fat_kcal / macro_total * 100
```

Alt skorlar:

```text
calorie_score  weight 0.30
protein_score  weight 0.25
fat_score      weight 0.25
carb_score     weight 0.10
balance_score  weight 0.10
```

Final makro skoru:

```text
raw_score =
  calorie_score * 0.30 +
  protein_score * 0.25 +
  fat_score * 0.25 +
  carb_score * 0.10 +
  balance_score * 0.10
```

Protein tek basina yuksek kalori ve yuksek yag cezasini telafi edemez. Bu nedenle hard cap kurallari vardir.

### 7.3 Makro hard cap kurallari

Ornekler:

```text
calories >= 1000 -> max 59
fat >= 70 -> max 59
fat_pct >= 55 -> max 59
calories >= 1000 and fat_pct >= 55 -> max 55
calories >= 1000 and fat >= 70 -> max 55
calories >= 850 and fat >= 50 -> max 65
```

Ali Nazik gibi 1156 kcal, 76 g protein, 80 g yag olan tarifler protein yuksek olsa bile B olamaz. Beklenen skor C bandidir.

### 7.4 Malzeme bazli risk katmani

Yeni sistem sadece makroya bakmaz. `build_recipe_health_profile(recipe)` icinde once makro skor hesaplanir, sonra `recipe_ingredients` uzerinden malzeme riskleri uygulanir.

Riskler:

- Eklenmis seker
- Rafine karbonhidrat
- Yuksek yag / krema / tereyagi gibi riskli icerikler
- Kizartma sinyalleri

Bonuslar:

- Sebze
- Bakliyat
- Yogurt
- Yagsiz protein
- Tam tahil
- Yulaf
- Bulgur

Bonus toplami en fazla 12 puandir ve asiri seker/yag cezasini kapatamaz.

### 7.5 Eklenmis seker tespiti

USDA eslesmesi olmasa bile su malzemeler added sugar sayilir:

```text
seker
toz seker
pudra sekeri
esmer seker
bal
pekmez
recel
surup
glikoz
fruktoz
misir surubu
agave
maple syrup
```

Seker gram donusumleri:

```text
1 su bardagi seker = 200 g
1 yemek kasigi seker = 13 g
1 tatli kasigi seker = 8 g
1 cay kasigi seker = 4 g
```

Bal/pekmez/recel/surup:

```text
bal: added_sugar = gram * 0.82
pekmez: gram * 0.60
recel: gram * 0.60
surup: gram * 0.70
```

Eklenmis seker cezasi:

```text
added_sugar_per_serving >= 50 -> +35 penalty
>= 35 -> +28
>= 25 -> +22
>= 15 -> +14
>= 10 -> +8
>= 5  -> +4
```

Eklenmis seker cap:

```text
>= 50 g -> max 49
>= 35 g -> max 54
>= 25 g -> max 59
>= 15 g -> max 69
>= 10 g -> max 79
```

### 7.6 Rafine karbonhidrat tespiti

Kaynaklar:

```text
pirinc
beyaz pirinc
nisasta
beyaz un
un
makarna
yufka
milfoy
irmik
galeta unu
```

Ceza:

```text
refined_carb_per_serving >= 80 -> +12 penalty
>= 50 -> +8
>= 30 -> +5
```

Eklenmis seker ve rafine karbonhidrat birlikte yuksekse:

```text
added_sugar_per_serving >= 15 and refined_carb_per_serving >= 30:
  +6 penalty
  max_score <= 59
```

### 7.7 SUTLAC test senaryosu

Sutlac malzemeleri:

```text
1 litre sut
1 su bardagi seker
1/2 su bardagi pirinc
2 yemek kasigi nisasta
tarcin
porsiyon: 6
```

Hesap:

```text
1 su bardagi seker = 200 g
added_sugar_per_serving = 200 / 6 = 33.33 g
```

Beklenen:

```text
score <= 59
grade = C
```

Guncel test sonucu:

```text
health_score = 54
health_grade = C
added_sugar_per_serving = 33.33
refined_carb_per_serving = 20.83
ingredient_penalty = 22
```

Aciklama:

```text
Bu tarif porsiyon basina yuksek miktarda eklenmis seker ve rafine karbonhidrat icerdigi icin saglik skoru dusurulmustur.
```

### 7.8 Health score testleri

Guncel beklenen testler:

```text
Tavuk Pilav:
  calories=504, protein=36, carbs=63, fat=12
  score ~= 79
  grade = B

Ali Nazik:
  calories=1156, protein=76, carbs=32, fat=80
  score ~= 54
  grade = C

Balli Tarcinli Elma Cipsi:
  calories=98, protein=0, carbs=24, fat=0, category=snack
  score ~= 72
  grade = B

Sutlac:
  1 su bardagi seker / 6 porsiyon
  score ~= 54
  grade = C
```

### 7.9 Health score backfill

Dosya:

```text
backend/scripts/backfill_health_scores.py
```

Komutlar:

```bash
python backend/scripts/backfill_health_scores.py --dry-run
python backend/scripts/backfill_health_scores.py --apply
```

Script:

- Tum recipes kayitlarini okur.
- Ilgili recipe_ingredients ve ingredients kayitlarini eager load eder.
- `build_recipe_health_profile(recipe)` ile skor hesaplar.
- `health_score`, `health_grade`, `health_explanation` alanlarini update eder.
- Dry-run modunda DB’ye kalici skor yazmaz.

Son dry-run dagilimi:

```text
Toplam tarif: 467
A: 73 (%15.6)
B: 178 (%38.1)
C: 152 (%32.5)
D: 64 (%13.7)
Hard cap uygulanan: 197
```

Bu dagilim hedefe yakindir. Tariflerin buyuk kismi A/B’ye yigilmiyor.

---

## 8. Tarif Oneri Algoritmasi

Endpoint:

```text
POST /api/recipes/recommendations
```

Dosya:

```text
backend/app/services/recipe_service.py
```

Girdi:

- `selected_ingredient_ids`
- `pantry_ingredient_ids`
- `disliked_ingredient_ids`
- `cooking_types`
- `exclude_disliked`
- `user_id`
- `source`
- `healthy_only`

Mantik:

- Kullanici secili malzemeleri ve dolap malzemeleri birlestirilir.
- Tarif malzemeleri normalize edilmis ingredient key’leriyle karsilastirilir.
- Secili malzeme eslesmeleri daha yuksek agirlik alir.
- Dolap malzemesi eslesmeleri ek puan alir.
- Eksik malzemeler reason alaninda gosterilir.
- Sevilmeyen malzemeler filtrelenebilir veya cezalandirilabilir.
- Sonuc `score` alanina gore siralanir.

Oneri skoru health score’dan farklidir:

- `score`: Kullanicinin elindeki malzemelerle tarif uyumu.
- `health_score`: Tarifin makro/malzeme bazli kalite puani.

---

## 9. Backend API

Temel endpointler:

```text
POST /api/register
POST /api/verify
POST /api/login
GET  /api/ingredients/categorized
GET  /api/recipes
GET  /api/recipes/{recipe_id}
POST /api/recipes/recommendations
POST /api/recipes/custom
GET  /api/users/{id}/profile
PUT  /api/users/{id}/profile
GET  /api/users/{id}/ingredients
POST /api/users/{id}/ingredients
GET  /api/users/{id}/disliked-ingredients
POST /api/users/{id}/disliked-ingredients
GET  /api/users/{id}/favorites
POST /api/users/{id}/favorites/{recipe_id}
DELETE /api/users/{id}/favorites/{recipe_id}
GET  /api/users/{id}/daily-logs
POST /api/users/{id}/daily-logs
PUT  /api/users/{id}/daily-logs/{log_id}
DELETE /api/users/{id}/daily-logs/{log_id}
```

Tarif response’lari `serialize_recipe_summary` ve `serialize_recipe_detail` ile uretilir. Health alanlari bu serialization sirasinda `build_recipe_health_profile(recipe)` ile hesaplanir.

---

## 10. Frontend Mimari Notlari

### 10.1 AppContext

Dosya:

```text
frontend/src/context/AppContext.jsx
```

Gorevleri:

- Kullanici ve profil state’i
- Dark/light tema state’i
- Malzeme secimleri
- Dolap/kiler malzemeleri
- Favoriler
- Gunluk loglar
- Tarif cache’i
- API helper fonksiyonlari

Onemli duzeltme:

`fetchRecipeById(id)` cache’de tarif varsa ama `ingredients` bos ise detay endpoint’ini tekrar cagirir. Aksi halde liste ekranindan gelen malzemesiz ozet tarif detayda malzemeleri gizleyebilir.

### 10.2 Tarif detay ekrani

Dosya:

```text
frontend/src/pages/RecipeDetailDb.jsx
```

Gosterilenler:

- Tarif adi
- Gorsel
- Aciklama
- Hazirlanis adimlari
- Malzeme listesi
- Porsiyon ayari
- Kalori/protein/karbonhidrat/yag
- Health grade / kalite
- Nutrition confidence uyarisi

### 10.3 Health grade UI

Dosya:

```text
frontend/src/utils/recipeInsights.js
```

Eşikler:

```text
score >= 80 -> A kalite
score >= 60 -> B kalite
score >= 50 -> C kalite
else -> D kalite
```

Renkler:

```text
A -> yesil
B -> turkuaz
C -> turuncu
D -> kirmizi
```

### 10.4 Tema duzeltmeleri

Yapilan son UI duzeltmeleri:

- Login ekrani global dark mode’dan bagimsiz acik tema degiskenleriyle sabitlendi.
- Malzeme secim ekranindaki arama inputu dark mode’da okunur hale getirildi.
- Tarif detay cache sorunu cozuldu; malzemeler backend detay response’undan dogru gelir.

Ilgili dosyalar:

```text
frontend/src/index.css
frontend/src/components/IngredientPicker.css
frontend/src/context/AppContext.jsx
```

---

## 11. Gunluk Log ve Dashboard

Dashboard kullanicinin gunluk hedeflerini ve tuketimini gosterir.

Kalori hedefi:

- Kullanici profiline gore hesaplanir.
- `daily_calorie` alaninda tutulur.
- Makro hedefleri frontend’de yaklasik hesaplanir:
  - protein: kalorinin %25’i / 4
  - karbonhidrat: kalorinin %45’i / 4
  - yag: kalorinin %30’u / 9

Gunluk loglar:

- `daily_logs` tablosunda saklanir.
- Tarifin kalorisi ve serving multiplier bilgisiyle toplam tuketim hesaplanir.
- Haftalik ve gunluk log ayrimi `entry_source` ile desteklenir.

---

## 12. Migration ve Backfill Notlari

Migration dosyalari:

```text
backend/alembic/versions/20260424_01_add_usda_nutrition_tables.py
backend/alembic/versions/20260426_01_add_ingredient_aliases_and_unmatched.py
backend/alembic/versions/20260427_01_add_recipe_ingredient_gram_conversions.py
backend/alembic/versions/20260427_02_add_recipe_health_score_fields.py
```

Not:

Projede `backend/alembic/versions` klasoru var ancak tam Alembic scaffold her ortamda bulunmayabilir. Scriptler kritik kolonlari `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` ile de guvenli sekilde olusturur.

Backfill scriptleri:

```bash
python backend/scripts/backfill_recipe_ingredient_grams.py --dry-run
python backend/scripts/backfill_recipe_ingredient_grams.py --apply

python backend/scripts/backfill_health_scores.py --dry-run
python backend/scripts/backfill_health_scores.py --apply
```

`--apply` oncesi PostgreSQL backup alinmasi onerilir.

---

## 13. Bilinen Teknik Kararlar

- Orijinal tarif miktar/birim verisi korunur.
- Gram normalize sonucu ayri alanlara yazilir.
- Health score deterministik olmalidir: ayni tarif ayni veriyle ayni skoru uretmelidir.
- Protein bonusu yuksek kalori/yuksek yag risklerini tamamen kapatamaz.
- Eklenmis seker USDA nutrition verisi olmasa bile malzeme adindan yakalanir.
- Health score ve tarif onerisi uyum skoru farkli kavramlardir.
- Frontend cache, detay malzemelerini gizlememelidir; cache’de ingredients yoksa detay endpoint’i tekrar cagrilir.

---

## 14. AI Asistani Icin Hizli Kontrol Listesi

Yeni bir AI bu projede calisirken:

1. Once `backend/app/db/models.py` dosyasindaki gercek model alanlarini oku.
2. Health score degistirilecekse `backend/app/utils/recipe_health.py` ana kaynaktir.
3. Gram donusum degistirilecekse `backend/app/services/unit_conversion_service.py` ana kaynaktir.
4. Tarif response’lari icin `backend/app/services/recipe_service.py` incelenmelidir.
5. Frontend API/cache davranisi icin `frontend/src/context/AppContext.jsx` incelenmelidir.
6. Health grade renk/esik UI icin `frontend/src/utils/recipeInsights.js` incelenmelidir.
7. DB’ye kalici yazmadan once backfill scriptleri mutlaka `--dry-run` ile calistirilmalidir.
8. `amount` ve `unit` alanlari orijinal veri olarak korunmalidir.
9. Sekerli tarif testinde Sutlac C bandinda kalmalidir.
10. Ali Nazik gibi cok kalorili/cok yagli tarifler protein yuksek diye B olmamalidir.

---

## 15. Son Dogrulama Sonuclari

Ornek health score testleri:

```text
Tavuk Pilav -> 79 / B
Ali Nazik -> 54 / C
Balli Tarcinli Elma Cipsi -> 72 / B
Sutlac -> 54 / C
```

Son health backfill dry-run dagilimi:

```text
Toplam tarif: 467
A: 73 (%15.6)
B: 178 (%38.1)
C: 152 (%32.5)
D: 64 (%13.7)
Hard cap uygulanan: 197
```

Bu dagilim, butun tariflerin A/B’ye yigilmasini engeller ve daha dengeli bir siniflandirma saglar.

---

## 16. Kisa Ozet

Bu proje, malzeme bazli tarif onerisi ve beslenme takibi yapan bir FastAPI + React uygulamasidir. Proje su an 12 haftalik genisletilmis takvimin 10. haftasindadir. Son guncellemelerle sistem; olcu birimlerini gram cinsine normalize edebilir, tarifleri makro ve malzeme risklerine gore `A/B/C/D` kaliteyle siniflandirabilir, sekerli/rafine karbonhidratli tarifleri fazla iyi puanlamaz ve frontend detay ekraninda bu bilgileri gosterebilir. Kalan 2 haftada ana odak yeni buyuk ozelliklerden cok test, stabilizasyon, raporlama, demo ve teslim hazirligidir.
