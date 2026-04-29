# Backend Kod İnceleme ve Katmanlı Mimari Düzenleme Planı

## 📊 Mevcut Durum Analizi

### ✅ İyi Durumda Olan Katmanlar
- **Routers (Presentation Layer)**: `auth.py`, `ingredients.py`, `recipes.py`, `users.py` → Temiz, ince, iş mantığı servis katmanına delege ediliyor
- **Schemas (DTO Layer)**: `auth.py`, `ingredient.py`, `recipe.py`, `user.py` → Pydantic modelleri uygun
- **Models (Data Layer)**: `models.py` → İlişkiler doğru tanımlanmış
- **Config**: `settings.py` → Temiz

### ⚠️ Sorunlu Alanlar

#### 1. Silinecek Gereksiz Dosyalar
| Dosya | Sebep |
|-------|-------|
| `test_recommendations.py` (kök) | Artık kullanılmayan test scripti |
| `backend/tmpf11neq93.pyc` | Geçici Python bytecode |
| `backend/tmpf11neq93.pyc.2720532897424` | Geçici dosya |
| `backend/recipe_app.db` | SQLite geliştirme dosyası (gitignore'da ama fiziksel olarak duruyor) |

#### 2. Backend Kökünden `scripts/` Altına Taşınacak Scriptler
| Dosya | Açıklama |
|-------|----------|
| `seed_ingredients.py` | Malzeme seed scripti → `scripts/` altına |
| `sync_healthy_recipes.py` | Sağlıklı tarif sync → `scripts/` altına |
| `sync_ingredient_nutrition_from_usda.py` | USDA sync → `scripts/` altına |
| `sync_ingredient_categories.py` | Kategori sync → `scripts/` altına |
| `merge_canonical_ingredients.py` | Birleştirme → `scripts/` altına |
| `normalize_healthy_recipe_ingredients.py` | Normalize → `scripts/` altına |
| `resequence_ingredient_ids.py` | ID yeniden sıralama → `scripts/` altına |
| `audit_ingredient_matching.py` | Audit → `scripts/` altına |
| `refresh_yemekcom_ingredients.py` | Refresh → `scripts/` altına |
| `translate_healthy_recipes.py` | Çeviri → `scripts/` altına |
| `import_yemekcom_diet_healthy_recipes.py` | Import → `scripts/` altına |

#### 3. Katmanlı Mimari İhlalleri

##### recipe_service.py (En Kritik)
- **707 satırlık dev dosya** — İş mantığı, veri erişimi, yardımcı fonksiyonlar hepsi iç içe
- DB sorguları doğrudan servis içinde (`db.query(...)`)
- `_unit_to_grams`, `_piece_gram_for_ingredient`, `_ascii_fold`, `_ingredient_keys` gibi utility fonksiyonlar servis içinde
- `_calculate_recipe_nutrition` ve `_ingredient_*_per_100g` helper fonksiyonları ayrılmalı
- `delete_custom_recipe` içinde inline import var: `from app.db.models import DailyLog, Favorite`

##### user_service.py
- `_ensure_daily_log_columns` → Runtime ALTER TABLE yapıyor (migration concern'ü)
- DB sorguları doğrudan servis içinde (repository pattern'e uymuyor)

##### ingredient_service.py
- DB sorguları doğrudan servis içinde

##### Repository Katmanı Yetersiz
- `ingredient_repository.py` sadece 2 fonksiyon (23 satır)
- `recipe_repository.py` sadece 4 fonksiyon (42 satır)
- User repository yok
- Servisler repository kullanmak yerine doğrudan `db.query()` çağırıyor

#### 4. database.py Sorunları
- `ensure_ingredient_inline_nutrition_columns` → Her request'te çağrılıyor, runtime DDL
- `declarative_base()` deprecated warning potansiyeli
- `check_connection` fonksiyonu hiçbir yerde kullanılmıyor

## 🔧 Yapılacak İşlemler (Öncelik Sırası)

### Faz 1: Temizlik
1. ✅ Gereksiz dosyaları sil (`test_recommendations.py`, `.pyc`, `.db`)
2. ✅ Backend kökündeki bağımsız scriptleri `backend/scripts/` altına taşı

### Faz 2: Repository Katmanını Genişlet
3. `user_repository.py` oluştur
4. `ingredient_repository.py` genişlet
5. `recipe_repository.py` genişlet

### Faz 3: Servis Katmanını Düzenle
6. `recipe_service.py`'den utility/helper fonksiyonları çıkar
7. Servislerdeki doğrudan DB sorgularını repository çağrılarına dönüştür
8. İnline import'ları düzelt

### Faz 4: database.py Temizliği
9. `check_connection` kaldır
10. Runtime DDL'leri migration'a taşınacak şekilde işaretle
