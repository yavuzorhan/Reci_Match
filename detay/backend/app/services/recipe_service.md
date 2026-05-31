# recipe_service.py — Tarif İş Mantığı Servisi

## Bu Dosya Ne İçin Var?

Tarif işlemlerinin iş mantığını barındırır: listeleme, detay gösterimi, öneri hesaplama, tarif ekleme/güncelleme/silme. HTTP isteği almaz; router'dan çağrılır ve repository katmanını kullanır.

## Mimarideki Yeri

**Katman:** Service (İş Mantığı)

- `app/routers/recipes.py` → bu servisi çağırır
- `recipe_repository.py` → SQL sorguları için kullanılır
- `recipe_health.py` → health score hesaplamak için
- `ingredient_resolver_service.py` → yeni tarifte malzemeleri çözmek için

## Fonksiyonlar

### `serialize_recipe_summary(recipe, calorie_target, meal_count)`
**Ne yapar:** Bir Recipe veritabanı nesnesini JSON'a uygun sözlüğe dönüştürür. Health profile de dahil eder.
**Neden ayrı fonksiyon:** Hem liste, hem detay, hem öneri endpoint'leri aynı temel alanları döndürür. Tekrarı önler, değişiklik tek yerde yapılır.

### `serialize_recipe_detail(recipe, calorie_target, meal_count)`
**Ne yapar:** `serialize_recipe_summary`'yi genişletir; malzeme listesini de ekler.
**Fark:** Tarif detay sayfası hem temel bilgiyi hem her malzemenin adını, miktarını ve besin değerini gösterir.

### `get_recipes(user_id, ids, source, recipe_category, healthy_only, db)`
**Ne yapar:** Filtreli tarif listesini döndürür.
**Parametreler:**
- `user_id` → Kullanıcının kişisel tarif izolasyonu için zorunlu
- `ids` → Sadece belirli ID'leri getir (favoriler, loglar için)
- `source` → "yemekcom", "custom" vb. filtresi
- `healthy_only` → True ise sadece `healthy_recipes` tablosundaki tarifler

### `get_recipe_detail(recipe_id, db)`
**Ne yapar:** Tek bir tarifin tam detayını döndürür, malzeme listesiyle birlikte.

---

### `get_recommendations(...)` — Öneri Algoritması

**Ne yapar:** Kullanıcının seçtiği malzemelere en uygun tarifleri puanlayarak sıralar.

**Parametreler:**
- `selected_ingredient_ids` → Kullanıcının aktif seçtiği malzemeler (ör: "bugün tavuk, soğan, domates var")
- `pantry_ingredient_ids` → Kullanıcının dolabındaki malzemeler (ek bonus)
- `disliked_ingredient_ids` → Sevilmeyen malzemelerin ID listesi
- `exclude_disliked` → True ise sevilmeyen malzeme içeren tarifler tamamen hariç tutulur

**Puan Formülü:**

```python
selected_score = (selected_hit_count / len(selected_ids)) * 75
# Seçili malzemelerin tarifle eşleşme oranı. MAX 75 puan.
# En ağırlıklı faktör: kullanıcının "o an istediği" malzemeler.

pantry_score = (pantry_hit_count / len(pantry_only_ids)) * 15
# Dolaptaki malzemelerin eşleşme oranı. MAX 15 puan.
# "Bu malzemeleri de kullanabilirsin" bonusu.

recipe_bonus = min(10, recipe_match_ratio * 20)
# Tarifteki malzemelerin kaçının eşleştiği. MAX 10 puan.
# Tarif "tamamlanabilirliği" — az malzeme eksik = yüksek puan.

matched_bonus = min(10, matched_count * 2)
# Eşleşen toplam malzeme sayısı. Her malzeme +2. MAX 10 puan.

disliked_penalty = disliked_count * 35
# Sevilmeyen her malzeme için -35 puan.

score = selected_score + pantry_score + recipe_bonus + matched_bonus - disliked_penalty
```

