# CLAUDE.md — ReciMatch Proje Rehberi

> Bu dosya Claude Code'un otomatik okuduğu proje hafızasıdır.
> Her oturum sonunda yaptığın değişiklikleri **AGENT.md** dosyasına da kaydet.

---

## 📁 Proje Genel Bakış

**ReciMatch** — Kullanıcının elindeki malzemelere ve beslenme profiline göre tarif öneren full-stack web uygulaması.

| Katman    | Teknoloji                                          |
|-----------|----------------------------------------------------|
| Backend   | Python · FastAPI · SQLAlchemy · PostgreSQL/SQLite  |
| Frontend  | React · Vite · React Router · Context API · CSS   |
| E-posta   | SMTP (mailer.py) — marka adı: **ReciMatch**        |
| AI        | Gemini 2.5 Flash (tarif revizyonu + besin değeri) |
| Scraper   | yemekcom                                           |

**GitHub:** `https://github.com/yavuzorhan/Reci_Match.git`  
**Branch:** `main`

---

## 🗂️ Klasör Yapısı (Kritik Dosyalar)

```
backend/
  app/
    utils/mailer.py              ← E-posta gönderici (marka: ReciMatch)
    services/
      recipe_service.py          ← Tarif listeleme, öneriler, kalori hesabı
      recipe_revision_service.py ← Gemini ile tarif revizyonu + kayıt
      user_service.py            ← Günlük log, favori, profil
      ingredient_service.py      ← Malzeme + kategori
    routers/
      recipes.py                 ← /api/recipes endpoint'leri
      users.py                   ← /api/users/{id}/... endpoint'leri
      ingredients.py             ← /api/ingredients/...
    repositories/
      recipe_repository.py       ← SQL sorguları (tarif)
      user_repository.py         ← SQL sorguları (kullanıcı)
      ingredient_repository.py   ← SQL sorguları (malzeme)
  scraper/
    yemekcom_scraper.py          ← Besin değerleri: PER SERVING saklanır (total değil)

frontend/src/
  context/AppContext.jsx         ← Global state, tema yönetimi (per-user key)
  pages/
    Login.jsx / Login.css        ← Auth ekranı, her iki temada düğme okunabilirliği
    Register.jsx                 ← useApp() ile isDarkMode alıyor (data-theme attr var)
    Dashboard.jsx                ← Topbar (ReciMatch logo) KALDIRILDI
    Pantry.jsx / Pantry.css      ← Açık temada .pantry-best-match, .pantry-ai-tip düzeltildi
    RecipeListDb.jsx/.css        ← Açık tema + besin kartları okunabilir
    FavoritesDb.jsx/.css         ← Açık tema düzeltmeleri
    ProfileEdit.jsx/.css         ← danger-title: sadece kırmızı metin, arka plan yok
    IngredientSelection.jsx/.css ← noct-chip-tray, noct-ingredient-grid açık temada görünür
    Recommendations.jsx/.css     ← glass-panel filtre satırı açık temada okunuyor
    RecipeDetailDb.jsx/.css      ← Bell+AI Assistant kaldırıldı; markAsDone iyileştirildi
    HealthyMenu.jsx/.css         ← Bell+AI Assistant kaldırıldı; besin kartı eklendi
```

---

## 🎨 Tema Sistemi

### Kurallar
- **Varsayılan tema:** Açık (light) — tüm yeni kullanıcılar için
- **Tema hafızası:** `localStorage['reciMatch_theme_<userId>']` — kullanıcı bazlı
- Karanlık mod: `body.dark-mode` class + `data-theme="dark"` attribute birlikte
- **Auth sayfaları** (Login, Register, ForgotPassword, ResetPassword, VerifyEmail):
  - `data-theme={isDarkMode ? 'dark' : 'light'}` attribute zorunlu
  - `useApp()` ile `isDarkMode` alınmalı

### CSS Yazım Standardı
Açık tema override'larını şu formatta yaz:
```css
.layout-shell[data-theme="light"] .component,
.layout-shell:not([data-theme="dark"]) .component {
  background: rgba(255, 255, 255, 0.88) !important;
  color: #1f332d !important;
}
```

