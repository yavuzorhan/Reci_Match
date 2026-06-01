# recipe_service.py - Okunakli Detay

## Bu Dosya Ne Ise Yarar?

`recipe_service.py`, tariflerle ilgili ana is mantiginin bulundugu dosyadir. Tarifleri listeleme, tarif detayi hazirlama, kullaniciya ozel tarif ekleme/guncelleme/silme, tarif resmi yukleme ve malzemeye gore tarif onerisi burada yapilir.

Router dosyalari HTTP istegini alir, ama asil kararlar burada verilir. Bu nedenle proje sunumunda en onemli backend dosyalarindan biridir.

## Projedeki Yeri

- Katman: Service
- `recipes.py` router'i bu dosyadaki fonksiyonlari cagirir.
- DB sorgulari icin `recipe_repository.py` kullanir.
- Malzeme cozme icin `ingredient_resolver_service.py` kullanir.
- Besin hesabi icin `recipe_helpers.py` kullanir.
- Saglik skoru icin `recipe_health.py` kullanir.

Bu dosya DB'ye dogrudan SQL yazmaz. Repository fonksiyonlarini cagirarak DB ile calisir.

## Bilmen Gereken Kavramlar

**Serialize etmek:** Veritabanindan gelen SQLAlchemy nesnesini frontend'in anlayacagi JSON/dict yapisina cevirmektir.

**Service katmani:** Projenin is kurallarinin bulundugu katmandir.

**Repository katmani:** Veritabanina sorgu atan katmandir.

**Malzeme eslestirme:** Kullanicinin sectigi malzemelerle tarif malzemelerini karsilastirip uygun tarif bulma isidir.

**Makro besin:** Protein, karbonhidrat ve yag gibi temel besin degerleridir.

## Onemli Fonksiyonlar

### `serialize_recipe_summary(...)`

Bu fonksiyon bir `Recipe` nesnesini kisa tarif karti verisine cevirir.

Frontend tarif listesinde genelde sunlari ister:

- Tarif ID
- Tarif adi
- Kategori
- Kalori
- Protein
- Karbonhidrat
- Yag
- Resim URL
- Saglik skoru
- Malzeme ID'leri

Bu fonksiyon bunlari tek bir dict olarak hazirlar.

Neden var? SQLAlchemy modelini direkt frontend'e gondermek uygun degildir. Frontend JSON bekler. Bu fonksiyon DB modelini frontend formatina cevirir.

### `serialize_recipe_detail(...)`

Bu fonksiyon tarif detay sayfasi icin daha kapsamli veri hazirlar.

`serialize_recipe_summary` ile gelen ana bilgilere ek olarak malzeme listesini de ekler:

- Malzeme ID
- Malzeme adi
- Miktar
- Birim
- Malzemenin 100 gramlik besin degeri

Bu fonksiyon tarif detay sayfasinda kullanilir.

### `_normalize_recipe_serving(serving)`

Bu fonksiyon porsiyon degerini kontrol eder.

Kurallar:

- Porsiyon bos olabilir.
- Doluysa sayiya cevrilebilmelidir.
- 1 ile 99 arasinda olmalidir.

Neden var? Kullanici 0, negatif veya cok buyuk porsiyon girerse besin hesaplari bozulabilir.

### `get_recipes(...)`

Bu fonksiyon tarif listesini getirir.

Kullanilabilecek filtreler:

- `user_id`: Kullaniciya gore global + ozel tarifleri getirir.
- `ids`: Belirli tarif ID'lerini getirir.
- `source`: Kaynaga gore filtreler.
- `recipe_category`: Kategoriye gore filtreler.
- `healthy_only`: Sadece saglikli tarifleri getirir.

Calisma mantigi:

1. Malzeme kolonlarinin hazir oldugundan emin olur.
2. Kullanici profilini alir.
3. Saglikli tarif filtresi varsa ilgili tabloyu hazirlar.
4. Repository'den tarifleri alir.
5. Her tarifi `serialize_recipe_summary` ile frontend formatina cevirir.

