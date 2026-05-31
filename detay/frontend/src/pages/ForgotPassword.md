# ForgotPassword.jsx — Şifremi Unuttum

## Bu Dosya Ne İçin Var?

E-posta girerek şifre sıfırlama kodu almayı sağlar. İlk adım; ikinci adım `ResetPassword.jsx`.

## Mimarideki Yeri

**Katman:** Frontend Auth Sayfası

- `data-theme` attribute zorunlu
- `POST /api/auth/forgot-password`
- Başarı sonrası `/reset-password` sayfasına yönlendirilir

## Güvenlik Notu

E-posta sistemde kayıtlı olmasa bile "Gönderildi" mesajı gösterilir. Bu e-posta enumerasyonu saldırısını önler.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Kullanıcı yanlış e-posta girerse ne olur?**
  C: Aynı mesaj gösterilir ("kod gönderildi"). Backend'de kullanıcı yoksa e-posta gönderilmez ama frontend bunu bilemez.
