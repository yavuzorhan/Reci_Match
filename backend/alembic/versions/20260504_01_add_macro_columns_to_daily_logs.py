"""add macro columns to daily_logs

Revision ID: 20260504_01
Revises: 20260430_03
Create Date: 2026-05-04
"""

from alembic import op
import sqlalchemy as sa


revision = "20260504_01"
down_revision = "20260430_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS protein_intake NUMERIC(6, 2)")
    op.execute("ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS carbohydrate_intake NUMERIC(6, 2)")
    op.execute("ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS fat_intake NUMERIC(6, 2)")


def downgrade() -> None:
    op.drop_column("daily_logs", "fat_intake")
    op.drop_column("daily_logs", "carbohydrate_intake")
    op.drop_column("daily_logs", "protein_intake")
