# schemas/ingredient.py — Malzeme Pydantic Şemaları

## Bu Dosya Ne İçin Var?

Malzeme ekleme ve listeleme için gelen/giden veri yapılarını tanımlar.

## Önemli Şemalar

### `IngredientCreate`
```python
class IngredientCreate(BaseModel):
    name: str = Field(min_length=1)
    category_id: int | None = None
```

### `ManualIngredientRequest`
```python
class ManualIngredientRequest(BaseModel):
    ingredient_name: str
    calorie_per_100g: float = Field(ge=0)   # >= 0
    protein_per_100g: float = Field(ge=0)
    carbohydrate_per_100g: float = Field(ge=0)
    fat_per_100g: float = Field(ge=0)
```

`Field(ge=0)` → "greater than or equal to 0". Negatif besin değeri girilemez.

### `IngredientResponse`
Malzeme bilgisini içeren yanıt şeması. `ingredient_id`, `ingredient_name`, besin alanları, `nutrition_source`, `nutrition_confidence`.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Kalori ve protein için üst sınır var mı?**
  C: Şemada yok. Uygulama mantığı çok yüksek değerleri reddedebilir ama şema sadece `>= 0` kontrol eder.
