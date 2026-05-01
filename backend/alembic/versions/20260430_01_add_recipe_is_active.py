"""add recipe is_active flag

Revision ID: 20260430_01
Revises: 20260429_02
Create Date: 2026-04-30
"""

from alembic import op
import sqlalchemy as sa


revision = "20260430_01"
down_revision = "20260429_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("recipes", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    op.drop_column("recipes", "is_active")
