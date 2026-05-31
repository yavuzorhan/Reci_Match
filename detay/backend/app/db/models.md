# models.py — SQLAlchemy Veritabanı Model Sınıfları

## Bu Dosya Ne İçin Var?

Python sınıfları aracılığıyla veritabanı tablolarını tanımlar. Her sınıf bir tabloyu, her sınıf değişkeni bir kolonu temsil eder. SQLAlchemy bu tanımları okuyarak SQL sorgularını otomatik oluşturur — geliştirici SQL yazmak zorunda kalmaz.

## Mimarideki Yeri

**Katman:** Veri Modeli (ORM Katmanı)

- `database.py`'daki `Base` sınıfından miras alır
- `repositories/` katmanı bu sınıfları sorgulamak için kullanır
- `services/` katmanı bu sınıfların nesnelerini okur ve günceller

## Sınıflar (Tablolar)

### `IngredientCategory` → `ingredient_categories`

Her malzemenin ait olduğu kategori (Et, Sebze, Tahıl, Süt Ürünleri vb.).

```python
class IngredientCategory(Base):
    __tablename__ = "ingredient_categories"
    category_id = Column(Integer, primary_key=True)
    category_name = Column(String(50), unique=True)
    ingredients = relationship("Ingredient", back_populates="category_rel")
```

`relationship(...)` → SQLAlchemy'ye "bu kategoriyle ilgili malzemelere `category.ingredients` diyerek ulaş" der. JOIN yazmak gerekmez.

---

### `Ingredient` → `ingredients`

Sistemdeki tüm malzemeleri ve besin değerlerini saklar.

