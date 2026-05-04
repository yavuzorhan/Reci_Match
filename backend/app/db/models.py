"""
SQLAlchemy modelleri - mevcut PostgreSQL tablolariyla uyumlu.
Runtime table creation sadece sonradan eklenen yardimci tablolar icin kullaniliyor.
"""

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Float,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from .database import Base


class IngredientCategory(Base):
    __tablename__ = "ingredient_categories"

    category_id = Column(Integer, primary_key=True, index=True)
    category_name = Column(String(50), unique=True, nullable=False)

    ingredients = relationship("Ingredient", back_populates="category_rel")


class Ingredient(Base):
    __tablename__ = "ingredients"

    ingredient_id = Column(Integer, primary_key=True, index=True)
    ingredient_name = Column(String(100), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=True)
    category = Column(String(50), nullable=True)
    category_id = Column(Integer, ForeignKey("ingredient_categories.category_id"), nullable=True)
    calorie_per_100g = Column(Float, nullable=False, default=0)
    protein_per_100g = Column(Float, nullable=False, default=0)
    carbohydrate_per_100g = Column(Float, nullable=False, default=0)
    fat_per_100g = Column(Float, nullable=False, default=0)
    is_verified = Column(Boolean, nullable=False, default=False)
    source = Column(String(50), nullable=False, default="manual")

    category_rel = relationship("IngredientCategory", back_populates="ingredients")
    aliases = relationship("IngredientAlias", back_populates="ingredient", cascade="all, delete-orphan")
    recipes = relationship("RecipeIngredient", back_populates="ingredient")
    usda_mapping = relationship("IngredientUsdaMapping", back_populates="ingredient", uselist=False)
    nutrition_value = relationship("IngredientNutritionValue", back_populates="ingredient", uselist=False)
    disliked_by = relationship("DislikedIngredient", back_populates="ingredient")
    owned_by = relationship("OwnedIngredient", back_populates="ingredient")
    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index(
            "ix_ingredient_name_global_unique",
            ingredient_name,
            unique=True,
            postgresql_where=(user_id.is_(None)),
        ),
        Index(
            "ix_ingredient_name_user_unique",
            user_id,
            ingredient_name,
            unique=True,
            postgresql_where=(user_id.is_not(None)),
        ),
    )


class IngredientAlias(Base):
    __tablename__ = "ingredient_aliases"

    id = Column(Integer, primary_key=True, index=True)
    ingredient_id = Column(Integer, ForeignKey("ingredients.ingredient_id", ondelete="CASCADE"), nullable=False)
    alias_name = Column(String(150), nullable=False)
    normalized_alias_name = Column(String(150), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=True)

    ingredient = relationship("Ingredient", back_populates="aliases")

    __table_args__ = (
        Index("ix_ingredient_aliases_normalized_alias_name", normalized_alias_name, unique=True),
        Index("ix_ingredient_aliases_ingredient_id", ingredient_id),
    )


class Recipe(Base):
    __tablename__ = "recipes"

    recipe_id = Column(Integer, primary_key=True, index=True)
    recipe_name = Column(String(150), nullable=False)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=True)
    source = Column(String(20), nullable=True)
    source_url = Column(String(500), nullable=True)
    recipe_category = Column(String(50), nullable=True)
    explanation = Column(Text, nullable=True)
    preparation = Column(Text, nullable=True)
    cooking_type = Column(String(50), nullable=True)
    cooking_method = Column(String(50), nullable=True)
    total_time_minutes = Column(Integer, nullable=True)
    serving = Column(Integer, nullable=True)
    calorie = Column(Numeric(6, 2), nullable=True)
    protein = Column(Numeric(6, 2), nullable=True)
    carbohydrate = Column(Numeric(6, 2), nullable=True)
    fat = Column(Numeric(6, 2), nullable=True)
    health_score = Column(Integer, nullable=True)
    health_grade = Column(String(1), nullable=True)
    health_explanation = Column(Text, nullable=True)
    image_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    ingredients = relationship("RecipeIngredient", back_populates="recipe")
    healthy_entries = relationship("HealthyRecipe", back_populates="recipe")
    favorites = relationship("Favorite", back_populates="recipe")
    daily_logs = relationship("DailyLog", back_populates="recipe")
    user = relationship("User", foreign_keys=[user_id])


