# routers/ingredients.py — Malzeme API Endpoint'leri

## Bu Dosya Ne İçin Var?

Malzeme arama, listeleme, kategori sorgulama ve toplu besin değeri senkronizasyonu için HTTP endpoint'lerini tanımlar.

## Mimarideki Yeri

**Katman:** Router (HTTP Giriş Noktası)

- İstemci → Bu router → `ingredient_service.py`

## Endpoint'ler

| Method | URL | Açıklama |
|--------|-----|----------|
| GET | `/api/ingredients` | Malzeme listesi (arama destekli) |
| GET | `/api/ingredients/categories` | Kategori listesi |
| GET | `/api/ingredients/{id}` | Tek malzeme detayı |
| POST | `/api/ingredients/nutrition/sync-missing` | Eksik besin değerlerini Gemini ile doldur |

### `/api/ingredients?q=tavuk&user_id=1`
Arama terimi ve kullanıcı ID'si ile hem global hem kişisel malzemeleri listeler.

### `/api/ingredients/nutrition/sync-missing`
Body: `{"limit": 200}` — Maksimum 200 malzeme için besin değeri Gemini ile doldurulur. Uzun sürebilir.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Malzeme araması Türkçe karakter duyarlı mı?**
  C: Hayır, `normalize_turkish_text()` ile hem girdi hem DB değerleri normalleştirilir. "Soğan" = "sogan" = "SOĞAN".

- **S: Tüm malzemeleri listelemek yavaş değil mi?**
  C: Sayfalama (`limit`, `offset`) uygulanabilir. Şu an arama filtresiyle daraltılıyor.
