# Pantry.jsx — Dolabım Sayfası

## Bu Dosya Ne İçin Var?

Kullanıcının kalıcı dolabını yönetir: evde sürekli bulunan malzemelerin listesi. Öneri algoritması dolap malzemelerini bonus puanla değerlendirir.

## Mimarideki Yeri

**Katman:** Frontend Sayfa

- `AppContext` → `pantryIngredients`, `/api/users/{id}/ingredients`

## Özellikler

### Dolap İçeriği
`owned_ingredients` tablosundaki malzemeler. Tarih, kategori ve isimle listelenir.

### Malzeme Ekleme
Arama kutusu → sonuç seçilir → dolaba eklenir → `OwnedIngredient` satırı oluşturulur.

### Malzeme Çıkarma
"✕" ikonuna basılır → `DELETE /api/users/{id}/ingredients/{id}` → dolabdan kaldırılır.

### Kategori Gruplandırma
Malzemeler "Et", "Sebze", "Tahıl" gibi kategorilere göre gruplanarak listelenir.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Dolap malzeme ekleme ile öneri akışındaki seçim farkı nedir?**
  C: Dolap kalıcı veri. Öneri akışındaki seçim anlık oturum verisi. Dolap "ev stoğu", seçim "bu tarife koymak istediğim".

- **S: Öneri algoritması dolabı nasıl kullanıyor?**
  C: `pantry_score = (pantry_hit_count / total_pantry) * 15` — max 15 puan bonus.
