# recipe_health.py — Sağlık Skoru Hesaplama Algoritması

## Bu Dosya Ne İçin Var?

Bir tarifin ne kadar sağlıklı olduğunu 0-100 arası sayısal bir skora dönüştürür ve A/B/C/D bandına atar. Bu dosya projenin en karmaşık iş mantığını içerir ve tamamen kendi içinde kapalı (başka servise bağımlı değil) bir algoritma sunar.

## Mimarideki Yeri

**Katman:** Utility / İş Mantığı Yardımcısı

- `recipe_service.py` → `build_recipe_health_profile()` çağırır (tarif listelenirken)
- `recipe_revision_service.py` → Revize edilmiş tariflerin skoru için
- Sonuçlar `recipes.health_score` ve `recipes.health_grade` kolonlarına yazılır
- Frontend'de A/B/C/D bandı renkli chip olarak gösterilir

## Health Score Hesaplama — Adım Adım

### Adım 1: Giriş Değerleri

`calculate_health_score(calories, protein, carbs, fat, recipe_name, category, servings)` fonksiyonu çağrılır.

Değerler **porsiyon başına** olmalıdır. Eğer `values_are_per_serving=False` ise `servings` ile bölünür.

Kalori = 0 ise hesaplama yapılamaz, `"Hesaplanamadi"` döner.

### Adım 2: Makro Yüzdeleri Hesaplama

```python
protein_kcal = protein * 4     # 1 gram protein = 4 kcal
carb_kcal = carbs * 4          # 1 gram karbonhidrat = 4 kcal
fat_kcal = fat * 9             # 1 gram yağ = 9 kcal
macro_total = protein_kcal + carb_kcal + fat_kcal

protein_pct = protein_kcal / macro_total * 100
carb_pct = carb_kcal / macro_total * 100
fat_pct = fat_kcal / macro_total * 100
```

**Neden 4 ve 9?** Bunlar kalori katsayıları. Yağ, karbonhidrattan 2.25 kat daha fazla kalori içerir. Bu nedenle aynı gram yağ, çok daha yüksek kalori anlamına gelir.

### Adım 3: Beş Alt Skor (Subscore)

Her makro için 0-100 arası bağımsız skor hesaplanır:

---

#### `_calorie_subscore(calories)` — Kalori Skoru (Ağırlık: **%30**)

| Porsiyon Kalori | Skor |
|---|---|
| ≤ 150 kcal | 90 |
| 150-350 kcal | 85 |
| 350-550 kcal | 78 |
| 550-700 kcal | 68 |
| 700-850 kcal | 58 |
| 850-1000 kcal | 45 |
| 1000-1200 kcal | 35 |
| > 1200 kcal | 25 |

**Neden bu değerler?** Türkiye beslenme rehberlerine göre bir öğün 400-600 kcal idealdir. 550-700 arası hâlâ kabul edilebilir. 1000 kcal üzeri ağır kabul edilir.

---

#### `_protein_subscore(protein_per_100_kcal)` — Protein Skoru (Ağırlık: **%25**)

Her 100 kcal başına düşen protein gramına bakılır:

| Protein / 100 kcal | Skor |
|---|---|
| ≥ 8g | 100 |
| 6-8g | 90 |
| 4-6g | 75 |
| 2.5-4g | 60 |
| 1-2.5g | 40 |
| < 1g | 20 |

**Neden mutlak gram değil, 100 kcal başına?** Kaloriden bağımsız protein yoğunluğu daha anlamlı. 400 kcal'lik yemekte 20g protein iyi; 800 kcal'lik yemekte 20g protein düşük kalır.

---

#### `_fat_subscore(fat_pct, fat)` — Yağ Skoru (Ağırlık: **%25**)

| Yağ Yüzdesi | Temel Skor |
|---|---|
| ≤ %20 | 95 |
| %20-30 | 90 |
| %30-40 | 70 |
| %40-50 | 50 |
| %50-60 | 30 |
| > %60 | 15 |

