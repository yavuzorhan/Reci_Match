# ReciMatch Tezi İçin Eklenecek Teknik Bölümler

Bu dosya, `YavuzOrhan_BitirmeTezi_ReciMatch(1).docx` içinde eksik görünen veritabanı tabloları, USDA'dan Gemini'ye geçiş açıklaması, örnek veriler ve eklerde kullanılabilecek kod parçaları için hazırlanmıştır. Metinler doğrudan Word dosyasına uyarlanabilir.

## 3.2.x Besin Değeri Çözümleme Mimarisinin Güncellenmesi

ReciMatch projesinin ilk sürümlerinde malzeme bazlı besin değeri verileri USDA FoodData Central API üzerinden alınacak şekilde tasarlanmıştır. Bu yaklaşımda Türkçe malzeme adının İngilizceye çevrilmesi, USDA üzerinde uygun besinin aranması, dönen besin değerlerinin ayrıştırılması ve ayrı eşleştirme tablolarına kaydedilmesi gerekiyordu. Ancak bu süreçte Türkçe malzeme adlarının farklı yazımları, çeviri hataları, dış API'ye bağımlılık ve eşleşme doğruluğunun her malzeme için aynı seviyede olmaması gibi sorunlar ortaya çıkmıştır.

Bu nedenle proje geliştirme sürecinde besin değeri altyapısı yeniden düzenlenmiş ve Gemini destekli iki katmanlı bir yapıya geçilmiştir. Yeni yapıda sistem önce yerel veritabanında ilgili malzemenin daha önce hesaplanmış veya girilmiş besin değeri olup olmadığını kontrol eder. Eğer `ingredients` tablosunda `calorie_per_100g` değeri sıfırdan büyükse sistem bu değeri yerel kaynak olarak kullanır. Yerel veride besin değeri bulunmuyorsa Gemini modelinden yapılandırılmış JSON formatında besin değeri tahmini istenir. Gemini tarafından dönen değerler doğrudan `ingredients` tablosundaki inline besin değeri kolonlarına yazılır.

Bu değişiklikle birlikte önceki sürümde kullanılan `ingredient_nutrition_values` ve `ingredient_usda_mappings` tablolarına ihtiyaç kalmamıştır. Besin değerlerinin doğrudan `ingredients` tablosunda tutulması veri erişimini basitleştirmiş, tarif makro hesaplamalarında ek ilişki yükleme ihtiyacını azaltmış ve servis katmanındaki iş akışını daha anlaşılır hale getirmiştir.

Yeni besin değeri çözümleme akışı şu şekildedir:

1. Kullanıcının girdiği malzeme adı normalize edilir.
2. Sistem erişilebilir global veya kullanıcıya ait malzemeler içinde eşleşme arar.
3. Eşleşen malzemede `calorie_per_100g > 0` ise veritabanındaki inline besin değerleri kullanılır.
4. Besin değeri bulunmuyorsa Gemini API'ye yapılandırılmış istek gönderilir.
5. Gemini cevabı başarılı ise 15 besin alanı `ingredients` tablosuna kaydedilir.
6. Gemini cevabı alınamazsa kullanıcıdan manuel besin değeri girişi istenir.

Bu yapı, tez çalışmasında yapay zekâ destekli veri tamamlama yaklaşımının bir uygulaması olarak değerlendirilebilir. Burada Gemini kesin bir beslenme otoritesi olarak değil, eksik malzeme verilerini tahmini olarak tamamlayan yardımcı bir kaynak olarak konumlandırılmıştır. Bu nedenle sistemde `nutrition_source` ve `nutrition_confidence` alanları tutulmaktadır.

## 3.3.1 Güncel Veritabanı Tablolarının Genel Özeti

Projenin güncel halinde SQLAlchemy model dosyasında 13 temel tablo bulunmaktadır. USDA'ya bağlı eski besin değeri ve eşleştirme tabloları kaldırılmıştır. Güncel tablo yapısı aşağıdaki gibidir.

