"""add ingredient aliases and unmatched ingredient logs

Revision ID: 20260426_01
Revises: 20260424_01
Create Date: 2026-04-26
"""

from alembic import op
import sqlalchemy as sa


revision = "20260426_01"
down_revision = "20260424_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ingredient_aliases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ingredient_id", sa.Integer(), sa.ForeignKey("ingredients.ingredient_id", ondelete="CASCADE"), nullable=False),
        sa.Column("alias_name", sa.String(length=150), nullable=False),
        sa.Column("normalized_alias_name", sa.String(length=150), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=True),
    )
    op.create_index(
        "ix_ingredient_aliases_normalized_alias_name",
        "ingredient_aliases",
        ["normalized_alias_name"],
        unique=True,
    )
    op.create_index(
        "ix_ingredient_aliases_ingredient_id",
        "ingredient_aliases",
        ["ingredient_id"],
        unique=False,
    )

    op.create_table(
        "unmatched_ingredients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("recipe_id", sa.Integer(), sa.ForeignKey("recipes.recipe_id", ondelete="SET NULL"), nullable=True),
        sa.Column("recipe_name", sa.String(length=150), nullable=True),
        sa.Column("source_url", sa.String(length=500), nullable=True),
        sa.Column("raw_name", sa.String(length=255), nullable=True),
        sa.Column("normalized_name", sa.String(length=150), nullable=True),
        sa.Column("suggested_match", sa.String(length=150), nullable=True),
        sa.Column("suggested_ingredient_id", sa.Integer(), sa.ForeignKey("ingredients.ingredient_id", ondelete="SET NULL"), nullable=True),
        sa.Column("confidence_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("issue_type", sa.String(length=40), nullable=False, server_default="unmatched_ingredient"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=True),
    )
    op.create_index(
        "ix_unmatched_ingredients_recipe_id",
        "unmatched_ingredients",
        ["recipe_id"],
        unique=False,
    )
    op.create_index(
        "ix_unmatched_ingredients_issue_status",
        "unmatched_ingredients",
        ["issue_type", "status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_unmatched_ingredients_issue_status", table_name="unmatched_ingredients")
    op.drop_index("ix_unmatched_ingredients_recipe_id", table_name="unmatched_ingredients")
    op.drop_table("unmatched_ingredients")
    op.drop_index("ix_ingredient_aliases_ingredient_id", table_name="ingredient_aliases")
    op.drop_index("ix_ingredient_aliases_normalized_alias_name", table_name="ingredient_aliases")
    op.drop_table("ingredient_aliases")
