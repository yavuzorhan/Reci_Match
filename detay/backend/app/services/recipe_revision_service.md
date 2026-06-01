# recipe_revision_service.py - Okunakli Detay

## Bu Dosya Ne Ise Yarar?

`recipe_revision_service.py`, Gemini ile tarif revizyonu yapan dosyadir. Kullanici bir tarifte degisiklik yapmak istediginde bu servis orijinal tarifi alir, kullanicinin isteklerini Gemini'ye gonderir, gelen cevabi kontrol eder ve gerekirse kaydeder.

Bu dosya projenin AI entegrasyonu acisindan en onemli dosyalarindan biridir.

## Projedeki Yeri

- Katman: Service / AI entegrasyonu
- `recipes.py` router'i tarafindan cagrilir.
- Orijinal tarifi almak icin `recipe_repository.py` kullanir.
- Tarifi JSON'a cevirmek ve kaydetmek icin `recipe_service.py` kullanir.
- Gemini API ile iletisim kurar.
- Cache icin `revision_cache` tablosunu kullanir.

## Bilmen Gereken Kavramlar

**Gemini:** Google'in yapay zeka modelidir. Bu projede tarif revizyonu icin kullanilir.

**Prompt:** AI modeline verilen talimat metnidir.

**JSON schema:** Gemini'den beklenen cevabin hangi alanlardan olusacagini tanimlar.

**Cache:** Ayni islem tekrar istendiginde sonucu yeniden uretmek yerine onceki sonucu kullanmaktir.

**Hash:** Bir veriden benzersiz gibi davranan kisa ozet uretmektir. Burada ayni revizyon istegini tanimak icin kullanilir.

## Onemli Kod Parcalari

```python
REVISION_RESPONSE_SCHEMA = {...}
```

Bu schema Gemini'den beklenen cevabin seklini belirler.

Beklenen alanlardan bazilari:

- `recipe_name`
- `ingredients`
- `preparation`
- `serving`
- `cooking_type`
- `image_url`

Neden gerekli? Gemini serbest metin dondururse backend bunu isleyemez. Schema sayesinde cevap JSON formatinda ve belirli alanlarla gelir.

```python
api_key = (getenv("GEMINI_API_KEY") or "").strip()
```

Bu satir Gemini API anahtarini ortam degiskeninden okur.

Neden kod icine yazilmiyor? API key gizli bilgidir. `.env` dosyasinda tutulmalidir.

```python
model="gemini-2.5-flash"
```

Bu kod Gemini 2.5 Flash modelinin kullanildigini gosterir.

## Fonksiyonlar ve Mantik

### `revise_recipe(...)`

Bu fonksiyon bir tarifi Gemini ile revize eder.

Calisma mantigi:

1. URL'deki tarif ID ile request icindeki orijinal tarif ID uyumlu mu kontrol eder.
2. Orijinal tarifi malzemeleriyle birlikte DB'den alir.
3. Tarif bulunamazsa 404 hatasi verir.
4. Kullanicinin revizyon istegini dict'e cevirir.
5. Bu istegin hash'ini olusturur.
6. Ayni tarif + ayni istek daha once yapilmis mi diye cache kontrol eder.
7. Cache varsa Gemini'ye gitmeden eski cevabi dondurur.
8. Cache yoksa tarifi JSON'a cevirir.
9. Gemini'den revize tarif ister.
10. Gelen cevabi `RevisedRecipePayload` ile dogrular.
11. Cevabi `revision_cache` tablosuna kaydeder.
12. Frontend'e revize tarifi dondurur.

Bu fonksiyonda cache kullanilmasi onemlidir. Cunku Gemini API hem zaman alabilir hem de kota/maliyet sinirlarina sahip olabilir.

### `save_revised_recipe(...)`

Bu fonksiyon Gemini'den gelen revize tarifi kullaniciya ozel tarif olarak kaydeder.

Calisma mantigi:

1. Orijinal tarif DB'de var mi kontrol eder.
2. Gemini'den gelen payload'u dict'e cevirir.
3. `recipe_service.create_custom_recipe(...)` fonksiyonunu cagirir.
4. Revize tarif normal kullanici tarifi gibi kaydedilir.
5. Malzeme cozulmezse 422 hatasi dondurur.
6. Basariliysa frontend'i tarifler sayfasina yonlendirecek bilgi ekler.

Neden yeni kayit olarak kaydediliyor?

Orijinal global tarif bozulmasin diye. Kullanici revize tarifi kendi ozel tarifi olarak saklar.

### `_hash_modifications(modifications)`

Bu fonksiyon kullanicinin revizyon isteginden SHA-256 hash uretir.

Neden var?

