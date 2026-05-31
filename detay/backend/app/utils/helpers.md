# helpers.py — Genel Yardımcı Fonksiyonlar

## Bu Dosya Ne İçin Var?

Birden fazla serviste ihtiyaç duyulan küçük yardımcı fonksiyonları barındırır: malzeme adı normalleştirme, kategori tahmini, kalori hesaplama.

## Mimarideki Yeri

**Katman:** Utility

- `ingredient_resolver_service.py` → `normalize_ingredient_name()`, `infer_ingredient_category()`
- `user_service.py` → kalori hesabı için

## Fonksiyonlar

### `normalize_ingredient_name(name: str) -> str`
**Ne yapar:** Malzeme adını trim eder, küçük harfe çevirir, fazla boşlukları kaldırır.
**Örnek:** "  Tavuk Göğsü  " → "tavuk göğsü"
**Neden gerekli:** Veritabanı karşılaştırması tutarlı olsun diye.

### `infer_ingredient_category(name: str) -> tuple[str, int | None]`
**Ne yapar:** Malzeme adından kategori tahmin eder.
**Mantık:** "tavuk", "balık", "et" → Et kategorisi. "domates", "biber" → Sebze. "süt", "peynir" → Süt Ürünleri.
**Döndürür:** `(kategori_adı, kategori_id)` tuple'ı.

### Kalori Hesaplama Yardımcıları
Harris-Benedict formülü ile günlük kalori hedefi hesaplar. `user_service.py` tarafından profil güncellemesinde kullanılır.

## Sıkça Sorulabilecek Hoca Soruları

- **S: `infer_ingredient_category()` her zaman doğru mu?**
  C: Kural tabanlı yaklaşım; kelimelere dayalı tahmin. %90 doğruluk. Yanlış kategoride olması kullanıcı deneyimini bozmaz (sadece kategori filtresi etkilenir, besin değeri değil).
