# Reci Match - Teknik Proje Detaylari

Bu dokuman, Reci Match projesinde gelistirilen tum ana modulleri, teknik kararlari ve mevcut uygulama durumunu toplu olarak aciklar. Amaci; projeyi inceleyen bir gelistiricinin, danismanin veya yeni bir AI asistaninin sistemi haftalik is planina bagli kalmadan dogrudan teknik urun olarak anlayabilmesidir.

Proje; kullanicinin profil bilgileri, beslenme hedefleri, sevdigi/sevmedigi malzemeler, kilerindeki urunler ve tarif verileri uzerinden tarif onerisi yapan full-stack bir web uygulamasidir. Backend FastAPI, frontend React/Vite, veri katmani SQLAlchemy tabanlidir.

GitHub reposu:

```text
https://github.com/yavuzorhan/Reci_Match.git
```

---

## 1. Projenin Amaci

Reci Match, kullanicinin elindeki malzemelere ve beslenme profiline gore uygun tarifler oneren, tariflerin kalori ve makro degerlerini gosteren, gunluk/haftalik beslenme takibini destekleyen bir akilli tarif ve beslenme uygulamasidir.

Ana hedefler:

- Kullanicinin sectigi malzemelere gore tarif onermek.
- Kiler/dolap malzemelerini onerilerde dikkate almak.
- Kullanicinin sevmedigi malzemeleri tarif seciminden cikarmak veya cezalandirmak.
- Kullanici profiline gore gunluk kalori hedefi olusturmak.
- Gunluk ve haftalik beslenme kayitlarini takip etmek.
- Tarif detaylarinda kalori, protein, karbonhidrat, yag ve kalite bilgisini gostermek.
- Tarifleri makro degerler ve malzeme riskleriyle A/B/C/D kalite seviyesine ayirmak.
- Tarif miktar ve birimlerini orijinal haliyle koruyup gram karsiliklarini ayri alanda hesaplamak.
- USDA ve manuel nutrition verileriyle malzeme besin degeri altyapisini desteklemek.

Bu sistem tibbi teshis, tedavi veya kesin diyet onerisi amaciyla tasarlanmamistir. Health score ve kalite siniflandirmasi, tarifleri yaklasik olarak karsilastirmak icin kullanilir.

---

## 2. Mevcut Urun Durumu

Proje artik haftalik plan dokumani degil, calisan bir uygulama ozeti olarak ele alinmalidir. Gelistirilen ana kisimlar:

- Backend API iskeleti kuruldu.
- Kullanici kaydi, giris, e-posta dogrulama ve sifre sifirlama akislari eklendi.
- Kullanici profil bilgileri ve kalori hedefi altyapisi olusturuldu.
- Malzeme, kategori, kiler, sevilmeyen malzeme ve favori tarif yapilari gelistirildi.
- Tarif listeleme, detay ve oneriler endpointleri olusturuldu.
- Tarif import/scraper scriptleri eklendi.
- USDA tabanli malzeme besin degeri import ve eslestirme altyapisi gelistirildi.
- Malzeme alias, unmatched ingredient ve canonical ingredient eslestirme yapilari kuruldu.
- Tarif malzemeleri icin gram donusum sistemi eklendi.
- Health score algoritmasi makro ve malzeme risklerine gore genisletildi.
- React frontend tarafinda sayfalar, routing, context state yonetimi ve tema sistemi kuruldu.
- Dashboard, profil, tarif listesi, tarif detayi, favoriler, kiler, sevilmeyen malzemeler, gunluk/haftalik log ekranlari eklendi.
- Git repo hazirlandi, gereksiz dosyalar `.gitignore` ile dislandi ve proje GitHub'a push edildi.

---

## 3. Teknoloji Stack

Backend:

- Python
- FastAPI
- SQLAlchemy ORM
- Pydantic schema yapisi
- PostgreSQL hedefli veritabani tasarimi
- SQLite gelistirme dosyasi destegi
- Bcrypt ile sifre hashleme
- SMTP tabanli e-posta/OTP islemleri
- Alembic-style migration dosyalari

