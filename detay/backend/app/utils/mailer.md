# mailer.py — E-posta Gönderici

## Bu Dosya Ne İçin Var?

Kullanıcılara doğrulama kodu ve şifre sıfırlama e-postaları gönderir. SMTP protokolü kullanır. Tüm e-postalar **ReciMatch** markası altında gönderilir.

## Mimarideki Yeri

**Katman:** Utility (Dış Servis)

- `auth_service.py` → `send_verification_email()` ve `send_password_reset_email()` için çağırır

## Fonksiyonlar

### `generate_otp(length=6) -> str`
**Ne yapar:** 6 haneli rastgele sayısal OTP kodu üretir.
**Örnek:** `"483921"`
**Neden sayısal?** Kullanıcının telefon/e-postadan kolayca girebileceği format.

### `send_verification_email(email, code)`
**Ne yapar:** Kayıt doğrulama kodu içeren e-posta gönderir.
**Konu:** "ReciMatch — E-posta Doğrulama Kodunuz"
**İçerik:** Kullanıcının gireceği 6 haneli kod ve 10 dakika geçerlilik uyarısı.

### `send_password_reset_email(email, code)`
**Ne yapar:** Şifre sıfırlama kodu içeren e-posta gönderir.
**Konu:** "ReciMatch — Şifre Sıfırlama Kodunuz"

## SMTP Yapılandırması

`.env` dosyasından şu değerleri okur:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=no-reply@recimatch.app
SMTP_PASSWORD=uygulama-sifresi
```

**Gmail ile kullanmak için:** Google Hesabında "Uygulama Şifreleri" oluşturulmalı. Normal parola SMTP için çalışmaz.

## Kritik Kod Parçaları

```python
with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
    server.starttls()          # TLS şifrelemesi
    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
    server.sendmail(from_addr, to_addr, message.as_string())
```

`starttls()` → Port 587'de şifreli bağlantı açar. Şifre ağda açık gitmez.

## Sıkça Sorulabilecek Hoca Soruları

- **S: E-posta gönderilemezse ne olur?**
  C: Exception fırlatılır ve kayıt işlemi başarısız olur. Kullanıcıya "E-posta gönderilemedi" hatası gösterilir.

- **S: Neden marka adı "ReciMatch", "Akıllı Tarif Sistemi" değil?**
  C: Profesyonel marka tutarlılığı. Tüm kullanıcıya yönelik iletişimde aynı marka adı kullanılır.

- **S: HTML e-posta mı, düz metin mi?**
  C: Hem HTML hem düz metin versiyonu gönderilir (`MIMEMultipart("alternative")`). E-posta istemcisi destekliyorsa HTML görünür, desteklemiyorsa düz metin.