| Tablo adı | Görevi |
|---|---|
| `users` | Kullanıcı hesap bilgileri, profil verileri ve günlük kalori hedefi |
| `email_verification_codes` | Kayıt, e-posta doğrulama ve şifre sıfırlama için geçici doğrulama kodları |
| `ingredient_categories` | Malzemelerin ait olduğu kategori bilgileri |
| `ingredients` | Global ve kullanıcıya özel malzemeler ile inline besin değerleri |
| `ingredient_aliases` | Aynı malzemenin farklı yazım biçimlerini eşleştirmek için alias kayıtları |
| `recipes` | Tarif adı, açıklama, hazırlık bilgisi, kategori, porsiyon, makro değerler ve sağlık puanı |
| `recipe_ingredients` | Tarifler ile malzemeler arasındaki çoktan çoğa ilişki ve miktar/birim bilgileri |
| `healthy_recipes` | Sağlıklı tarif listesine alınmış tarif kayıtları |
| `favorites` | Kullanıcıların favoriye aldığı tarifler |
| `disliked_ingredients` | Kullanıcının sevmediği veya önerilerde görmek istemediği malzemeler |
| `owned_ingredients` | Kullanıcının dolabında bulunan malzemeler |
| `daily_logs` | Kullanıcının günlük tüketim kayıtları ve makro besin alımları |
| `revision_cache` | Gemini ile yapılan tarif revizyonlarının aynı istek için tekrar üretilmesini önleyen önbellek kayıtları |

### Canlı Veritabanı Örnek Kayıt Sayıları

Aşağıdaki değerler geliştirme ortamındaki örnek veritabanından alınmıştır. Teslim öncesinde veritabanı değişirse sayılar güncellenebilir.

| Varlık | Kayıt sayısı |
|---|---:|
| Kullanıcı (`users`) | 4 |
| Malzeme (`ingredients`) | 242 |
| Tarif (`recipes`) | 483 |
| Tarif-malzeme ilişkisi (`recipe_ingredients`) | 3584 |
| Malzeme kategorisi (`ingredient_categories`) | 14 |
| Malzeme alias kaydı (`ingredient_aliases`) | 0 |

## 3.3.2 `users` Tablosu

`users` tablosu uygulamadaki kullanıcı hesaplarını ve kişiselleştirme için gerekli profil bilgilerini tutar. Kullanıcı kayıt olduktan sonra e-posta, şifre özeti, yaş, cinsiyet, boy, kilo, hedef, aktivite seviyesi, günlük öğün sayısı ve günlük kalori hedefi gibi bilgiler bu tabloda saklanır.

| Alan | Tür | Açıklama |
|---|---|---|
| `user_id` | Integer | Birincil anahtar |
| `name_surname` | String(100) | Kullanıcının ad soyad bilgisi |
| `email` | String(100) | Benzersiz e-posta adresi |
| `password_hash` | String(255) | Hashlenmiş şifre |
| `age` | Integer | Kullanıcının yaşı |
| `gender` | String(20) | Cinsiyet bilgisi |
| `height_cm` | Integer | Boy bilgisi |
| `weight_kg` | Numeric(5,2) | Kilo bilgisi |
| `objective` | String(50) | Kullanıcının hedefi |
| `activity` | String(50) | Aktivite düzeyi |
| `meals` | Integer | Günlük öğün sayısı |
| `daily_calorie` | Integer | Hesaplanan veya girilen günlük kalori hedefi |
| `created_at` | DateTime | Kayıt tarihi |
| `is_verified` | Boolean | E-posta doğrulama durumu |

## 3.3.3 `ingredients` Tablosu

`ingredients` tablosu projenin besin değeri mimarisinde merkezi konuma sahiptir. Önceki tasarımda besin değerleri ayrı bir tabloda tutulurken güncel sistemde kalori, protein, karbonhidrat, yağ ve mikro besin değerleri doğrudan bu tabloya eklenmiştir. Bu sayede tarif hesaplamalarında `Ingredient.nutrition_value` gibi ek ilişkilere gerek kalmamıştır.

