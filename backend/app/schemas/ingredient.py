from pydantic import BaseModel


class IngredientUpdate(BaseModel):
    ingredient_ids: list[int]


class CustomIngredientCreate(BaseModel):
    name: str
    category_id: int | None = None


class IngredientResolveRequest(BaseModel):
    ingredient_name: str
    user_id: int | None = None


class ManualIngredientCreate(BaseModel):
    ingredient_name: str
    calorie_per_100g: float
    protein_per_100g: float
    carbohydrate_per_100g: float
    fat_per_100g: float


class IngredientNutritionSyncRequest(BaseModel):
    ingredient_id: int


class MissingIngredientNutritionSyncRequest(BaseModel):
    limit: int = 25