Frontend:

- React
- Vite
- React Router
- React Context API
- CSS tabanli tema ve responsive layout
- `lucide-react` ikon kutuphanesi

Veri ve yardimci araclar:

- USDA food/nutrition eslestirme servisleri
- Yemek.com, BBC Good Food, EatingWell ve Skinnytaste scraper/import scriptleri
- Backfill scriptleri
- Alias ve unmatched ingredient denetim scriptleri

---

## 4. Proje Klasor Yapisi

```text
backend/
  main.py
  requirements.txt
  app/
    config/
      settings.py
    db/
      database.py
      models.py
    routers/
      auth.py
      ingredients.py
      recipes.py
      users.py
    schemas/
      auth.py
      ingredient.py
      recipe.py
      user.py
    repositories/
      ingredient_repository.py
      recipe_repository.py
    services/
      auth_service.py
      healthy_recipe_service.py
      ingredient_matching_service.py
      ingredient_nutrition_service.py
      ingredient_resolver_service.py
      ingredient_service.py
      nutrition_mapper.py
      recipe_import_service.py
      recipe_service.py
      unit_conversion_service.py
      usda_client.py
      usda_mapping_service.py
      user_service.py
    utils/
      helpers.py
      mailer.py
      nutrition_fetcher.py
      recipe_health.py
      recipe_translation.py
      usda_food_data.py
    data/
      usda_seed_mappings.json
  alembic/
    versions/
  scraper/
  scripts/

frontend/
  package.json
  vite.config.js
  src/
    App.jsx
    App.css
    index.css
    main.jsx
    context/
      AppContext.jsx
    components/
      AddRecipeForm.jsx
      IngredientPicker.jsx
      Layout.jsx
      ManualIngredientNutritionModal.jsx
      ProgressCircle.jsx
    pages/
      Dashboard.jsx
      DailyLogs.jsx
      DislikedIngredients.jsx
      Favorites.jsx
      FavoritesDb.jsx
      ForgotPassword.jsx
      HealthyMenu.jsx
      HealthyResults.jsx
      IngredientSelection.jsx
      Login.jsx
      Pantry.jsx
      ProfileEdit.jsx
      ProfileSetup.jsx
      RecipeDetail.jsx
      RecipeDetailDb.jsx
      RecipeList.jsx
      RecipeListDb.jsx
      Recommendations.jsx
      Register.jsx
      ResetPassword.jsx
      VerifyEmail.jsx
      WeeklyLogs.jsx
    utils/
      recipeInsights.js
```

---

## 5. Backend Mimarisi

Backend FastAPI uzerine kuruludur. `backend/main.py`, uygulamayi baslatir, CORS ayarlarini yapar ve router modullerini dahil eder.

Ana router modulleri:

- `auth.py`: Kayit, giris, e-posta dogrulama, sifre sifirlama.
- `ingredients.py`: Malzeme ve kategori islemleri.
- `recipes.py`: Tarif listeleme, detay, oneriler ve custom tarif akislari.
- `users.py`: Profil, kiler, favoriler, sevilmeyen malzemeler ve log islemleri.

Servis katmani is mantigini routerlardan ayirir:

- `auth_service.py`: Kimlik dogrulama, sifre hashleme, OTP ve mail akislarini yonetir.
- `user_service.py`: Profil, kalori hedefi, log, favori ve kullanici iliskili islemleri yonetir.
- `recipe_service.py`: Tarif listeleme, detay, serialization, oneriler ve health score entegrasyonunu yonetir.
- `ingredient_service.py`: Malzeme ve kategori islemleri.
- `ingredient_matching_service.py`: Malzeme adlarini normalize edip tarif importlarinda eslestirme yapar.
- `ingredient_resolver_service.py`: Alias/canonical ingredient yaklasimiyla malzeme cozme katmanidir.
- `ingredient_nutrition_service.py`: Malzeme bazli besin degeri islemleri.
- `unit_conversion_service.py`: Miktar ve birimlerden gram karsiligi hesaplar.
- `usda_client.py` ve `usda_mapping_service.py`: USDA veri entegrasyonunu destekler.

