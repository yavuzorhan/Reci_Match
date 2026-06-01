# recipes.py - Okunakli Detay

## Bu Dosya Ne Ise Yarar?

`recipes.py`, tariflerle ilgili backend API endpoint'lerini tanimlar. Frontend tarif listelemek, tarif detayi almak, tarif onerisi istemek, Gemini ile tarif revize etmek, ozel tarif eklemek veya tarif resmi yuklemek istediginde bu dosyadaki endpoint'lere istek atar.

Bu dosya asil tarif mantigini kendisi yapmaz. Gelen istegi alir, gerekli veriyi schema ile okur ve isi `recipe_service` veya `recipe_revision_service` dosyasina aktarir.

## Projedeki Yeri

- Katman: Router
- Frontend'den gelen HTTP isteklerini karsilar.
- DB session'i `Depends(get_db)` ile alir.
- Tarif is mantigi icin `recipe_service.py` dosyasini cagirir.
- Gemini revizyon icin `recipe_revision_service.py` dosyasini cagirir.

## Bilmen Gereken Kavramlar

**Router:** API adreslerini tanimlayan katmandir.

**Endpoint:** Frontend'in istek attigi URL'dir.

**Query parametresi:** URL sonunda gelen ek bilgidir. Ornek: `?user_id=1`

**Request body:** POST/PUT isteklerinde frontend'in JSON olarak gonderdigi veridir.

**Depends(get_db):** Endpoint'e veritabani session'i verir.

## Ana Endpointler

### `GET /api/recipe-image`

Dis kaynakli tarif resmini backend uzerinden proxy olarak getirir.

Neden var?

Bazi dis resimler frontend tarafindan dogrudan yuklenemeyebilir. Backend resmi alip frontend'e aktarir.

Akis:

1. Frontend resim URL'sini query parametresi olarak gonderir.
2. Backend URL'nin `http` veya `https` ile basladigini kontrol eder.
3. Resmi indirir.
4. Resim icerigini frontend'e dondurur.

### `GET /api/recipes`

Tarif listesini getirir.

Alabilecegi filtreler:

- `user_id`
- `ids`
- `source`
- `recipe_category`
- `healthy_only`

Bu endpoint `recipe_service.get_recipes(...)` fonksiyonunu cagirir.

Neden onemli?

Tarif listeleme sayfalari ve saglikli tarif filtreleri bu endpoint uzerinden calisir.

### `GET /api/recipes/{recipe_id}`

Tek bir tarifin detayini getirir.

Frontend tarif kartina tiklaninca detay sayfasi bu endpoint'i kullanir.

Bu endpoint `recipe_service.get_recipe_detail(...)` fonksiyonunu cagirir.

### `POST /api/recipes/recommendations`

Malzemelere gore tarif onerisi dondurur.

Frontend su bilgileri gonderir:

- Secili malzeme ID'leri
- Dolap malzemesi ID'leri
- Sevilmeyen malzeme ID'leri
- Pisirme tipi filtreleri
- Kullanici ID
- Saglikli tarif filtresi

Bu endpoint `recipe_service.get_recommendations(...)` fonksiyonunu cagirir.

Sunum icin onemli not:

Router sadece istegi alir. Tarif eslestirme algoritmasi `recipe_service.py` icindedir.

### `POST /api/healthy-recipes/sync`

Saglikli tarifleri senkronize eder.

Bu endpoint daha cok admin/geliştirme amacli dusunulebilir. Saglikli tarif listesini `healthy_recipes` tablosuyla eslestirmek icin kullanilir.

### `POST /api/recipes/{recipe_id}/revise`

Gemini ile tarif revizyonu yapar.

Frontend tarif ID, kullanici ID ve istenen degisiklikleri gonderir.

Ornek istek mantigi:

- "Bu tariften sogani cikar."
- "Tuzu azalt."
- "Tavuk yerine hindi kullan."

Bu endpoint `recipe_revision_service.revise_recipe(...)` fonksiyonunu cagirir.

### `POST /api/recipes/{recipe_id}/revise/save`

Gemini'den gelen revize tarifi kullanicinin ozel tarifi olarak kaydeder.

Onemli:

Bu islem orijinal tarifi degistirmez. Yeni bir kullanici tarifi olusturur.

### `POST /api/users/{user_id}/custom-recipes`

Kullanicinin kendi tarifini eklemesini saglar.

Frontend tarif formundan sunlari gonderir:

- Tarif adi
- Aciklama
- Hazirlanis
- Kategori
- Porsiyon
- Malzemeler
- Resim URL

Bu endpoint `recipe_service.create_custom_recipe(...)` fonksiyonunu cagirir.

### `PUT /api/users/{user_id}/custom-recipes/{recipe_id}`

Kullaniciya ait tarifi gunceller.

Guvenlik acisindan service tarafinda tarifin bu kullaniciya ait olup olmadigi kontrol edilir.

### `DELETE /api/users/{user_id}/custom-recipes/{recipe_id}`

Kullaniciya ait tarifi siler.

Kodda tarif tamamen yok edilmek yerine pasif hale getirilebilir. Bu sayede veri iliskileri daha kontrollu kalir.

### `POST /api/recipes/{recipe_id}/image`

Tarife resim yukler.

Frontend multipart dosya olarak resim gonderir. Backend dosya tipini ve boyutunu kontrol eder.

### `POST /api/recipes/custom`

Eski frontend akisiyle uyumluluk icin eklenmis alternatif tarif ekleme endpoint'idir.

Burada `creator_id` alanindan kullanici ID alinmaya calisilir.

## Veri Akisi

Tarif onerisi icin:

1. Frontend `/api/recipes/recommendations` endpoint'ine istek atar.
2. Router request body'yi `RecipeRecommendationRequest` ile okur.
3. Router `recipe_service.get_recommendations` fonksiyonunu cagirir.
4. Service tarifleri skorlar.
5. Router sonucu frontend'e dondurur.

Gemini revizyon icin:

1. Frontend `/api/recipes/{recipe_id}/revise` endpoint'ine istek atar.
2. Router `RecipeRevisionRequest` verisini alir.
3. Router `recipe_revision_service.revise_recipe` cagirir.
4. Service Gemini ile revizyon yapar.
5. Sonuc frontend'e doner.

## Veritabani Iliskisi

Bu dosya DB sorgusunu kendisi yazmaz. Ama `Depends(get_db)` ile session alir ve service fonksiyonlarina verir.

Dolayli olarak su tablolari ilgilendirir:

- `recipes`
- `recipe_ingredients`
- `ingredients`
- `healthy_recipes`
- `revision_cache`

## Hocaya Kisa Cevaplar

**Soru: Router ne ise yariyor?**  
Cevap: Frontend'den gelen HTTP isteklerini karsiliyor ve dogru service fonksiyonuna yonlendiriyor.

**Soru: Tarif onerisi burada mi hesaplanıyor?**  
Cevap: Hayir. Burada sadece endpoint var. Asil tarif onerisi `recipe_service.get_recommendations` fonksiyonunda hesaplanıyor.

**Soru: Gemini endpoint'i hangisi?**  
Cevap: `/api/recipes/{recipe_id}/revise` endpoint'i Gemini ile revizyon yapıyor. Kaydetmek icin `/revise/save` endpoint'i kullanılıyor.

## 30 Saniyelik Ozet

`recipes.py`, tariflerle ilgili API kapisidir. Listeleme, detay, oneriler, ozel tarifler, resim yukleme ve Gemini revizyon endpoint'leri burada tanimlanir. Router is mantigini yapmaz; istegi service katmanina aktarir.

