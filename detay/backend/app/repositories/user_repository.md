# repositories/user_repository.py — Kullanıcı SQL Sorguları

## Bu Dosya Ne İçin Var?

Kullanıcı bilgisi, profil, favori, dolap, sevilmeyen ve günlük log için tüm veritabanı sorgularını barındırır.

## Mimarideki Yeri

**Katman:** Repository (Veri Erişim)

- `user_service.py` → bu fonksiyonları çağırır
- `auth_service.py` → kullanıcı arama için

## Temel Fonksiyonlar

### `find_user_by_email(db, email)` / `find_user_by_id(db, user_id)`
Kullanıcı arama — login ve profil işlemleri için.

### `get_user_daily_logs(db, user_id, limit, offset)`
Kullanıcının tüm öğün kayıtları. Tarih sırasına göre azalan.

### `add_favorite(db, user_id, recipe_id)` / `remove_favorite(db, user_id, recipe_id)`
Favori ekleme/çıkarma. Duplicate kontrolü ile.

### `get_pantry_ingredients(db, user_id)`
Kullanıcının dolap içeriği — malzeme bilgileriyle birlikte join'li sorgu.

### `get_disliked_ingredients(db, user_id)`
Sevilmeyen malzeme listesi.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Günlük loglar sayfalandırılıyor mu?**
  C: `limit` ve `offset` parametreleriyle sayfalandırma destekleniyor. Frontend şu an tüm logları çekiyor ama büyük veri için sayfalandırma gerekebilir.
