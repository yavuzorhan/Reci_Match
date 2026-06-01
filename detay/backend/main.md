# main.py - Okunakli Detay

## Bu Dosya Ne Ise Yarar?

`main.py`, backend uygulamasinin baslangic dosyasidir. FastAPI uygulamasi burada olusturulur, middleware'ler burada eklenir, router dosyalari burada uygulamaya baglanir.

Kisaca backend'in ana giris kapisidir.

## Projedeki Yeri

- Katman: Uygulama baslangic noktasi
- FastAPI uygulamasini olusturur.
- CORS ayarlarini yapar.
- UTF-8 middleware ekler.
- Auth, recipes, users ve ingredients router'larini ekler.
- Upload edilen dosyalari `/uploads` yolundan servis eder.

## Bilmen Gereken Kavramlar

**FastAPI:** Python ile API gelistirmek icin kullanilan framework.

**Middleware:** Istek endpoint'e gitmeden once veya cevap frontend'e donmeden once araya giren kod katmanidir.

**CORS:** Frontend ve backend farkli portlarda calistiginda tarayicinin istege izin vermesi icin gereken ayardir.

**Router:** Endpoint'lerin gruplandigi dosyalardir.

**StaticFiles:** Resim gibi statik dosyalari URL uzerinden servis etmeyi saglar.

## Uygulama Nasil Basliyor?

`FastAPI(...)` ile uygulama nesnesi olusturulur. Burada API basligi, aciklamasi ve versiyonu tanimlanir. Bu bilgiler Swagger/OpenAPI dokumaninda gorunur.

Bu uygulama nesnesi daha sonra middleware, router ve endpoint'lerle genisletilir.

## UTF-8 Middleware

Bu dosyada `UTF8Middleware` adinda ozel bir middleware vardir.

Amaci:

JSON cevaplarda `charset=utf-8` yoksa eklemek.

Neden gerekli?

Projede Turkce metinler var. UTF-8 belirtilmesi Turkce karakterlerin bozulmadan gorunmesine yardim eder.

## CORS Ayarlari

Frontend React/Vite ile farkli portta calisir. Backend de baska portta calisir. Tarayici guvenlik nedeniyle farkli origin'den gelen isteklere her zaman izin vermez.

Bu yuzden CORS middleware eklenir.

Kodda su izinler verilmis:

- Tum origin'ler
- Tum method'lar
- Tum header'lar
- Credential destegi

Gelistirme ortaminda bu rahattir. Production ortamda daha sinirli origin kullanmak daha guvenlidir.

## Router'larin Eklenmesi

Bu dosyada su router'lar uygulamaya dahil edilir:

- `auth.router`
- `ingredients.router`
- `recipes.router`
- `users.router`

Bu sayede su tarz endpoint'ler aktif olur:

- `/api/login`
- `/api/register`
- `/api/recipes`
- `/api/ingredients`
- `/api/users/...`

## Upload Klasoru

Tarif resimleri backend tarafinda `uploads` klasorune kaydedilir.

`main.py`, bu klasoru su URL altinda servis eder:

```text
/uploads
```

Bu sayede frontend kaydedilen resme URL ile ulasabilir.

## Root Endpoint

Dosyanin sonunda `/` endpoint'i vardir.

Bu endpoint sadece backend ayakta mi kontrol etmek icin basit mesaj dondurur:

```json
{"message": "Welcome to Bitirme Backend API"}
```

## Veri Akisi

1. Backend calistirilir.
2. `main.py` FastAPI uygulamasini olusturur.
3. Middleware'ler eklenir.
4. Router'lar eklenir.
5. Frontend bir endpoint'e istek atar.
6. FastAPI ilgili router fonksiyonunu calistirir.

## Veritabani Iliskisi

`main.py` veritabanina dogrudan baglanmaz. DB session islemleri router'larda `Depends(get_db)` ile baslar.

Ama router'lari uygulamaya ekledigi icin backend akisi icin temel dosyadir.

## Hocaya Kisa Cevaplar

**Soru: Backend nereden basliyor?**  
Cevap: `main.py` dosyasindan. FastAPI uygulamasi burada olusturuluyor.

**Soru: Router'lar neden burada include ediliyor?**  
Cevap: Farkli dosyalardaki endpoint'lerin ana uygulamada aktif olmasi icin.

**Soru: CORS neden gerekli?**  
Cevap: Frontend ve backend farkli portlarda calistigi icin tarayicinin isteklere izin vermesi gerekir.

**Soru: Upload resimleri nasil gosteriliyor?**  
Cevap: `StaticFiles` ile `uploads` klasoru `/uploads` URL'i altinda servis ediliyor.

## 30 Saniyelik Ozet

`main.py`, backend'in baslangic dosyasidir. FastAPI uygulamasi burada kurulur, CORS ve UTF-8 middleware eklenir, router'lar baglanir ve upload edilen resimler servis edilir.

