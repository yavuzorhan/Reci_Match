"""add ingredient nutrition data_source

Revision ID: 20260430_02
Revises: 20260430_01
Create Date: 2026-04-30
"""

from alembic import op
import sqlalchemy as sa


revision = "20260430_02"
down_revision = "20260430_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "ingredient_nutrition_values",
        sa.Column("data_source", sa.String(length=20), nullable=False, server_default="db"),
    )
    op.execute("UPDATE ingredient_nutrition_values SET data_source = lower(COALESCE(source, 'db'))")
    op.execute("UPDATE ingredient_nutrition_values SET data_source = 'usda' WHERE data_source LIKE 'usda%'")


def downgrade() -> None:
    op.drop_column("ingredient_nutrition_values", "data_source")
