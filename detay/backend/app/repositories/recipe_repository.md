# repositories/recipe_repository.py — Tarif SQL Sorguları

## Bu Dosya Ne İçin Var?

Tarife ilgili tüm veritabanı sorgularını içerir. Service katmanı iş mantığını bu fonksiyonlar aracılığıyla veritabanına erişir.

## Mimarideki Yeri

**Katman:** Repository (Veri Erişim)

- `recipe_service.py` → bu dosyadaki fonksiyonları çağırır
- Doğrudan SQLAlchemy sorguları yazar, iş mantığı içermez

## Temel Fonksiyonlar

### `get_all_recipes(db, user_id, ids, source, recipe_category, healthy_only)`
**Ne yapar:** Filtreli tarif listesi döndürür.

```python
query = db.query(Recipe).filter(Recipe.is_active == True)

if user_id:
    query = query.filter(
        or_(Recipe.user_id.is_(None), Recipe.user_id == user_id)
    )

if healthy_only:
    query = query.join(HealthyRecipe)

if source:
    query = query.filter(Recipe.source == source)
```

`or_(Recipe.user_id.is_(None), Recipe.user_id == user_id)` → Hem global hem kişisel tarifler.

### `find_recipe_by_id_with_relations(db, recipe_id)`
**Ne yapar:** Tarifi malzemeleri ve malzeme bilgileriyle (joined) yükler.

```python
db.query(Recipe)
    .options(
        joinedload(Recipe.ingredients).joinedload(RecipeIngredient.ingredient)
    )
    .filter(Recipe.recipe_id == recipe_id)
    .first()
```

`joinedload` → N+1 sorgu sorununu önler. Tek SQL sorgusuyla tarif + malzeme bağlantıları + malzeme bilgisi yüklenir.

### `create_recipe(db, ...)` / `replace_recipe_ingredients(db, ...)`
Yeni tarif oluşturur, malzeme bağlantılarını kurar.

### `find_revision_cache(db, recipe_id, modifications_hash)` / `create_revision_cache(...)`
Önbellek okuma/yazma.

## Neden Repository Pattern?

Service'ler doğrudan `db.query()` yazsaydı:
- Aynı sorgu birçok yerde tekrarlanırdı
- Test etmek zorlaşırdı (DB'yi mock etmek gerekir)
- Sorgu değişince birçok yer güncellenmeli

Repository ile sorgu tek yerde, servis sadece veriyle ilgilenir.

## Sıkça Sorulabilecek Hoca Soruları

- **S: N+1 sorgu problemi nedir?**
  C: 100 tarif çekip sonra her tarif için ayrı sorgu yapmak 101 sorgu = yavaş. `joinedload` ile tek sorgu → hızlı.

- **S: `is_active = True` filtresi neden her sorguda?**
  C: Soft-delete mekanizması. `is_active = False` yapılan tarifler görünmez ama veritabanında var.
