"""add recipe health score fields

Revision ID: 20260427_02
Revises: 20260427_01
Create Date: 2026-04-27
"""

from alembic import op


revision = "20260427_02"
down_revision = "20260427_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE recipes ADD COLUMN IF NOT EXISTS health_score INTEGER")
    op.execute("ALTER TABLE recipes ADD COLUMN IF NOT EXISTS health_grade VARCHAR(1)")
    op.execute("ALTER TABLE recipes ADD COLUMN IF NOT EXISTS health_explanation TEXT")


def downgrade() -> None:
    op.drop_column("recipes", "health_explanation")
    op.drop_column("recipes", "health_grade")
    op.drop_column("recipes", "health_score")
