# RecipeCard.jsx — Tarif Kartı Bileşeni

## Bu Dosya Ne İçin Var?

Tek bir tarifi kart formatında gösterir. Tarif listesi, favoriler ve öneri sayfalarında kullanılır.

## Mimarideki Yeri

**Katman:** Frontend Bileşen (Yeniden Kullanılabilir)

- `RecipeListDb.jsx`, `FavoritesDb.jsx`, `Recommendations.jsx`, `HealthyMenu.jsx` → RecipeCard kullanır
- `AppContext` → `toggleFavorite()`, `favorites`

## Ne Gösterir?

- Tarif resmi (veya varsayılan resim)
- Tarif adı ve kısa özet (`buildRecipeShortSummary()`)
- Health grade chip (A/B/C/D) — renkli
- Pişirme süresi ve porsiyon
- Kalori (porsiyon başına)
- Favori kalp ikonu (toggle'lı)
- Eşleşen/eksik malzeme chip'leri (sadece Recommendations'da)

## Favori Toggle

```jsx
<button onClick={() => toggleFavorite(recipe.id)}>
    {favorites.includes(recipe.id) ? '❤️' : '🤍'}
</button>
```

`toggleFavorite` API çağrısı yapıp state'i günceller. Anlık değişim.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Kart tıklanınca ne oluyor?**
  C: `navigate('/recipes/:id')` → RecipeDetailDb sayfasına geçilir.

- **S: Resim yüklenemezse ne gösterilir?**
  C: Varsayılan `hero.png` gösterilir. `onError` event handler ile.
