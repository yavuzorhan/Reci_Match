# routers/auth.py — Kimlik Doğrulama Endpoint'leri

## Bu Dosya Ne İçin Var?

Kullanıcı kayıt, giriş, e-posta doğrulama ve şifre sıfırlama HTTP endpoint'lerini tanımlar. İstekleri alır, temel doğrulama yapar ve `auth_service.py`'a iletir.

## Mimarideki Yeri

**Katman:** Router (HTTP Giriş Noktası)

- İstemci → Bu router → `auth_service.py` → `mailer.py` / `models.py`

## Endpoint'ler

| Method | URL | Açıklama |
|--------|-----|----------|
| POST | `/api/auth/register` | Yeni kullanıcı kaydı (OTP gönderir) |
| POST | `/api/auth/verify-email` | E-posta doğrulama kodu kontrolü |
| POST | `/api/auth/login` | Giriş yapma |
| POST | `/api/auth/forgot-password` | Şifre sıfırlama kodu gönder |
| POST | `/api/auth/reset-password` | Yeni şifreyi kaydet |
| POST | `/api/auth/request-otp` | Hesap güncelleme OTP iste |
| POST | `/api/auth/update-password` | Hesap içinden şifre güncelle |
| POST | `/api/auth/update-email` | Hesap içinden e-posta güncelle |

## Pydantic Şema Doğrulaması

FastAPI, her endpoint'e gelen veriyi otomatik doğrular:

```python
class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=6)
```

`password` 6 karakterden kısaysa FastAPI 422 hatasını otomatik döner — servis koduna ulaşmaz.

## Sıkça Sorulabilecek Hoca Soruları

- **S: JWT middleware var mı?**
  C: Bu projede JWT middleware kullanılmıyor. Kullanıcı kimliği her istekte query parameter olarak gönderilir (`user_id`). Servis katmanı bu ID'yi sorguluyor. Daha basit ama ticari uygulamalar için JWT tercih edilir.

- **S: Rate limiting var mı?**
  C: Şu an yok. OTP süresinin 10 dakika olması brute force'u zorlaştırıyor ama gerçek bir rate limit eklenebilir.
