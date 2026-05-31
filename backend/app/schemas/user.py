from pydantic import AliasChoices, BaseModel, ConfigDict, Field


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
    model_config = ConfigDict(populate_by_name=True)

    recipe_id: int = Field(validation_alias=AliasChoices("recipe_id", "recipeId"))
    meal_type: str = Field(default="Akşam Yemeği", validation_alias=AliasChoices("meal_type", "mealType"))
    serving_count: int | float | str | None = Field(
        default=None,
        validation_alias=AliasChoices("serving_count", "servingCount", "portion", "serving", "servings"),
    )
    serving_multiplier: float | str | None = Field(
        default=None,
        validation_alias=AliasChoices("serving_multiplier", "servingMultiplier"),
    )
    log_date: str | None = Field(default=None, validation_alias=AliasChoices("log_date", "logDate", "loggedAt"))
    entry_source: str | None = Field(default="daily", validation_alias=AliasChoices("entry_source", "entrySource"))
    calorie_intake: float | None = Field(
        default=None,
        validation_alias=AliasChoices("calorie_intake", "calorieIntake"),
    )
    protein_intake: float | None = Field(
        default=None,
        validation_alias=AliasChoices("protein_intake", "proteinIntake", "protein"),
    )
    carbohydrate_intake: float | None = Field(
        default=None,
        validation_alias=AliasChoices("carbohydrate_intake", "carbohydrateIntake", "carbohydrate", "carb"),
    )
    fat_intake: float | None = Field(
        default=None,
        validation_alias=AliasChoices("fat_intake", "fatIntake", "fat"),
    )


class DailyLogUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    meal_type: str | None = None
    serving_count: int | float | str | None = Field(
        default=None,
        validation_alias=AliasChoices("serving_count", "servingCount", "portion", "serving", "servings"),
    )
    calorie_intake: float | None = Field(default=None, validation_alias=AliasChoices("calorie_intake", "calorieIntake"))
    protein_intake: float | None = Field(default=None, validation_alias=AliasChoices("protein_intake", "proteinIntake", "protein"))
    carbohydrate_intake: float | None = Field(default=None, validation_alias=AliasChoices("carbohydrate_intake", "carbohydrateIntake", "carbohydrate", "carb"))
    fat_intake: float | None = Field(default=None, validation_alias=AliasChoices("fat_intake", "fatIntake", "fat"))
