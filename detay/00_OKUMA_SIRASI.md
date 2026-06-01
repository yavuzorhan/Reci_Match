# ReciMatch - Okuma Sirasi

Bu klasor projeyi hocaya anlatabilmen icin hazirlandi. Artik dokumanlar satir satir yorum seklinde degil, daha okunakli "dosya ne yapar, fonksiyonlar ne ise yarar, veri nasil akar" formatinda duzenleniyor.

## Nasil Okumalisin?

Once tum kodu ezberlemeye calisma. Su sirayla ilerle:

1. Projenin genel akisini anla.
2. Veritabaninda hangi tablolar var onu anla.
3. Backend'de istek hangi router'a geliyor onu anla.
4. Service dosyalarinda asil mantigi anla.
5. Frontend'in hangi endpoint'e istek attigini anla.

## 1. Ilk Okunacak Akis Dokumanlari

### `akislari/frontend_backend_veri_akisi.md`

Frontend'den backend'e veri nasil gider, backend cevabi nasil doner, genel olarak bunu anlatir.

Once bunu oku. Cunku butun proje su mantikla calisir:

```text
React Frontend -> FastAPI Router -> Service -> Repository -> PostgreSQL
```

### `akislari/tarif_oneri_akisi.md`

Kullanici malzeme sectikten sonra tarif onerisi nasil olusuyor anlatir.

Bu proje icin en onemli akis budur.

### `akislari/tarif_eslestirme_mantigi.md`

Tarif skoru nasil hesaplanir, secili malzeme ne kadar puan getirir, sevilmeyen malzeme ne yapar bunlari anlatir.

Hoca "tarif eslestirme kodu nasil calisiyor?" derse bu dosya cevap olur.

### `akislari/gemini_ile_tarif_revizyonu.md`

Gemini ile tarif nasil revize edilir, prompt nasil kullanilir, cevap nasil cache'lenir bunu anlatir.

### `akislari/besin_degeri_cozumleme_akisi.md`

Malzeme besin degerlerinden tarif kalorisi nasil hesaplanir anlatir.

### `akislari/kullanici_kayit_ve_giris.md`

Kayit, OTP dogrulama ve login mantigini anlatir.

### `akislari/favori_ve_haftalik_log_akisi.md`

Favori tarifler ve gunluk/haftalik beslenme loglari nasil kaydedilir anlatir.

## 2. Veritabani Katmani

### `veritabani/TABLOLAR_VE_ILISKILER.md`

Bu dosya mutlaka okunmali. Hangi tablo neden var, hangi tablo hangi tabloya bagli, senaryolarla anlatir.

Ozellikle sunlari anlamaya calis:

- `users` ne tutar?
- `recipes` ne tutar?
- `ingredients` ne tutar?
- `recipe_ingredients` neden ara tablodur?
- Favoriler nerede tutulur?
- Gunluk loglar nerede tutulur?
- Gemini cache nerede tutulur?

### `veritabani/DB_BAGLANTISI.md`

Backend veritabanina nasil baglaniyor anlatir.

Burada su kavramlari bilmen yeterli:

- `DATABASE_URL`
- `engine`
- `SessionLocal`
- `get_db`
- `commit`
- `rollback`

### `backend/app/db/models.md`

SQLAlchemy modellerini tablo tablo anlatir. Kod tarafinda DB tablolari nasil temsil ediliyor bunu gosterir.

### `backend/app/db/database.md`

DB engine, session ve eksik kolon kontrollerini anlatir.

## 3. Backend Cekirdek Dosyalari

### `backend/main.md`

Backend uygulamasi nerede basliyor, router'lar nerede ekleniyor, CORS ne ise yariyor anlatir.

### `backend/app/config/settings.md`

`.env`, PostgreSQL, SMTP ve `DATABASE_URL` ayarlarini anlatir.

### `backend/app/routers/auth.md`

Kayit, dogrulama, login ve sifre sifirlama endpoint'lerini anlatir.

### `backend/app/routers/recipes.md`

Tarif listeleme, tarif detayi, tarif onerisi, Gemini revizyonu ve ozel tarif endpoint'lerini anlatir.

### `backend/app/repositories/recipe_repository.md`

Tariflerle ilgili DB sorgularini anlatir. Kullaniciya ozel tariflerin nasil filtrelendigini burada gorebilirsin.

## 4. En Onemli Service Dosyalari

### `backend/app/services/recipe_service.md`

Bu dosya cok onemli. Tarif ekleme, guncelleme, silme, besin hesabi ve tarif onerisi burada anlatilir.

### `backend/app/services/recipe_revision_service.md`

Gemini ile tarif revizyonu burada anlatilir.

### `backend/app/services/auth_service.md`

Kayit, login, OTP ve sifre islemleri icin okunur.

### `backend/app/services/user_service.md`

Profil, favori ve gunluk log islemleri icin okunur.

### `backend/app/services/ingredient_service.md`

Malzeme listeleme ve kullanici malzemeleri icin okunur.

## 5. Frontend Dokumanlari

Frontend tarafinda once sunlari oku:

1. `frontend/src/context/AppContext.md`
2. `frontend/src/pages/Login.md`
3. `frontend/src/pages/Register.md`
4. `frontend/src/pages/IngredientSelection.md`
5. `frontend/src/pages/Recommendations.md`
6. `frontend/src/pages/RecipeDetailDb.md`
7. `frontend/src/pages/Pantry.md`
8. `frontend/src/pages/WeeklyLogs.md`

Frontend icin ana soru sudur:

"Kullanici ekranda ne yapiyor ve frontend hangi backend endpoint'ine istek atiyor?"

## Sunum Icin En Kisa Yol

Zamanin azsa sadece su dosyalari oku:

1. `akislari/frontend_backend_veri_akisi.md`
2. `akislari/tarif_oneri_akisi.md`
3. `akislari/tarif_eslestirme_mantigi.md`
4. `veritabani/TABLOLAR_VE_ILISKILER.md`
5. `backend/app/services/recipe_service.md`
6. `backend/app/services/recipe_revision_service.md`
7. `backend/app/db/models.md`
8. `backend/app/db/database.md`

Bu 8 dosya projenin ana mantigini anlatmak icin yeterli temel verir.

## 30 Saniyelik Genel Ozet

ReciMatch'te kullanici frontend'den malzeme secer. Frontend bu bilgileri FastAPI backend'e gonderir. Router istegi alir, service katmani asil is mantigini calistirir, repository veritabanindan tarif ve malzeme bilgilerini okur. Tarifler malzeme eslesmesine gore skorlanir ve frontend'e sirali sekilde doner. Gemini ise tarif revizyonu icin kullanilir ve cevaplar tekrar kullanilabilsin diye cache'lenir.

