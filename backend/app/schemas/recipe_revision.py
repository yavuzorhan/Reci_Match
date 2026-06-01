from pydantic import BaseModel, Field

class AddIngredientModification(BaseModel):
    name: str
    amount: float | None = None
    unit: str | None = None

class AdjustAmountModification(BaseModel):
    ingredient: str
    new_amount: float

class RecipeRevisionRequest(BaseModel):
    original_recipe_id: int | None = None
    remove_ingredients: list[str] = Field(default_factory=list)
    add_ingredients: list[AddIngredientModification] = Field(default_factory=list)
    adjust_amounts: list[AdjustAmountModification] = Field(default_factory=list)
    free_text_request: str | None = None

class RevisedRecipeIngredient(BaseModel):
    ingredient_name: str
    amount: float | None = None
    unit: str | None = None

class RevisedRecipePayload(BaseModel):
    recipe_name: str
    explanation: str | None = None
    preparation: str
    recipe_category: str | None = None
    cooking_type: str | None = None
    cooking_method: str | None = None
    total_time_minutes: int | None = None
    serving: int | None = None
    image_url: str | None = None
    ingredients: list[RevisedRecipeIngredient]

class RecipeRevisionResponse(BaseModel):
    status: str
    cached: bool
    revised_recipe: RevisedRecipePayload

class RecipeRevisionSaveRequest(BaseModel):
    user_id: int
    revised_recipe: RevisedRecipePayload