Repository katmani:

- `ingredient_repository.py`
- `recipe_repository.py`

Bu katmanlar veritabani erisimini servis mantigindan ayirmak icin kullanilir.

---

## 6. Veritabani Tasarimi

Temel model kaynagi:

```text
backend/app/db/models.py
```

### 6.1 Kullanici ve Profil

`users` tablosu kullanici hesap ve profil bilgilerini tutar.

Baslica alanlar:

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

Profil bilgileri frontend onboarding ve profil duzenleme ekranlarindan yonetilir. Gunluk kalori hedefi kullanici bilgilerine gore hesaplanir ve dashboard tarafinda kullanilir.

### 6.2 Malzemeler

`ingredients` tablosu global ve kullaniciya ozel malzemeleri destekler.

Baslica alanlar:

- `ingredient_id`
- `ingredient_name`
- `category`
- `category_id`
- `user_id`

`ingredient_categories`, malzemeleri sebze, meyve, et, sut urunu, tahil gibi kategorilerle iliskilendirir.

### 6.3 Tarifler

`recipes` tablosu tarif ana kaydidir.

Baslica alanlar:

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

Tarifler hem import edilen kaynaklardan hem de kullanici/custom akislarindan gelebilecek sekilde tasarlanmistir.

### 6.4 Tarif Malzemeleri

`recipe_ingredients`, tarif ile malzemeler arasindaki many-to-many yapidir.

Orijinal veri alanlari:

- `recipe_ingredient_id`
- `recipe_id`
- `ingredient_id`
- `amount`
- `unit`

Gram normalizasyon alanlari:

- `miktar_gram`
- `donusum_kaynagi`
- `donusum_guveni`
- `donusum_notu`

Kritik teknik karar: `amount` ve `unit` alanlari orijinal tarif verisi olarak korunur. Gram hesaplama sonucu bu alanlara yazilmaz, ayrica `miktar_gram` alanina kaydedilir.

### 6.5 Nutrition Tablolari

`ingredient_nutrition_values`, malzeme bazli 100 gramlik besin degerlerini tutar.

Baslica alanlar:

- `calories_per_100g`
- `protein_per_100g`
- `carbs_per_100g`
- `fat_per_100g`
- `saturated_fat_per_100g`
- `fiber_per_100g`
- `sugar_per_100g`
- `sodium_mg_per_100g`
- `confidence_score`

`ingredient_unit_conversions`, malzeme ve birim bazli gram/ml/density donusumlerini tutar.

### 6.6 Kullanici Iliski Tablolari

- `owned_ingredients`: Kullanicinin kiler/dolap malzemeleri.
- `disliked_ingredients`: Kullanicinin sevmedigi malzemeler.
- `favorites`: Favori tarifler.
- `daily_logs`: Gunluk/haftalik beslenme kayitlari.
- `email_verification_codes`: OTP ve dogrulama kodlari.
- `ingredient_aliases`: Malzeme alias eslestirmeleri.
- `unmatched_ingredients`: Import sirasinda eslesmeyen malzemeler.
- `healthy_recipes`: Saglikli tarif import ve ayrim islemleri icin yardimci yapi.

---

## 7. Kimlik Dogrulama ve Kullanici Akislari

Gelistirilen auth akislari:

- Kullanici kaydi.
- E-posta dogrulama.
- Kullanici girisi.
- Sifre sifirlama.
- OTP/e-posta kodu gonderimi.
- Profil olusturma ve profil guncelleme.

Backend tarafinda sifreler hashlenerek saklanir. E-posta dogrulama ve sifre sifirlama akislarinda `email_verification_codes` tablosu ve mailer yardimci modulu kullanilir.

Frontend tarafinda ilgili sayfalar:

- `Register.jsx`
- `Login.jsx`
- `VerifyEmail.jsx`
- `ForgotPassword.jsx`
- `ResetPassword.jsx`
- `ProfileSetup.jsx`
- `ProfileEdit.jsx`

---

## 8. Tarif Oneri Sistemi

Ana endpoint:

```text
POST /api/recipes/recommendations
```

Ana servis:

```text
backend/app/services/recipe_service.py
```

Oneri sistemi su girdileri dikkate alir:

- Secili malzemeler.
- Kiler/dolap malzemeleri.
- Sevmedigi malzemeler.
- Pisirme tipi veya tarif tipi filtreleri.
- Healthy-only gibi saglik odakli filtreler.
- Tarif kaynagi.
- Kullanici bilgisi.

Oneri skoru ile health score farklidir:

- `score`: Kullanicinin elindeki malzemelerle tarifin uyum puani.
- `health_score`: Tarifin kalori, makro ve malzeme risklerine gore kalite puani.

Oneri mantigi:

- Secili malzemeler ve kiler malzemeleri birlestirilir.
- Tarif malzemeleri normalize edilmis isimlerle karsilastirilir.
- Secili malzeme eslesmesi daha yuksek agirlik alir.
- Kiler eslesmeleri ek avantaj saglar.
- Eksik malzemeler response icinde gosterilir.
- Sevilmeyen malzemeler filtrelenebilir veya skor dusurmede kullanilir.
- Sonuc tarif uyum skoruna gore siralanir.

---

## 9. Malzeme Esleme, Alias ve Import Altyapisi

Tarif importlarinda en kritik sorun, farkli kaynaklardan gelen malzeme adlarinin ayni malzemeye baglanmasidir. Bunun icin su yapi gelistirildi:

- Malzeme adlari normalize edilir.
- Turkce karakter, buyuk/kucuk harf, fazla bosluk ve basit yazim farklari temizlenir.
- Alias tablosu ile farkli isimler canonical ingredient kaydina baglanabilir.
- Eslesmeyen malzemeler `unmatched_ingredients` ile raporlanir.
- Denetim ve merge scriptleri ile malzeme havuzu temizlenebilir.

Ilgili dosyalar:

```text
backend/app/services/ingredient_matching_service.py
backend/app/services/ingredient_resolver_service.py
backend/aliases.json
backend/audit_ingredient_matching.py
backend/merge_canonical_ingredients.py
backend/normalize_healthy_recipe_ingredients.py
backend/refresh_yemekcom_ingredients.py
```

---

## 10. USDA ve Besin Degeri Entegrasyonu

USDA entegrasyonu, malzemelerin 100 gram bazli besin degerlerini sisteme kazandirmak icin gelistirildi.

Ilgili dosyalar:

```text
backend/app/services/usda_client.py
backend/app/services/usda_mapping_service.py
backend/app/services/nutrition_mapper.py
backend/app/scripts/import_usda_nutrition.py
backend/app/data/usda_seed_mappings.json
backend/sync_ingredient_nutrition_from_usda.py
```

Gelistirilen yaklasim:

- Ingredient kayitlari USDA food datasiyla eslestirilir.
- USDA nutrient alanlari uygulamanin `calories/protein/carbs/fat/fiber/sugar/sodium` modeline map edilir.
- Confidence score ile eslestirme kalitesi takip edilir.
- Manuel veya inline nutrition girisi desteklenir.
- Custom ingredient nutrition degerleri daha sonra hesaplamalarda kullanilabilecek sekilde saklanir.

---

## 11. Olcu Birimi ve Gram Donusum Sistemi

Ana dosya:

```text
backend/app/services/unit_conversion_service.py
```

Amac, tariflerdeki `amount` ve `unit` bilgisinden orijinal veriyi bozmadan gram karsiligi uretmektir.

Desteklenen birim aileleri:

