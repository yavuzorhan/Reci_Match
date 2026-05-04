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
    op.add_column("daily_logs", sa.Column("protein_intake", sa.Numeric(6, 2), nullable=True))
    op.add_column("daily_logs", sa.Column("carbohydrate_intake", sa.Numeric(6, 2), nullable=True))
    op.add_column("daily_logs", sa.Column("fat_intake", sa.Numeric(6, 2), nullable=True))


def downgrade() -> None:
    op.drop_column("daily_logs", "fat_intake")
    op.drop_column("daily_logs", "carbohydrate_intake")
    op.drop_column("daily_logs", "protein_intake")
