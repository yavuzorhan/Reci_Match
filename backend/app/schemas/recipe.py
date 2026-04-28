"""
Tarif (Recipe) ile ilgili Pydantic şemaları.
"""
from pydantic import BaseModel, ConfigDict


class CustomRecipeIngredientCreate(BaseModel):
    ingredient_id: int | None = None
    ingredient_name: str | None = None
    amount: float | None = None
    unit: str | None = None


class CustomRecipeCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    recipe_name: str | None = None
    description: str | None = None
    instructions: str | None = None
    recipe_category: str | None = None
    explanation: str | None = None
    preparation: str | None = None
    cooking_type: str | None = None
    cooking_method: str | None = None
    serving: int | None = None
    serving_count: int | None = None
    preparation_time: int | None = None
    calorie: float | None = None
    image_url: str | None = None
    creator_id: int | None = None
    ingredients: list[CustomRecipeIngredientCreate] = []

    def resolved_name(self) -> str:
        return self.recipe_name or self.name or ""

    def resolved_explanation(self) -> str | None:
        return self.explanation or self.description

    def resolved_preparation(self) -> str | None:
        return self.preparation or self.instructions

    def resolved_serving(self) -> int | None:
        return self.serving_count or self.serving


class RecipeRecommendationRequest(BaseModel):
    selected_ingredient_ids: list[int] = []
    pantry_ingredient_ids: list[int] = []
    disliked_ingredient_ids: list[int] = []
    cooking_types: list[str] = []
    exclude_disliked: bool = False
    user_id: int | None = None
    source: str | None = None
    healthy_only: bool = False
