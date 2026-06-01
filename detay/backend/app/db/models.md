# models.py - Okunakli Detay

## Bu Dosya Ne Ise Yarar?

`models.py`, veritabanindaki tablolarin Python tarafindaki karsiligidir. SQLAlchemy bu class'lari kullanarak `users`, `recipes`, `ingredients`, `favorites`, `daily_logs` gibi tablolarla calisir.

Kisaca bu dosya projenin veritabani haritasidir. Hangi tablo var, hangi kolonlari var, hangi tablo hangi tabloya bagli gibi bilgiler burada tanimlanir.

## Projedeki Yeri

- Katman: Model / ORM
- `database.py` dosyasindaki `Base` sinifini kullanir.
- Repository dosyalari bu modeller uzerinden sorgu yapar.
- Service katmani repository araciligiyla bu modellerdeki veriye ulasir.

## Bilmen Gereken Kavramlar

**Model:** Veritabani tablosunun Python class'i olarak tanimlanmis halidir.

**Column:** Tablo kolonunu temsil eder.

**Primary key:** Tablo icindeki her satiri benzersiz yapan ID alanidir.

**Foreign key:** Bir tablodaki kaydin baska tabloya baglanmasini saglar.

**Relationship:** SQLAlchemy tarafinda tablolar arasindaki iliskiyi Python nesnesi gibi kullanmayi saglar.

**Cascade:** Ana kayit silinince ona bagli alt kayitlarin da silinmesini saglayan kuraldir.

## Ana Tablolar

### `IngredientCategory`

Bu tablo malzeme kategorilerini tutar. Ornegin sebze, meyve, et, sut urunleri gibi kategoriler burada saklanabilir.

Onemli alanlar:

- `category_id`: Kategorinin benzersiz ID'si.
- `category_name`: Kategori adi.

Iliski:

- Bir kategorinin birden fazla malzemesi olabilir.

### `Ingredient`

Bu tablo tariflerde kullanilan malzemeleri tutar. Projede tarif eslestirme ve besin degeri hesaplama icin en onemli tablolardan biridir.

Onemli alanlar:

- `ingredient_id`: Malzemenin ID'si.
- `ingredient_name`: Malzemenin adi.
- `user_id`: Malzeme kullaniciya ozel mi global mi bilgisini verir.
- `calorie_per_100g`: 100 gram basina kalori.
- `protein_per_100g`: 100 gram basina protein.
- `carbohydrate_per_100g`: 100 gram basina karbonhidrat.
- `fat_per_100g`: 100 gram basina yag.
- `nutrition_source`: Besin bilgisinin kaynagi.
- `is_verified`: Besin bilgisinin dogrulanip dogrulanmadigi.

`user_id` alaninin anlami:

- `NULL` ise malzeme globaldir, tum kullanicilar gorebilir.
- Doluysa malzeme sadece o kullaniciya aittir.

Bu tablo neden onemli?

Tarifin kalori ve makro degerleri tarif malzemelerinden hesaplanir. Bu nedenle her malzemenin 100 gram basina besin degeri tutulur.

### `IngredientAlias`

Bu tablo malzemelerin alternatif adlarini tutar.

Ornek:

- `domates`
- `tomato`
- `domates rendesi`

Bu farkli yazimlar ayni malzemeye baglanabilir. Tarif eslestirme daha esnek calisir.

### `Recipe`

Bu tablo tariflerin ana bilgilerini tutar.

Onemli alanlar:

- `recipe_id`: Tarif ID'si.
- `recipe_name`: Tarif adi.
- `user_id`: Tarif global mi kullaniciya ozel mi bilgisini verir.
- `source`: Tarifin kaynagi.
- `recipe_category`: Tarif kategorisi.
- `preparation`: Hazirlanis adimlari.
- `serving`: Porsiyon sayisi.
- `calorie`, `protein`, `carbohydrate`, `fat`: Tarifin besin degerleri.
- `health_score`, `health_grade`, `health_explanation`: Saglik skoru bilgileri.
- `is_active`: Tarif aktif mi pasif mi.

`user_id` alaninin anlami:

- `NULL` ise tarif globaldir.
- Doluysa tarif kullaniciya ozel tariftir.

`is_active` neden var?

Tarif silindiginde veritabanindan tamamen yok etmek yerine pasif hale getirilebilir. Boylece iliskiler ve gecmis kayitlar daha kontrollu yonetilir.

### `RecipeIngredient`

Bu tablo tarif ile malzeme arasindaki ara tablodur.

Neden ara tablo var?

Bir tarifte birden fazla malzeme olabilir. Bir malzeme de birden fazla tarifte kullanilabilir. Bu coktan-coga iliskiyi `recipe_ingredients` tablosu kurar.

Onemli alanlar:

- `recipe_id`: Hangi tarif.
- `ingredient_id`: Hangi malzeme.
- `amount`: Miktar.
- `unit`: Birim.
- `miktar_gram`: Gram karsiligi.

`miktar_gram` neden onemli?

Besin degerleri 100 gram uzerinden tutulur. Tarifin toplam kalorisi hesaplanirken malzemenin tarifte kac gram kullanildigi gerekir.

### `User`

Bu tablo kullanici bilgilerini tutar.

Onemli alanlar:

- `user_id`: Kullanici ID'si.
- `name_surname`: Ad soyad.
- `email`: Benzersiz e-posta.
- `password_hash`: Hashlenmis sifre.
- `age`, `gender`, `height_cm`, `weight_kg`: Profil bilgileri.
- `objective`, `activity`, `meals`: Beslenme hedefi bilgileri.
- `daily_calorie`: Hesaplanan gunluk kalori hedefi.
- `is_verified`: E-posta dogrulanmis mi.

Sifre neden `password_hash` olarak tutuluyor?

Guvenlik icin sifreler duz metin olarak saklanmaz. Hashlenmis hali saklanir.

### `EmailVerificationCode`

Bu tablo OTP/dogrulama kodlarini tutar.

Kullanim alanlari:

- E-posta dogrulama
- Sifre sifirlama
- E-posta guncelleme
- Sifre guncelleme

Onemli alanlar:

- `email`: Kodun hangi e-postaya ait oldugu.
- `code`: 6 haneli kod.
- `purpose`: Kodun amaci.
- `expires_at`: Kodun gecerlilik suresi.

### `Favorite`

Bu tablo kullanicinin favori tariflerini tutar.

Iliski:

- `user_id`: Favoriyi ekleyen kullanici.
- `recipe_id`: Favorilenen tarif.

Bu tablo sayesinde her kullanici kendi favori tariflerini gorebilir.

### `DislikedIngredient`

Bu tablo kullanicinin sevmedigi malzemeleri tutar.

Tarif onerisi yapilirken bu tablo onemlidir. Kullanici sevilmeyen malzemeleri haric tutmak isterse sistem bu malzemeleri iceren tarifleri eleyebilir veya skorunu dusurebilir.

### `OwnedIngredient`

Bu tablo kullanicinin dolabindaki malzemeleri tutar.

Tarif onerisi yapilirken kullanicinin elindeki malzemeler dikkate alinir. Bu nedenle pantry/dolap ozelliginin temel tablosudur.

### `DailyLog`

Bu tablo kullanicinin gunluk yedigi tarifleri ve aldigi besin degerlerini tutar.

Onemli alanlar:

- `user_id`: Hangi kullanici.
- `recipe_id`: Hangi tarif.
- `log_date`: Hangi gun.
- `meal_type`: Hangi ogun.
- `calorie_intake`: Alinan kalori.
- `protein_intake`, `carbohydrate_intake`, `fat_intake`: Makro besinler.
- `serving_count`: Kac porsiyon.

Bu tablo haftalik/gunluk beslenme takibi icin kullanilir.

### `RevisionCache`

Bu tablo Gemini ile yapilan tarif revizyonlarini cache olarak tutar.

Neden var?

Ayni tarif icin ayni degisiklik tekrar istenirse Gemini API'ye tekrar gitmeye gerek kalmaz. Eski cevap buradan okunur.

Onemli alanlar:

- `recipe_id`: Hangi tarif revize edildi.
- `modifications_hash`: Istenen degisikliklerin hash'i.
- `response_json`: Gemini'nin verdigi cevap.

## En Onemli Iliskiler

Bir kullanicinin birden fazla favorisi olabilir:

```text
users -> favorites
```

Bir tarifin birden fazla malzemesi olabilir:

```text
recipes -> recipe_ingredients -> ingredients
```

Bir kullanicinin kendi ozel tarifleri olabilir:

```text
users -> recipes
```

Bir kullanicinin dolabinda birden fazla malzeme olabilir:

```text
users -> owned_ingredients -> ingredients
```

Bir kullanicinin sevilmeyen malzemeleri olabilir:

```text
users -> disliked_ingredients -> ingredients
```

Bir kullanicinin gunluk log kayitlari olabilir:

```text
users -> daily_logs -> recipes
```

## Sunum Icin En Onemli Kisimlar

Bu dosyada her tablo ayni derecede onemli degil. Sunumda en cok sorulabilecek kisimlar sunlardir.

### 1. `User`, `Recipe`, `Ingredient` Uclusu

Projenin temel verileri bu uc model uzerine kuruludur:

- `User`: Sistemdeki kullaniciyi temsil eder.
- `Recipe`: Sistemdeki tarifi temsil eder.
- `Ingredient`: Sistemdeki malzemeyi ve besin degerlerini temsil eder.

Tarif onerisi yapilabilmesi icin kullanicinin secimleri, tariflerin malzemeleri ve malzemelerin besin degerleri birlikte kullanilir.

Hocaya soyle anlatabilirsin:

"Hocam sistemin ana omurgasi kullanici, tarif ve malzeme tablolaridir. Kullanici malzeme secer, tariflerin malzemeleriyle karsilastirilir ve uygun tarifler bulunur."

### 2. `RecipeIngredient` Neden Cok Onemli?

`RecipeIngredient`, tarif ile malzeme arasindaki ara tablodur.

Bu tablo olmadan su bilgi tutulamazdi:

```text
Menemen tarifinde 2 adet domates var.
Menemen tarifinde 3 adet yumurta var.
```

Tarif ile malzeme arasinda coktan-coga iliski vardir:

```text
Bir tarifte birden fazla malzeme olabilir.
Bir malzeme birden fazla tarifte kullanilabilir.
```

Bu yuzden ara tablo gerekir.

Bu tablo sadece baglanti tutmaz. Ayni zamanda sunlari da tutar:

- Miktar
- Birim
- Gram karsiligi
- Gram donusum kaynagi
- Donusum guveni

Hocaya soyle anlatabilirsin:

"Hocam tarif-malzame iliskisini ayri tabloda tuttum cunku bir tarifte birden fazla malzeme var, bir malzeme de birden fazla tarifte kullanilabilir. Ayrica miktar ve birim bilgisi de bu iliskinin uzerinde tutuluyor."

### 3. Global Veri ve Kullaniciya Ozel Veri Ayrimi

`Recipe` ve `Ingredient` modellerinde `user_id` alani vardir.

Bu alanin mantigi:

```text
user_id = NULL  -> global veri, herkes gorebilir
user_id = 5     -> sadece 5 numarali kullaniciya ait veri
```

Bu sayede sistemde hem ortak tarif/malzeme havuzu olur hem de kullanici kendi tarifini veya malzemesini ekleyebilir.

Hocaya soyle anlatabilirsin:

"Hocam `user_id` bos ise kayit globaldir, dolu ise kullaniciya ozeldir. Boylece herkes ortak tarifleri gorebilir ama kullanicilarin kendi tarifleri birbirine karismaz."

### 4. Besin Degeri Hesabi Nereden Geliyor?

`Ingredient` tablosunda malzemelerin 100 gram basina besin degerleri tutulur:

- `calorie_per_100g`
- `protein_per_100g`
- `carbohydrate_per_100g`
- `fat_per_100g`

`RecipeIngredient` tablosunda ise tarifte kullanilan miktarin gram karsiligi tutulur:

- `miktar_gram`