- Gram, kilogram.
- Mililitre, litre.
- Yemek kasigi, tatli kasigi, cay kasigi.
- Su bardagi, cay bardagi, cup.
- Adet/tane/parca.
- Tutam, biraz, goz karari gibi belirsiz birimler.

Ornek aliaslar:

```text
yemek kasigi, y.k., yk, tbsp, tablespoon -> tablespoon
tatli kasigi, t.k., tk, dessert spoon -> dessert_spoon
cay kasigi, tsp, teaspoon -> teaspoon
su bardagi, bardak, cup -> cup
cay bardagi -> tea_glass
adet, tane -> piece
gram, gr, g -> gram
kilogram, kg -> kilogram
ml, mililitre -> ml
litre, l -> liter
```

Volume profile destegi:

```text
yemek_com_profile
tr_200ml_profile
us_fda_profile
```

Backfill scripti:

```text
backend/scripts/backfill_recipe_ingredient_grams.py
```

Kullanim:

```bash
python backend/scripts/backfill_recipe_ingredient_grams.py --dry-run
python backend/scripts/backfill_recipe_ingredient_grams.py --apply
```

`--dry-run`, veritabanina kalici yazmadan donusum raporu uretir. `--apply` gercek guncelleme yapar.

---

## 12. Health Score ve Tarif Kalite Sistemi

Ana dosya:

```text
backend/app/utils/recipe_health.py
```

Frontend yardimci:

```text
frontend/src/utils/recipeInsights.js
```

Health score, tarifleri sadece kaloriye gore degil, makro dagilimi ve malzeme risklerine gore degerlendirir.

Kalite esikleri:

```text
80-100 -> A
60-79  -> B
50-59  -> C
0-49   -> D
```

Makro tabanli skor bilesenleri:

- Kalori skoru.
- Protein skoru.
- Yag skoru.
- Karbonhidrat skoru.
- Makro denge skoru.

Hard cap kurallari:

- Cok yuksek kalorili tarifler otomatik olarak A/B bandina cikamaz.
- Cok yuksek yag iceren tariflerde skor sinirlanir.
- Protein yuksekligi tek basina asiri kalori veya yag riskini kapatamaz.
- Eklenmis seker ve rafine karbonhidrat iceren tariflere ek ceza uygulanir.

Malzeme riskleri:

- Eklenmis seker.
- Bal, pekmez, recel, surup gibi seker kaynaklari.
- Rafine karbonhidrat.
- Beyaz pirinc, beyaz un, nisasta, makarna, yufka gibi kaynaklar.
- Tereyagi, krema ve yuksek yag sinyalleri.
- Kizartma sinyalleri.

Pozitif sinyaller:

- Sebze.
- Bakliyat.
- Yogurt.
- Yagsiz protein.
- Tam tahil.
- Yulaf.
- Bulgur.

Eklenmis seker ornekleri:

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

Onemli test senaryolari:

```text
Tavuk Pilav -> 79 / B
Ali Nazik -> 54 / C
Balli Tarcinli Elma Cipsi -> 72 / B
Sutlac -> 54 / C
```

Sutlac senaryosunda 1 su bardagi seker 200 gram kabul edilmis, 6 porsiyonda porsiyon basina yaklasik 33.33 gram eklenmis seker hesaplanmis ve tarif C bandinda tutulmustur. Bu, sekerli tariflerin sadece dusuk porsiyon kalorisi nedeniyle fazla iyi puan almamasini saglar.

Health score backfill:

```text
backend/scripts/backfill_health_scores.py
```

Kullanim:

```bash
python backend/scripts/backfill_health_scores.py --dry-run
python backend/scripts/backfill_health_scores.py --apply
```

Son dry-run dagilim hedefi:

```text
Toplam tarif: 467
A: 73
B: 178
C: 152
D: 64
Hard cap uygulanan: 197
```

Bu dagilim, tariflerin buyuk cogunlugunun yapay olarak A/B bandina yigilmasini engeller.

---

## 13. Frontend Mimarisi

