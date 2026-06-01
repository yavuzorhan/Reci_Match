# Frontend Backend Veri Akisi

Bu dokuman React frontend ile FastAPI backend arasinda verinin nasil gidip geldigini anlatir.

## Genel Akis

1. Kullanici frontend'de bir butona basar veya form doldurur.
// Ne oluyor: React component icindeki event fonksiyonu calisir.
// Neden gerekli: Kullanici aksiyonu uygulama tarafinda isleme donussun diye.

2. Frontend `fetch` veya benzeri API istegi hazirlar.
// Ne oluyor: URL, method, headers ve body belirlenir.
// Neden gerekli: Backend'e hangi islem yapilacagi net gonderilsin diye.

3. Istek backend'deki router endpoint'ine gider.
// Ne oluyor: FastAPI URL ve HTTP method'a gore dogru fonksiyonu calistirir.
// Neden gerekli: Her API isleminin ayri endpoint'i vardir.

4. Router gelen veriyi schema ile alir.
// Ne oluyor: Pydantic request modeli alanlari kontrol eder.
// Neden gerekli: Eksik veya yanlis formatli veri erken yakalansin diye.

5. Router service fonksiyonunu cagirir.
// Ne oluyor: Asil is mantigi service katmanina aktarilir.
// Neden gerekli: Router sade kalir, proje katmanli olur.

6. Service gerekirse repository cagirir.
// Ne oluyor: DB okuma/yazma islemleri repository fonksiyonlariyla yapilir.
// Neden gerekli: SQL sorgulari service icinde dagilmasin diye.

7. Repository SQLAlchemy session ile veritabanina gider.
// Ne oluyor: `db.query(...)`, `db.add(...)`, `db.commit()` gibi islemler calisir.
// Neden gerekli: Veriler kalici olarak PostgreSQL'de saklansin diye.

8. Service sonucu frontend'e uygun dict/JSON hale getirir.
// Ne oluyor: SQLAlchemy model nesnesi serialize edilir.
// Neden gerekli: Frontend JSON okuyabilir, Python nesnesini direkt okuyamaz.

9. Router cevabi frontend'e dondurur.
// Ne oluyor: FastAPI dict yapisini JSON cevaba cevirir.
// Neden gerekli: Tarayici cevabi alip ekrani guncelleyebilsin diye.

10. Frontend state'i gunceller ve ekrani yeniler.
// Ne oluyor: React yeni veriye gore component'i tekrar render eder.
// Neden gerekli: Kullanici sonucu ekranda gorsun diye.

## Ornek: Tarif Onerisi

1. Kullanici malzeme secer.
2. Frontend `/api/recipes/recommendations` adresine POST istegi atar.
3. Router `RecipeRecommendationRequest` ile veriyi alir.
4. Router `recipe_service.get_recommendations` cagirir.
5. Service tarifleri ve malzemeleri DB'den repository ile alir.
6. Eslestirme skoru hesaplanir.
7. Sonuc JSON olarak frontend'e doner.
8. Frontend tarif kartlarini skorla birlikte gosterir.

## Ornek: Ozel Tarif Ekleme

1. Kullanici tarif formunu doldurur.
2. Frontend `/api/users/{user_id}/custom-recipes` adresine POST istegi atar.
3. Router `CustomRecipeCreate` ile veriyi alir.
4. Service kullaniciyi kontrol eder.
5. Malzemeler DB'de cozulur.
6. Besin degeri hesaplanir.
7. Tarif `recipes` tablosuna yazilir.
8. Tarif malzemeleri `recipe_ingredients` tablosuna yazilir.
9. Frontend basarili mesaj veya yeni tarifi gosterir.

## Hocaya 1 Dakikada Anlat

// Frontend kullanici aksiyonunu API istegine ceviriyor.
// FastAPI router istegi karsiliyor.
// Router veriyi schema ile kontrol edip service'e veriyor.
// Service is mantigini calistiriyor.
// Repository veritabanina okuma/yazma yapiyor.
// Sonuc JSON olarak frontend'e donuyor.
// React state guncellenince ekran degisiyor.

