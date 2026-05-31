# ResetPassword.jsx — Şifre Sıfırlama

## Bu Dosya Ne İçin Var?

E-posta ile alınan 6 haneli kodu ve yeni şifreyi girerek şifre sıfırlamayı tamamlar.

## Mimarideki Yeri

**Katman:** Frontend Auth Sayfası

- `data-theme` attribute zorunlu
- `POST /api/auth/reset-password`
- Başarı sonrası `/login` sayfasına yönlendirilir

## Akış

```
ForgotPassword'dan /reset-password?email=... ile gelinir →
6 haneli kod + yeni şifre girilir →
POST /api/auth/reset-password {email, code, new_password} →
    Başarılı: "Şifreniz güncellendi" → navigate('/login')
    Hatalı kod: "Geçersiz veya süresi dolmuş kod"
```

## Sıkça Sorulabilecek Hoca Soruları

- **S: Kod ne kadar süre geçerli?**
  C: 10 dakika. Backend `expires_at < datetime.utcnow()` kontrolü yapar.