Frontend React ve Vite ile gelistirilmistir. Ana uygulama routing ve layout yapisi `App.jsx` uzerinden ilerler. Global state ve API iletisimleri `AppContext.jsx` icinde toplanmistir.

Ana frontend sorumluluklari:

- Kullanici oturum ve profil state'i.
- Tema state'i.
- Malzeme secimi.
- Kiler/dolap state'i.
- Favori tarifler.
- Gunluk ve haftalik loglar.
- Tarif cache'i.
- API helper fonksiyonlari.

### 13.1 AppContext

Dosya:

```text
frontend/src/context/AppContext.jsx
```

Onemli karar:

`fetchRecipeById(id)`, cache'de tarif varsa bile `ingredients` alanlari eksikse detay endpointini tekrar cagirir. Boylece liste ekranindan gelen ozet tarif, detay sayfasinda malzeme listesinin kaybolmasina neden olmaz.

### 13.2 Ana Sayfalar

- `Dashboard.jsx`: Gunluk hedef, tuketim ve ozet metrikleri.
- `IngredientSelection.jsx`: Malzeme secimi.
- `Recommendations.jsx`: Onerilen tarifler.
- `RecipeListDb.jsx`: Veritabanindaki tarif listesi.
- `RecipeDetailDb.jsx`: Tarif detaylari.
- `Pantry.jsx`: Kiler/dolap yonetimi.
- `DislikedIngredients.jsx`: Sevilmeyen malzemeler.
- `FavoritesDb.jsx`: Favori tarifler.
- `DailyLogs.jsx`: Gunluk kayitlar.
- `WeeklyLogs.jsx`: Haftalik kayitlar.
- `ProfileSetup.jsx` ve `ProfileEdit.jsx`: Profil olusturma/duzenleme.

### 13.3 UI ve Tema

Gelistirilen UI iyilestirmeleri:

- Acik/koyu tema destegi.
- Login ekraninin tema degiskenleriyle daha stabil calismasi.
- Malzeme secim ekraninda dark mode okunabilirliginin iyilestirilmesi.
- Tarif detay ekraninda kalite bilgisinin gosterilmesi.
- Nutrition confidence uyarilarinin detay ekranina dahil edilmesi.
- Dashboard ve log ekranlarinda kalori/makro takibinin gorsellestirilmesi.

---

## 14. Gunluk ve Haftalik Beslenme Takibi

Kullanici profilinden hesaplanan `daily_calorie`, dashboard ve log ekranlarinda hedef deger olarak kullanilir.

Makro hedefleri frontend tarafinda yaklasik hesaplanir:

```text
protein: kalorinin %25'i / 4
karbonhidrat: kalorinin %45'i / 4
yag: kalorinin %30'u / 9
```

`daily_logs` tablosu:

- Tarif veya manuel kayit bilgisini saklar.
- Porsiyon/miktar bilgisiyle toplam kalori ve makro tuketimini hesaplamaya yardim eder.
- Gunluk ve haftalik ekranlarda raporlanir.
- `entry_source` ile gunluk/haftalik veya farkli kaynak ayrimi desteklenir.

---

## 15. Scraper ve Tarif Import Sistemi

Projede farkli kaynaklardan tarif verisi toplamak ve sisteme almak icin scraper/import scriptleri gelistirildi.

Kaynak dosyalar:

```text
backend/scraper/yemekcom_scraper.py
backend/scraper/bbcgoodfood_scraper.py
backend/scraper/eatingwell_scraper.py
backend/scraper/skinnytaste_scraper.py
backend/scraper/import_yemekcom_recipes.py
backend/scraper/import_bbcgoodfood_healthy_recipes.py
backend/scraper/import_eatingwell_healthy_recipes.py
backend/scraper/import_skinnytaste_healthy_recipes.py
backend/import_yemekcom_diet_healthy_recipes.py
```

Import sirasinda:

