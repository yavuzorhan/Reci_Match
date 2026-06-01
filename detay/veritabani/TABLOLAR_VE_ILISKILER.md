# Veritabani Tablolari ve Iliskiler - Okunakli Detay

## Bu Dokuman Ne Ise Yarar?

Bu dokuman projedeki veritabani tablolarini sade sekilde anlatir. Her tablonun ne tuttugunu, neden var oldugunu ve hangi tablolarla iliskili oldugunu gosterir.

Sunumda hoca "bu tablo neden var?", "tarifler malzemelerle nasil bagli?", "favoriler nerede tutuluyor?" diye sorarsa bu dokuman cevap icindir.

## Genel Veritabani Mantigi

Projede ana varliklar sunlardir:

- Kullanici
- Tarif
- Malzeme
- Tarif-malzame iliskisi
- Favori tarifler
- Dolap malzemeleri
- Sevilmeyen malzemeler
- Gunluk beslenme loglari
- Gemini revizyon cache'i

En temel iliski sudur:

```text
users -> recipes -> recipe_ingredients -> ingredients
```

Yani kullanicilar tarif ekleyebilir, tariflerin malzemeleri vardir, malzemeler de ayri tabloda tutulur.

## `users` Tablosu

`users`, sisteme kayitli kullanicilari tutar.

Neden var?

Kullanicinin giris yapabilmesi, profil bilgilerinin tutulmasi, favorilerinin, dolap malzemelerinin ve gunluk loglarinin kendisine baglanmasi icin gerekir.

Onemli kolonlar:

- `user_id`: Kullanici kimligi.
- `name_surname`: Ad soyad.
- `email`: Benzersiz e-posta.
- `password_hash`: Hashlenmis sifre.
- `daily_calorie`: Gunluk kalori hedefi.
- `meals`: Gunluk ogun sayisi.
- `is_verified`: E-posta dogrulandi mi.

Iliskiler:

- Bir kullanicinin birden fazla favorisi olabilir.
- Bir kullanicinin birden fazla dolap malzemesi olabilir.
- Bir kullanicinin birden fazla gunluk log kaydi olabilir.
- Bir kullanicinin kendine ozel tarifleri olabilir.

## `email_verification_codes` Tablosu

Bu tablo e-posta dogrulama ve sifre sifirlama kodlarini tutar.

Neden var?

Kullaniciya gonderilen kodun dogru olup olmadigi ve suresinin gecip gecmedigi kontrol edilmelidir.

Onemli kolonlar:

- `email`: Kodun gonderildigi e-posta.
- `code`: 6 haneli dogrulama kodu.
- `purpose`: Kodun amaci.
- `expires_at`: Kodun gecerlilik suresi.
- `temp_name`, `temp_password`: Kayit dogrulama sirasinda gecici bilgiler.

## `ingredients` Tablosu

Bu tablo malzemeleri ve malzemelerin besin degerlerini tutar.

Neden var?

Tarif onerisi ve kalori hesabinin temeli malzemelerdir. Bir tarifin toplam kalorisi, icindeki malzemelerin 100 gram basina besin degerlerinden hesaplanir.

Onemli kolonlar:

- `ingredient_id`: Malzeme ID'si.
- `ingredient_name`: Malzeme adi.
- `user_id`: Malzeme global mi kullaniciya ozel mi.
- `calorie_per_100g`: 100 gram basina kalori.
- `protein_per_100g`: 100 gram basina protein.
- `carbohydrate_per_100g`: 100 gram basina karbonhidrat.
- `fat_per_100g`: 100 gram basina yag.
- `nutrition_source`: Besin bilgisinin kaynagi.

`user_id` alani cok onemlidir:

- `NULL` ise malzeme globaldir.
- Doluysa malzeme sadece o kullaniciya aittir.

## `ingredient_categories` Tablosu

Malzeme kategorilerini tutar.

Ornek kategoriler:

- Sebze
- Meyve
- Et
- Sut urunleri
- Bakliyat

Bu tablo malzemeleri daha duzenli listelemek icin vardir.

## `ingredient_aliases` Tablosu

Malzemelerin alternatif adlarini tutar.

Ornek:

```text
domates -> tomato
domates -> domates rendesi
```

Neden var?

Tarif eslestirme sirasinda farkli yazilan ama ayni anlama gelen malzemeleri yakalamak icin kullanilir.

## `recipes` Tablosu

Tariflerin ana bilgilerinin tutuldugu tablodur.

Onemli kolonlar:

- `recipe_id`: Tarif ID'si.
- `recipe_name`: Tarif adi.
- `user_id`: Tarif global mi kullaniciya ozel mi.
- `source`: Tarifin kaynagi.
- `source_url`: Tarif dis kaynaktan geldiyse URL.
- `recipe_category`: Tarif kategorisi.
- `preparation`: Hazirlanis adimlari.
- `serving`: Porsiyon sayisi.
- `calorie`, `protein`, `carbohydrate`, `fat`: Besin degerleri.
- `health_score`, `health_grade`: Saglik skoru.
- `image_url`: Tarif resmi.
- `is_active`: Tarif aktif mi.

`user_id` burada da onemlidir:

- `NULL`: Global tarif.
- Dolu: Kullaniciya ozel tarif.

## `recipe_ingredients` Tablosu

Bu tablo tarifler ile malzemeler arasindaki baglantiyi tutar.

Neden var?

Bir tarifte birden fazla malzeme olabilir. Bir malzeme de birden fazla tarifte kullanilabilir. Bu coktan-coga iliskiyi ayri tabloyla tutmak gerekir.

Onemli kolonlar:

- `recipe_id`: Hangi tarif.
- `ingredient_id`: Hangi malzeme.
- `amount`: Miktar.
- `unit`: Birim.
- `miktar_gram`: Gram karsiligi.