class UnmatchedIngredient(Base):
    __tablename__ = "unmatched_ingredients"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.recipe_id", ondelete="SET NULL"), nullable=True)
    recipe_name = Column(String(150), nullable=True)
    source_url = Column(String(500), nullable=True)
    raw_name = Column(String(255), nullable=True)
    normalized_name = Column(String(150), nullable=True)
    suggested_match = Column(String(150), nullable=True)
    suggested_ingredient_id = Column(Integer, ForeignKey("ingredients.ingredient_id", ondelete="SET NULL"), nullable=True)
    confidence_score = Column(Numeric(5, 2), nullable=True)
    issue_type = Column(String(40), nullable=False, default="unmatched_ingredient")
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime, server_default=func.now(), nullable=True)

    recipe = relationship("Recipe")
    suggested_ingredient = relationship("Ingredient")

    __table_args__ = (
        Index("ix_unmatched_ingredients_recipe_id", recipe_id),
        Index("ix_unmatched_ingredients_issue_status", issue_type, status),
    )


class HealthyRecipe(Base):
    __tablename__ = "healthy_recipes"

    healthy_recipe_id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.recipe_id", ondelete="CASCADE"), nullable=False, unique=True)
    source = Column(String(20), nullable=True)
    synced_at = Column(DateTime, server_default=func.now(), nullable=True)

    recipe = relationship("Recipe", back_populates="healthy_entries")


class IngredientUsdaMapping(Base):
    __tablename__ = "ingredient_usda_mappings"

    mapping_id = Column(Integer, primary_key=True, index=True)
    ingredient_id = Column(Integer, ForeignKey("ingredients.ingredient_id", ondelete="CASCADE"), nullable=False, unique=True)
    fdc_id = Column(Integer, nullable=True)
    usda_description = Column(String(255), nullable=True)
    data_type = Column(String(50), nullable=True)
    search_query = Column(String(150), nullable=True)
    match_confidence = Column(Numeric(5, 2), nullable=True)
    match_status = Column(String(20), nullable=False, default="pending")
    is_verified = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True)

    ingredient = relationship("Ingredient", back_populates="usda_mapping")


class IngredientNutritionValue(Base):
    __tablename__ = "ingredient_nutrition_values"

    nutrition_id = Column(Integer, primary_key=True, index=True)
    ingredient_id = Column(Integer, ForeignKey("ingredients.ingredient_id", ondelete="CASCADE"), nullable=False, unique=True)
    fdc_id = Column(Integer, nullable=True)
    calories_per_100g = Column(Numeric(8, 2), nullable=False)
    protein_per_100g = Column(Numeric(8, 2), nullable=False)
    carbs_per_100g = Column(Numeric(8, 2), nullable=False)
    fat_per_100g = Column(Numeric(8, 2), nullable=False)
    saturated_fat_per_100g = Column(Numeric(8, 2), nullable=False)
    fiber_per_100g = Column(Numeric(8, 2), nullable=False)
    sugar_per_100g = Column(Numeric(8, 2), nullable=False)
    sodium_mg_per_100g = Column(Numeric(10, 2), nullable=False)
    added_sugar_per_100g = Column(Numeric(8, 2), nullable=True)
    trans_fat_per_100g = Column(Numeric(8, 2), nullable=True)
    cholesterol_mg_per_100g = Column(Numeric(10, 2), nullable=True)
    potassium_mg_per_100g = Column(Numeric(10, 2), nullable=True)
    calcium_mg_per_100g = Column(Numeric(10, 2), nullable=True)
    iron_mg_per_100g = Column(Numeric(10, 2), nullable=True)
    vitamin_d_mcg_per_100g = Column(Numeric(10, 2), nullable=True)
    source = Column(String(30), nullable=False, default="USDA_FDC")
    data_source = Column(String(20), nullable=False, default="db")
    confidence_score = Column(Numeric(5, 2), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True)

    ingredient = relationship("Ingredient", back_populates="nutrition_value")


