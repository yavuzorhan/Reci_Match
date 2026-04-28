"""use ingredient_nutrition_values for custom ingredient nutrition

Revision ID: 20260428_02
Revises: 20260428_01
Create Date: 2026-04-28
"""

from alembic import op


revision = "20260428_02"
down_revision = "20260428_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE ingredient_nutrition_values ALTER COLUMN fdc_id DROP NOT NULL")


def downgrade() -> None:
    op.execute("UPDATE ingredient_nutrition_values SET fdc_id = 0 WHERE fdc_id IS NULL")
    op.execute("ALTER TABLE ingredient_nutrition_values ALTER COLUMN fdc_id SET NOT NULL")
