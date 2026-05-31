# schemas/auth.py — Kimlik Doğrulama Pydantic Şemaları

## Bu Dosya Ne İçin Var?

Kayıt, giriş, OTP doğrulama ve şifre sıfırlama isteklerinin veri yapılarını tanımlar.

## Önemli Şemalar

### `RegisterRequest`
```python
class RegisterRequest(BaseModel):
    name: str = Field(min_length=2)
    email: EmailStr          # Geçerli e-posta formatı kontrolü
    password: str = Field(min_length=6)
```

`EmailStr` → Pydantic'in yerleşik e-posta format doğrulayıcısı. "abc@" geçersiz, "abc@example.com" geçerli.

### `LoginRequest`
```python
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
```

### `VerifyEmailRequest`
```python
class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
```

`code` tam 6 karakter olmalı — fazlası veya eksiği 422 hatası.

### `ResetPasswordRequest`
```python
class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(min_length=6)
```

## Neden Şema Katmanı Ayrı?

Router'da inline doğrulama yazmak yerine Pydantic şemalar:
- Swagger belgesi otomatik oluşturur
- Hata mesajları standart 422 formatında
- Tekrar kullanılabilir — birden fazla endpoint aynı şemayı kullanabilir