Tarifin kalorisi kabaca su mantikla hesaplanir:

```text
malzeme_kalorisi = miktar_gram / 100 * calorie_per_100g
```

Tum malzemelerin degeri toplaninca tarifin toplam besin degeri olusur.

Hocaya soyle anlatabilirsin:

"Hocam malzemelerin besin degerlerini 100 gram uzerinden tutuyorum. Tarifteki miktar gram karsiligina cevriliyor ve bu degerle orantili kalori/makro hesabi yapiliyor."

### 5. Favori, Dolap, Sevilmeyen Malzeme ve Log Tablolari

Bu tablolar kullanici deneyimini kisisellestirir:

- `Favorite`: Kullanici hangi tarifleri favoriledi?
- `OwnedIngredient`: Kullanicinin dolabinda hangi malzemeler var?
- `DislikedIngredient`: Kullanici hangi malzemeleri sevmiyor?
- `DailyLog`: Kullanici hangi gun hangi tarifi yedi?

Tarif onerisi icin en onemli ikisi:

```text
OwnedIngredient + DislikedIngredient
```

Beslenme takibi icin en onemlisi:

```text
DailyLog
```

Hocaya soyle anlatabilirsin:

"Hocam sistem sadece tarif listelemiyor, kullaniciya gore kisisellestirme yapiyor. Dolaptaki malzemeler oneriyi guclendiriyor, sevilmeyen malzemeler tarif skorunu dusuruyor veya tarifi eliyor."

### 6. `RevisionCache` Neden Var?

`RevisionCache`, Gemini ile uretilen tarif revizyon cevaplarini saklar.

Ayni tarif icin ayni degisiklik tekrar istenirse Gemini'ye yeniden istek atilmaz. Cache'teki cevap kullanilir.

Bu uc acıdan faydalidir:

- Daha hizli cevap doner.
- Gemini API kotasi korunur.
- Gereksiz maliyet azalir.

Hocaya soyle anlatabilirsin:

"Hocam Gemini revizyonlari cache'leniyor. Ayni tarif ve ayni degisiklik tekrar istenirse tekrar AI modeline gitmek yerine kayitli cevap kullaniliyor."

## Veri Akisi

Tarif ekleme sirasinda:

1. Tarif ana bilgileri `recipes` tablosuna yazilir.
2. Malzemeler `ingredients` tablosundan bulunur.
3. Tarif-malzame baglantisi `recipe_ingredients` tablosuna yazilir.
4. Besin degerleri tarif kaydinda tutulur.

Tarif onerisi sirasinda:

1. Kullanici malzemeleri `owned_ingredients` veya secili ID listesinden gelir.
2. Tariflerin malzemeleri `recipe_ingredients` uzerinden okunur.
3. Sevilmeyen malzemeler `disliked_ingredients` tablosundan alinir.
4. Tarif skoru hesaplanir.

## Hocaya Kisa Cevaplar

**Soru: Neden `RecipeIngredient` tablosu var?**  
Cevap: Cunku bir tarifte birden fazla malzeme, bir malzemede de birden fazla tarif olabilir. Bu coktan-coga iliski ara tabloyla tutulur.

**Soru: Global tarif ile kullanici tarifi nasil ayriliyor?**  
Cevap: `recipes.user_id` bos ise global tarif, doluysa kullaniciya ozel tariftir.

**Soru: Malzemelerin besin degeri neden 100 gram uzerinden tutuluyor?**  
Cevap: Standart hesaplama yapabilmek icin. Tarif miktari grama cevrilip 100 gramlik degerle orantilanir.

**Soru: Gemini revizyon cache neden var?**  
Cevap: Ayni revizyon isteginde Gemini'ye tekrar istek atmayip onceki cevabi kullanmak icin.

## 30 Saniyelik Ozet

`models.py`, projenin veritabani haritasidir. Kullanici, tarif, malzeme, favori, dolap, gunluk log ve Gemini cache tablolarini tanimlar. Tarif-malzame iliskisi `RecipeIngredient` ile kurulur. Kullaniciya ozel veriler `user_id` ile ayrilir.
