# schemas/recipe.py — Tarif Pydantic Şemaları

## Bu Dosya Ne İçin Var?

Tarif ekleme, güncelleme ve listeleme için gelen/giden veri yapılarını tanımlar. FastAPI bu şemaları kullanarak otomatik doğrulama ve Swagger belgesi oluşturur.

## Mimarideki Yeri

**Katman:** Şema / Veri Doğrulama

- Router'lar gelen request body'leri bu şemalarla doğrular
- Çıkan response'lar bu şemalar formatında serialize edilir

## Önemli Şemalar

### `RecipeCreateRequest`
Tarif ekleme isteği:
- `name: str` (zorunlu, min 1 karakter)
- `ingredients: list[IngredientInRecipe]` (zorunlu, min 1 eleman)
- `serving: int` (1-99 arası)
- `cooking_type: Literal["Fırında", "Tavada", "Tencerede", "Diğer"] | None`

### `RecommendationRequest`
Öneri isteği:
- `selected_ingredient_ids: list[int]` — Seçili malzeme ID'leri
- `pantry_ingredient_ids: list[int]` — Dolap malzeme ID'leri
- `disliked_ingredient_ids: list[int]` — Sevilmeyen malzeme ID'leri
- `exclude_disliked: bool`
- `healthy_only: bool`
- `cooking_types: list[str]`

## Neden Pydantic?

FastAPI + Pydantic kombinasyonu:
1. Veri tipi otomatik kontrol (str yerine int gelirse 422 hatası)
2. Swagger belgesi otomatik oluşturulur
3. IDE otomatik tamamlama için tip bilgisi

## Sıkça Sorulabilecek Hoca Soruları

- **S: Şema ile model farkı nedir?**
  C: Model (SQLAlchemy) → Veritabanı tablosu temsili. Şema (Pydantic) → HTTP isteği/yanıtı veri yapısı. Model DB'yi, şema API'yi temsil eder.
