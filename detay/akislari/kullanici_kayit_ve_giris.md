# Kullanici Kayit ve Giris Akisi

## Kayit Akisi

1. Kullanici frontend'de Register ekranina ad, e-posta ve sifre girer.
// Ne oluyor: Frontend form verisini hazirlar.
// Neden gerekli: Backend kullanici kaydi icin bu bilgilere ihtiyac duyar.

2. Frontend `/api/register` endpoint'ine POST istegi atar.
// Ne oluyor: Istenen veri backend auth router'a gider.
// Neden gerekli: Kayit isleminin backend tarafinda kontrol edilmesi gerekir.

3. `auth.py` icindeki `register` fonksiyonu istegi alir.
// Ne oluyor: Router request body'yi `RegisterRequest` schema ile alir.
// Neden gerekli: Gelen verinin beklenen formatta olup olmadigi kontrol edilsin diye.

4. Router `auth_service.register_user(...)` fonksiyonunu cagirir.
// Ne oluyor: Asil kayit mantigi service katmanina aktarilir.
// Neden gerekli: Router sade kalsin, is kurallari service'te toplansin diye.

5. Service e-posta daha once kullanilmis mi kontrol eder.
// Ne oluyor: `users` tablosunda ayni e-posta var mi bakilir.
// Neden gerekli: Bir e-posta ile birden fazla hesap acilmasin diye.

6. Dogrulama kodu uretilir ve `email_verification_codes` tablosuna yazilir.
// Ne oluyor: Kullaniciya gonderilecek OTP kodu DB'de saklanir.
// Neden gerekli: Kullanici kodu girdiginde backend dogru mu kontrol edebilsin diye.

7. Kod e-posta ile kullaniciya gonderilir.
// Ne oluyor: SMTP ayarlari kullanilarak mail gonderilir.
// Neden gerekli: Kullanici e-posta sahibi oldugunu kanitlasin diye.

8. Kullanici kodu girince frontend `/api/verify` endpoint'ine istek atar.
// Ne oluyor: E-posta ve kod backend'e gider.
// Neden gerekli: Hesap dogrulanmadan aktif kayit tamamlanmasin diye.

9. Kod dogruysa kullanici `users` tablosuna eklenir veya dogrulanir.
// Ne oluyor: Kullanici kaydi kalici hale gelir.
// Neden gerekli: Login ve profil islemleri artik bu kullanici uzerinden yapilir.

## Giris Akisi

1. Kullanici Login ekraninda e-posta ve sifre girer.
// Ne oluyor: Frontend login formunu hazirlar.
// Neden gerekli: Backend kullaniciyi bulmak ve sifreyi kontrol etmek icin bu bilgilere ihtiyac duyar.

2. Frontend `/api/login` endpoint'ine POST istegi atar.
// Ne oluyor: Login bilgileri auth router'a gider.
// Neden gerekli: Giris kontrolu backend'de yapilir.

3. `auth.py` icindeki `login` fonksiyonu `auth_service.login_user(...)` cagirir.
// Ne oluyor: Router is mantigini service'e devreder.
// Neden gerekli: Sifre kontrolu ve kullanici dogrulama service katmaninda yapilsin diye.

4. Service kullaniciyi `users` tablosunda e-posta ile arar.
// Ne oluyor: E-postaya ait hesap var mi kontrol edilir.
// Neden gerekli: Olmayan kullanici giris yapamaz.

5. Girilen sifre hashlenmis sifre ile karsilastirilir.
// Ne oluyor: Duz sifre DB'de tutulmaz; hash kontrolu yapilir.
// Neden gerekli: Sifre guvenligi icin.

6. Basariliysa kullanici bilgisi frontend'e doner.
// Ne oluyor: Frontend kullaniciyi uygulama state'ine kaydeder.
// Neden gerekli: Sonraki isteklerde `user_id` ile kullaniciya ozel veriler alinabilsin diye.

## Hocaya 1 Dakikada Anlat

// Kayitta once kullanicidan bilgiler aliniyor, OTP kodu uretilip mail gonderiliyor.
// Kod dogrulaninca kullanici `users` tablosunda aktif hale geliyor.
// Giriste e-posta ile kullanici bulunuyor, sifre hash kontrolu yapiliyor.
// Basarili olursa frontend kullanici bilgisini saklayip kullaniciya ozel endpoint'leri kullanıyor.

