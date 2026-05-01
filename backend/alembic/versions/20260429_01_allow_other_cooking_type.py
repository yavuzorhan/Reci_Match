"""allow other cooking type

Revision ID: 20260429_01
Revises: 20260428_02
Create Date: 2026-04-29
"""

from alembic import op


revision = "20260429_01"
down_revision = "20260428_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE recipes DROP CONSTRAINT IF EXISTS check_cooking_type")
    op.execute(
        """
        ALTER TABLE recipes
        ADD CONSTRAINT check_cooking_type
        CHECK (
            cooking_type IN (
                'Tava',
                'Tencere',
                U&'F\\0131r\\0131n',
                'Airfryer',
                U&'D\\00FCd\\00FCkl\\00FC',
                U&'Di\\011Fer'
            )
        )
        """
    )


def downgrade() -> None:
    op.execute("UPDATE recipes SET cooking_type = 'Tencere' WHERE cooking_type = U&'Di\\011Fer'")
    op.execute("ALTER TABLE recipes DROP CONSTRAINT IF EXISTS check_cooking_type")
    op.execute(
        """
        ALTER TABLE recipes
        ADD CONSTRAINT check_cooking_type
        CHECK (
            cooking_type IN (
                'Tava',
                'Tencere',
                U&'F\\0131r\\0131n',
                'Airfryer',
                U&'D\\00FCd\\00FCkl\\00FC'
            )
        )
        """
    )
