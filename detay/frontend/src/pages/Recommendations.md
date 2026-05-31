# Recommendations.jsx — Tarif Önerileri Sayfası

## Bu Dosya Ne İçin Var?

Kullanıcının seçtiği malzemelere göre puanlanmış tarif önerilerini listeler. Her tarif için eşleşen/eksik malzeme gösterir, puan ve sağlık bandını görselleştirir.

## Mimarideki Yeri

**Katman:** Frontend Sayfa

- `AppContext` → `fetchRecommendedRecipes()`, `dislikedIngredients`, `pantryIngredients`
- `recipeInsights.js` → `applyRecipeFilters()`, `getHealthMeta()`
- `RecipeCard.jsx` → Her tarif kartı

## Ne Gösterir?

### Her Tarif Kartında
- Tarif adı ve resmi
- **Öneri skoru** (0-100) → Malzeme uyum puanı
- **Health grade** (A/B/C/D chip) → Sağlık kalitesi
- **Eşleşen malzemeler** → Yeşil çip listesi
- **Eksik malzemeler** → Gri çip listesi
- Pişirme süresi, kalori

### Filtre Satırı
- "30 dk Altı" / "Fırında" / "Tavada" / "Tencerede"
- "Sevilmeyenleri Çıkar"
- "Düşük Kalorili" / "Yüksek Proteinli"
- "Sağlıklı Tarifler" toggle

## Öneri İsteği Akışı

```javascript
const results = await fetchRecommendedRecipes({
    selected_ingredient_ids: selectedIngredients,
    pantry_ingredient_ids: pantryIngredients.map(i => i.id),
    disliked_ingredient_ids: dislikedIngredients,
    exclude_disliked: filterState.excludeDisliked,
    healthy_only: filterState.healthyOnly,
    cooking_type: [...pişirmeTipi],
    source: null
});
```

Backend bu isteği alır, öneri algoritmasını çalıştırır ve puanlanmış sıralı liste döner.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Puan sıralaması nasıl çalışıyor?**
  C: Backend `score` alanına göre azalan sıralı döner. Frontend bu sırayı korur, sadece filtreler uygular.

- **S: "Sevilmeyenleri Çıkar" ne anlama geliyor?**
  C: Sevilmeyen malzeme içeren tarifler listeden kaldırılır. Ceza puanı (-35/malzeme) yerine tamamen çıkarma.

- **S: Puan 0 olabilir mi?**
  C: Eşleşme varsa minimum 5 puan. Hiç eşleşme yoksa tarif listede görünmez.