| Alan | Tür | Açıklama |
|---|---|---|
| `ingredient_id` | Integer | Birincil anahtar |
| `ingredient_name` | String(100) | Malzeme adı |
| `user_id` | Integer / Nullable | Malzeme kullanıcıya özel ise kullanıcı ID'si, global ise NULL |
| `category` | String(50) | Kategori adı |
| `category_id` | Integer | `ingredient_categories` tablosu ile ilişki |
| `calorie_per_100g` | Float | 100 gram başına kalori |
| `protein_per_100g` | Float | 100 gram başına protein |
| `carbohydrate_per_100g` | Float | 100 gram başına karbonhidrat |
| `fat_per_100g` | Float | 100 gram başına yağ |
| `saturated_fat_per_100g` | Float | 100 gram başına doymuş yağ |
| `fiber_per_100g` | Float | 100 gram başına lif |
| `sugar_per_100g` | Float | 100 gram başına şeker |
| `sodium_mg_per_100g` | Float | 100 gram başına sodyum |
| `added_sugar_per_100g` | Float | 100 gram başına eklenmiş şeker |
| `trans_fat_per_100g` | Float | 100 gram başına trans yağ |
| `cholesterol_mg_per_100g` | Float | 100 gram başına kolesterol |
| `potassium_mg_per_100g` | Float | 100 gram başına potasyum |
| `calcium_mg_per_100g` | Float | 100 gram başına kalsiyum |
| `iron_mg_per_100g` | Float | 100 gram başına demir |
| `vitamin_d_mcg_per_100g` | Float | 100 gram başına D vitamini |
| `nutrition_source` | String(30) | Besin değeri kaynağı: `gemini`, `manual`, `db`, `usda_legacy` |
| `nutrition_confidence` | Float | Besin değeri güven skoru |
| `is_verified` | Boolean | Malzeme doğrulama durumu |
| `source` | String(50) | Malzemenin sisteme eklenme kaynağı |

Örnek `ingredients` kayıtları:

| id | Malzeme | Kalori | Protein | Karbonhidrat | Yağ | Kaynak |
|---:|---|---:|---:|---:|---:|---|
| 1 | yumurta | 0.0 | 0.0 | 0.0 | 0.0 | manual |
| 2 | domates | 18.0 | 0.9 | 3.9 | 0.2 | gemini |
| 5 | zeytinyağı | 884.0 | 0.0 | 0.0 | 100.0 | gemini |

Bu örneklerde bazı manuel kayıtların besin değerleri sıfır olabilir. Böyle durumlarda kullanıcı yeni tarif oluştururken sistem Gemini ile besin değerini tamamlamayı dener veya manuel giriş isteyebilir.

## 3.3.4 `recipes` Tablosu

`recipes` tablosu tariflerin temel bilgilerini tutar. Global tariflerde `user_id` alanı NULL değerindedir. Kullanıcının oluşturduğu özel tariflerde ise `user_id` ilgili kullanıcıyı gösterir. Bu yapı, sistemde hem genel tarif havuzunun hem de kişisel tariflerin aynı tablo üzerinden yönetilmesini sağlar.

| Alan | Tür | Açıklama |
|---|---|---|
| `recipe_id` | Integer | Birincil anahtar |
| `recipe_name` | String(150) | Tarif adı |
| `user_id` | Integer / Nullable | Kullanıcıya özel tariflerde kullanıcı ID'si |
| `source` | String(20) | Tarif kaynağı: scraper, custom vb. |
| `source_url` | String(500) | Tarifin alındığı kaynak bağlantısı |
| `recipe_category` | String(50) | Tarif kategorisi |
| `explanation` | Text | Tarif açıklaması |
| `preparation` | Text | Hazırlanış metni |
| `cooking_type` | String(50) | Pişirme türü |
| `cooking_method` | String(50) | Pişirme yöntemi |
| `total_time_minutes` | Integer | Toplam süre |
| `serving` | Integer | Porsiyon sayısı |
| `calorie` | Numeric(6,2) | Tarif kalori değeri |
| `protein` | Numeric(6,2) | Tarif protein değeri |
| `carbohydrate` | Numeric(6,2) | Tarif karbonhidrat değeri |
| `fat` | Numeric(6,2) | Tarif yağ değeri |
| `health_score` | Integer | 0-100 arası sağlık puanı |
| `health_grade` | String(1) | A, B, C, D kalite sınıfı |
| `health_explanation` | Text | Sağlık puanı açıklaması |
| `image_url` | String(255) | Tarif görseli |
| `is_active` | Boolean | Tarifin aktiflik durumu |