**En kritik alan: `user_id`**
- `user_id = NULL` → Global malzeme (scraper'dan geldi, tüm kullanıcılar görür)
- `user_id = 5` → Sadece kullanıcı 5'e ait özel malzeme

**Besin değeri alanları (100 gram başına):**
`calorie_per_100g`, `protein_per_100g`, `carbohydrate_per_100g`, `fat_per_100g`, `saturated_fat_per_100g`, `fiber_per_100g`, `sugar_per_100g`, `sodium_mg_per_100g`

**`nutrition_source`:** Besin değerinin kaynağı:
- `"gemini"` → Gemini AI hesapladı
- `"manual"` → Kullanıcı elle girdi
- `"db"` → Veritabanında zaten mevcuttu
- `"usda_legacy"` → Eski USDA API'sinden geldi (artık kullanılmıyor)

**Unique Index neden iki ayrı:**
- Global malzemelerde sadece `ingredient_name` tekil olmalı (partial index: `WHERE user_id IS NULL`)
- Kişisel malzemelerde `user_id + ingredient_name` çifti tekil olmalı

---

### `IngredientAlias` → `ingredient_aliases`

Bir malzemenin birden fazla ismiyle aranabilmesini sağlar.

**Örnek:** "domates" ana malzeme; "tomato", "domates (taze)", "kırmızı domates" takma adları.

`normalized_alias_name` → Türkçe karakterlerin normalleştirilmiş hali. SQL'de Türkçe büyük/küçük harf duyarsız arama yapılamadığından Python'da normalleştirme yapılıp buraya kaydedilir.

---

### `Recipe` → `recipes`

Sistemdeki tüm tarifleri içerir.

**`user_id = NULL`** → yemek.com'dan scraper ile alınan global tarif
**`user_id = X`** → Kullanıcı X'in eklediği kişisel tarif ya da revizyonu

**`is_active`:** Soft-delete mekanizması. Tarifi silmek yerine `is_active = False` yapılabilir. Böylece bu tarife ait loglar ve favoriler kaybolmaz.

**Kalori NOT:** `calorie`, `protein`, `carbohydrate`, `fat` sütunları **TÜM porsiyonların toplamıdır**. Bir porsiyonluk değer için `calorie / serving` yapılır. Frontend bunu uygular.

**`health_score`:** 0-100 arası puan. `recipe_health.py` tarafından hesaplanır.
**`health_grade`:** A/B/C/D harfi (A = çok sağlıklı, D = ağır tarif).

---

### `HealthyRecipe` → `healthy_recipes`

Health score yüksek tariflerin işaretlendiği ara tablo. `recipe_id` UNIQUE — her tarif bir kez sağlıklı işaretlenebilir. "Sağlıklı Tarif" filtresinin hızlı çalışmasını sağlar.

---

### `RecipeIngredient` → `recipe_ingredients`

Tarif-malzeme N:N ilişkisini çözer. Her tarif için her malzeme ayrı bir satır.

```python
amount = Column(Numeric(6, 2))     # Miktar (ör: 2.5)
unit = Column(String(50))          # Birim (ör: "su bardağı")
miktar_gram = Column(Numeric(10, 2))  # Gram karşılığı (dönüştürülmüş)
donusum_guveni = Column(String(20))   # "high", "medium", "low"
```

`miktar_gram` → Health score hesaplamak için tüm malzemelerin gram cinsinden ağırlığı gerekir. "2 su bardağı pirinç" → gram dönüşümü karmaşıktır; sonuç burada saklanır.

`ondelete="CASCADE"` → Tarif silinirse, o tarife ait tüm malzeme bağlantıları da silinir.

---

### `User` → `users`

Sisteme kayıtlı kullanıcı.

`password_hash` → Hiçbir zaman düz metin parola içermez. bcrypt hash saklanır.

`is_verified` → E-posta doğrulaması tamamlandı mı?

`daily_calorie` → Profil kurulumunda hesaplanan günlük kalori hedefi (yaş, cinsiyet, aktivite, hedeften).

`cascade="all, delete-orphan"` → Kullanıcı silinirse favoriler, loglar, dolap içeriği de silinir.

---

### `EmailVerificationCode` → `email_verification_codes`

Kayıt ve şifre sıfırlama sırasında gönderilen 6 haneli kodlar.

`temp_name`, `temp_password` → Kayıt doğrulama beklenmeden kullanıcı tablosuna yazılmaz; bu geçici alanlar onay gelince `users` tablosuna aktarılır.

`purpose` → `"register"` veya `"password_reset"` — kodun amacını belirtir.

---

### `Favorite` → `favorites`

Kullanıcı ↔ Tarif N:N ilişkisi. Kullanıcının kalp ikonuna bastığı tarifler.

---

### `DislikedIngredient` → `disliked_ingredients`

Kullanıcının sevmediği malzemelerin listesi. Tarif önerisinde `disliked_penalty = count * 35` cezası uygulanır.

---

### `OwnedIngredient` → `owned_ingredients`

Kullanıcının dolabındaki malzemeler. Öneri algoritması bunları bonus olarak değerlendirir.

---

### `DailyLog` → `daily_logs`

Kullanıcının yediği öğünlerin kaydı.

`entry_source` → `"daily"` = günlük logdan, `"weekly"` = haftalık plandan eklendi.

`serving_count` ve `serving_multiplier` → Kaç porsiyon yenildiği takip edilir; kalori hesabı buna göre yapılır.

---

### `RevisionCache` → `revision_cache`

Gemini AI revizyon yanıtlarının önbelleği.

`modifications_hash` → Değişiklik listesinin SHA-256 özeti. Aynı tarih + aynı değişiklikler → aynı hash → önbellekten döner, Gemini çağrılmaz.

## İlişkilerin Çalışma Mantığı

SQLAlchemy `relationship()` ile iki tablo arasındaki bağlantı Python düzeyinde tanımlanır:

```python
# Recipe modelinde:
ingredients = relationship(
    "RecipeIngredient",
    back_populates="recipe",
    cascade="all, delete-orphan"
)
```

Bu tanım sayesinde:
```python
recipe = db.query(Recipe).first()
for item in recipe.ingredients:  # Otomatik JOIN — SQL yazmak gerekmedi
    print(item.ingredient.ingredient_name, item.amount, item.unit)
```

## Sıkça Sorulabilecek Hoca Soruları

- **S: ORM nedir ve neden kullanılıyor?**
  C: Object-Relational Mapping. SQL yazmak yerine Python nesneleri üzerinden veritabanı işlemi yapmayı sağlar. SQLAlchemy bu SQL'i arka planda üretir. Daha az hata, daha okunabilir, test edilebilir kod.

- **S: `user_id = NULL` neden veritabanında tutulur?**
  C: Bu "global" kaydı ifade eder. Alternatif her kullanıcı için tarif kopyalamak olurdu — hem depolama israfı hem yönetim sorunu. NULL pattern daha temiz ve ölçeklenebilir.

- **S: `passive_deletes=True` ne anlama geliyor?**
  C: Veritabanının CASCADE silme işlemini yapmasına izin verir. SQLAlchemy her kaydı Python'da silmek yerine DB'nin CASCADE'ini kullanır. Çok daha hızlı (özellikle büyük tablolarda).

- **S: Neden `Numeric(6,2)` kullanılmış, Float değil?**
  C: `Numeric` tam hassasiyetli ondalık sayı sunar (kayıplar yok). `Float` IEEE 754 nedeniyle küçük yuvarlama hataları içerebilir. Besin değerleri gibi hassas alanlar için `Numeric` tercih edilir.

- **S: `cascade="all, delete-orphan"` ne anlama geliyor?**
  C: Ana kayıt (ör: Recipe) silindiğinde, bağlı tüm alt kayıtlar (ör: RecipeIngredient) otomatik silinir. "delete-orphan" ise ana kayıttan bağı kopan alt kayıtları da siler.
