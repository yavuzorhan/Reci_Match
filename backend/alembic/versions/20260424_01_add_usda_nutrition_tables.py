"""add usda nutrition tables

Revision ID: 20260424_01
Revises:
Create Date: 2026-04-24
"""

from alembic import op
import sqlalchemy as sa


revision = "20260424_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ingredient_usda_mappings",
        sa.Column("mapping_id", sa.Integer(), primary_key=True),
        sa.Column("ingredient_id", sa.Integer(), sa.ForeignKey("ingredients.ingredient_id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("fdc_id", sa.Integer(), nullable=True),
        sa.Column("usda_description", sa.String(length=255), nullable=True),
        sa.Column("data_type", sa.String(length=50), nullable=True),
        sa.Column("search_query", sa.String(length=150), nullable=True),
        sa.Column("match_confidence", sa.Numeric(5, 2), nullable=True),
        sa.Column("match_status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=True),
    )
    op.create_index(
        "ix_ingredient_usda_mappings_ingredient_id",
        "ingredient_usda_mappings",
        ["ingredient_id"],
        unique=False,
    )

    op.create_table(
        "ingredient_nutrition_values",
        sa.Column("nutrition_id", sa.Integer(), primary_key=True),
        sa.Column("ingredient_id", sa.Integer(), sa.ForeignKey("ingredients.ingredient_id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("fdc_id", sa.Integer(), nullable=False),
        sa.Column("calories_per_100g", sa.Numeric(8, 2), nullable=False),
        sa.Column("protein_per_100g", sa.Numeric(8, 2), nullable=False),
        sa.Column("carbs_per_100g", sa.Numeric(8, 2), nullable=False),
        sa.Column("fat_per_100g", sa.Numeric(8, 2), nullable=False),
        sa.Column("saturated_fat_per_100g", sa.Numeric(8, 2), nullable=False),
        sa.Column("fiber_per_100g", sa.Numeric(8, 2), nullable=False),
        sa.Column("sugar_per_100g", sa.Numeric(8, 2), nullable=False),
        sa.Column("sodium_mg_per_100g", sa.Numeric(10, 2), nullable=False),
        sa.Column("added_sugar_per_100g", sa.Numeric(8, 2), nullable=True),
        sa.Column("trans_fat_per_100g", sa.Numeric(8, 2), nullable=True),
        sa.Column("cholesterol_mg_per_100g", sa.Numeric(10, 2), nullable=True),
        sa.Column("potassium_mg_per_100g", sa.Numeric(10, 2), nullable=True),
        sa.Column("calcium_mg_per_100g", sa.Numeric(10, 2), nullable=True),
        sa.Column("iron_mg_per_100g", sa.Numeric(10, 2), nullable=True),
        sa.Column("vitamin_d_mcg_per_100g", sa.Numeric(10, 2), nullable=True),
        sa.Column("source", sa.String(length=30), nullable=False, server_default="USDA_FDC"),
        sa.Column("confidence_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=True),
    )
    op.create_index(
        "ix_ingredient_nutrition_values_ingredient_id",
        "ingredient_nutrition_values",
        ["ingredient_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_ingredient_nutrition_values_ingredient_id", table_name="ingredient_nutrition_values")
    op.drop_table("ingredient_nutrition_values")
    op.drop_index("ix_ingredient_usda_mappings_ingredient_id", table_name="ingredient_usda_mappings")
    op.drop_table("ingredient_usda_mappings")