### Renk Paleti
| Token              | Açık Tema            | Karanlık Tema        |
|--------------------|----------------------|----------------------|
| Ana metin          | `#1f332d`            | `#d4e4fa`            |
| İkincil metin      | `#4b6358`            | `#b8af9b`            |
| Birincil renk      | `#10b981`            | `#4edea3`            |
| Kart arka planı    | `rgba(255,255,255,0.88)` | `rgba(2,26,22,0.88)` |
| Kart border        | `rgba(16,185,129,0.15)` | `rgba(16,185,129,0.42)` |

---

## 🧠 Veri Kuralları

### Besin Değerleri (KRİTİK)
- Tüm `calorie`, `protein`, `carbohydrate`, `fat` değerleri **1 porsiyon** için saklanır
- `yemekcom_scraper.py`: `per_serving_calorie` direkt saklanır (`* servings` YAPILMAZ)
- Eski BBC Good Food / EatingWell / Skinnytaste scraper hattı kaldırıldı; aktif scraper kaynağı yemek.com'dur.
- Tarif detayda gösterim: `calorie * servingCount` ile hesaplanır

### Kullanıcı İzolasyonu
- `Recipe.user_id IS NULL` → tüm kullanıcılara görünür (global tarif)
- `Recipe.user_id = X` → sadece kullanıcı X'e görünür
- `Ingredient.user_id IS NULL` → global malzeme
- `Ingredient.user_id = X` → özel malzeme
- Her API çağrısında `user_id` parametresi gönderilmeli

### E-posta Markası
Tüm e-posta konu ve içeriklerinde: **"ReciMatch"** kullan, "Akıllı Tarif Sistemi" kullanma.

---

## ⚙️ Sık Yapılan İşlemler

### Yeni Sayfa Açık Tema Desteği Eklemek
1. Sayfanın `layout-content:has(.page-class)` içinde `background-color: var(--noct-dark-bg)` varsa kaldır / override ekle
2. `.layout-shell[data-theme="light"]` ve `.layout-shell:not([data-theme="dark"])` ile override yaz
3. Metin rengi: `#1f332d`, arka plan: `rgba(255,255,255,0.88)`

### Yeni Auth Sayfası Eklemek
```jsx
import { useApp } from '../context/AppContext';
const { isDarkMode } = useApp();
// JSX'te:
<div className="auth-shell" data-theme={isDarkMode ? 'dark' : 'light'}>
```

### Topbar/Header Bileşeninden Bildirim + AI Assistant Kaldırmak
`Bell`, `Bot` import'larını ve ilgili `<button>` bloklarını sil.
`recipe-topbar-actions` veya `healthy-topbar-actions` div'ini tamamen kaldır.

---

## 🚫 Yapılmaması Gerekenler

- `reciMatch_theme` global localStorage key'ini kullanma → per-user key kullan
- Scraper'da `total = per_serving * servings` hesaplaması yapma
- Topbar'da Bell/AI Assistant butonu bırakma
- `danger-title`'a kırmızı `background` verme (sadece kırmızı `color`)
- Auth sayfasında `data-theme` attribute'u olmadan bırakma
- E-postalarda "Akıllı Tarif Sistemi" yazma
- `user_id` göndermeden `/api/recipes` isteği yapma (izolasyon bozulur)
- AddRecipeForm'da birim için serbest text input kullanma → `<select>` (Gram/ml/Adet) kullan
- `ensure_nutrition_for_ingredient`'ta DB'de bulunan malzeme için `manual_required` dönme → `resolved` döndür
- Gemini revizyon çıktısındaki malzemeleri filtrelemeden kaydetme → orijinal + kullanıcı eklentileri dışındakileri filtrele

---

## 🤖 Claude Code Ajan Modeli Seçim Rehberi

Claude Code'da görev tiplerine göre model seçimi:

### `claude-haiku-4-5` — Hızlı & Ucuz ✅
**Ne zaman kullan:**
- Tek bir CSS sınıfı değişikliği
- Sabit metin değiştirme (`sed`, `str_replace`)
- Import ekleme/çıkarma
- `console.log` / `print` ekleme
- Dosya kopyalama, klasör oluşturma
- Basit regex veya string manipülasyonu
- `grep`/`find` ile dosya arama

