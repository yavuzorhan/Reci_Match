# Login.jsx — Giriş Sayfası

## Bu Dosya Ne İçin Var?

Kullanıcının e-posta ve şifresiyle uygulamaya giriş yapmasını sağlar. Başarılı girişte kullanıcı bilgileri `localStorage`'a kaydedilir ve Dashboard'a yönlendirilir.

## Mimarideki Yeri

**Katman:** Frontend Auth Sayfası

- `AppContext` → `setUser()` ile kullanıcıyı global state'e yazar
- `data-theme={isDarkMode ? 'dark' : 'light'}` → tema desteği zorunlu

## Akış

```
Kullanıcı e-posta/şifre girer →
POST /api/auth/login →
    Başarılı: { user: {id, name, email}, profile: {...} } →
        setUser(user) → localStorage'a yaz →
        navigate('/dashboard') →
    Başarısız: Hata mesajı göster
```

## Tema Desteği

```jsx
const { isDarkMode } = useApp();
return (
    <div className="auth-shell" data-theme={isDarkMode ? 'dark' : 'light'}>
```

Auth sayfaları Layout dışında render edilir. `data-theme` attribute olmadan CSS tema kuralları çalışmaz.

## Bağlantılar

- "Hesabınız yok mu? Kayıt olun" → `/register`
- "Şifremi unuttum" → `/forgot-password`

## Sıkça Sorulabilecek Hoca Soruları

- **S: Kullanıcı bilgisi nerede saklanıyor?**
  C: `localStorage['reciMatch_user']` key'inde JSON olarak. Sayfa yenilenince buradan okunur, giriş durumu korunur.

- **S: Hatalı şifre durumunda ne gösteriliyor?**
  C: "Geçersiz e-posta veya şifre." — Güvenlik nedeniyle hangi alanın yanlış olduğu belirtilmez.
