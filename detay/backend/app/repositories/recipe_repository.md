# recipe_repository.py - Okunakli Detay

## Bu Dosya Ne Ise Yarar?

`recipe_repository.py`, tariflerle ilgili veritabani sorgularini toplar. Service dosyalari tarif aramak, tarif eklemek, tarif silmek, tarif malzemelerini yenilemek veya Gemini cache kaydina bakmak istediginde bu dosyayi kullanir.

Bu dosyanin amaci SQLAlchemy sorgularini service dosyalarinin icine dagitmamaktir.

## Projedeki Yeri

- Katman: Repository
- `recipe_service.py` tarafindan kullanilir.
- `recipe_revision_service.py` tarafindan kullanilir.
- `Recipe`, `Ingredient`, `RecipeIngredient`, `Favorite`, `DailyLog`, `RevisionCache` gibi modellerle calisir.

## Bilmen Gereken Kavramlar

**Repository:** Veritabani sorgularinin toplandigi katmandir.

**selectinload:** Iliskili verileri daha verimli yuklemek icin kullanilir. Ornegin tarifle birlikte tarif malzemelerini almak gibi.

**Soft delete:** Kaydi tamamen silmek yerine pasif hale getirmektir. Bu projede tarif silinirken `is_active=False` kullanilir.

## Ana Fonksiyonlar

### Tarif Bulma Fonksiyonlari

Bu dosyada tarifleri farkli sekillerde bulan fonksiyonlar vardir:

- `find_recipe_by_source_url`
- `find_recipe_by_name`
- `find_recipe_by_id`
- `find_recipe_by_id_with_relations`

`find_recipe_by_id_with_relations` ozellikle onemlidir. Cunku tarifi malzemeleriyle birlikte getirir. Tarif detay sayfasi ve Gemini revizyonu icin sadece tarif adi yetmez, malzeme listesi de gerekir.

### `create_recipe(db, **recipe_fields)`

Yeni tarif kaydi olusturur.

Calisma mantigi:

1. Gelen alanlarla `Recipe` nesnesi olusturur.
2. DB session'a ekler.
3. `db.flush()` ile ID'nin olusmasini saglar.
4. Tarif nesnesini dondurur.

`flush()` burada onemlidir. Yeni tarifin `recipe_id` degeri olusur ve hemen arkasindan `recipe_ingredients` tablosuna malzeme baglari yazilabilir.

### `delete_recipe(db, recipe)`

Tarifi aktif listeden kaldirir.

Bu fonksiyon once tarifle iliskili kayitlari temizler:

- `RecipeIngredient`
- `Favorite`
- `DailyLog`
- `HealthyRecipe`

Sonra tarifin `is_active` alanini `False` yapar.

Bu yaklasim tarifin tamamen yok edilmesi yerine sistemde pasif hale gelmesini saglar.

### `replace_recipe_ingredients(db, recipe_id, ingredient_rows)`

Bir tarifin malzeme listesini yeniler.

Calisma mantigi:

1. O tarife ait eski `recipe_ingredients` kayitlari silinir.
2. Yeni malzeme listesi tek tek eklenir.

Bu fonksiyon tarif ekleme ve tarif guncelleme sirasinda kullanilir.

Neden eski malzemeler silinip yenileri ekleniyor?

Guncellemede eski ve yeni malzemeler karismasin diye. Tarifin son hali neyse ara tablo onu tutsun.

### `get_all_recipes(...)`

Tarif listeleme ve tarif onerisi icin ana sorgu fonksiyonudur.

Filtreler:

- `user_id`
- `ids`
- `source`
- `recipe_category`
- `healthy_only`

En onemli satir mantigi:

```python
Recipe.user_id IS NULL veya Recipe.user_id == user_id
```

Bu su anlama gelir:

- Global tarifler herkes tarafindan gorulebilir.
- Kullaniciya ozel tarifler sadece o kullanici tarafindan gorulebilir.

Bu, kullanici izolasyonu icin kritik bir sorgudur.

### `find_ingredient_by_id(db, ingredient_id, user_id)`

Malzemeyi ID ile bulur ama kullanici kontrolu yapar.

Mantik:

- Malzeme global ise kullanilabilir.
- Malzeme bu kullaniciya aitse kullanilabilir.
- Baska kullanicinin ozel malzemesi ise kullanilamaz.

Bu kontrol ozel malzeme gizliligi icin gereklidir.

### `get_ingredients_by_ids(db, ingredient_ids)`

Birden fazla malzemeyi ID listesine gore getirir.

Tarif onerisi algoritmasinda kullanilir. Cunku frontend malzeme ID'leri gonderir, algoritma ise malzeme isimlerini karsilastirmak ister.

### Revision Cache Fonksiyonlari

Gemini revizyonu icin iki fonksiyon vardir:

- `find_revision_cache`
- `create_revision_cache`

`find_revision_cache`, ayni tarif ve ayni degisiklik daha once yapildi mi bakar.

`create_revision_cache`, Gemini cevabini `revision_cache` tablosuna kaydeder.

Bu sayede ayni AI istegi tekrar tekrar yapilmaz.

## Veri Akisi

Tarif listeleme:

1. Service `get_all_recipes` fonksiyonunu cagirir.
2. Repository aktif tarifleri filtreler.
3. Global tarifleri ve kullaniciya ait tarifleri getirir.
4. Sonuc service'e doner.

Tarif ekleme:

1. Service `create_recipe` cagirir.
2. Repository `recipes` tablosuna kayit ekler.
3. Service yeni tarif ID'siyle `replace_recipe_ingredients` cagirir.
4. Repository `recipe_ingredients` tablosunu doldurur.

Gemini cache:

1. Service revizyon istegi icin hash uretir.
2. Repository `find_revision_cache` ile cache arar.
3. Yoksa Gemini cevabi alinir.
4. Repository `create_revision_cache` ile cevap kaydedilir.

## Veritabani Iliskisi

Bu dosya dogrudan su tablolarla calisir:

- `recipes`
- `recipe_ingredients`
- `ingredients`
- `favorites`
- `daily_logs`
- `healthy_recipes`
- `revision_cache`
- `users`

## Hocaya Kisa Cevaplar

**Soru: Repository neden var?**  
Cevap: DB sorgularini tek yerde toplamak icin. Service is mantigini, repository sorgu mantigini tasir.

**Soru: Kullaniciya ozel tarifler nasil korunuyor?**  
Cevap: `get_all_recipes` sorgusu sadece global tarifleri ve ilgili kullanicinin tariflerini getiriyor.

**Soru: Tarif silme nasil yapiliyor?**  
Cevap: Iliskili kayitlar temizleniyor ve tarif `is_active=False` yapiliyor. Boylece aktif listede gorunmuyor.

**Soru: Gemini cache nerede kontrol ediliyor?**  
Cevap: `find_revision_cache` ve `create_revision_cache` fonksiyonlariyla `revision_cache` tablosu kullaniliyor.

## 30 Saniyelik Ozet

`recipe_repository.py`, tariflerle ilgili DB sorgularinin toplandigi dosyadir. Tarif bulma, tarif ekleme, tarif silme, tarif-malzame baglarini yenileme, kullaniciya ozel tarif filtreleme ve Gemini cache islemleri burada yapilir.

