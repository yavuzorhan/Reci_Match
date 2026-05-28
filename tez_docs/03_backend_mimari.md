# ReciMatch — Backend Mimari

Bu belge `backend/app` altındaki gerçek kod okunarak hazırlanmıştır. Güncel durumda backend FastAPI tabanlıdır, USDA besin altyapısı kaldırılmıştır ve besin değerleri Gemini + inline `ingredients` kolonları üzerinden yönetilir.

---

## 3a. Katman Yapısı

Backend dört ana katmandan oluşur:

| Katman | Dosyalar | Sorumluluk |
|---|---|---|
| Router / Presentation | `backend/app/routers/auth.py:23`, `ingredients.py:24`, `recipes.py:20`, `users.py:20` | HTTP endpoint tanımları, request schema alma, response döndürme |
| Service / Business Logic | `backend/app/services/*.py` | Kimlik, öneri, tarif, besin değeri, Gemini ve kullanıcı iş kuralları |
| Repository / Data Access | `backend/app/repositories/*.py` | SQLAlchemy sorgularını izole eder |
| Model / ORM | `backend/app/db/models.py:26` | 13 tabloyu SQLAlchemy sınıflarıyla temsil eder |

Örnek akış: kullanıcı özel tarif eklediğinde frontend `POST /api/users/{user_id}/custom-recipes` çağırır. İstek `recipes.py:104` router fonksiyonuna gelir, `recipe_service.create_custom_recipe()` çalışır, malzeme çözümü için `ingredient_resolver_service.resolve_ingredient_for_user()` kullanılır, kayıtlar `recipe_repository` üzerinden `recipes` ve `recipe_ingredients` tablolarına yazılır.

---

## 3b. Router Detayı

### Auth Router — `backend/app/routers/auth.py`

| Method | Path | Fonksiyon | Açıklama |
|---|---|---|---|
| POST | `/api/register` | `register` (`auth.py:23`) | Kayıt talebi ve OTP üretimi |
| POST | `/api/verify` | `verify_email` (`auth.py:28`) | E-posta doğrulama |
| POST | `/api/login` | `login` (`auth.py:33`) | Kullanıcı girişi |
| POST | `/api/forgot-password` | `forgot_password` (`auth.py:38`) | Şifre sıfırlama kodu |
| POST | `/api/reset-password` | `reset_password` (`auth.py:43`) | Yeni şifre kaydı |
| POST | `/api/users/{user_id}/request-otp` | `request_otp_for_update` (`auth.py:50`) | Güvenlik güncellemesi OTP |
| POST | `/api/users/{user_id}/update-password` | `security_update_password` (`auth.py:55`) | Şifre güncelleme |
| POST | `/api/users/{user_id}/update-email` | `security_update_email` (`auth.py:60`) | E-posta güncelleme |

### Ingredients Router — `backend/app/routers/ingredients.py`

| Method | Path | Açıklama |
|---|---|---|
| GET | `/api/ingredients/categorized` | Kategorili malzeme listesi |
| POST | `/api/users/{user_id}/custom-ingredients` | Kullanıcı özel malzemesi oluşturma |
| POST | `/api/ingredients/resolve` | Malzeme adını DB/Gemini ile çözme |
| POST | `/api/users/{user_id}/ingredients/manual` | Manuel besin değerli malzeme |
| GET/POST | `/api/users/{user_id}/ingredients` | Kiler listesi okuma/güncelleme |
| GET/POST | `/api/users/{user_id}/disliked-ingredients` | Sevilmeyen malzemeler |
| GET | `/api/ingredients/{ingredient_id}/nutrition` | Inline nutrition okuma |
| POST | `/api/ingredients/nutrition/sync` | Tek malzeme Gemini sync |
| POST | `/api/ingredients/nutrition/sync-missing` | Eksik besinleri toplu sync |

### Recipes Router — `backend/app/routers/recipes.py`

| Method | Path | Açıklama |
|---|---|---|
| GET | `/api/recipe-image` | Dış görsel proxy |
| GET | `/api/recipes` | Tarif listesi |
| GET | `/api/recipes/{recipe_id}` | Tarif detayı |
| POST | `/api/recipes/recommendations` | Malzemeye göre öneri |
| POST | `/api/healthy-recipes/sync` | `healthy_recipes` sync |
| POST | `/api/recipes/{recipe_id}/revise` | Gemini tarif revizyonu |
| POST | `/api/recipes/{recipe_id}/revise/save` | Revize tarifi kaydetme |
| POST/PUT/DELETE | `/api/users/{user_id}/custom-recipes...` | Kullanıcı tarif CRUD |
| POST | `/api/recipes/{recipe_id}/image` | Tarif görsel yükleme |
| POST | `/api/recipes/custom` | Eski uyumluluk endpoint'i |

### Users Router — `backend/app/routers/users.py`

Profil, favori ve günlük log endpointleri `users.py:20-103` arasında tanımlıdır. Ana yollar: `/api/users/{user_id}/profile`, `/favorites`, `/daily-logs`, `/daily-logs/totals`.

---

## 3c. Servis Detayı