### `get_recipe_detail(recipe_id, db)`

Bu fonksiyon tek bir tarifin detayini getirir.

Calisma mantigi:

1. Tarif ID ile DB'de aranir.
2. Tarif yoksa 404 hatasi verilir.
3. Tarifin kullanici profiline gore saglik bilgileri hazirlanir.
4. Tarif detay JSON'u dondurulur.

Bu fonksiyon tarif detay sayfasi icin kullanilir.

### `_resolve_ingredients(...)`

Bu fonksiyon tarif ekleme veya guncelleme sirasinda gelen malzemeleri sistemdeki gercek malzeme kayitlariyla eslestirir.

Iki durum vardir:

1. Malzeme ID ile gelmistir.
2. Malzeme isim ile gelmistir.

Fonksiyon malzemeyi bulur, gerekirse besin degerini tamamlamaya calisir ve miktari grama cevirmeye calisir.

Neden onemli? Tarif besin hesabi yapilacaksa her malzemenin sistemde bir `ingredient_id` kaydi ve besin degeri olmalidir.

Eger malzeme otomatik cozulmezse `_ManualRequired` hatasi uzerinden frontend'e manuel giris gerektigi soylenir.

### `create_custom_recipe(...)`

Bu fonksiyon kullaniciya ozel tarif olusturur.

Calisma mantigi:

1. Kullanici var mi kontrol eder.
2. Tarif adi bos mu kontrol eder.
3. Malzeme listesi bos mu kontrol eder.
4. Porsiyon degerini dogrular.
5. Malzemeleri `_resolve_ingredients` ile cozer.
6. Besin degerlerini `calculate_recipe_nutrition` ile hesaplar.
7. Tarifi `recipes` tablosuna kaydeder.
8. Tarif-malzame baglarini `recipe_ingredients` tablosuna yazar.
9. Saglik skorunu hesaplar.
10. DB commit yapar.

Hata olursa `rollback` yapar. Bu sayede yarim kalmis tarif kaydi veritabaninda kalmaz.

### `update_custom_recipe(...)`

Bu fonksiyon kullaniciya ait mevcut tarifi gunceller.

Once tarifin var olup olmadigini ve bu kullaniciya ait olup olmadigini kontrol eder. Bu kontrol onemlidir, cunku bir kullanici baska kullanicinin tarifini degistirmemelidir.

Sonra tarif bilgilerini gunceller, malzeme listesini yeniler ve besin degerlerini tekrar hesaplar.

### `delete_custom_recipe(...)`

Bu fonksiyon kullaniciya ait tarifi siler.

Kodda tarif tamamen yok edilmek yerine repository tarafinda `is_active=False` yapilir. Boylece tarif aktif listelerde gorunmez.

Bu yontem daha kontrolludur, cunku tarifle iliskili eski kayitlarin yonetimi kolaylasir.

### `upload_recipe_image(...)`

Bu fonksiyon kullanici tarifine resim yukler.

Kontroller:

- Tarif kullaniciya ait mi?
- Dosya tipi `jpeg`, `png` veya `webp` mi?
- Dosya boyutu 5 MB'dan kucuk mu?

Resim yuklenince PIL ile islenir, 1200x1200 sinirina kucultulur ve JPEG olarak kaydedilir.

### `get_recommendations(...)`

Bu fonksiyon projenin ana ozelliklerinden biridir. Kullanicinin sectigi malzemelere gore tarif onerisi hesaplar.

Gelen veriler:

- Secili malzemeler
- Dolaptaki malzemeler
- Sevilmeyen malzemeler
- Pisirme tipi filtreleri
- Kullanici ID
- Saglikli tarif filtresi

Calisma mantigi:

1. Secili malzemeler ve dolap malzemeleri set'e cevrilir.
2. Sevilmeyen malzemeler belirlenir.
3. Malzeme ID'lerinden malzeme adlari bulunur.
4. Malzeme adlari eslestirme anahtarlarina cevrilir.
5. Kullaniciya gorunebilen tarifler DB'den alinir.
6. Her tarifin malzemeleri kullanici malzemeleriyle karsilastirilir.
7. Eslesen, eksik ve sevilmeyen malzemeler ayrilir.
8. Tarif icin skor hesaplanir.
9. Sonuclar skora gore siralanir.

## Tarif Skoru Nasil Hesaplanir?

Skor birden fazla parcadan olusur:

**Secili malzeme skoru:** Kullanicinin ozellikle sectigi malzemeler en onemli girdidir. Bu nedenle en fazla 75 puan getirir.

**Dolap malzemesi skoru:** Kullanıcının pantry/dolap malzemeleri destekleyici puan verir. En fazla 15 puan getirir.

**Tarif uyum bonusu:** Tarifin toplam malzemelerinin ne kadari eslesiyor ona gore ek puan gelir.

**Eslesen malzeme bonusu:** Eslesen malzeme sayisi arttikca kucuk bonus gelir.

**Sevilmeyen malzeme cezasi:** Tarif sevilmeyen malzeme iceriyorsa puan duser. Kullanici "sevilmeyenleri haric tut" derse tarif tamamen elenir.

Bu sistem sayesinde sadece bir malzeme eslesti diye tarif one cikmaz; genel uyum da dikkate alinir.

## Veri Akisi

Tarif onerisi icin veri akisi:

1. Frontend malzeme ID'lerini backend'e gonderir.
2. Router istegi `recipe_service.get_recommendations` fonksiyonuna yollar.
3. Service malzeme adlarini DB'den alir.
4. Tarifleri repository'den alir.
5. Malzemeleri karsilastirir.
6. Skor hesaplar.
7. Frontend'e sirali tarif listesi dondurur.

Ozel tarif ekleme icin veri akisi:

1. Frontend tarif formunu backend'e gonderir.
2. Service kullaniciyi kontrol eder.
3. Malzemeleri cozer.
4. Besin degeri hesaplar.
5. `recipes` ve `recipe_ingredients` tablolarina kayit yapar.

## Veritabani Iliskisi

Bu dosya su tablolara dolayli olarak dokunur:

- `recipes`
- `recipe_ingredients`
- `ingredients`
- `users`
- `favorites`
- `daily_logs`
- `healthy_recipes`

DB sorgulari dogrudan burada yazilmaz; `recipe_repository.py` uzerinden yapilir.

## Hocaya Kisa Cevaplar

**Soru: Tarif onerisi nasil calisiyor?**  
Cevap: Kullanıcının malzemeleri tarif malzemeleriyle normalize edilerek karsilastiriliyor. Eslesen malzemeler puan getiriyor, eksik malzemeler listeleniyor, sevilmeyen malzemeler ceza veriyor. Sonuclar skora gore siralaniyor.

**Soru: Tarif eklenince besin degeri nasil hesaplanıyor?**  
Cevap: Malzemeler DB'deki besin degerleriyle eslestiriliyor. Miktarlar grama cevriliyor. Her malzemenin 100 gramlik degeriyle miktari orantilanip toplam kalori ve makrolar hesaplanıyor.

**Soru: Bir kullanici baskasinin tarifini silebilir mi?**  
Cevap: Hayir. Guncelleme ve silme oncesinde tarifin `user_id` degeri kontrol ediliyor.

**Soru: Neden repository kullanildi?**  
Cevap: Service is mantigini yonetiyor, repository ise DB sorgularini topluyor. Bu katmanli yapi kodu daha duzenli yapıyor.

## 30 Saniyelik Ozet

`recipe_service.py`, tarif is mantiginin merkezidir. Tarifleri frontend'e uygun formata cevirir, ozel tarif ekler/gunceller/siler, resim yukler ve malzemeye gore tarif onerisi hesaplar. Projenin ana algoritmasi olan tarif eslestirme burada calisir.