Örnek `recipes` kayıtları:

| id | Tarif | Kategori | Porsiyon | Kalori | Protein | Karbonhidrat | Yağ |
|---:|---|---|---:|---:|---:|---:|---:|
| 1085 | Tam Ölçülü Pankek (Pancake) | Kahvaltı | 4 | 1040.00 | 24.00 | 180.00 | 24.00 |
| 1086 | Menemen | Kahvaltı | 4 | 592.00 | 20.00 | 20.00 | 48.00 |
| 1089 | Patatesli Omlet | Kahvaltı | 1 | 566.00 | 17.00 | 16.00 | 47.00 |

## 3.3.5 `recipe_ingredients` Tablosu

`recipe_ingredients` tablosu tarifler ile malzemeler arasındaki ilişkiyi kurar. Bir tarif birden fazla malzeme içerebilir ve aynı malzeme birden fazla tarifte yer alabilir. Bu nedenle ilişki ayrı bir tablo ile modellenmiştir.

| Alan | Tür | Açıklama |
|---|---|---|
| `recipe_ingredient_id` | Integer | Birincil anahtar |
| `recipe_id` | Integer | İlgili tarif |
| `ingredient_id` | Integer | İlgili malzeme |
| `amount` | Numeric(6,2) | Kullanıcının veya scraper'ın verdiği miktar |
| `unit` | String(50) | Ölçü birimi |
| `miktar_gram` | Numeric(10,2) | Gram cinsinden tahmini miktar |
| `donusum_kaynagi` | String(100) | Gram dönüşümünün kaynağı |
| `donusum_guveni` | String(20) | Dönüşüm güven seviyesi |
| `donusum_notu` | Text | Dönüşüm ile ilgili açıklama |

## 3.3.x Yeni Eklenmesi Gereken Diğer Tablolar

### `email_verification_codes`

Bu tablo kullanıcı kayıt, e-posta doğrulama ve şifre sıfırlama süreçlerinde kullanılan geçici kodları saklar. Kodun kullanım amacı `purpose` alanında tutulur ve `expires_at` alanı ile geçerlilik süresi sınırlandırılır.

| Alan | Açıklama |
|---|---|
| `id` | Birincil anahtar |
| `user_id` | Mevcut kullanıcıya bağlı kodlarda kullanıcı ID'si |
| `email` | Doğrulanacak e-posta adresi |
| `code` | Doğrulama kodu |
| `purpose` | Kayıt, şifre sıfırlama veya e-posta güncelleme amacı |
| `expires_at` | Kodun geçerlilik bitiş zamanı |
| `created_at` | Kodun oluşturulma zamanı |
| `temp_name`, `temp_password` | Kayıt sürecinde geçici tutulan bilgiler |

### `ingredient_aliases`

Bu tablo aynı malzemenin farklı yazım biçimlerini tek bir malzemeye bağlamak için tasarlanmıştır. Örneğin kullanıcı "yeşil biber", "sivri biber" veya farklı karakter kullanımları ile giriş yaptığında sistem bu alias yapısı ile daha doğru eşleşme yapabilir.

| Alan | Açıklama |
|---|---|
| `id` | Birincil anahtar |
| `ingredient_id` | Asıl malzeme kaydı |
| `alias_name` | Kullanıcının yazabileceği alternatif ad |
| `normalized_alias_name` | Normalize edilmiş alias değeri |
| `created_at` | Kayıt zamanı |

### `healthy_recipes`

Bu tablo sağlıklı tarifler ekranında gösterilecek tarifleri işaretlemek için kullanılır. Tarif bilgileri `recipes` tablosunda tutulmaya devam eder; bu tablo yalnızca sağlıklı liste ile ilişkiyi yönetir.

| Alan | Açıklama |
|---|---|
| `healthy_recipe_id` | Birincil anahtar |
| `recipe_id` | Sağlıklı listeye alınan tarif |
| `source` | Kayıt kaynağı |
| `synced_at` | Senkronizasyon zamanı |

### `revision_cache`

