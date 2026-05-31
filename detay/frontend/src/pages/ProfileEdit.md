# ProfileEdit.jsx — Profil Düzenleme Sayfası

## Bu Dosya Ne İçin Var?

Kullanıcının mevcut beslenme profilini (yaş, boy, kilo, hedef, aktivite) günceller. Güvenli bilgi değiştirme (şifre/e-posta) için OTP akışı başlatır.

## Mimarideki Yeri

**Katman:** Frontend Sayfa

- `AppContext` → `profile`, `user`
- `PUT /api/users/{id}/profile` → profil güncelleme
- `POST /api/auth/request-otp` → şifre/e-posta değiştirme

## Bölümler

### Profil Bilgileri
Yaş, cinsiyet, boy, kilo, hedef, aktivite, öğün sayısı. Günlük kalori hedefi otomatik hesaplanır.

### Şifre Değiştirme
OTP akışı: "Şifre Değiştir" → OTP e-posta gönderilir → Kod girilir → Yeni şifre belirlenir.

### E-posta Değiştirme
Aynı OTP akışı. Yeni e-posta doğrulandıktan sonra güncellenir.

### Tehlike Bölgesi
Hesap silme seçeneği (`.danger-title` — sadece kırmızı metin, arka plan yok).

## Sıkça Sorulabilecek Hoca Soruları

- **S: Profil güncellenince kalori hedefi otomatik değişiyor mu?**
  C: Evet. Backend Harris-Benedict formülüyle yeniden hesaplar ve `daily_calorie` güncellenir. Dashboard anlık yansır.

- **S: OTP neden şifre değiştirmek için gerekli?**
  C: Ekstra güvenlik katmanı. Birisi oturumu ele geçirirse bile şifre değiştirmek için e-postaya erişim gerekir.