Ayni tarif icin ayni degisiklik tekrar istenirse sistem bunu fark eder ve Gemini'ye tekrar istek atmaz.

Ornek:

Kullanici ayni tarifte iki kere "tuzu azalt" isterse, ikinci istekte cache kullanilabilir.

### `_revise_with_gemini(recipe_json, modifications)`

Bu fonksiyon Gemini API ile gercek iletisimi kurar.

Calisma mantigi:

1. Gemini paketi yuklu mu kontrol eder.
2. `GEMINI_API_KEY` var mi kontrol eder.
3. Gemini client olusturur.
4. Orijinal malzeme adlarini cikarir.
5. Kullanicinin eklemek/cikarmak istedigi malzemeleri cikarir.
6. Prompt metnini hazirlar.
7. Gemini'ye JSON formatinda cevap istemiyle istek atar.
8. Kota hatasi varsa 429 dondurur.
9. Gelen cevabi JSON'a cevirir.
10. Gemini'nin uydurdugu alakasiz malzemeleri filtreler.

Bu fonksiyondaki en kritik nokta malzeme filtrelemedir.

Gemini bazen tarifte olmayan malzemeler uydurabilir. Kod bunu engellemek icin sadece su malzemelere izin verir:

- Orijinal tarifte olan malzemeler
- Kullanicinin eklemek istedigi malzemeler

Cikarilan malzemeler de izinli listeden dusulur.

### `_parse_json_response(text)`

Gemini cevabini Python dict yapisina cevirir.

Bazen Gemini cevabi su sekilde markdown kod blogu icinde donebilir:

```text
```json
{ ... }
```
```

Bu fonksiyon once bu markdown isaretlerini temizler, sonra `json.loads` ile JSON'a cevirir.

## Gemini Prompt Mantigi

Prompt icinde Gemini'ye sunlar soylenir:

- Tarifi verilen degisikliklere gore revize et.
- Tarifin kimligini bozma.
- Yeni ve alakasiz malzeme uydurma.
- Sadece gerekli minimum degisikligi yap.
- Gramajlari porsiyon dengesine gore ayarla.
- Hazirlanis adimlarini yeni malzemeye gore yaz.
- Saglik skoru veya besin degeri iddiasi uretme.
- Sadece JSON dondur.

Bu kurallar modelin daha kontrollu cevap vermesi icin yazilmistir.

## Veri Akisi

1. Frontend revizyon istegini backend'e gonderir.
2. Router `recipe_revision_service.revise_recipe` fonksiyonunu cagirir.
3. Servis orijinal tarifi DB'den alir.
4. Revizyon istegi hashlenir.
5. Cache kontrol edilir.
6. Cache yoksa Gemini'ye prompt gonderilir.
7. Gemini JSON cevap dondurur.
8. Backend malzemeleri filtreler.
9. Cevap cache'e kaydedilir.
10. Frontend revize tarifi gosterir.
11. Kullanici kaydederse yeni ozel tarif olusur.

## Veritabani Iliskisi

Bu dosya su tablolari dolayli kullanir:

- `recipes`: Orijinal tarif okunur.
- `recipe_ingredients`: Orijinal tarifin malzemeleri okunur.
- `revision_cache`: Gemini cevaplari cache'lenir.
- `ingredients`: Revize tarif kaydedilirken malzemeler cozulur.

Kaydetme islemi dogrudan bu dosyada degil, `recipe_service.create_custom_recipe` uzerinden yapilir.

## Hocaya Kisa Cevaplar

**Soru: Gemini tarifi nasil revize ediyor?**  
Cevap: Backend orijinal tarifi ve kullanicinin istedigi degisiklikleri prompt olarak Gemini'ye gonderiyor. Gemini'den belirli JSON schema'ya uygun cevap isteniyor.

**Soru: Gemini alakasiz malzeme uydurursa ne oluyor?**  
Cevap: Backend cevap geldikten sonra malzemeleri filtreliyor. Sadece orijinal malzemeler ve kullanicinin eklemek istedigi malzemeler kalıyor.

**Soru: Cache neden var?**  
Cevap: Ayni tarif ve ayni revizyon istegi tekrar gelirse Gemini'ye tekrar istek atmak yerine eski cevap kullanılıyor.

**Soru: Revize tarif orijinal tarifi degistiriyor mu?**  
Cevap: Hayir. Kullanici kaydederse revize tarif yeni bir kullanici tarifi olarak kaydediliyor.

## 30 Saniyelik Ozet

`recipe_revision_service.py`, Gemini ile tarif revizyonu yapar. Orijinal tarifi ve kullanici degisikliklerini AI modele gonderir, JSON cevap alir, alakasiz malzemeleri filtreler, sonucu cache'e kaydeder ve kullanici isterse yeni ozel tarif olarak saklar.

