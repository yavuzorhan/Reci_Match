# RecipeDetailDb.jsx — Tarif Detay Sayfası

## Bu Dosya Ne İçin Var?

Tek bir tarifin tüm bilgilerini gösterir: malzemeler, hazırlık adımları, besin değerleri, sağlık skoru. Favoriye ekleme, "Yedim" işaretleme ve Gemini revizyonu buradan yapılır.

## Mimarideki Yeri

**Katman:** Frontend Sayfa

- `AppContext` → `fetchRecipeById()`, `toggleFavorite()`, `addDailyLog()`, `reviseRecipe()`, `saveRevisedRecipe()`
- `recipeInsights.js` → health meta, `normalizeServingPortion()`
- `RecipeRevisionModal.jsx` → Gemini revizyon akışı

## Ne Gösterir?

### Üst Bölüm
- Tarif resmi
- Ad, kategori, pişirme tipi
- Süre ve porsiyon bilgisi
- Favori kalp ikonu
- Health grade chip (A/B/C/D)

### Besin Değerleri Kartı
- Kalori, protein, karbonhidrat, yağ — porsiyon başına
- "Porsiyon sayısı" seçici → Değiştirince besin değerleri orantılı değişir

### Malzeme Listesi
- Her malzeme için miktar, birim ve ad
- Besin değeri kaynağı (Gemini, manual, DB)

### Hazırlık Adımları
`preparation` alanındaki metin. Adım adım gösterim.

### Aksiyon Butonları
- **"Yedim" (markAsDone):** Seçilen porsiyon sayısıyla `addDailyLog()` çağrılır
- **"Revize Et":** `RecipeRevisionModal` açılır → Gemini akışı başlar

## `markAsDone` Fonksiyonu

```javascript
const markAsDone = async () => {
    await addDailyLog({
        recipeId: recipe.id,
        mealType: selectedMealType,
        servingCount: servingCount,
        calorieIntake: recipe.calorie * servingCount,
        protein: recipe.protein * servingCount,
        ...
    });
    // Başarı mesajı göster
};
```

`serving_count` kullanıcının seçtiği porsiyon sayısı. Kalori buna göre hesaplanır.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Aynı tarif birden fazla kez "Yedim" işaretlenebilir mi?**
  C: Evet. Her "Yedim" yeni bir `DailyLog` satırı oluşturur. Aynı tarifte farklı porsiyonlarla iki kez yemek gerçekçi senaryo.

- **S: Revize edilmiş tarif orijinali değiştiriyor mu?**
  C: Hayır. Revizyon yeni bir kişisel tarif olarak kaydedilir. Orijinal global tarif değişmez.

- **S: Besin değerleri porsiyon seçince nasıl değişiyor?**
  C: `recipe.calorie × servingCount` hesabı frontend'de yapılır. Backend'e istek gönderilmez, anlık UI güncellemesi.
