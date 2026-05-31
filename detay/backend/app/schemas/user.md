# schemas/user.py — Kullanıcı Pydantic Şemaları

## Bu Dosya Ne İçin Var?

Kullanıcı profil güncelleme, günlük log ekleme ve favori yönetimi için veri yapılarını tanımlar.

## Önemli Şemalar

### `ProfileUpdateRequest`
```python
class ProfileUpdateRequest(BaseModel):
    age: int | None = Field(None, ge=1, le=120)
    gender: Literal["Erkek", "Kadın", "Diğer"] | None = None
    height_cm: int | None = Field(None, ge=50, le=300)
    weight_kg: float | None = Field(None, ge=10, le=500)
    objective: Literal["Kilo Vermek", "Kilo Almak", "Kilo Korumak"] | None = None
    activity: str | None = None
    meals: int | None = Field(None, ge=1, le=10)
```

`Literal[...]` → Sadece listelenen değerlere izin verir. "Kaslilanmak" gibi olmayan bir hedef 422 hatasıyla reddedilir.

### `DailyLogCreate`
```python
class DailyLogCreate(BaseModel):
    recipe_id: int
    meal_type: str = "Akşam Yemeği"
    serving_count: int = Field(default=1, ge=1, le=99)
    calorie_intake: float | None = None
```

### `FavoriteCreate`
```python
class FavoriteCreate(BaseModel):
    recipe_id: int
```

## Neden `Literal` Kullanılıyor?

```python
objective: Literal["Kilo Vermek", "Kilo Almak", "Kilo Korumak"]
```

Veritabanında saklanan değerlerin tutarlı olması için. Yanlış yazılmış veya olmayan bir hedef kabul edilmez. Swagger belgesi de enum olarak gösterir.