Gemini ile tarif revizyonu maliyetli ve dış servise bağlı bir işlemdir. Aynı tarif için aynı değişiklikler tekrar istendiğinde Gemini'ye yeniden istek göndermek yerine daha önce alınan cevap `revision_cache` tablosundan döndürülebilir. Bu tablo hem performansı artırır hem de API kota tüketimini azaltır.

| Alan | Açıklama |
|---|---|
| `cache_id` | Birincil anahtar |
| `recipe_id` | Revize edilen tarif |
| `modifications_hash` | Kullanıcının revizyon isteğinin hash değeri |
| `response_json` | Gemini'den dönen revize tarif JSON cevabı |
| `created_at` | Önbellek kaydının oluşturulma zamanı |

## 3.5.x Backend Katmanlı Mimari ve Gemini Besin Değeri Akışı

Backend katmanı FastAPI, SQLAlchemy ve servis-repository ayrımı üzerine kurulmuştur. HTTP istekleri router katmanında karşılanır. Router katmanı iş kuralı içermez; ilgili servis fonksiyonunu çağırır. Servis katmanı kullanıcı, tarif, malzeme, besin değeri ve revizyon işlemlerindeki temel iş mantığını yürütür. Repository katmanı ise veritabanı sorgularını merkezi hale getirir.

Gemini destekli besin değeri akışında temel dosyalar şunlardır:

| Dosya | Görev |
|---|---|
| `app/services/gemini_client.py` | Gemini API'ye yapılandırılmış JSON schema ile besin değeri isteği gönderir |
| `app/services/nutrition_resolver_service.py` | Yerel DB ve Gemini arasında iki katmanlı çözümleme yapar |
| `app/services/ingredient_resolver_service.py` | Malzeme eşleştirme, yeni malzeme oluşturma ve besin değerini kaydetme işlemlerini yürütür |
| `app/services/ingredient_nutrition_service.py` | Tekil veya toplu besin değeri tamamlama işlemlerini sağlar |
| `app/db/database.py` | Eski veritabanlarında eksik inline kolonları runtime sırasında ekler |

Bu katmanlı yapı sayesinde Gemini entegrasyonu doğrudan router içine yazılmamış, ayrı servisler aracılığıyla yönetilmiştir. Böylece ileride farklı bir yapay zekâ servisine geçilmesi veya manuel doğrulama mekanizması eklenmesi daha kolay hale gelmiştir.

## Eklerde Kullanılabilecek Kod Parçaları

### EK-x: Gemini ile Besin Değeri Alma

```python
NUTRITION_SCHEMA = {
    "type": "object",
    "properties": {
        "calories_per_100g": {"type": "number"},
        "protein_per_100g": {"type": "number"},
        "carbs_per_100g": {"type": "number"},
        "fat_per_100g": {"type": "number"},
        "saturated_fat_per_100g": {"type": "number"},
        "fiber_per_100g": {"type": "number"},
        "sugar_per_100g": {"type": "number"},
        "sodium_mg_per_100g": {"type": "number"},
        "added_sugar_per_100g": {"type": "number"},
        "trans_fat_per_100g": {"type": "number"},
        "cholesterol_mg_per_100g": {"type": "number"},
        "potassium_mg_per_100g": {"type": "number"},
        "calcium_mg_per_100g": {"type": "number"},
        "iron_mg_per_100g": {"type": "number"},
        "vitamin_d_mcg_per_100g": {"type": "number"},
    },
    "required": ["calories_per_100g", "protein_per_100g", "carbs_per_100g", "fat_per_100g"],
}
```

Bu kod parçası Gemini'den beklenen JSON cevabının şemasını göstermektedir. Zorunlu alanlar temel makro değerlerdir. Diğer alanlar Gemini tarafından bilinmediğinde sıfır dönebilecek opsiyonel besin alanlarıdır.

### EK-x: İki Katmanlı Besin Değeri Çözümleme

