"""allow shared USDA fdc ids for ingredient nutrition

Revision ID: 20260429_02
Revises: 20260429_01
Create Date: 2026-04-29
"""

from alembic import op


revision = "20260429_02"
down_revision = "20260429_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE ingredient_nutrition_values DROP CONSTRAINT IF EXISTS ingredient_nutrition_values_fdc_id_key")


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE ingredient_nutrition_values
        ADD CONSTRAINT ingredient_nutrition_values_fdc_id_key UNIQUE (fdc_id)
        """
    )
