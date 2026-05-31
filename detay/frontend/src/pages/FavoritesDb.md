# FavoritesDb.jsx — Favorilerim Sayfası

## Bu Dosya Ne İçin Var?

Kullanıcının favoriye eklediği tarifleri listeler. Favoriden çıkarma ve tarif detayına geçme işlemleri yapılır.

## Mimarideki Yeri

**Katman:** Frontend Sayfa

- `AppContext` → `favorites`, `recipeCache`, `toggleFavorite()`, `fetchRecipesByIds()`

## Akış

```
Sayfa açılır →
    favorites = [42, 17, 93] (ID listesi, AppContext'ten) →
    fetchRecipesByIds([42, 17, 93]) →
    Eksik ID'ler API'den çekilir →
    RecipeCard'larla listelenir
```

## Favoriden Çıkarma

```javascript
await toggleFavorite(recipe.id);
// State güncellenir → favorites listesinden ID kaldırılır → sayfa yenilenmez
```

`toggleFavorite` hem API'yi çağırır hem local state'i günceller. Sayfa yenilemek gerekmez.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Favoriler hangi tarihten itibaren listeleniyor?**
  C: Tüm zamanlar. `favorites` tablosunda tarih filtresiz tüm kayıtlar.

- **S: Favori tarif silinirse ne olur?**
  C: CASCADE ile `favorites` kaydı da silinir. Sayfa yenilenince liste güncellenir.
