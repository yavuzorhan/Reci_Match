# auth.py - Okunakli Detay

## Bu Dosya Ne Ise Yarar?

`auth.py`, kullanici kimlik islemleriyle ilgili API endpoint'lerini tanimlar. Kayit olma, e-posta dogrulama, giris yapma, sifre sifirlama, sifre guncelleme ve e-posta guncelleme istekleri bu dosyadan gecer.

Bu dosya sifre kontrolunu veya kod dogrulama mantigini kendisi yapmaz. Gelen istegi `auth_service.py` dosyasina aktarir.

## Projedeki Yeri

- Katman: Router
- Frontend auth ekranlarindan gelen istekleri karsilar.
- DB session'i `Depends(get_db)` ile alir.
- Is mantigi icin `auth_service.py` dosyasini cagirir.

## Bilmen Gereken Kavramlar

**Auth:** Kullanici kimlik dogrulama islemleridir.

**OTP:** Tek kullanimlik dogrulama kodudur.

**Schema:** Frontend'den gelen JSON verisinin beklenen seklidir.

**Endpoint:** Frontend'in istek attigi API adresidir.

## Endpointler

### `POST /api/register`

Kullanici kayit istegini alir.

Frontend su bilgileri gonderir:

- Ad soyad
- E-posta
- Sifre

Router bu bilgileri `RegisterRequest` schema ile alir ve `auth_service.register_user(...)` fonksiyonuna gonderir.

### `POST /api/verify`

E-posta dogrulama kodunu kontrol eder.

Frontend kullanicinin girdigi kodu ve e-postayi gonderir. Service bu kodu `email_verification_codes` tablosundaki kayitla karsilastirir.

### `POST /api/login`

Kullanici girisi yapar.

Frontend e-posta ve sifre gonderir. Service kullaniciyi bulur, sifreyi hash ile kontrol eder ve basariliysa kullanici bilgisini dondurur.

### `POST /api/forgot-password`

Sifresini unutan kullanici icin sifre sifirlama kodu uretir.

Service e-posta adresini kontrol eder, OTP kodu uretir ve mail olarak gonderir.

### `POST /api/reset-password`

Kullanici kod ile yeni sifre belirler.

Service kodu kontrol eder, dogruysa yeni sifreyi hashleyerek kullanici kaydina yazar.

### `POST /api/users/{user_id}/request-otp`

Kullanici guvenlik islemleri icin OTP ister.

Bu endpoint genelde e-posta veya sifre guncelleme oncesinde kullanilir.

### `POST /api/users/{user_id}/update-password`

Oturumdaki kullanicinin sifresini OTP ile gunceller.

### `POST /api/users/{user_id}/update-email`

Kullanicinin e-posta adresini OTP ile gunceller.

## Veri Akisi

Kayit akisi:

1. Frontend `/api/register` endpoint'ine istek atar.
2. Router veriyi `RegisterRequest` ile alir.
3. Router `auth_service.register_user` cagirir.
4. Service e-posta kontrolu yapar.
5. OTP kodu uretir.
6. Kod mail olarak gonderilir.
7. Kullanici `/api/verify` ile kodu dogrular.

Login akisi:

1. Frontend `/api/login` endpoint'ine e-posta ve sifre gonderir.
2. Router `auth_service.login_user` cagirir.
3. Service kullaniciyi DB'de bulur.
4. Sifre hash kontrolu yapar.
5. Basariliysa kullanici bilgisi frontend'e doner.

## Veritabani Iliskisi

Bu dosya veritabani sorgusunu dogrudan yazmaz. Ama service'e DB session verir.

Dolayli olarak su tablolar kullanilir:

- `users`
- `email_verification_codes`

## Hocaya Kisa Cevaplar

**Soru: Kayit endpoint'i ne yapiyor?**  
Cevap: Frontend'den gelen ad, e-posta ve sifreyi aliyor, auth service'e gonderiyor. Service dogrulama kodu uretip mail gonderiyor.

**Soru: Login kontrolu router'da mi yapiliyor?**  
Cevap: Hayir. Router sadece istegi aliyor. Sifre kontrolu `auth_service.py` icinde yapiliyor.

**Soru: OTP kodlari nerede tutuluyor?**  
Cevap: `email_verification_codes` tablosunda tutuluyor.

## 30 Saniyelik Ozet

`auth.py`, kayit, dogrulama, login ve sifre islemleri icin API kapisidir. Gelen veriyi schema ile alir, DB session'i ekler ve asil islemi `auth_service.py` dosyasina devreder.