| Servis | Fonksiyon sayısı | Ana sorumluluk |
|---|---:|---|
| `auth_service.py` | 8 | bcrypt şifre hashleme, OTP, mail, login/register |
| `user_service.py` | 18 | profil, kalori hedefi, favori, daily log |
| `recipe_service.py` | 13 | liste, detay, custom tarif, öneri, görsel yükleme |
| `ingredient_service.py` | 6 | kategori, kiler, sevilmeyen malzeme |
| `ingredient_matching_service.py` | 13 | normalize, alias, fuzzy match |
| `ingredient_resolver_service.py` | 9 | malzeme çözme ve nutrition upsert |
| `ingredient_nutrition_service.py` | 6 | nutrition okuma/sync/backfill |
| `nutrition_resolver_service.py` | 1 | DB local → Gemini çözüm |
| `gemini_client.py` | 1 | Gemini 2.5 Flash nutrition schema |
| `recipe_revision_service.py` | 5 | Gemini revizyon + cache |
| `healthy_recipe_service.py` | 2 | `healthy_recipes` tablosu sync |
| `recipe_import_service.py` | 3 | scraper çıktısını DB’ye yazma |

---

## 3d. Repository Detayı

`ingredient_repository.py` 14 fonksiyon içerir; kategori, global/user ingredient arama, alias arama, kiler ve sevilmeyen malzeme kayıtlarını yönetir.

`recipe_repository.py` 16 fonksiyon içerir; kaynak URL ile tarif bulma, tarif detay ilişkilerini yükleme, tarif oluşturma/silme, ingredient replace ve revision cache işlemlerini soyutlar.

`user_repository.py` 11 fonksiyon içerir; kullanıcı, favori ve daily log sorgularını servis katmanından ayırır.

---

## 3e. Besin Değeri Akışı

Eski sistem:

```text
Türkçe malzeme adı
  -> deep_translator ile İngilizce çeviri
  -> httpx ile USDA FoodData Central API
  -> USDA response parse
  -> ingredient_usda_mappings + ingredient_nutrition_values tabloları
```

Yeni sistem:

```text
Türkçe malzeme adı
  -> nutrition_resolver_service.resolve_ingredient_nutrition()
  -> DB local kontrolü: ingredient.calorie_per_100g > 0
  -> yoksa gemini_client.estimate_nutrition_with_gemini()
  -> 8 alanlı JSON schema
  -> ingredients inline kolonlarına yazma
```

Değişiklik nedeni: çeviri hataları, USDA eşleşme güvenilirliği, ekstra tablolar ve dış bağımlılıkların azaltılması. Güncel `NUTRITION_FIELDS` yalnızca 8 alan içerir (`nutrition_resolver_service.py:13`).

---

## 3f. Sağlık Skoru Hesaplama

`recipe_health.py` içinde ana giriş `build_recipe_health_profile()` (`recipe_health.py:104`) ve `calculate_health_score()` (`recipe_health.py:226`) fonksiyonlarıdır. Hesaplama kalori, protein, carbohydrate, fat, saturated fat, fiber, sugar ve sodium alanlarını kullanır.

Bileşenler:

- Kalori ve porsiyon değerlendirmesi.
- Protein oranı ve protein bonusu.
- Yağ oranı, saturated fat ve yüksek yağ hard cap kuralları.
- Karbonhidrat oranı ve rafine karbonhidrat riski.
- Malzeme riskleri: şeker, bal, pekmez, rafine karbonhidrat, ağır yağ, işlenmiş et.
- Pozitif sinyaller: sebze, baklagil, tam tahıl, lean protein, dairy.

Grade sistemi kodda A/B/C/D olarak üretilir. Proje dokümanında tez anlatımı için eşikler A ≥ 80, B ≥ 60, C ≥ 40, D < 40 olarak özetlenebilir; uygulama açıklaması `recipe_health.py` içinde score ve grade birlikte hesaplanır.

---

## 3g. Tarif Öneri Sistemi

Ana fonksiyon `recipe_service.get_recommendations()` (`recipe_service.py:388`) içinde bulunur. Sistem seçili malzemeler, pantry malzemeleri, disliked malzemeler, cooking type, source ve healthy filter parametrelerini değerlendirir.

Skor mantığı:

- Tarif malzemeleri ile seçili/kiler malzemeleri karşılaştırılır.
- Eşleşen malzeme sayısı ve oranı yükseldikçe skor artar.
- Eksik malzeme sayısı response içinde döner.
- Sevilmeyen malzeme varsa filtrelenebilir veya skor düşer.
- `healthy_only=True` olduğunda `healthy_recipes` bağlantısı kullanılır.

Response özetinde recipe bilgisi, match score, available/missing ingredients ve makro/health alanları yer alır.

---

## 3h. Gemini Entegrasyonu

### Besin Değeri — `gemini_client.py`

`NUTRITION_SCHEMA` `gemini_client.py:15` içinde tanımlıdır. Required alanlar calories, protein, carbs ve fat’tir; schema toplam 8 nutrition alanını kapsar. API çağrısı `client.models.generate_content()` ile `gemini-2.5-flash` modeline yapılır (`gemini_client.py:49`).

Rate limit yönetimi: hata metninde `ResourceExhausted`, `429` veya `quota` varsa FastAPI `HTTPException(429)` döndürülür (`gemini_client.py:61`).

### Tarif Revizyonu — `recipe_revision_service.py`

`REVISION_RESPONSE_SCHEMA` `recipe_revision_service.py:24` içinde tanımlıdır. Revizyon isteği orijinal tarif JSON’u ve kullanıcı değişiklikleriyle prompt’a çevrilir. Cevap JSON parse edilir ve `revision_cache` tablosuna kaydedilebilir. Aynı rate limit yaklaşımı burada da vardır (`recipe_revision_service.py:208`).
