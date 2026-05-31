# IngredientPicker.jsx — Malzeme Seçici Bileşen

## Bu Dosya Ne İçin Var?

Tarif formu içinde malzeme arama, seçme ve miktar/birim belirleme bileşeni. `AddRecipeForm` ve `EditRecipe` sayfalarında kullanılır.

## Mimarideki Yeri

**Katman:** Frontend Bileşen (Tekrar Kullanılabilir Form Elemanı)

- `AddRecipeForm.jsx` → tarif eklerken
- `EditRecipe.jsx` → tarif düzenlerken

## Akış

```
Kullanıcı malzeme adı yazmaya başlar →
    Debounce (300ms bekle) →
    GET /api/ingredients?q={arama}&user_id={id} →
    Sonuçlar dropdown'da listelenir →
    Kullanıcı seçer → miktar ve birim girer →
    "Ekle" butonu → formun malzeme listesine eklenir
```

## Özellikler

### Debounce
Her tuş basışında API çağrısı yapılmaz. 300ms bekletilir — kullanıcı yazmayı durdurunca arama yapılır. Gereksiz API isteğini önler.

### Özel Malzeme
Aramada bulunamazsa "Özel malzeme ekle: {isim}" seçeneği. Bu malzeme backend'de `resolve_ingredient_for_user()` ile işlenir.

### Miktar/Birim
Seçilen malzeme için miktar (sayısal) ve birim (dropdown: Gram, ml, Adet, su bardağı vb.) girilir.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Kullanıcı aynı malzemeyi iki kez ekleyebilir mi?**
  C: Frontend kontrol eder; aynı malzeme varsa eklenmez veya uyarı gösterilir.