**Eşleşme mantığı:** `ingredient_keys()` fonksiyonu malzeme adını küçük token'lara böler. "Tavuk Göğsü" → {"tavuk", "gogsu"}. Token kesişimi ile eşleşme bulunur. Böylece "tavuk" seçildiğinde "Tavuk Kanat", "Tavuk Göğsü", "Tavuk Sote" tarifteki malzemeler eşleşir.

**Örnek senaryo:**
Kullanıcı 3 malzeme seçti (tavuk, soğan, domates). Tarif "Tavuk Sote" içeriyor, 2 malzeme eşleşiyor (tavuk, soğan).
- selected_score = (2/3) × 75 = **50**
- recipe_bonus = 2/3 = 0.67 → min(10, 0.67×20) = **10**
- matched_bonus = min(10, 2×2) = **4**
- Toplam = **64 puan**

**Sıralama:** Puan azalan, eşleşen malzeme sayısı azalan, eksik malzeme sayısı artan, isim artan.

---

### `create_custom_recipe(...)` (async)
**Ne yapar:** Kullanıcının yeni özel tarif eklemesini sağlar.

**Akış:**
1. Kullanıcı ve ad doğrulaması
2. `_resolve_ingredients()` → Her malzeme için besin değerini bul
3. `calculate_recipe_nutrition()` → Toplam besin değerini hesapla
4. `recipe_repository.create_recipe()` → DB'ye kaydet
5. `build_recipe_health_profile()` → Health score hesapla
6. `db.commit()` → Kalıcı kaydet

**`_ManualRequired` exception:** Malzemenin besin değeri bulunamazsa bu iç exception fırlatılır; işlem geri alınır ve `{"status": "manual_required", "ingredient_name": ...}` döner.

### `upload_recipe_image(user_id, recipe_id, upload_file, db)`
**Ne yapar:** Tarif fotoğrafı yükler, PIL ile boyutlandırır (max 1200×1200), JPEG olarak kaydeder.
**Güvenlik kontrolleri:**
- Sadece JPEG/PNG/WebP kabul edilir
- Maksimum 5 MB boyut kontrolü
- Dosya adı `uuid4().hex` ile rastgele oluşturulur (tahmin edilemez)

## Kritik Kod Parçaları

```python
# Öneri puanlama — sistemin özü:
selected_score = (selected_hit_count / len(selected_ids)) * 75 if selected_ids else 0
pantry_score = (pantry_hit_count / len(pantry_only_ids)) * 15 if pantry_only_ids else 0
recipe_bonus = min(10, recipe_match_ratio * 20)
matched_bonus = min(10, matched_count * 2)
disliked_penalty = disliked_count * 35
score = selected_score + pantry_score + recipe_bonus + matched_bonus - disliked_penalty
```

```python
# Kullanıcı izolasyonu:
user_profile = _get_user_profile(user_id, db)
# Her listeleme işleminde kullanıcının kalori hedefi alınır.
# Böylece her tarifin "size uygun mu" hesabı yapılabilir.
```

## Sıkça Sorulabilecek Hoca Soruları

- **S: Neden seçili malzeme skoru max 75, dolap skoru max 15?**
  C: Kullanıcının o an yapmak istediği için aktif seçimler daha önemli. Dolap "bu malzemeyi de kullanabilirsin" şeklinde ek bonus. Teorik maksimum 75+15+10+10=110 ama `min(100, score)` ile kenetleniyor.

- **S: Neden öneri algoritmasına health score dahil değil?**
  C: İki farklı metrik. Health score tarifin ne kadar sağlıklı olduğunu; öneri skoru elindekilere ne kadar uyduğunu gösterir. Kullanıcı `healthy_only=True` seçerek zaten sağlıklı tariflerle sınırlayabilir.

- **S: Aynı malzeme hem "seçili" hem "dolap"ta varsa ne olur?**
  C: `pantry_only_ids = pantry_ids - selected_ids` satırı bunu önler. Seçili malzeme pantry setinden çıkarılır, çift sayılmaz.

- **S: "Eşleşme" nasıl çalışıyor? Tam isim mi lazım?**
  C: Hayır. Token tabanlı eşleşme. "Tavuk" seçilirse "Tavuk Kanat", "Bütün Tavuk", "Tavuk Suyu" de eşleşir. Çünkü "tavuk" tokenı hepsinde var.
