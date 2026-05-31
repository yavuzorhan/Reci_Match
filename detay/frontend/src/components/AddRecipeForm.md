# AddRecipeForm.jsx — Tarif Ekleme Formu

## Bu Dosya Ne İçin Var?

Kullanıcının yeni kişisel tarif eklemesini sağlayan modal form. Tarif adı, kategori, malzeme listesi, hazırlık adımları ve porsiyon bilgisi girilir.

## Mimarideki Yeri

**Katman:** Frontend Bileşen (Modal Form)

- `RecipeListDb.jsx` → "+" butonuyla açılır
- `AppContext` → `addCustomRecipe()`

## Form Alanları

- **Tarif Adı** — zorunlu
- **Kategori** — seçim listesi
- **Pişirme Tipi** — `<select>`: Fırında, Tavada, Tencerede, Diğer (serbest metin değil!)
- **Porsiyon** — 1-99 arası sayı
- **Malzemeler** — `IngredientPicker.jsx` bileşeni ile
- **Hazırlık Adımları** — textarea

## Birim Seçimi Kuralı

```jsx
<select name="unit">
    <option value="Gram">Gram</option>
    <option value="ml">ml</option>
    <option value="Adet">Adet</option>
    <option value="su bardağı">Su Bardağı</option>
    ...
</select>
```

**Serbest metin birim girişi yasak.** Bu sayede birim standardizasyonu sağlanır ve `unit_to_grams()` dönüşümü güvenilir çalışır.

## `manual_required` Durumu

Malzemenin besin değeri bulunamazsa backend `{"status": "manual_required"}` döner. Form bu durumda `ManualIngredientNutritionModal.jsx` açar.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Tarif eklendikten sonra health score hemen görünür mü?**
  C: Evet. Backend kayıt sırasında health score hesaplayıp `recipes.health_score` ve `health_grade`'e yazar. Tarif listesine döndüğünde chip görünür.

- **S: Pişirme tipi neden dropdown?**
  C: Öneri filtresi "Fırında/Tavada/Tencerede" seçimine göre çalışır. Serbest metin girişi bu filtreyi bozar.
