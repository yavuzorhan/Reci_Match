# schemas/recipe_revision.py — Tarif Revizyonu Pydantic Şemaları

## Bu Dosya Ne İçin Var?

Gemini AI ile tarif revizyonu için gelen istek ve dönen yanıt yapılarını tanımlar.

## Şemalar

### `RecipeRevisionRequest`
Kullanıcının yapmak istediği değişiklikler:

```python
class RecipeRevisionRequest(BaseModel):
    add_ingredients: list[IngredientModification] | None = None
    # Eklenecek malzemeler: [{"name": "sarımsak", "amount": 2, "unit": "diş"}]
    
    remove_ingredients: list[str] | None = None
    # Çıkarılacak malzeme isimleri: ["şeker", "tereyağı"]
    
    dietary_notes: str | None = None
    # Serbest metin not: "az yağlı yap", "veganlaştır"
    
    serving_change: int | None = None
    # Porsiyon sayısı değiştir
    
    original_recipe_id: int | None = None
```

### `RevisedRecipePayload`
Gemini'den dönen revize tarif:

```python
class RevisedRecipePayload(BaseModel):
    recipe_name: str
    explanation: str | None
    preparation: str
    ingredients: list[RevisedIngredient]
    serving: int | None
    cooking_type: str | None
    total_time_minutes: int | None
```

## Kritik Tasarım Kararı

`original_recipe_id` isteğe bağlı. Varsa path'teki `recipe_id` ile eşleşmeli, farklıysa 400 hatası. Bu tutarsızlık kontrolü.

## Sıkça Sorulabilecek Hoca Soruları

- **S: `dietary_notes` alanı ne kadar esnek?**
  C: Serbest metin. "Veganlaştır", "bebek için az tuzlu yap", "glutensiz" gibi her türlü istek yazılabilir. Gemini bunu yorumlar.
