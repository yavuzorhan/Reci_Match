-- ============================================================
-- ReciMatch — Akıllı Tarif ve Beslenme Öneri Sistemi
-- TEZ BELGE EKİ: PostgreSQL Veritabanı Tablo Tanımları
-- Öğrenci: Yavuz Orhan (220702023)
-- Danışman: Nurşen Topcubaşı
-- Tarih: Mayıs 2026
-- ============================================================
-- Bu dosya backend/app/db/models.py dosyasındaki SQLAlchemy
-- modellerinden üretilmiştir. Bağımlılık sırasına göre
-- sıralanmıştır; doğrudan psql ile çalıştırılabilir.
-- ============================================================


-- ------------------------------------------------------------
-- TABLO 1: ingredient_categories
-- Açıklama: Malzemeleri tematik gruplara ayıran kategori
-- tablosudur. Her kategoriye bir ya da daha fazla malzeme
-- bağlanabilir (1:N ilişki). Örnek kategoriler: "Sebze",
-- "Et & Tavuk", "Tahıl", "Süt Ürünleri".
-- ------------------------------------------------------------
CREATE TABLE ingredient_categories (
    category_id  SERIAL       PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL,
    CONSTRAINT uq_ingredient_categories_name UNIQUE (category_name)
);

CREATE INDEX ix_ingredient_categories_category_id
    ON ingredient_categories (category_id);


