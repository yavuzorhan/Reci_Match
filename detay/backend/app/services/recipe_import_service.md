# recipe_import_service.py — Tarif İçe Aktarma Servisi

## Bu Dosya Ne İçin Var?

Scraper'dan (yemek.com) veya harici JSON kaynağından tarif verilerini veritabanına toplu olarak aktarır. Scraper çıktısını işleyerek `recipes` ve `recipe_ingredients` tablolarına dönüştürür.

## Mimarideki Yeri

**Katman:** Service (Veri Aktarım)

- Scraper → ham JSON
- Bu servis → JSON'u parse et → DB'ye kaydet
- `ingredient_resolver_service.py` → malzeme adlarını çözmek için

## Temel İşlevler

### Scraper Verisi İşleme

Scraper yemek.com'dan tarif adı, malzeme listesi, hazırlık, süre, kategori ve besin değerlerini çeker. Bu servis bu veriyi `recipes` tablosuna uygun hale getirir.

### Malzeme Eşleştirme

Scraper'dan gelen metin malzeme adları (`"2 su bardağı pirinç"`) → miktar, birim ve malzeme adına ayrıştırılır → `ingredient_resolver_service` ile veritabanındaki malzemeyle eşleştirilir.

### Porsiyon Bazlı Besin Değerleri

Scraper yemek.com'dan **porsiyon başına** besin değerlerini çeker. Bu değerler `recipes` tablosuna doğrudan yazılır. `serving` ile çarpılarak toplam değer hesaplanır.

## Neden Scraper Ayrı?

`backend/scraper/` klasöründe ayrı çalışır. Veri güncellemesi tek seferlik bir işlem; sürekli çalışmıyor. Tüm yemek.com tarifleri zaten içe aktarıldı.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Scraper şu an aktif mi?**
  C: Pasif. Veriler zaten içe aktarıldı ve `recipes` tablosunda. `scraper/` klasörü referans amaçlı bırakıldı.

- **S: Yeni tarif eklenebilir mi?**
  C: Evet, iki yol: (1) Kullanıcı uygulamadan kendi tarifini ekler, (2) Admin scraper ile yeni batch alır.
