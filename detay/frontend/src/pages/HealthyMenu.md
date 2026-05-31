# HealthyMenu.jsx — Sağlıklı Menü Sayfası

## Bu Dosya Ne İçin Var?

Health score B+ olan (dengeli veya çok sağlıklı) tarifleri özel bir "Sağlıklı Menü" olarak listeler. Günlük sağlıklı beslenme planı oluşturmak için kullanılır.

## Mimarideki Yeri

**Katman:** Frontend Sayfa

- `AppContext` → `fetchHealthyRecipes()` → `healthy_only=true` ile tarif listesi
- `recipeInsights.js` → filtre ve health meta

## Ne Gösterir?

- Sadece `healthy_recipes` tablosuna kayıtlı tarifler (grade A veya B)
- Her tarifte besin kartı: kalori, protein, karbonhidrat, yağ
- Health grade chip: A (yeşil), B (mavi)
- Filtre: "Fırında", "Tavada", "30 dk Altı" vb.

## `fetchHealthyRecipes()` Nedir?

```javascript
const fetchHealthyRecipes = useCallback(
    () => fetchRecipeList({ healthy_only: 'true' }),
    [fetchRecipeList]
);
```

Backend `/api/recipes?healthy_only=true` → `JOIN healthy_recipes` ile sadece sağlıklı tarifler döner.

## Sıkça Sorulabilecek Hoca Soruları

- **S: "Sağlıklı" kriteri ne?**
  C: Health score ≥ 60 (grade B veya üstü). `healthy_recipes` tablosunda kayıtlı olan tarifler.

- **S: Kullanıcı D grade tarif buraya ekleyebilir mi?**
  C: Hayır. `healthy_recipes` tablosu otomatik dolduruluyor, kullanıcı kontrolünde değil.
