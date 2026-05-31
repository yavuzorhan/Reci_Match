# settings.py — Ortam Değişkenleri ve Uygulama Ayarları

## Bu Dosya Ne İçin Var?

Uygulamanın çalışmak için ihtiyaç duyduğu hassas bilgileri (veritabanı bağlantısı, e-posta şifresi, API anahtarları) yönetir. Bu bilgiler kaynak kodda değil, `.env` dosyasında saklanır ve Pydantic `BaseSettings` ile otomatik yüklenir.

## Mimarideki Yeri

**Katman:** Konfigürasyon

- `database.py` → `DATABASE_URL` için bu dosyayı kullanır
- `mailer.py` → SMTP ayarları için kullanır
- `gemini_client.py` → `GEMINI_API_KEY` için kullanır

## Nasıl Çalışır?

`pydantic-settings` kütüphanesi `.env` dosyasından değişkenleri okuyarak Python nesnelerine dönüştürür.

### Tipik `.env` içeriği:
```
DATABASE_URL=postgresql://user:password@localhost:5432/recimatch
SECRET_KEY=gizli-anahtar-buraya
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=no-reply@example.com
SMTP_PASSWORD=uygulama-sifresi
GEMINI_API_KEY=AIza...
```

## Neden `.env` Dosyası Kullanılıyor?

1. **Güvenlik:** Şifreler kaynak kodda olursa GitHub'a yüklenebilir. `.env` dosyası `.gitignore`'a eklenir.
2. **Taşınabilirlik:** Geliştirme, test ve production ortamları farklı değerler kullanabilir. Sadece `.env` değişir, kod değişmez.
3. **Konfigürasyon değişimi için kod değiştirmek gerekmez.**

## Kritik Ayarlar

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | PostgreSQL bağlantı adresi |
| `SECRET_KEY` | JWT token imzalama anahtarı |
| `SMTP_HOST/PORT/USER/PASSWORD` | E-posta gönderim ayarları |
| `GEMINI_API_KEY` | Google Gemini AI API anahtarı |

## Sıkça Sorulabilecek Hoca Soruları

- **S: `.env` dosyası nerede?**
  C: `backend/.env` konumunda, `.gitignore`'a eklenmiş olduğu için GitHub'da görünmez. Sadece `backend/.env.example` şablonu repoda var.

- **S: Gemini API anahtarı güvenli mi?**
  C: `.env` dosyasında saklanır ve kaynak kodda asla yazılmaz. `os.getenv("GEMINI_API_KEY")` ile okunur.

- **S: Pydantic BaseSettings ne işe yarar?**
  C: Ortam değişkenlerini otomatik okur ve tip kontrolü yapar. Eksik zorunlu değişken olursa uygulama başlamadan hata verir.

- **S: `.env.example` dosyası ne işe yarıyor?**
  C: Diğer geliştiricilere hangi değişkenlerin gerektiğini gösterir. Gerçek değerleri içermez, sadece şablon.
