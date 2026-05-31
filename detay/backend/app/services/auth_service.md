# auth_service.py — Kimlik Doğrulama Servisi

## Bu Dosya Ne İçin Var?

Kullanıcı kayıt, giriş, e-posta doğrulama ve şifre sıfırlama işlemlerinin iş mantığını barındırır. Güvenlik açısından kritik bir dosyadır.

## Mimarideki Yeri

**Katman:** Service (İş Mantığı)

- `app/routers/auth.py` → bu servisi çağırır
- `app/utils/mailer.py` → e-posta gönderimi için
- `app/db/models.py` → `User` ve `EmailVerificationCode` modelleri

## Kayıt Akışı (2 Adımlı)

Kullanıcı anında kaydedilmez. Önce e-posta doğrulanır:

```
1. register_user() → OTP kod oluştur → e-posta gönder → "kod gönderildi" mesajı dön
2. verify_email()  → Kodu kontrol et → User tablosuna ekle → oturum açma bilgisi dön
```

**Neden 2 adımlı?** E-posta geçerliliğini doğrulamak için. Sahte e-posta ile kayıt önlenir.

**Geçici saklama:** `temp_name` ve `temp_password` doğrulama kodunun yanında `EmailVerificationCode` tablosunda saklanır. Doğrulama tamamlandığında `User` tablosuna taşınır.

## Fonksiyonlar

### `register_user(name, email, password, db)`
**Ne yapar:** Yeni kullanıcı kaydı için OTP kodu oluşturur ve e-posta gönderir.
**Güvenlik:** Parola `bcrypt.hashpw()` ile hash'lenir, düz metin saklanmaz.
**E-posta çakışması:** Aynı e-posta varsa 400 hatası döner.

### `verify_email(email, code, db)`
**Ne yapar:** 6 haneli kodu doğrular; doğruysa `User` tablosuna ekler.
**Süre kontrolü:** `expires_at < datetime.utcnow()` → 10 dakika geçmişse reddedilir.
**Temizleme:** Doğrulandıktan sonra OTP kaydı `db.delete(record)` ile silinir.

### `login_user(email, password, db)`
**Ne yapar:** E-posta ve şifre kontrol eder, başarılıysa kullanıcı bilgilerini döndürür.

**Şifre doğrulama:**
```python
if user.password_hash.startswith("$2b$"):
    is_valid = bcrypt.checkpw(password.encode(), user.password_hash.encode())
else:
    is_valid = user.password_hash == password  # Eski kayıtlar için fallback
```

**`is_verified` kontrolü:** E-postası doğrulanmamış kullanıcı giriş yapamaz.

**Güvenlik notu:** Başarısız girişte "Kullanıcı bulunamadı" değil, "Geçersiz e-posta veya şifre" dönülür. Bu sayede saldırgan hangi e-postaların kayıtlı olduğunu bilemez.

### `forgot_password(email, db)`
**Ne yapar:** Şifre sıfırlama kodu gönderir.
**Güvenlik:** E-posta sistemde kayıtlı olmasa bile "gönderildi" mesajı döner. Bu sayede e-posta enumerasyonu saldırısı önlenir.

### `reset_password(email, code, new_password, db)`
**Ne yapar:** Geçerli kodu doğrular, yeni parolayı bcrypt ile hash'leyip kaydeder.

### `request_otp_for_update(user_id, email, db)` + `security_update_password/email`
**Ne yapar:** Hesap içinden şifre/e-posta değiştirmek için OTP akışı. Oturum açıkken bile ek güvenlik katmanı.

## Kritik Kod Parçaları

```python
hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
```
`bcrypt.gensalt()` her çağrıda farklı "salt" üretir. Aynı parola için farklı hash'ler oluşur. Rainbow table saldırısına karşı koruma.

```python
code = generate_otp()  # 6 haneli rastgele sayı
record = EmailVerificationCode(
    expires_at=datetime.utcnow() + timedelta(minutes=10),
    ...
)
```
10 dakika geçerli OTP. Kısa süre → brute force riski azalır.

## Sıkça Sorulabilecek Hoca Soruları

- **S: JWT token kullanılmıyor mu?**
  C: Bu projede oturum yönetimi frontend tarafında `localStorage` ile yapılıyor. Backend her istekte `user_id` parametresini alıyor ve sorguluyor. Ticari sistemde JWT tercih edilir ama proje kapsamı için bu yaklaşım yeterli.

- **S: bcrypt neden md5/sha256 yerine?**
  C: bcrypt kasıtlı olarak yavaş algoritmadır. Birini kırmak çok zaman alır. Ayrıca her hash'e salt eklenir — aynı parola farklı hash verir. MD5/SHA256 hızlı ve salt eklenmeden kullanılınca çok savunmasız.

- **S: OTP süresi neden 10 dakika?**
  C: Çok kısa (1 dakika) kullanıcı deneyimini bozar. Çok uzun (1 saat) güvenlik riski oluşturur. 10 dakika pratik bir denge noktası.

- **S: Şifre sıfırlamada neden kullanıcı bulunamasa bile "gönderildi" deniyor?**
  C: E-posta enumerasyonu saldırısını önlemek için. Yoksa saldırgan "bu e-posta kayıtlı mı?" sorusunu otomatik sorgulayabilir.
