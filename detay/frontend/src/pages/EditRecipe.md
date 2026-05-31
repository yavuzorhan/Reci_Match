# EditRecipe.jsx — Tarif Düzenleme Sayfası

## Bu Dosya Ne İçin Var?

Kullanıcının kendi eklediği tarifleri düzenlemesini sağlar. Malzeme ekle/çıkar, isim, kategori, hazırlık adımları güncellenir.

## Mimarideki Yeri

**Katman:** Frontend Sayfa

- `AppContext` → `updateCustomRecipe()`
- `PUT /api/users/{id}/custom-recipes/{recipe_id}`

## Dikkat Edilmesi Gereken

Sadece `user_id = kullanıcı_id` olan tarifler düzenlenebilir. Global tarifler (yemek.com) düzenlenemez.

Düzenleme sonrası `recipeCache`'ten o tarif silinir → Bir sonraki açılışta taze versiyon çekilir.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Düzenleme sırasında malzeme değişince health score güncelleniyor mu?**
  C: Kaydetme sırasında backend health score'u yeniden hesaplar. Anlık güncellenmiyor.