```bash
# Örnek: Haiku ile basit değişiklik
claude --model claude-haiku-4-5-20251001 \
  "Login.css dosyasında .primary-btn rengini #4edea3 yap"
```

### `claude-sonnet-4-6` — Dengeli ⚖️ (varsayılan)
**Ne zaman kullan:**
- JSX bileşeni yeniden yazma/düzenleme
- Python servis fonksiyonu ekleme/güncelleme
- Birden fazla dosyayı etkileyen mantıksal değişiklik
- CSS tema sistemi refactor
- API endpoint güncellemesi
- Context/state yönetimi değişikliği
- Hata ayıklama (birden fazla dosya inceleme)

```bash
# Örnek: Sonnet ile orta karmaşıklık
claude --model claude-sonnet-4-6 \
  "AppContext.jsx'e per-user tema yönetimi ekle"
```

### `claude-opus-4-6` — Güçlü & Pahalı 🔴
**Ne zaman kullan:**
- Mimari kararlar (yeni katman, servis tasarımı)
- Karmaşık algoritma (health score, nutrition hesaplama)
- Çok adımlı debugging (backend + frontend birlikte)
- Veritabanı migration tasarımı
- Gemini entegrasyonu veya besin değeri akışı değişikliği
- **Hiçbir zaman CSS değişikliği için kullanma**

```bash
# Örnek: Opus ile mimari karar
claude --model claude-opus-4-6 \
  "Health score algoritmasını protein/karbonhidrat dengesine göre yeniden tasarla"
```

### Alt Ajan Paralel Çalıştırma
Birbirinden bağımsız CSS dosyaları için paralel sub-agent kullan:
```
Task 1 (haiku): Pantry.css açık tema → 
Task 2 (haiku): FavoritesDb.css açık tema → 
Task 3 (haiku): RecipeListDb.css açık tema
```
(Paralel = zaman tasarrufu + maliyet düşürme)

---

## 📋 Oturum Sonrası Yapılacaklar

Her Claude Code oturumu bittiğinde **AGENT.md** dosyasını güncelle:

```markdown
## [TARİH] Oturum — [KONU]
**Model:** claude-sonnet-4-6
**Değiştirilen Dosyalar:**
- `path/to/file.jsx` — Ne değişti, neden
**Notlar:** Önemli kararlar, bilinen sorunlar
```

---

## 🔧 Geliştirme Ortamı

```bash
# Backend başlat
cd backend && uvicorn main:app --reload --port 8000

# Frontend başlat  
cd frontend && npm run dev

# Test
python test_recommendations.py

# Backfill (önce dry-run!)
python backend/scripts/backfill_health_scores.py --dry-run
python backend/scripts/backfill_health_scores.py --apply
```

---

## 📌 Bilinen Teknik Kararlar