Mutlak gram cezası ek olarak uygulanır:
- ≥ 80g → -20 puan
- ≥ 60g → -15 puan
- ≥ 40g → -8 puan
- ≥ 25g → -3 puan

**İki boyutlu değerlendirme:** Yüksek yağ yüzdesi + yüksek mutlak gram çift ceza alır.

---

#### `_carb_subscore(carb_pct, calories, fat, category)` — Karbonhidrat Skoru (Ağırlık: **%10**)

| Karbonhidrat Yüzdesi | Skor |
|---|---|
| %25-55 (ideal) | 90 |
| %55-65 | 75 |
| %65-80 | 55 |
| > %80 | 35 |
| %10-25 (düşük) | 70 |
| < %10 | 50 |

---

#### `_balance_subscore(...)` — Denge Skoru (Ağırlık: **%10**)

Makroların birbirleriyle dengesi:
- Protein %20-35 arasında → +15 puan
- Karbonhidrat %25-60 arasında → +10 puan
- Yağ %15-35 arasında → +15 puan
- Yağ ≥ %55 → -25 puan
- Kalori ≥ 1000 → -20 puan
- Karbonhidrat ≥ 70g ve protein < 15g → -10 puan

---

### Adım 4: Ağırlıklı Birleştirme

```python
raw_score = (
    calorie_score * 0.30    # Kalori en ağırlıklı faktör
    + protein_score * 0.25  # Protein ikinci sırada
    + fat_score * 0.25      # Yağ eşit ağırlıkta
    + carb_score * 0.10     # Karbonhidrat daha az ağırlık
    + balance_score * 0.10  # Genel denge
)
```

**Neden bu ağırlıklar?** Kalori ve yağ, kronik hastalık riskiyle en güçlü ilişkili faktörler. Protein kas koruma ve tokluk için kritik. Karbonhidrat tek başına iyi/kötü değil; denge skoru bağlamı sağlar.

---

### Adım 5: İsim / Kategori Ayarlaması

`_weighted_name_category_adjustment()` tarif adına ve kategorisine bakarak ek düzeltme yapar:

| Tarif Adında / Kategoride | Koşul | Düzeltme |
|---|---|---|
| "kızartma" | — | -10 |
| "pilav", "pirinç" | karbonhidrat ≥50g | -5 |
| "şeker", "ballı" | karbonhidrat yüzdesi ≥%75 | -5 |
| "krema", "tereyağı" | yağ ≥30g | -6 |
| "salata", "sebze", "ızgara", "fırın" | — | +4 |

---

### Adım 6: Hard Cap (Tavan Sınırları)

Bazı durumlar maksimum skoru kısıtlar — bu sayede yüksek kalorili tariflerin asla A kalitesi alamaması garanti edilir:

| Koşul | Maksimum Skor |
|---|---|
| Kalori ≥ 1000 kcal | 59 |
| Yağ ≥ 70g | 59 |
| Yağ yüzdesi ≥ %55 | 59 |
| Kalori ≥ 1000 VE yağ yüzdesi ≥ %55 | 55 |
| Kalori ≥ 850 VE yağ ≥ 50g | 65 |

---

### Adım 7: Grade (Band) Belirleme

```python
def _health_grade(score):
    if score >= 80: return "A"   # Çok Sağlıklı
    if score >= 60: return "B"   # Dengeli
    if score >= 50: return "C"   # Kontrollu Tüketilebilir
    return "D"                    # Daha Ağır Tarif
```

---

## Malzeme Risk Analizi

`analyze_recipe_ingredient_risks(recipe)` → Tarif malzemelerini tek tek inceleyerek ek ceza/bonus hesaplar.

### Eklenen Şeker Hesabı

```python
_SUGAR_SOURCE_FACTORS = [
    ({"bal"}, 0.82),              # Balın %82'si şeker
    ({"pekmez"}, 0.60),           # Pekmezin %60'ı şeker
    ({"recel"}, 0.60),
    ({"surup", "şurup"}, 0.70),
    ({"seker", "toz seker", ...}, 1.0),  # Saf şeker
]
```

