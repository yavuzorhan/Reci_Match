"""add recipe revision cache

Revision ID: 20260430_03
Revises: 20260430_02
Create Date: 2026-04-30
"""

from alembic import op
import sqlalchemy as sa


revision = "20260430_03"
down_revision = "20260430_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "revision_cache",
        sa.Column("cache_id", sa.Integer(), primary_key=True),
        sa.Column("recipe_id", sa.Integer(), nullable=False),
        sa.Column("modifications_hash", sa.String(length=64), nullable=False),
        sa.Column("response_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["recipe_id"], ["recipes.recipe_id"], ondelete="CASCADE"),
        sa.UniqueConstraint("recipe_id", "modifications_hash", name="uq_revision_cache_recipe_hash"),
    )
    op.create_index("ix_revision_cache_recipe_hash", "revision_cache", ["recipe_id", "modifications_hash"])


def downgrade() -> None:
    op.drop_index("ix_revision_cache_recipe_hash", table_name="revision_cache")
    op.drop_table("revision_cache")
