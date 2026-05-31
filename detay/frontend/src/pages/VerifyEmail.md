# VerifyEmail.jsx — E-posta Doğrulama

## Bu Dosya Ne İçin Var?

Kayıt sırasında gönderilen 6 haneli doğrulama kodunu girerek hesabı aktifleştirir.

## Mimarideki Yeri

**Katman:** Frontend Auth Sayfası

- `data-theme` attribute zorunlu
- `POST /api/auth/verify-email`
- Başarı sonrası `/profile-setup` sayfasına yönlendirilir

## Akış

```
Register'dan /verify-email sayfasına state={email} ile gelinir →
6 haneli kod girilir →
POST /api/auth/verify-email {email, code} →
    Başarılı: Kullanıcı DB'ye eklenir → navigate('/profile-setup', {state: {user}})
    Hatalı: "Geçersiz doğrulama kodu"
    Süresi dolmuş: "Kodun süresi dolmuş. Yeni kod isteyin."
```

## "Yeni Kod Gönder" Seçeneği

Kullanıcı kodu almadıysa veya süresi dolmuşsa yeni OTP istenebilir.
`POST /api/auth/register` → Aynı e-posta için yeni OTP kod oluşturur.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Doğrulama olmadan giriş yapılabilir mi?**
  C: Hayır. `login_user()` `is_verified = False` ise 401 döner: "Lütfen önce e-posta adresinizi doğrulayın."
