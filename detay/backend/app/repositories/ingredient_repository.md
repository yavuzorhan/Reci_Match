# repositories/ingredient_repository.py — Malzeme SQL Sorguları

## Bu Dosya Ne İçin Var?

Malzeme arama, listeleme, alias sorgulama ve kategori listeleme için veritabanı sorgularını içerir.

## Mimarideki Yeri

**Katman:** Repository (Veri Erişim)

- `ingredient_resolver_service.py` → eşleştirme için çok kullanılır
- `ingredient_service.py` → listeleme için

## Temel Fonksiyonlar

### `find_accessible_ingredients_by_name(db, user_id, name)`
**Ne yapar:** Hem global hem kullanıcıya özgü malzemeleri SQL `LOWER()` ile arar.

```python
db.query(Ingredient).filter(
    or_(Ingredient.user_id.is_(None), Ingredient.user_id == user_id),
    func.lower(Ingredient.ingredient_name).contains(name.lower())
)
```

### `find_accessible_ingredient_alias(db, user_id, normalized_name)`
**Ne yapar:** `ingredient_aliases` tablosunda normalize edilmiş ada göre arama.

### `list_accessible_ingredients(db, user_id)`
**Ne yapar:** Tüm erişilebilir malzemeleri listeler. Fuzzy matching için kullanılır.

```python
db.query(Ingredient).filter(
    or_(Ingredient.user_id.is_(None), Ingredient.user_id == user_id)
).all()
```

### `get_categories(db)`
`ingredient_categories` tablosunun tamamını döndürür.

## Sıkça Sorulabilecek Hoca Soruları

- **S: `find_accessible_ingredients_by_name` neden hem global hem kişisel malzemelere bakıyor?**
  C: Kullanıcı hem sisteme eklenmiş genel malzemeleri hem kendi eklediği özel malzemeleri kullanabilmeli. `or_(user_id IS NULL, user_id = X)` her ikisini kapsar.