- Tarif basligi, aciklama, hazirlanis, sure, porsiyon ve gorsel bilgileri alinir.
- Malzeme listeleri parse edilir.
- Malzeme adlari normalize edilip ingredient kayitlariyla eslestirilir.
- Eslesmeyen malzemeler raporlanir.
- Health score ve gram donusum backfill surecleri sonradan calistirilabilir.

---

## 16. API Ozeti

Ana endpoint gruplari:

```text
POST /api/register
POST /api/verify
POST /api/login
POST /api/forgot-password
POST /api/reset-password

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

Tarif response'lari summary ve detail seviyesinde ayrilir. Detail response icinde malzeme listesi, hazirlanis, makrolar ve health score bilgileri birlikte doner.

---

## 17. Migration ve Backfill Dosyalari

Migration dosyalari:

```text
backend/alembic/versions/20260424_01_add_usda_nutrition_tables.py
backend/alembic/versions/20260426_01_add_ingredient_aliases_and_unmatched.py
backend/alembic/versions/20260427_01_add_recipe_ingredient_gram_conversions.py
backend/alembic/versions/20260427_02_add_recipe_health_score_fields.py
backend/alembic/versions/20260428_01_add_ingredient_inline_nutrition.py
backend/alembic/versions/20260428_02_use_nutrition_values_for_custom_ingredients.py
```

Backfill scriptleri:

```bash
python backend/scripts/backfill_recipe_ingredient_grams.py --dry-run
python backend/scripts/backfill_recipe_ingredient_grams.py --apply

