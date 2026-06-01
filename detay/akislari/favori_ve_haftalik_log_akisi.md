# Favori ve Haftalik Log Akisi

Bu akis kullanicinin tarif favorilemesini ve yedigi tarifleri gunluk/haftalik takip etmesini anlatir.

## Favori Akisi

1. Kullanici frontend'de tarif kartindaki favori butonuna basar.
// Ne oluyor: Frontend tarif ID ve kullanici ID ile backend'e istek hazirlar.
// Neden gerekli: Hangi kullanici hangi tarifi favoriledi bilinmelidir.

2. Backend favori endpoint'i istegi alir.
// Ne oluyor: Router gelen `user_id` ve `recipe_id` bilgisini service'e yollar.
// Neden gerekli: Router sadece API kapisidir, is mantigi service'te olur.

3. Service kullanici ve tarif var mi kontrol eder.
// Ne oluyor: `users` ve `recipes` tablolari okunur.
// Neden gerekli: Olmayan kullanici veya tarif icin favori kaydi yapilmasin diye.

4. Favori kaydi `favorites` tablosuna yazilir.
// Ne oluyor: `user_id` ve `recipe_id` birlikte saklanir.
// Neden gerekli: Kullanici favorilerini daha sonra listeleyebilsin diye.

5. Kullanici favoriden cikarirsa kayit silinir.
// Ne oluyor: `favorites` tablosundaki ilgili satir kaldirilir.
// Neden gerekli: Favoriler kullanicinin anlik tercihine gore guncellenebilmelidir.

## Gunluk / Haftalik Log Akisi

1. Kullanici bir tarifi yedigini veya yaptigini isaretler.
// Ne oluyor: Frontend tarif ID, kullanici ID, ogun tipi ve porsiyon bilgisini backend'e gonderir.
// Neden gerekli: Gunluk beslenme takibi icin bu bilgiler gerekir.

2. Backend log endpoint'i istegi alir.
// Ne oluyor: Router istegi user service katmanina aktarir.
// Neden gerekli: Log hesaplama ve DB kaydi service'te yapilir.

3. Service tarifi DB'den bulur.
// Ne oluyor: `recipes` tablosundan tarifin kalori ve makro degerleri okunur.
// Neden gerekli: Log kaydina alinacak besin degeri tariften hesaplanir.

4. Porsiyon carpanina gore kalori/makro hesaplanir.
// Ne oluyor: 1 porsiyon yerine 2 porsiyon yenirse degerler artar.
// Neden gerekli: Kullanici gercek tuketimini takip edebilsin diye.

5. Kayit `daily_logs` tablosuna yazilir.
// Ne oluyor: Kullanici, tarif, tarih, ogun tipi, kalori ve makro bilgiler saklanir.
// Neden gerekli: Gunluk ve haftalik raporlar bu tablodan uretilir.

6. Haftalik log ekraninda `daily_logs` kayitlari okunur.
// Ne oluyor: Belirli tarih araligindaki loglar frontend'e doner.
// Neden gerekli: Kullanici haftalik kalori ve makro durumunu gorebilsin diye.

## Ilgili Tablolar

`favorites`

// Ne tutar: Kullanici favori tariflerini.
// Neden gerekli: Favoriler sayfasi icin.

`daily_logs`

// Ne tutar: Kullanıcının yedigi tarifleri, tarihleri ve besin alimini.
// Neden gerekli: Gunluk/haftalik kalori takibi icin.

`recipes`

// Ne tutar: Tarifin besin degeri bilgilerini.
// Neden gerekli: Log kaydindaki kalori/makro hesaplamasi buradan gelir.

## Hocaya 1 Dakikada Anlat

// Favoride sadece kullanici ID ve tarif ID `favorites` tablosuna yaziliyor.
// Haftalik logda kullanici yedigi tarifi isaretliyor.
// Backend tarifin kalori ve makrolarini aliyor.
// Porsiyon sayisina gore degerleri hesapliyor.
// Sonucu `daily_logs` tablosuna yaziyor.
// Haftalik ekran bu kayitlari okuyup kullaniciya ozet gosteriyor.