1. Health score ≠ öneri skoru (ayrı algoritmalar)
2. Tarif miktar/birim orijinal haliyle saklanır, gram ayrı alanda
3. Protein bonusu yüksek kalori/yağ riskini tamamen kapatamaz
4. Eklenmiş şeker, malzeme adından tespit edilir (USDA'ya bağımlı değil)
5. Frontend cache, detay response'undaki malzeme listesini ezmemeli
6. `.env` ve veritabanı dosyaları GitHub'a gönderilmez
7. Besin değeri kaynağı olarak Gemini AI kullanılmaktadır. `nutrition_source` kolonu `'gemini'`, `'usda_legacy'`, `'manual'`, `'db'` değerlerini alabilir.

---

## 🔄 USDA → Gemini Migrasyonu (Mayıs 2026)

### Yapılan Değişiklik
Besin değeri altyapısı USDA FoodData Central API'den Gemini AI'a taşındı.

### Motivasyon
- Eski akış: Türkçe malzeme adı → `deep_translator` (çeviri) → `httpx` (USDA API) → parse → ayrı tablolara kayıt
- Bu zincir 3 dış bağımlılık ve 2 ekstra tablo gerektiriyordu
- Çeviri hataları, API erişim sorunları ve eşleştirme güvenilirliği sorunları yaşandı

### Yeni Mimari (2 Katmanlı)
1. **DB local:** `ingredient.calorie_per_100g > 0` ise doğrudan kullan
2. **Gemini:** `gemini_client.estimate_nutrition_with_gemini()` → inline kolonlara yaz
3. İkisi de başarısız → `"manual_required"` → kullanıcıdan manuel giriş

### Kaldırılan Bileşenler
- **Tablolar (DROP edildi):** `ingredient_nutrition_values`, `ingredient_usda_mappings`, `unmatched_ingredients`, `ingredient_unit_conversions`
- **Dosyalar:** `usda_client.py`, `usda_mapping_service.py`, `nutrition_fetcher.py`, `usda_food_data.py`, `import_usda_nutrition.py`
- **Paketler:** `deep_translator`, `httpx`

### Mevcut Tablo Sayısı: 13

### Kritik Dosyalar
| Dosya | Görev |
|---|---|
| `app/services/gemini_client.py` | Gemini'ye structured JSON ile 8 temel besin alanı sorgusu |
| `app/services/nutrition_resolver_service.py` | 2 katmanlı çözüm mantığı |
| `app/services/ingredient_resolver_service.py` | `resolve_ingredient_for_user()`, `upsert_ingredient_nutrition()` |
| `app/services/ingredient_nutrition_service.py` | Toplu backfill ve tek malzeme sync |
| `app/db/database.py` | `ensure_ingredient_inline_nutrition_columns()` — inline kolon guard |

### Yapılmaması Gerekenler
- `try_usda` parametresi kullanma → `try_ai` kullan
- `nutrition_value` relationship'i kontrol etme → `ingredient.calorie_per_100g > 0` kullan
- `IngredientNutritionValue` veya `IngredientUsdaMapping` import etme (sınıflar silindi)

### Besin Değeri Resolve Davranışı (Mayıs 2026)
- `ensure_nutrition_for_ingredient`: calorie > 0 ise direkt "resolved", 0 ise Gemini çağrılır
- Gemini başarılı → besin değeri yazılır, "resolved" döner
- Gemini başarısız (None) → DB'de bilinen malzeme ise yine "resolved" döner (0 besiniyle), bilinmeyen malzeme ise "manual_required"
- Backfill endpoint: `POST /api/ingredients/nutrition/sync-missing` body: `{"limit": 200}`

### Ingredient Inline Nutrition Daraltmasi (Mayis 2026)
- Health score hesaplamasi gercekte 8 alan kullanir: `calorie_per_100g`, `protein_per_100g`, `carbohydrate_per_100g`, `fat_per_100g`, `saturated_fat_per_100g`, `fiber_per_100g`, `sugar_per_100g`, `sodium_mg_per_100g`.
- `ingredients` tablosunda aktif inline besin kolonlari: `calorie_per_100g`, `protein_per_100g`, `carbohydrate_per_100g`, `fat_per_100g`, `saturated_fat_per_100g`, `fiber_per_100g`, `sugar_per_100g`, `sodium_mg_per_100g`, `nutrition_source`, `nutrition_confidence`.
- `NUTRITION_FIELDS` guncel tuple: `calorie_per_100g`, `protein_per_100g`, `carbohydrate_per_100g`, `fat_per_100g`, `saturated_fat_per_100g`, `fiber_per_100g`, `sugar_per_100g`, `sodium_mg_per_100g`.
- Kaldirilan kolonlar: `added_sugar_per_100g`, `trans_fat_per_100g`, `cholesterol_mg_per_100g`, `potassium_mg_per_100g`, `calcium_mg_per_100g`, `iron_mg_per_100g`, `vitamin_d_mcg_per_100g`. Neden: `REQUIRED_HEALTH_FIELDS` ve score hesaplamasi bu alanlari kullanmiyor; potasyum/kalsiyum/demir/D vitamini sadece eski referans deger olarak duruyordu.
- Temel malzemelerin eksik besin degerleri manuel yaklasik degerlerle doldurulabilir; bu kayitlarda `nutrition_source = 'manual'`, `nutrition_confidence = 0.9` kullanilir.
- `recipe_health.py`, eski `nutrition_value` relationship'i yerine dogrudan `ingredient` inline kolonlarini okur.
