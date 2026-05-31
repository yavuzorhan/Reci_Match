# healthy_recipe_service.py — Sağlıklı Tarif Yönetimi

## Bu Dosya Ne İçin Var?

`healthy_recipes` tablosunu yönetir. Yüksek health grade'e sahip tarifleri bu tabloya ekler, siler ve senkronize eder.

## Mimarideki Yeri

**Katman:** Service

- `recipe_service.py` → `healthy_only=True` filtresinde `ensure_healthy_recipe_table()` çağırır
- `recipe_repository.py` → healthy_recipes sorguları

## Temel İşlevler

### `ensure_healthy_recipe_table(db)`

`healthy_recipes` tablosunun var olduğunu garanti eder. İlk çağrıda B+ grade tarifler otomatik eklenir.

### Senkronizasyon Mantığı

Health score hesaplandıktan sonra:
- Grade A veya B → `healthy_recipes`'e ekle (yoksa)
- Grade C veya D → Varsa `healthy_recipes`'den çıkar

Bu sayede "Sağlıklı Tarif" filtresi gerçek zamanlı güncellenir.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Sağlıklı tarif kriteri nedir?**
  C: Health grade B veya üstü (health_score ≥ 60). A = çok sağlıklı, B = dengeli.

- **S: Tarif health score'u düşerse otomatik sağlıklı listeden çıkar mı?**
  C: Senkronizasyon çalıştırıldığında çıkar. Otomatik değil; `/sync-healthy-recipes` endpoint'i veya script tetiklenmeli.
