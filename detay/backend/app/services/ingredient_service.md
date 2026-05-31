# ingredient_service.py — Malzeme Servisi

## Bu Dosya Ne İçin Var?

Malzeme arama, listeleme, kullanıcı bazlı erişim ve kategori yönetimini sağlar. Frontend'in malzeme bileşenlerinin ihtiyaç duyduğu verileri hazırlar.

## Mimarideki Yeri

**Katman:** Service (İş Mantığı)

- `app/routers/ingredients.py` → bu servisi çağırır
- `ingredient_repository.py` → veritabanı sorguları
- `ingredient_resolver_service.py` → yeni malzeme oluştururken

## Temel İşlevler

### Malzeme Arama
Kullanıcının yazdığı arama terimine göre hem global hem kişisel malzemeleri listeler. Türkçe normalleştirme ile büyük/küçük harf farkı gözetilmez.

### Kategori Listesi
`ingredient_categories` tablosundaki tüm kategorileri döndürür. Frontend'de malzeme ekleme formunda dropdown olarak kullanılır.

### Kullanıcı Malzeme Yönetimi
Kullanıcının kişisel malzeme ekleme, güncelleme ve silme işlemlerini yönetir.

### Besin Değeri Senkronizasyonu
`/api/ingredients/nutrition/sync-missing` endpoint'i → Besin değeri eksik malzemeleri Gemini ile toplu günceller.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Malzeme silince tarifler etkileniyor mu?**
  C: CASCADE sayesinde o malzemi kullanan `recipe_ingredients` satırları da silinir. Ancak `is_active` tarif seviyesinde; malzeme silme tarifi silmez ama o malzeme bağlantısını kaldırır.

- **S: Kullanıcı kişisel malzeme ekleyince nereye gidiyor?**
  C: `ingredients` tablosuna `user_id = kullanıcı_id` ile eklenir. Sadece o kullanıcı görür.