class IngredientUnitConversion(Base):
    __tablename__ = "ingredient_unit_conversions"

    conversion_id = Column(Integer, primary_key=True, index=True)
    ingredient_id = Column(Integer, ForeignKey("ingredients.ingredient_id", ondelete="CASCADE"), nullable=True)
    unit_key = Column(String(50), nullable=False)
    unit_aliases = Column(Text, nullable=True)
    grams_per_unit = Column(Numeric(10, 2), nullable=True)
    ml_per_unit = Column(Numeric(10, 2), nullable=True)
    density_g_per_ml = Column(Numeric(10, 4), nullable=True)
    source = Column(String(100), nullable=True)
    confidence = Column(String(20), nullable=True)
    note = Column(Text, nullable=True)

    ingredient = relationship("Ingredient")

    __table_args__ = (
        Index("ix_ingredient_unit_conversions_lookup", ingredient_id, unit_key),
    )


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    recipe_ingredient_id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.recipe_id"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.ingredient_id"), nullable=False)
    amount = Column(Numeric(6, 2), nullable=True)
    unit = Column(String(50), nullable=True)
    miktar_gram = Column(Numeric(10, 2), nullable=True)
    donusum_kaynagi = Column(String(100), nullable=True)
    donusum_guveni = Column(String(20), nullable=True)
    donusum_notu = Column(Text, nullable=True)

    recipe = relationship("Recipe", back_populates="ingredients")
    ingredient = relationship("Ingredient", back_populates="recipes")


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    name_surname = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    height_cm = Column(Integer, nullable=True)
    weight_kg = Column(Numeric(5, 2), nullable=True)
    objective = Column(String(50), nullable=True)
    activity = Column(String(50), nullable=True)
    meals = Column(Integer, nullable=True)
    daily_calorie = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=True)
    is_verified = Column(Boolean, default=False, nullable=True)

    favorites = relationship("Favorite", back_populates="user")
    disliked_ingredients = relationship("DislikedIngredient", back_populates="user")
    owned_ingredients = relationship("OwnedIngredient", back_populates="user")
    daily_logs = relationship("DailyLog", back_populates="user")
    verification_codes = relationship("EmailVerificationCode", back_populates="user", cascade="all, delete-orphan")


class EmailVerificationCode(Base):
    __tablename__ = "email_verification_codes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=True)
    email = Column(String(255), nullable=False)
    code = Column(String(6), nullable=False)
    purpose = Column(String(30), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    temp_name = Column(String(100), nullable=True)
    temp_password = Column(String(255), nullable=True)

    user = relationship("User", back_populates="verification_codes")


class Favorite(Base):
    __tablename__ = "favorites"

    favorite_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    recipe_id = Column(Integer, ForeignKey("recipes.recipe_id"), nullable=False)

    user = relationship("User", back_populates="favorites")
    recipe = relationship("Recipe", back_populates="favorites")


class DislikedIngredient(Base):
    __tablename__ = "disliked_ingredients"

    disliked_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.ingredient_id"), nullable=False)

    user = relationship("User", back_populates="disliked_ingredients")
    ingredient = relationship("Ingredient", back_populates="disliked_by")


class OwnedIngredient(Base):
    __tablename__ = "owned_ingredients"

    owned_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    ingredient_id = Column(Integer, ForeignKey("ingredients.ingredient_id"), nullable=False)
    added_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="owned_ingredients")
    ingredient = relationship("Ingredient", back_populates="owned_by")


class DailyLog(Base):
    __tablename__ = "daily_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    recipe_id = Column(Integer, ForeignKey("recipes.recipe_id"), nullable=False)
    log_date = Column(Date, nullable=True)
    logged_at = Column(DateTime, nullable=True)
    meal_type = Column(String(30), nullable=True)
    entry_source = Column(String(20), nullable=True)
    calorie_intake = Column(Numeric(6, 2), nullable=True)
    protein_intake = Column(Numeric(6, 2), nullable=True)
    carbohydrate_intake = Column(Numeric(6, 2), nullable=True)
    fat_intake = Column(Numeric(6, 2), nullable=True)
    serving_count = Column(Integer, nullable=True)
    serving_multiplier = Column(Numeric(6, 2), nullable=True)

    user = relationship("User", back_populates="daily_logs")
    recipe = relationship("Recipe", back_populates="daily_logs")


class RevisionCache(Base):
    __tablename__ = "revision_cache"

    cache_id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.recipe_id", ondelete="CASCADE"), nullable=False)
    modifications_hash = Column(String(64), nullable=False)
    response_json = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=True)

    recipe = relationship("Recipe")

    __table_args__ = (
        Index("ix_revision_cache_recipe_hash", recipe_id, modifications_hash),
        UniqueConstraint("recipe_id", "modifications_hash", name="uq_revision_cache_recipe_hash"),
    )