**Örnek:** "2 yemek kaşığı bal" → 2 × 20g = 40g × 0.82 = **32.8g eklenen şeker**

### Rafine Karbonhidrat Tespiti

`REFINED_CARB_TERMS`: pirinç, beyaz un, makarna, yufka, nişasta, irmik, galeta unu...

Malzeme "tam buğday" veya "yulaf" içeriyorsa rafine sayılmaz (`WHOLE_FLOUR_EXCLUSIONS`).

### Ceza Tablosu

| Eklenen Şeker | Ceza |
|---|---|
| ≥ 50g | 35 puan |
| 35-50g | 28 puan |
| 25-35g | 22 puan |
| 15-25g | 14 puan |
| 10-15g | 8 puan |
| 5-10g | 4 puan |

---

## `aggregate_recipe_nutrition(recipe)` — Besin Değeri Toplama

Tarif malzemelerini gezerek toplam besin değerini hesaplar:

```python
for link in ingredient_links:
    amount_grams, confidence = resolve_link_amount_grams(link)
    multiplier = amount_grams / 100.0

    for field in REQUIRED_HEALTH_FIELDS:
        totals[field] += ingredient.field_value * multiplier

per_serving[field] = totals[field] / servings
```

Eğer `miktar_gram` zaten hesaplanmışsa onu kullanır (yüksek güven = 0.85-1.0). Yoksa `UNIT_TO_GRAMS` tablosundan tahmin eder (düşük güven = 0.2-0.55).

---

## `UNIT_TO_GRAMS` — Birim Dönüşüm Tablosu

| Birim | Gram Karşılığı | Güven Skoru |
|---|---|---|
| g, gram | 1.0 | 1.0 |
| kg | 1000.0 | 1.0 |
| ml | 1.0 | 0.75 |
| yemek kaşığı | 15.0 | 0.55 |
| su bardağı | 200.0 | 0.45 |
| çay bardağı | 100.0 | 0.45 |
| adet | 50.0 | 0.25 |
| demet | 60.0 | 0.20 |

---

## Sıkça Sorulabilecek Hoca Soruları

- **S: Health score nasıl hesaplanıyor? Özetle anlat.**
  C: 5 alt skor (kalori %30, protein %25, yağ %25, karbonhidrat %10, denge %10) ağırlıklı ortalamayla birleştirilir. Tarif adı ve malzeme riski ek düzeltme yapar. Hard cap'ler aşırı değerleri sınırlar. Sonuç 0-100 skor ve A/B/C/D bant.

- **S: Neden kalori %30, protein %25 ağırlık aldı?**
  C: Dünya Sağlık Örgütü ve Türkiye beslenme rehberlerine dayanarak belirlendi. Kalori kontrolü kilo yönetiminin temelidir. Protein, tokluk ve kas korunması için kritik. Yağ, kardiyovasküler risk ile en güçlü ilişkili makrodur.

- **S: Bir tarif D bant almasına rağmen yine de önerilebilir mi?**
  C: Evet. Health score, öneri skoru değildir. D band tarif yine de seçili malzemelere çok iyi eşleşebilir ve yüksek öneri skoru alabilir. İki metrik bağımsız çalışır.

- **S: "Kızartma" adındaki tarif neden ekstra -10 ceza alıyor?**
  C: Kızartma pişirme yöntemi besinlerin yağ emişini artırır. Bu bilinen bir beslenme gerçeği. Malzeme verisi bu yağı tam yansıtmıyor olabilir; isim bazlı düzeltme bu boşluğu kapatır.

- **S: `confidence` değeri ne anlama geliyor?**
  C: 0-1 arası. Besin hesaplamasının ne kadar güvenilir olduğunu gösterir. Malzemelerin %90'ı gram verisiyle hesaplandıysa ≈0.85+. Sadece "adet" gibi belirsiz birimler varsa 0.3-0.5 olabilir.