python backend/scripts/backfill_health_scores.py --dry-run
python backend/scripts/backfill_health_scores.py --apply
```

Notlar:

- `--dry-run`, veritabanina kalici yazmadan kontrol icin kullanilir.
- `--apply`, gercek guncelleme yapar.
- Kalici backfill oncesinde veritabani yedegi alinmasi onerilir.
- Orijinal tarif miktar ve birim alanlari hicbir backfill sirasinda ezilmemelidir.

---

## 18. Test ve Dogrulama

Projede health score ve onerilerin mantigini kontrol etmek icin hedef senaryolar kullanildi.

Onemli dogrulamalar:

- Tavuk Pilav dengeli makro nedeniyle B bandinda kalir.
- Ali Nazik yuksek proteinli olsa bile cok yuksek kalori/yag nedeniyle C bandina cekilir.
- Balli Tarcinli Elma Cipsi dusuk kalorili ama seker kaynagi iceren snack olarak B bandinda kalir.
- Sutlac eklenmis seker ve rafine karbonhidrat nedeniyle C bandina cekilir.
- Tarif detay cache problemi cozuldu; detay sayfasinda malzemeler kaybolmaz.
- `.venv`, `node_modules`, build ciktilari, `.env`, veritabani ve gecici Python dosyalari GitHub'a gonderilmez.

Mevcut test dosyasi:

```text
test_recommendations.py
```

---

## 19. Git ve GitHub Durumu

Git kurulumu yapildi ve proje klasoru Git reposu olarak baslatildi.

Yapilan Git islemleri:

- `main` branch'i olusturuldu.
- `.gitignore` guncellendi.
- Veritabani dosyalari ve gecici derlenmis Python dosyalari commit disinda birakildi.
- Ilk commit olusturuldu.
- GitHub remote eklendi.
- Proje `origin/main` branch'ine push edildi.

Remote:

```text
origin https://github.com/yavuzorhan/Reci_Match.git
```

`.gitignore` ile dislanan kritik dosyalar:

```text
.venv/
__pycache__/
*.py[cod]
*.pyc.*
*.db
*.sqlite
*.sqlite3
frontend/node_modules/
frontend/dist/
.env
.env.*
```

---

## 20. Bilinen Teknik Kararlar

- Health score ile tarif onerisi skoru birbirinden ayridir.
- Tarif onerisi, kullanicinin malzeme uyumunu olcer.
- Health score, tarifin besinsel kalite siniflandirmasidir.
- Orijinal tarif miktar ve birim bilgileri korunur.
- Gram donusum sonucu ayri alanlara yazilir.
- Protein bonusu, yuksek kalori ve yuksek yag riskini tamamen kapatamaz.
- Eklenmis seker, USDA verisi olmasa bile malzeme adindan tespit edilir.
- Rafine karbonhidrat ve eklenmis seker birlikteyse skor daha sert dusurulur.
- Frontend cache, detay response'undaki malzeme listesini ezmemelidir.
- Backfill scriptleri once `--dry-run` ile calistirilmalidir.
- `.env` ve veritabani dosyalari GitHub'a gonderilmemelidir.

---

## 21. Yeni Gelistirici Icin Hizli Rehber

Bu projede calismaya baslayan bir gelistirici su sirayla ilerlemelidir:

1. Veritabani modelleri icin `backend/app/db/models.py` dosyasini incele.
2. Backend baslangici icin `backend/main.py` dosyasini incele.
3. Tarif is mantigi icin `backend/app/services/recipe_service.py` dosyasini incele.
4. Health score icin `backend/app/utils/recipe_health.py` dosyasini incele.
5. Gram donusum icin `backend/app/services/unit_conversion_service.py` dosyasini incele.
6. Kullanici ve auth akislarini `auth_service.py`, `user_service.py` ve ilgili routerlarda takip et.
7. Frontend global state icin `frontend/src/context/AppContext.jsx` dosyasini incele.
8. Tarif detay davranisi icin `frontend/src/pages/RecipeDetailDb.jsx` dosyasini incele.
9. Health grade UI esikleri icin `frontend/src/utils/recipeInsights.js` dosyasini incele.
10. DB guncelleyen scriptleri once `--dry-run` ile calistir.

---

## 22. Kisa Sonuc

Reci Match; tarif onerisi, kullanici profili, malzeme yonetimi, kiler takibi, sevilmeyen malzeme filtresi, favoriler, gunluk/haftalik beslenme loglari, USDA destekli nutrition altyapisi, gram donusum sistemi ve health score algoritmasi bulunan kapsamli bir bitirme projesidir.

Proje artik yalnizca planlanan bir uygulama degil; backend, frontend, veri isleme scriptleri, skor algoritmasi ve GitHub yayini olan gelistirilmis bir urundur. Bundan sonraki ana odak; kurulum dokumani, demo senaryosu, tez/rapor metni, test kapsami ve son UI/UX kontrollerinin netlestirilmesidir.

---

## 23. Backend Katmanlı Mimari (Layered Architecture) Revizyonu

Nisan 2026 itibarıyla proje backend'i, endüstri standardı olan **Katmanlı Mimari (Layered Architecture)** prensiplerine tam uyumlu olacak şekilde yeniden yapılandırılmıştır:

1. **Repository Katmanı İzole Edildi:** `user_repository.py`, `ingredient_repository.py` ve `recipe_repository.py` oluşturularak `db.query` ve `db.execute` gibi tüm veritabanı sorguları Service katmanından buraya taşındı.
2. **Service Katmanı Temizlendi:** `user_service.py`, `ingredient_service.py` ve `recipe_service.py` içerisindeki tüm SQL mantıkları çıkarıldı. Servisler artık sadece iş kurallarını (business logic) işler ve veritabanı erişimi için Repository fonksiyonlarını çağırır.
3. **Helper Modülleri Oluşturuldu:** `recipe_service.py` içerisindeki uzun kalori hesaplama, gram dönüşüm (`_unit_to_grams`) gibi yardımcı fonksiyonlar tamamen sökülüp `app/utils/recipe_helpers.py` içerisine taşındı.
4. **Klasör Hiyerarşisi Temizlendi:** Sadece çalıştırma amacıyla kullanılan (cron job veya migration) geçici scriptler `backend/scripts/` altına taşındı. Kullanılmayan eski React mock dosyaları (`mockData.js`) ve sayfası olmayan bileşenler silindi.

Bu yapı sayesinde backend kod tabanı çok daha modüler, test edilebilir ve sürdürülebilir hale getirilmiştir.
