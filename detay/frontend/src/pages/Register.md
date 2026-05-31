# Register.jsx — Kayıt Sayfası

## Bu Dosya Ne İçin Var?

Yeni kullanıcının e-posta, şifre ve ad bilgileriyle kayıt olmasını sağlar. Kayıt anında kullanıcı oluşturulmaz; e-posta doğrulama kodu gönderilir.

## Mimarideki Yeri

**Katman:** Frontend Auth Sayfası

- `data-theme` attribute zorunlu (auth sayfası)
- Başarılı kayıt sonrası `/verify-email` sayfasına yönlendirilir

## Kayıt Akışı

```
Ad, e-posta, şifre gir →
POST /api/auth/register →
    OTP kodu e-postaya gönderildi →
navigate('/verify-email', { state: { email } }) →
VerifyEmail sayfasında 6 haneli kodu gir →
POST /api/auth/verify-email →
    Kullanıcı oluşturuldu →
navigate('/profile-setup')
```

## Validasyon

- Ad: minimum 2 karakter
- E-posta: geçerli format
- Şifre: minimum 6 karakter
- Şifre tekrar: şifreyle eşleşmeli

Frontend validasyonu + Pydantic şema validasyonu (backend) çift kontrol.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Kayıt neden iki adımlı?**
  C: E-posta geçerliliğini doğrulamak için. Sahte e-posta ile hesap açılmasını önler.

- **S: E-posta zaten kayıtlıysa ne oluyor?**
  C: Backend 400 hatası döner: "Bu email zaten kayıtlı."
