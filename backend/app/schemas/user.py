"""
Kullanıcı (User) profili ile ilgili Pydantic şemaları.
"""
from pydantic import BaseModel


class ProfileUpdateRequest(BaseModel):
    age: int
    gender: str
    height_cm: int
    weight_kg: float
    objective: str
    meals: int
    activity: str


class FavoriteCreateRequest(BaseModel):
    recipe_id: int


class DailyLogCreateRequest(BaseModel):
    recipe_id: int
    meal_type: str = "Akşam Yemeği"
    serving_count: int | None = None
    serving_multiplier: float | None = None
    log_date: str | None = None
    entry_source: str | None = "daily"


class DailyLogUpdateRequest(BaseModel):
    meal_type: str | None = None
    serving_count: int | None = None