Bu tablo olmadan tarifin hangi malzemelerden olustugunu duzenli takip etmek zor olurdu.

## `healthy_recipes` Tablosu

Saglikli tarif olarak secilen tarifleri tutar.

Neden var?

Saglikli menu ekraninda sadece saglikli tarifler filtrelenebilsin diye.

Bu tablo `recipes` tablosuna baglanir. Yani burada tarifin tamamı tekrar yazilmaz, sadece hangi tarifin saglikli listede oldugu tutulur.

## `favorites` Tablosu

Kullanicilarin favori tariflerini tutar.

Onemli kolonlar:

- `user_id`: Favoriyi ekleyen kullanici.
- `recipe_id`: Favorilenen tarif.

Neden var?

Her kullanicinin favori listesi farkli oldugu icin favoriler ayri tabloyla tutulur.

## `disliked_ingredients` Tablosu

Kullanicinin sevmedigi malzemeleri tutar.

Neden var?

Tarif onerisi yaparken kullanici istemedigi malzemeleri iceren tarifleri gormeyebilir veya bu tariflerin skoru dusurulebilir.

## `owned_ingredients` Tablosu

Kullanicinin dolabinda bulunan malzemeleri tutar.

Neden var?

Tarif onerisi sadece secili malzemelere degil, kullanicinin dolabindaki malzemelere de bakabilir.

Ornek:

Kullanici "yumurta" secer ama dolabinda "sut" ve "un" varsa sistem pankek gibi tarifleri daha uygun gorebilir.

## `daily_logs` Tablosu

Kullanicinin gunluk yedigi tarifleri ve aldigi besin degerlerini tutar.

Onemli kolonlar:

- `user_id`: Hangi kullanici.
- `recipe_id`: Hangi tarif.
- `log_date`: Hangi gun.
- `meal_type`: Hangi ogun.
- `calorie_intake`: Alinan kalori.
- `protein_intake`, `carbohydrate_intake`, `fat_intake`: Makro besinler.
- `serving_count`: Kac porsiyon.

Neden var?

Kullanici gunluk/haftalik kalori ve makro takibi yapabilsin diye.

## `revision_cache` Tablosu

Gemini tarif revizyon cevaplarini tutar.

Neden var?

Ayni tarif icin ayni revizyon istegi tekrar gelirse Gemini'ye tekrar istek atmak yerine eski cevap kullanilir.

Onemli kolonlar:

- `recipe_id`: Revize edilen tarif.
- `modifications_hash`: Revizyon isteginin hash'i.
- `response_json`: Gemini cevabi.

## En Onemli Iliski Haritasi

```text
users
  -> recipes
  -> favorites
  -> owned_ingredients
  -> disliked_ingredients
  -> daily_logs

recipes
  -> recipe_ingredients
  -> favorites
  -> daily_logs
  -> revision_cache

ingredients
  -> recipe_ingredients
  -> owned_ingredients
  -> disliked_ingredients
  -> ingredient_aliases
```

## Senaryolarla Anlatim

### Kullanici kayit olunca

1. Dogrulama kodu `email_verification_codes` tablosuna yazilir.
2. Kod dogrulaninca kullanici `users` tablosuna eklenir veya dogrulanir.

### Kullanici tarif ekleyince

1. Tarif ana bilgileri `recipes` tablosuna yazilir.
2. Malzemeler `ingredients` tablosundan bulunur.
3. Tarif-malzame baglantilari `recipe_ingredients` tablosuna yazilir.
4. Tarifin kalori ve makro degerleri hesaplanip `recipes` tablosuna kaydedilir.

### Kullanici favoriye ekleyince

1. `favorites` tablosuna `user_id` ve `recipe_id` yazilir.
2. Favoriler sayfasinda bu tablo okunur.

### Kullanici tarif onerisi isteyince

1. Kullanici malzemeleri ve dolap malzemeleri alinir.
2. Tariflerin malzemeleri `recipe_ingredients` uzerinden okunur.
3. Sevilmeyen malzemeler `disliked_ingredients` uzerinden kontrol edilir.
4. Tarif skoru hesaplanir.

### Gemini revizyonu yapilinca

1. Orijinal tarif `recipes` ve `recipe_ingredients` uzerinden okunur.
2. Revizyon istegi hashlenir.
3. `revision_cache` tablosunda ayni cevap var mi bakilir.
4. Yoksa Gemini'ye gidilir.
5. Cevap cache'e yazilir.
6. Kullanici kaydederse yeni tarif olarak `recipes` ve `recipe_ingredients` tablolarina yazilir.

## Hocaya Kisa Cevaplar

**Soru: Tarif ile malzeme nasil bagli?**  
Cevap: `recipe_ingredients` ara tablosu ile bagli. Bir tarifin birden fazla malzemesi, bir malzemenin de birden fazla tarifte kullanimi olabilir.

**Soru: Kullaniciya ozel tarif nasil ayriliyor?**  
Cevap: `recipes.user_id` doluysa tarif kullaniciya ozeldir. `NULL` ise global tariftir.

**Soru: Favoriler nerede tutuluyor?**  
Cevap: `favorites` tablosunda `user_id` ve `recipe_id` ile tutuluyor.

**Soru: Gunluk kalori takibi nerede tutuluyor?**  
Cevap: `daily_logs` tablosunda tutuluyor.

## 30 Saniyelik Ozet

Veritabaninda kullanicilar, tarifler ve malzemeler ana tablolardir. Tarif-malzame baglantisi `recipe_ingredients` ile kurulur. Favoriler, dolap malzemeleri, sevilmeyen malzemeler ve gunluk loglar kullaniciya baglidir. Gemini revizyon cevaplari `revision_cache` tablosunda tutulur.

