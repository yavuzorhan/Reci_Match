"""add inline ingredient nutrition fields

Revision ID: 20260428_01
Revises: 20260427_02
Create Date: 2026-04-28
"""

from alembic import op


revision = "20260428_01"
down_revision = "20260427_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS calorie_per_100g DOUBLE PRECISION NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS protein_per_100g DOUBLE PRECISION NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS carbohydrate_per_100g DOUBLE PRECISION NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS fat_per_100g DOUBLE PRECISION NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE")
    op.execute("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'manual'")
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'ck_ingredients_source'
            ) THEN
                ALTER TABLE ingredients
                ADD CONSTRAINT ck_ingredients_source
                CHECK (source IN ('manual', 'usda_auto', 'admin'));
            END IF;
        END
        $$;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE ingredients DROP CONSTRAINT IF EXISTS ck_ingredients_source")
    op.drop_column("ingredients", "source")
    op.drop_column("ingredients", "is_verified")
    op.drop_column("ingredients", "fat_per_100g")
    op.drop_column("ingredients", "carbohydrate_per_100g")
    op.drop_column("ingredients", "protein_per_100g")
    op.drop_column("ingredients", "calorie_per_100g")
