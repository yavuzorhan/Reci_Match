"""add recipe ingredient gram conversions

Revision ID: 20260427_01
Revises: 20260426_01
Create Date: 2026-04-27
"""

from alembic import op
import sqlalchemy as sa


revision = "20260427_01"
down_revision = "20260426_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS miktar_gram NUMERIC(10, 2)")
    op.execute("ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS donusum_kaynagi VARCHAR(100)")
    op.execute("ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS donusum_guveni VARCHAR(20)")
    op.execute("ALTER TABLE recipe_ingredients ADD COLUMN IF NOT EXISTS donusum_notu TEXT")

    op.execute("""
        CREATE TABLE IF NOT EXISTS ingredient_unit_conversions (
            conversion_id SERIAL PRIMARY KEY,
            ingredient_id INTEGER REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
            unit_key VARCHAR(50) NOT NULL,
            unit_aliases TEXT,
            grams_per_unit NUMERIC(10, 2),
            ml_per_unit NUMERIC(10, 2),
            density_g_per_ml NUMERIC(10, 4),
            source VARCHAR(100),
            confidence VARCHAR(20),
            note TEXT
        )
    """)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_ingredient_unit_conversions_lookup
        ON ingredient_unit_conversions (ingredient_id, unit_key)
    """)


def downgrade() -> None:
    op.drop_index("ix_ingredient_unit_conversions_lookup", table_name="ingredient_unit_conversions")
    op.drop_table("ingredient_unit_conversions")
    op.drop_column("recipe_ingredients", "donusum_notu")
    op.drop_column("recipe_ingredients", "donusum_guveni")
    op.drop_column("recipe_ingredients", "donusum_kaynagi")
    op.drop_column("recipe_ingredients", "miktar_gram")
