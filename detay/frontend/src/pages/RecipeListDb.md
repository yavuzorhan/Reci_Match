# RecipeListDb.jsx — Tarif Listesi Sayfası

## Bu Dosya Ne İçin Var?

Sistemdeki tüm tarifleri (hem global hem kullanıcının kişisel tarifleri) listeler. Arama, kategori filtresi ve pişirme tipi filtresi sunar.

## Mimarideki Yeri

**Katman:** Frontend Sayfa

- `AppContext` → `fetchAllRecipes()`, `fetchRecipeList()`
- `RecipeCard.jsx` → Her tarif kartı
- `recipeInsights.js` → Filtre uygulamak için

## Özellikler

### Arama
Tarif adına göre client-side filtreleme. Anlık.

### Kategori Filtresi
"Çorba", "Ana Yemek", "Tatlı", "Salata" vb. chip'ler. Seçince o kategori filtrelenir.

### Pişirme Tipi
"Fırın", "Tava", "Tencere" chip'leri.

### Kendi Tariflerim
`user_id` olan tarifler (kişisel) ayrı sekme veya "Sadece benimkiler" filtresi ile.

### Tarif Ekleme
Sağ üst köşede "+" butonu → `AddRecipeForm` modal'ı açar.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Her sayfa açıldığında tüm tarifler mi yükleniyor?**
  C: Evet, şu an sayfalama yok. Tüm tarifler tek istekte gelir. Büyük veri için sayfalama (pagination) eklenebilir.

- **S: Kullanıcı global tarifleri görebilir mi?**
  C: Evet. Global tarifler (`user_id = NULL`) herkese görünür. Kullanıcı kendi eklediği tarifleri de görür.