```python
async def resolve_ingredient_nutrition(db: Session, user_id: int, ingredient_name: str):
    normalized_name = normalize_turkish_text(ingredient_name)
    local = ingredient_repository.find_local_nutrition_match(db, user_id, normalized_name)

    if local and float(getattr(local, "calorie_per_100g", 0) or 0) > 0:
        return NutritionResult(
            source="db",
            confidence_score=1.0,
            nutrition={field: float(getattr(local, field, 0) or 0) for field in NUTRITION_FIELDS},
        )

    nutrition = estimate_nutrition_with_gemini(normalized_name)
    if nutrition:
        return NutritionResult(source="gemini", confidence_score=0.7, nutrition=nutrition)

    return None
```

Bu kodda sistem önce yerel veritabanını kontrol eder. Yerel veri yoksa Gemini çağrısı yapılır. Bu yapı USDA dönemindeki çeviri, arama, eşleştirme ve parse adımlarını ortadan kaldırmıştır.

### EK-x: Besin Değerini `ingredients` Tablosuna Yazma

```python
def upsert_ingredient_nutrition(db: Session, ingredient: Ingredient, nutrition: dict, source: str, confidence: float | None = None):
    for field in NUTRITION_FIELDS:
        setattr(ingredient, field, float(nutrition.get(field) or 0))

    ingredient.nutrition_source = source if source in {"gemini", "manual", "db"} else "manual"
    ingredient.nutrition_confidence = float(
        confidence if confidence is not None else {"db": 1.0, "gemini": 0.7, "manual": 0.4}.get(source, 0.4)
    )
    db.flush()
    return ingredient
```

Bu kod parçası eski ayrı besin değeri tablosu yerine tüm besin değerlerinin doğrudan `ingredients` satırına yazıldığını göstermektedir.

### EK-x: Eski Veritabanları İçin Inline Kolon Guard

```python
def ensure_ingredient_inline_nutrition_columns(db):
    db.execute(text("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS saturated_fat_per_100g DOUBLE PRECISION NOT NULL DEFAULT 0"))
    db.execute(text("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS fiber_per_100g DOUBLE PRECISION NOT NULL DEFAULT 0"))
    db.execute(text("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS sugar_per_100g DOUBLE PRECISION NOT NULL DEFAULT 0"))
    db.execute(text("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS sodium_mg_per_100g DOUBLE PRECISION NOT NULL DEFAULT 0"))
    db.execute(text("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS nutrition_source VARCHAR(30) NOT NULL DEFAULT 'manual'"))
    db.execute(text("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS nutrition_confidence DOUBLE PRECISION NOT NULL DEFAULT 0"))
    db.commit()
```

Bu bölüm, migration dosyası oluşturmadan geliştirme ortamındaki eski veritabanlarının yeni model ile çalışabilmesi için kullanılan koruyucu yapıyı göstermektedir.

## Sonuç Bölümüne Eklenebilecek Paragraf

Projenin geliştirme sürecinde besin değeri alma altyapısında önemli bir mimari değişiklik yapılmıştır. İlk tasarımda USDA FoodData Central API üzerinden veri çekme yaklaşımı değerlendirilmiş, ancak Türkçe malzeme adlarının çeviri ve eşleştirme problemleri nedeniyle süreç karmaşık hale gelmiştir. Güncel sistemde Gemini destekli yapılandırılmış JSON çıktısı kullanılarak malzeme bazlı besin değeri tahmini yapılmaktadır. Bu değişiklik, dış bağımlılık sayısını azaltmış, veritabanı şemasını sadeleştirmiş ve Türkçe yerel malzeme adlarıyla çalışma esnekliğini artırmıştır. Bununla birlikte Gemini çıktılarının tahmini değerler olduğu unutulmamalı, kritik sağlık kararlarında doğrulanmış besin veri kaynaklarıyla desteklenmesi gerektiği belirtilmelidir.

## Kaynakça İçin Not

USDA FoodData Central kaynağı tamamen çıkarılmak zorunda değildir. Tezde "önceki yaklaşımda değerlendirilen veri kaynağı" veya "karşılaştırmalı besin veri kaynağı" olarak tutulabilir. Ancak güncel uygulama mimarisinde aktif besin değeri kaynağı Gemini olduğu için kaynakçaya ayrıca Gemini API dokümantasyonu eklenmelidir.

Önerilen kaynak:

Google. (2026). Gemini API Documentation. https://ai.google.dev/gemini-api/docs
