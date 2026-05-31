# recipeInsights.js — Frontend Yardımcı Fonksiyonlar

## Bu Dosya Ne İçin Var?

Tarif verilerini frontend'de görselleştirmek için kullanılan yardımcı fonksiyonlar içerir: health grade renkleri, filtre uygulama, sağlık skoru gösterimi, özet oluşturma ve porsiyon normalleştirme.

## Mimarideki Yeri

**Katman:** Frontend Utility

- Neredeyse her sayfadan import edilir
- `AppContext.jsx` → `normalizeServingPortion` için
- `RecipeCard.jsx`, `RecipeDetailDb.jsx`, `HealthyMenu.jsx` → health meta için
- `Recommendations.jsx`, `RecipeListDb.jsx` → filtre uygulamak için

## Fonksiyonlar

### `getHealthTone(score)` — Health Renk Paleti
**Ne yapar:** 0-100 arası skor için arka plan, metin ve chip renkleri döner.

```javascript
if (score >= 80) return { bg: '#dcfce7', text: '#166534', chip: '#16a34a' };  // Yeşil (A)
if (score >= 60) return { bg: '#dbeafe', text: '#1e40af', chip: '#2563eb' };  // Mavi (B)
if (score >= 50) return { bg: '#fee2e2', text: '#991b1b', chip: '#dc2626' };  // Kırmızı (C)
return { bg: '#fee2e2', text: '#991b1b', chip: '#dc2626' };                   // Kırmızı (D)
```

**Neden bu renkler?** A → yeşil (iyi), B → mavi (dengeli), C/D → kırmızı (dikkat). Kullanıcı rengi görünce ne anlama geldiğini anlar.

### `getHealthGrade(score)` — Grade Metni
**Ne yapar:** Sayısal skoru "A kalite", "B kalite" vb. metne çevirir.

### `getHealthMeta(recipeOrScore)` — Kapsamlı Health Verisi
**Ne yapar:** Tarif nesnesinden veya skordan tüm health görselleştirme verisini tek seferde üretir.

```javascript
return {
    hasScore: true,
    score: 75,
    grade: "B",
    label: "B Kalite",
    display: "B",
    tone: { bg: ..., text: ..., chip: ... }
};
```

Hem ham skor hem `health_grade` alanını destekler (backend ikisini de gönderir).

### `applyRecipeFilters(recipes, activeFilters, options)` — Tarif Filtreleme
**Ne yapar:** Aktif filtrelere göre tarif listesini filtreler.

```javascript
activeFilters = ['fast', 'firin', 'excludeDisliked']
```

| Filtre | Mantık |
|---|---|
| `fast` | `total_time_minutes <= 30` |
| `firin` | `cooking_type` "fırın" içeriyor |
| `tava` | `cooking_type` "tava" içeriyor |
| `tencere` | `cooking_type` "tencere" içeriyor |
| `lowCalorie` | `health_flags` içinde "Dusuk kalorili" var |
| `highProtein` | `health_flags` içinde "Yuksek protein" var |
| `excludeDisliked` | Tarif malzemeleri sevilmeyen listesiyle kesişmiyor |

### `normalizeServingPortion(value, max)` — Porsiyon Sayısı Normalleştirme
**Ne yapar:** Girilen porsiyon değerini 1-99 arasında tam sayıya dönüştürür.

```javascript
normalizeServingPortion(0.5)  → 1   (minimum)
normalizeServingPortion(3.7)  → 3   (trunc, yukarı yuvarlama yok)
normalizeServingPortion(150)  → 99  (maksimum)
normalizeServingPortion("abc") → 1  (geçersiz giriş → 1)
```

Neden `Math.trunc()` ve `Math.max(1, ...)`: Yarım porsiyon yok, negatif porsiyon yok, sonsuz porsiyon yok.

### `buildRecipeShortSummary(recipe)` — Kısa Tarif Özeti
**Ne yapar:** Tarif kartı için kısa açıklama metni oluşturur.

Önce `explanation` alanından gerçek bir özet almaya çalışır. Health score metni (A kalite, B kalite vb.) özet gibi görünüyorsa atlar. Gerçek açıklama yoksa tarif adı ve kategorisinden otomatik cümle oluşturur.

### `stripHtml(value)` — HTML Temizleme
**Ne yapar:** Metin içindeki HTML tag'lerini kaldırır.
**Neden gerekli:** `explanation` alanı bazen HTML içeriyor olabilir (scraper'dan gelen veriler).

### `normalizeCookingType(value)` — Pişirme Tipi Normalleştirme
**Ne yapar:** "Fırın", "fırında", "FIRIN" → "firin" (ASCII, küçük harf, normalleştirilmiş)

```javascript
"Fırında" → "firinda" → "firin" içeriyor → "firin" döner
```

Türkçe karakterlerin (ı→i, ğ→g vb.) dönüştürülmesini içerir.

### `RECIPE_FILTER_OPTIONS` — Filtre Seçenekleri
UI'da gösterilen filtre butonlarının listesi. `label` görünen metin, `value` internal filtre kodu.

### `HEALTH_SCORE_MAX_PORTION = 99`
Maksimum porsiyon sayısı sabiti. Veritabanında `Numeric(6,2)` limitiyle uyumlu.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Neden health score renkleri JavaScript'te tanımlandı, CSS'de değil?**
  C: Dinamik renk gerekiyor — `score` sayısına göre hangi rengin kullanılacağı hesaplanıyor. Inline style olarak uygulanıyor. Sabit CSS sınıfları bu dinamizmi sağlayamaz.

- **S: `getHealthMeta()` neden hem skor hem grade kabul ediyor?**
  C: Backend bazen sadece grade döndürebilir (tarife göre). Bu fonksiyon her iki durumu da handle eder. Tutarsız API yanıtlarına karşı savunmalı programlama.

- **S: `looksLikeHealthScore()` fonksiyonu ne işe yarıyor?**
  C: `explanation` alanı bazen health score açıklaması içeriyor ("A kalite, dengeli..."). Tarif özeti olarak bu metin anlamsız. Bu fonksiyon o durumu tespit eder ve gerçek özet başka kaynaktan alınır.