-- ------------------------------------------------------------
-- TABLO 2: users
-- Açıklama: Sisteme kayıtlı kullanıcıların kimlik, profil ve
-- beslenme hedef bilgilerini tutan ana tablodur. Kullanıcının
-- yaşı, kilosu, boyu, aktivite düzeyi ve günlük kalori
-- hedefi bu tabloda saklanır. is_verified alanı, hesabın
-- e-posta doğrulamasından geçip geçmediğini belirtir.
-- ------------------------------------------------------------
CREATE TABLE users (
    user_id       SERIAL         PRIMARY KEY,
    name_surname  VARCHAR(100)   NOT NULL,
    email         VARCHAR(100)   NOT NULL,
    password_hash VARCHAR(255)   NOT NULL,
    age           INTEGER,
    gender        VARCHAR(20),
    height_cm     INTEGER,
    weight_kg     NUMERIC(5, 2),
    objective     VARCHAR(50),
    activity      VARCHAR(50),
    meals         INTEGER,
    daily_calorie INTEGER,
    created_at    TIMESTAMP,
    is_verified   BOOLEAN        DEFAULT FALSE,
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE INDEX ix_users_user_id ON users (user_id);


-- ------------------------------------------------------------
-- TABLO 3: ingredients
-- Açıklama: Sistemdeki tüm malzemeleri ve 100 gram başına
-- besin değerlerini (kalori, protein, karbonhidrat, yağ)
-- barındıran tablodur. user_id NULL ise malzeme tüm
-- kullanıcılara görünür (global); NULL değilse yalnızca
-- ilgili kullanıcıya özeldir (kullanıcı bazlı izolasyon).
-- Kısmi benzersiz indeksler ile global ve kullanıcıya özel
-- malzeme adı çakışmaları önlenir.
-- ------------------------------------------------------------
CREATE TABLE ingredients (
    ingredient_id        SERIAL        PRIMARY KEY,
    ingredient_name      VARCHAR(100)  NOT NULL,
    user_id              INTEGER,
    category             VARCHAR(50),
    category_id          INTEGER,
    calorie_per_100g     DOUBLE PRECISION NOT NULL DEFAULT 0,
    protein_per_100g     DOUBLE PRECISION NOT NULL DEFAULT 0,
    carbohydrate_per_100g DOUBLE PRECISION NOT NULL DEFAULT 0,
    fat_per_100g         DOUBLE PRECISION NOT NULL DEFAULT 0,
    is_verified          BOOLEAN       NOT NULL DEFAULT FALSE,
    source               VARCHAR(50)   NOT NULL DEFAULT 'manual',
    CONSTRAINT fk_ingredients_user
        FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_ingredients_category
        FOREIGN KEY (category_id)
        REFERENCES ingredient_categories (category_id)
);

CREATE INDEX ix_ingredients_ingredient_id
    ON ingredients (ingredient_id);

-- Global malzeme adı benzersizliği (user_id NULL olan kayıtlar)
CREATE UNIQUE INDEX ix_ingredient_name_global_unique
    ON ingredients (ingredient_name)
    WHERE user_id IS NULL;

-- Kullanıcıya özel malzeme adı benzersizliği (user_id NOT NULL)
CREATE UNIQUE INDEX ix_ingredient_name_user_unique
    ON ingredients (user_id, ingredient_name)
    WHERE user_id IS NOT NULL;


-- ------------------------------------------------------------
-- TABLO 4: ingredient_aliases
-- Açıklama: Her malzemenin alternatif (takma) isimlerini
-- tutan tablodur. Scraper ve kullanıcı arama süreçlerinde
-- "domates" yerine "roma domates", "cherry domates" gibi
-- varyantların tanınmasına olanak sağlar. normalized_alias_name
-- alanı Türkçe karakter normalize edilerek saklanır.
-- ------------------------------------------------------------
CREATE TABLE ingredient_aliases (
    id                   SERIAL       PRIMARY KEY,
    ingredient_id        INTEGER      NOT NULL,
    alias_name           VARCHAR(150) NOT NULL,
    normalized_alias_name VARCHAR(150) NOT NULL,
    created_at           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ingredient_aliases_ingredient
        FOREIGN KEY (ingredient_id)
        REFERENCES ingredients (ingredient_id)
        ON DELETE CASCADE
);

CREATE INDEX ix_ingredient_aliases_id
    ON ingredient_aliases (id);
CREATE UNIQUE INDEX ix_ingredient_aliases_normalized_alias_name
    ON ingredient_aliases (normalized_alias_name);
CREATE INDEX ix_ingredient_aliases_ingredient_id
    ON ingredient_aliases (ingredient_id);


-- ------------------------------------------------------------
-- TABLO 5: ingredient_usda_mappings
-- Açıklama: Yerel malzemelerin USDA FoodData Central
-- veritabanındaki karşılıklarını (fdc_id) tutan tablodur.
-- Eşleştirme güven skoru, doğrulama durumu ve eşleşme
-- statüsü bu tabloda izlenir. Bir malzemenin en fazla bir
-- USDA kaydına karşılık gelmesi beklenir (1:1 ilişki).
-- ------------------------------------------------------------
CREATE TABLE ingredient_usda_mappings (
    mapping_id       SERIAL        PRIMARY KEY,
    ingredient_id    INTEGER       NOT NULL,
    fdc_id           INTEGER,
    usda_description VARCHAR(255),
    data_type        VARCHAR(50),
    search_query     VARCHAR(150),
    match_confidence NUMERIC(5, 2),
    match_status     VARCHAR(20)   NOT NULL DEFAULT 'pending',
    is_verified      BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ingredient_usda_mappings_ingredient UNIQUE (ingredient_id),
    CONSTRAINT fk_ingredient_usda_mappings_ingredient
        FOREIGN KEY (ingredient_id)
        REFERENCES ingredients (ingredient_id)
        ON DELETE CASCADE
);

CREATE INDEX ix_ingredient_usda_mappings_mapping_id
    ON ingredient_usda_mappings (mapping_id);


-- ------------------------------------------------------------
-- TABLO 6: ingredient_nutrition_values
-- Açıklama: Malzemelerin 100 gram başına ayrıntılı besin
-- değerlerini (doymuş yağ, lif, şeker, sodyum, potasyum,
-- kalsiyum, demir, D vitamini vb.) saklayan tablodur. Bu
-- değerler ağırlıklı olarak USDA FoodData Central'dan
-- çekilir ve sağlık puanı (health score) algoritmasında
-- kullanılır.
-- ------------------------------------------------------------
CREATE TABLE ingredient_nutrition_values (
    nutrition_id             SERIAL         PRIMARY KEY,
    ingredient_id            INTEGER        NOT NULL,
    fdc_id                   INTEGER,
    calories_per_100g        NUMERIC(8, 2)  NOT NULL,
    protein_per_100g         NUMERIC(8, 2)  NOT NULL,
    carbs_per_100g           NUMERIC(8, 2)  NOT NULL,
    fat_per_100g             NUMERIC(8, 2)  NOT NULL,
    saturated_fat_per_100g   NUMERIC(8, 2)  NOT NULL,
    fiber_per_100g           NUMERIC(8, 2)  NOT NULL,
    sugar_per_100g           NUMERIC(8, 2)  NOT NULL,
    sodium_mg_per_100g       NUMERIC(10, 2) NOT NULL,
    added_sugar_per_100g     NUMERIC(8, 2),
    trans_fat_per_100g       NUMERIC(8, 2),
    cholesterol_mg_per_100g  NUMERIC(10, 2),
    potassium_mg_per_100g    NUMERIC(10, 2),
    calcium_mg_per_100g      NUMERIC(10, 2),
    iron_mg_per_100g         NUMERIC(10, 2),
    vitamin_d_mcg_per_100g   NUMERIC(10, 2),
    source                   VARCHAR(30)    NOT NULL DEFAULT 'USDA_FDC',
    data_source              VARCHAR(20)    NOT NULL DEFAULT 'db',
    confidence_score         NUMERIC(5, 2),
    created_at               TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    updated_at               TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ingredient_nutrition_values_ingredient UNIQUE (ingredient_id),
    CONSTRAINT fk_ingredient_nutrition_values_ingredient
        FOREIGN KEY (ingredient_id)
        REFERENCES ingredients (ingredient_id)
        ON DELETE CASCADE
);

CREATE INDEX ix_ingredient_nutrition_values_nutrition_id
    ON ingredient_nutrition_values (nutrition_id);


-- ------------------------------------------------------------
-- TABLO 7: ingredient_unit_conversions
-- Açıklama: Tarif malzeme miktarlarını gram cinsine
-- dönüştürmek için kullanılan birim çevrim tablosudur.
-- "1 su bardağı pirinç = 185 g" gibi malzemeye özel
-- (ingredient_id NOT NULL) veya evrensel (ingredient_id NULL)
-- dönüşüm katsayıları burada saklanır.
-- ------------------------------------------------------------
CREATE TABLE ingredient_unit_conversions (
    conversion_id   SERIAL         PRIMARY KEY,
    ingredient_id   INTEGER,
    unit_key        VARCHAR(50)    NOT NULL,
    unit_aliases    TEXT,
    grams_per_unit  NUMERIC(10, 2),
    ml_per_unit     NUMERIC(10, 2),
    density_g_per_ml NUMERIC(10, 4),
    source          VARCHAR(100),
    confidence      VARCHAR(20),
    note            TEXT,
    CONSTRAINT fk_ingredient_unit_conversions_ingredient
        FOREIGN KEY (ingredient_id)
        REFERENCES ingredients (ingredient_id)
        ON DELETE CASCADE
);

CREATE INDEX ix_ingredient_unit_conversions_conversion_id
    ON ingredient_unit_conversions (conversion_id);
CREATE INDEX ix_ingredient_unit_conversions_lookup
    ON ingredient_unit_conversions (ingredient_id, unit_key);


-- ------------------------------------------------------------
-- TABLO 8: recipes
-- Açıklama: Sistemdeki tüm tarifleri barındıran merkezi
-- tablodur. Tarif adı, açıklama, yapılış talimatları,
-- pişirme süresi ve porsiyon bilgisinin yanı sıra 1 porsiyon
-- başına besin değerleri (kalori, protein, karbonhidrat, yağ)
-- de burada saklanır. health_score ve health_grade alanları
-- tarifin besinsel kalitesini özetler. user_id NULL ise
-- tarif tüm kullanıcılara görünür; değilse kullanıcıya
-- özel bir tariftir.
-- ------------------------------------------------------------
CREATE TABLE recipes (
    recipe_id          SERIAL        PRIMARY KEY,
    recipe_name        VARCHAR(150)  NOT NULL,
    user_id            INTEGER,
    source             VARCHAR(20),
    source_url         VARCHAR(500),
    recipe_category    VARCHAR(50),
    explanation        TEXT,
    preparation        TEXT,
    cooking_type       VARCHAR(50),
    cooking_method     VARCHAR(50),
    total_time_minutes INTEGER,
    serving            INTEGER,
    calorie            NUMERIC(6, 2),
    protein            NUMERIC(6, 2),
    carbohydrate       NUMERIC(6, 2),
    fat                NUMERIC(6, 2),
    health_score       INTEGER,
    health_grade       VARCHAR(1),
    health_explanation TEXT,
    image_url          VARCHAR(255),
    is_active          BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_recipes_user
        FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE CASCADE
);

CREATE INDEX ix_recipes_recipe_id ON recipes (recipe_id);


-- ------------------------------------------------------------
-- TABLO 9: recipe_ingredients
-- Açıklama: Tarifler ile malzemeler arasındaki çoktan çoğa
-- (M:N) ilişkiyi kuran köprü tablodur. Her satır bir tarifteki
-- bir malzemenin miktarını, birimini ve gram karşılığını
-- tutar. Orijinal miktar/birim bilgisi korunurken (amount,
-- unit), gram dönüşümü ve dönüşüm kalitesi ayrı sütunlarda
-- saklanır.
-- ------------------------------------------------------------
CREATE TABLE recipe_ingredients (
    recipe_ingredient_id SERIAL        PRIMARY KEY,
    recipe_id            INTEGER       NOT NULL,
    ingredient_id        INTEGER       NOT NULL,
    amount               NUMERIC(6, 2),
    unit                 VARCHAR(50),
    miktar_gram          NUMERIC(10, 2),
    donusum_kaynagi      VARCHAR(100),
    donusum_guveni       VARCHAR(20),
    donusum_notu         TEXT,
    CONSTRAINT fk_recipe_ingredients_recipe
        FOREIGN KEY (recipe_id)
        REFERENCES recipes (recipe_id),
    CONSTRAINT fk_recipe_ingredients_ingredient
        FOREIGN KEY (ingredient_id)
        REFERENCES ingredients (ingredient_id)
);

CREATE INDEX ix_recipe_ingredients_recipe_ingredient_id
    ON recipe_ingredients (recipe_ingredient_id);


-- ------------------------------------------------------------
-- TABLO 10: unmatched_ingredients
-- Açıklama: Scraper sürecinde sistemdeki malzeme listesiyle
-- eşleştirilemeyen ham malzeme isimlerini kaydeden hata
-- takip tablosudur. Veri kalite sürecinde manuel inceleme
-- ve düzeltme için kullanılır. status alanı "pending",
-- "resolved" veya "ignored" değerlerini alabilir.
-- ------------------------------------------------------------
CREATE TABLE unmatched_ingredients (
    id                     SERIAL        PRIMARY KEY,
    recipe_id              INTEGER,
    recipe_name            VARCHAR(150),
    source_url             VARCHAR(500),
    raw_name               VARCHAR(255),
    normalized_name        VARCHAR(150),
    suggested_match        VARCHAR(150),
    suggested_ingredient_id INTEGER,
    confidence_score       NUMERIC(5, 2),
    issue_type             VARCHAR(40)   NOT NULL DEFAULT 'unmatched_ingredient',
    status                 VARCHAR(20)   NOT NULL DEFAULT 'pending',
    created_at             TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_unmatched_ingredients_recipe
        FOREIGN KEY (recipe_id)
        REFERENCES recipes (recipe_id)
        ON DELETE SET NULL,
    CONSTRAINT fk_unmatched_ingredients_ingredient
        FOREIGN KEY (suggested_ingredient_id)
        REFERENCES ingredients (ingredient_id)
        ON DELETE SET NULL
);

CREATE INDEX ix_unmatched_ingredients_id
    ON unmatched_ingredients (id);
CREATE INDEX ix_unmatched_ingredients_recipe_id
    ON unmatched_ingredients (recipe_id);
CREATE INDEX ix_unmatched_ingredients_issue_status
    ON unmatched_ingredients (issue_type, status);


-- ------------------------------------------------------------
-- TABLO 11: healthy_recipes
-- Açıklama: Sağlıklı tarif olarak etiketlenen tarifleri
-- işaret eden yardımcı tablodur. Ana recipes tablosundaki
-- her sağlıklı tarif için bir kayıt bulunur (1:1 ilişki).
-- Bu mimari, sağlıklı tarif filtresini etkinleştirip
-- devre dışı bırakmayı, ana tabloyu değiştirmeden mümkün
-- kılar.
-- ------------------------------------------------------------
CREATE TABLE healthy_recipes (
    healthy_recipe_id SERIAL    PRIMARY KEY,
    recipe_id         INTEGER   NOT NULL,
    source            VARCHAR(20),
    synced_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_healthy_recipes_recipe UNIQUE (recipe_id),
    CONSTRAINT fk_healthy_recipes_recipe
        FOREIGN KEY (recipe_id)
        REFERENCES recipes (recipe_id)
        ON DELETE CASCADE
);

CREATE INDEX ix_healthy_recipes_healthy_recipe_id
    ON healthy_recipes (healthy_recipe_id);


-- ------------------------------------------------------------
-- TABLO 12: email_verification_codes
-- Açıklama: Kayıt, e-posta doğrulama ve şifre sıfırlama
-- işlemlerinde kullanılan tek kullanımlık OTP (One-Time
-- Password) kodlarını saklayan tablodur. purpose alanı
-- kodun amacını ("register", "reset_password", "verify")
-- belirtir. expires_at süresi geçmiş kodlar geçersiz
-- sayılır. Kayıt akışında henüz user_id olmadığından
-- bu alan NULL bırakılabilir; bu durumda geçici kullanıcı
-- bilgileri temp_name ve temp_password alanlarında tutulur.
-- ------------------------------------------------------------
CREATE TABLE email_verification_codes (
    id            SERIAL        PRIMARY KEY,
    user_id       INTEGER,
    email         VARCHAR(255)  NOT NULL,
    code          VARCHAR(6)    NOT NULL,
    purpose       VARCHAR(30)   NOT NULL,
    expires_at    TIMESTAMP     NOT NULL,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    temp_name     VARCHAR(100),
    temp_password VARCHAR(255),
    CONSTRAINT fk_email_verification_codes_user
        FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE CASCADE
);

CREATE INDEX ix_email_verification_codes_id
    ON email_verification_codes (id);


-- ------------------------------------------------------------
-- TABLO 13: favorites
-- Açıklama: Kullanıcıların beğenip kaydettiği tariflerin
-- listesini tutan tablodur. Kullanıcı ile tarif arasındaki
-- M:N ilişkiyi modelleyen köprü görevi görür. Bir kullanıcı
-- aynı tarifi birden fazla kez favorilerine ekleyemez
-- (uygulama katmanı kontrolü).
-- ------------------------------------------------------------
CREATE TABLE favorites (
    favorite_id SERIAL   PRIMARY KEY,
    user_id     INTEGER  NOT NULL,
    recipe_id   INTEGER  NOT NULL,
    CONSTRAINT fk_favorites_user
        FOREIGN KEY (user_id)
        REFERENCES users (user_id),
    CONSTRAINT fk_favorites_recipe
        FOREIGN KEY (recipe_id)
        REFERENCES recipes (recipe_id)
);

CREATE INDEX ix_favorites_favorite_id ON favorites (favorite_id);


-- ------------------------------------------------------------
-- TABLO 14: disliked_ingredients
-- Açıklama: Kullanıcının sevmediğini belirttiği malzemeleri
-- tutan tablodur. Öneri algoritması, bu tablodaki malzemeleri
-- içeren tariflere ceza puanı uygular; bu sayede kullanıcıya
-- rahatsızlık verecek tarifler listenin üstüne çıkmaz.
-- ------------------------------------------------------------
CREATE TABLE disliked_ingredients (
    disliked_id   SERIAL   PRIMARY KEY,
    user_id       INTEGER  NOT NULL,
    ingredient_id INTEGER  NOT NULL,
    CONSTRAINT fk_disliked_ingredients_user
        FOREIGN KEY (user_id)
        REFERENCES users (user_id),
    CONSTRAINT fk_disliked_ingredients_ingredient
        FOREIGN KEY (ingredient_id)
        REFERENCES ingredients (ingredient_id)
);

CREATE INDEX ix_disliked_ingredients_disliked_id
    ON disliked_ingredients (disliked_id);


-- ------------------------------------------------------------
-- TABLO 15: owned_ingredients
-- Açıklama: Kullanıcının evinde bulundurduğu malzemeleri
-- ("Dolabım / Kiler") kaydeden tablodur. Öneri algoritması
-- bu tablodaki malzemeleri göz önünde bulundurarak dolaptaki
-- malzemeyle yapılabilecek tarif önerisine ek ağırlık verir.
-- ------------------------------------------------------------
CREATE TABLE owned_ingredients (
    owned_id      SERIAL    PRIMARY KEY,
    user_id       INTEGER   NOT NULL,
    ingredient_id INTEGER   NOT NULL,
    added_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_owned_ingredients_user
        FOREIGN KEY (user_id)
        REFERENCES users (user_id),
    CONSTRAINT fk_owned_ingredients_ingredient
        FOREIGN KEY (ingredient_id)
        REFERENCES ingredients (ingredient_id)
);

CREATE INDEX ix_owned_ingredients_owned_id
    ON owned_ingredients (owned_id);


-- ------------------------------------------------------------
-- TABLO 16: daily_logs
-- Açıklama: Kullanıcının günlük yediği yemekleri tarih ve
-- öğün bazında kaydeden beslenme günlüğü tablosudur. Her
-- kayıt hangi tarif yenildiğini, kaç porsiyon olduğunu,
-- toplam alınan kalori ile makro besin değerlerini ve öğün
-- türünü (kahvaltı, öğle, akşam, ara öğün) içerir. Bu
-- tablo, haftalık beslenme analizi ve kalori takibi
-- ekranlarının veri kaynağıdır.
-- ------------------------------------------------------------
CREATE TABLE daily_logs (
    log_id               SERIAL        PRIMARY KEY,
    user_id              INTEGER       NOT NULL,
    recipe_id            INTEGER       NOT NULL,
    log_date             DATE,
    logged_at            TIMESTAMP,
    meal_type            VARCHAR(30),
    entry_source         VARCHAR(20),
    calorie_intake       NUMERIC(6, 2),
    protein_intake       NUMERIC(6, 2),
    carbohydrate_intake  NUMERIC(6, 2),
    fat_intake           NUMERIC(6, 2),
    serving_count        INTEGER,
    serving_multiplier   NUMERIC(6, 2),
    CONSTRAINT fk_daily_logs_user
        FOREIGN KEY (user_id)
        REFERENCES users (user_id),
    CONSTRAINT fk_daily_logs_recipe
        FOREIGN KEY (recipe_id)
        REFERENCES recipes (recipe_id)
);

CREATE INDEX ix_daily_logs_log_id ON daily_logs (log_id);


-- ------------------------------------------------------------
-- TABLO 17: revision_cache
-- Açıklama: Gemini API aracılığıyla yeniden düzenlenen
-- (revize edilen) tarif yanıtlarını önbelleğe alan tablodur.
-- Aynı tarife aynı düzenleme parametreleriyle (modifications_hash)
-- tekrar istek gelirse Gemini'ye yeniden sorgu yapılmaz,
-- önbellekteki yanıt doğrudan döndürülür. Bu yöntem API
-- maliyetini ve gecikmeyi önemli ölçüde azaltır.
-- ------------------------------------------------------------
CREATE TABLE revision_cache (
    cache_id            SERIAL      PRIMARY KEY,
    recipe_id           INTEGER     NOT NULL,
    modifications_hash  VARCHAR(64) NOT NULL,
    response_json       TEXT        NOT NULL,
    created_at          TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_revision_cache_recipe_hash
        UNIQUE (recipe_id, modifications_hash),
    CONSTRAINT fk_revision_cache_recipe
        FOREIGN KEY (recipe_id)
        REFERENCES recipes (recipe_id)
        ON DELETE CASCADE
);

CREATE INDEX ix_revision_cache_cache_id
    ON revision_cache (cache_id);
CREATE INDEX ix_revision_cache_recipe_hash
    ON revision_cache (recipe_id, modifications_hash);


-- ============================================================
-- ÖRNEK SQL SORGULARI
-- ============================================================

-- --------------------------------------------------------
-- Örnek 1: Kullanıcının seçtiği malzemelere göre tarif önerisi
-- (Eşleşen malzeme sayısına göre sıralanmış)
-- --------------------------------------------------------
SELECT
    r.recipe_id,
    r.recipe_name,
    r.calorie,
    r.health_grade,
    COUNT(ri.ingredient_id) FILTER (
        WHERE ri.ingredient_id = ANY(ARRAY[101, 205, 310])  -- kullanıcının seçtiği malzeme id'leri
    ) AS matched_count,
    COUNT(ri.ingredient_id) AS total_ingredients
FROM recipes r
JOIN recipe_ingredients ri ON r.recipe_id = ri.recipe_id
WHERE r.is_active = TRUE
  AND (r.user_id IS NULL OR r.user_id = 42)  -- global + kullanıcıya özel tarifler
GROUP BY r.recipe_id
HAVING COUNT(ri.ingredient_id) FILTER (
    WHERE ri.ingredient_id = ANY(ARRAY[101, 205, 310])
) > 0
ORDER BY matched_count DESC, r.health_score DESC
LIMIT 20;


-- --------------------------------------------------------
-- Örnek 2: Belirli bir tarife favori ekleme
-- --------------------------------------------------------
INSERT INTO favorites (user_id, recipe_id)
VALUES (42, 15)
ON CONFLICT DO NOTHING;


-- --------------------------------------------------------
-- Örnek 3: Kullanıcının favorisini kaldırma
-- --------------------------------------------------------
DELETE FROM favorites
WHERE user_id = 42 AND recipe_id = 15;


-- --------------------------------------------------------
-- Örnek 4: Günlük yemek kaydı ekleme
-- --------------------------------------------------------
INSERT INTO daily_logs (
    user_id, recipe_id, log_date, logged_at,
    meal_type, calorie_intake, protein_intake,
    carbohydrate_intake, fat_intake,
    serving_count, serving_multiplier
)
VALUES (
    42, 15, '2026-05-19', CURRENT_TIMESTAMP,
    'lunch', 450.00, 28.50, 52.00, 14.20,
    1, 1.00
);


-- --------------------------------------------------------
-- Örnek 5: Kullanıcının belirli bir güne ait günlük log özeti
-- --------------------------------------------------------
SELECT
    dl.meal_type,
    r.recipe_name,
    dl.serving_count,
    dl.calorie_intake,
    dl.protein_intake,
    dl.carbohydrate_intake,
    dl.fat_intake,
    dl.logged_at
FROM daily_logs dl
JOIN recipes r ON r.recipe_id = dl.recipe_id
WHERE dl.user_id = 42
  AND dl.log_date = '2026-05-19'
ORDER BY dl.logged_at;


-- --------------------------------------------------------
-- Örnek 6: Kullanıcının haftalık kalori ve makro özeti
-- --------------------------------------------------------
SELECT
    dl.log_date,
    SUM(dl.calorie_intake)      AS total_calorie,
    SUM(dl.protein_intake)      AS total_protein,
    SUM(dl.carbohydrate_intake) AS total_carb,
    SUM(dl.fat_intake)          AS total_fat
FROM daily_logs dl
WHERE dl.user_id = 42
  AND dl.log_date BETWEEN '2026-05-13' AND '2026-05-19'
GROUP BY dl.log_date
ORDER BY dl.log_date;


-- --------------------------------------------------------
-- Örnek 7: Tarif malzeme listesi (gram dönüşümü ile)
-- --------------------------------------------------------
SELECT
    i.ingredient_name,
    ri.amount,
    ri.unit,
    ri.miktar_gram,
    ri.donusum_guveni
FROM recipe_ingredients ri
JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
WHERE ri.recipe_id = 15
ORDER BY i.ingredient_name;


-- --------------------------------------------------------
-- Örnek 8: Kullanıcının dolabında bulunan malzemeleri listele
-- --------------------------------------------------------
SELECT
    i.ingredient_id,
    i.ingredient_name,
    ic.category_name,
    oi.added_at
FROM owned_ingredients oi
JOIN ingredients i  ON i.ingredient_id  = oi.ingredient_id
LEFT JOIN ingredient_categories ic ON ic.category_id = i.category_id
WHERE oi.user_id = 42
ORDER BY ic.category_name, i.ingredient_name;


-- --------------------------------------------------------
-- Örnek 9: Tarife ait Gemini önbellekten cevap alma
-- --------------------------------------------------------
SELECT response_json
FROM revision_cache
WHERE recipe_id = 15
  AND modifications_hash = 'a3f9c2b1d4e8...';  -- SHA-256 hash


-- --------------------------------------------------------
-- Örnek 10: Sevilmeyen malzemeleri içermeyen tarifleri bul
-- --------------------------------------------------------
SELECT DISTINCT r.recipe_id, r.recipe_name, r.calorie, r.health_grade
FROM recipes r
WHERE r.is_active = TRUE
  AND (r.user_id IS NULL OR r.user_id = 42)
  AND r.recipe_id NOT IN (
      SELECT DISTINCT ri2.recipe_id
      FROM recipe_ingredients ri2
      JOIN disliked_ingredients di ON di.ingredient_id = ri2.ingredient_id
      WHERE di.user_id = 42
  )
ORDER BY r.health_score DESC
LIMIT 20;
