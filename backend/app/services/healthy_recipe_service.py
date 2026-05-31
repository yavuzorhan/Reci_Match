from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.orm import Session


HEALTHY_SOURCES = ("yemekcom_diet",)


HEALTHY_COMPLETENESS_CONDITION = """
    r.recipe_name IS NOT NULL
    AND BTRIM(r.recipe_name) <> ''
    AND r.explanation IS NOT NULL
    AND BTRIM(r.explanation) <> ''
    AND r.preparation IS NOT NULL
    AND BTRIM(r.preparation) <> ''
    AND r.total_time_minutes IS NOT NULL
    AND r.cooking_type IS NOT NULL
    AND BTRIM(r.cooking_type) <> ''
    AND r.cooking_method IS NOT NULL
    AND BTRIM(r.cooking_method) <> ''
    AND r.calorie IS NOT NULL
    AND r.protein IS NOT NULL
    AND r.carbohydrate IS NOT NULL
    AND r.fat IS NOT NULL
    AND EXISTS (
        SELECT 1
        FROM recipe_ingredients ri
        WHERE ri.recipe_id = r.recipe_id
    )
"""


def ensure_healthy_recipe_table(db: Session) -> None:
    db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS healthy_recipes (
                healthy_recipe_id SERIAL PRIMARY KEY,
                recipe_id INTEGER NOT NULL UNIQUE REFERENCES recipes(recipe_id) ON DELETE CASCADE,
                source VARCHAR(20),
                synced_at TIMESTAMP DEFAULT NOW()
            )
            """
        )
    )
    db.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS ix_healthy_recipes_recipe_id
            ON healthy_recipes (recipe_id)
            """
        )
    )
    db.commit()


def sync_healthy_recipes(db: Session) -> dict:
    ensure_healthy_recipe_table(db)

    upserted = db.execute(
        text(
            """
            INSERT INTO healthy_recipes (recipe_id, source, synced_at)
            SELECT r.recipe_id, r.source, NOW()
            FROM recipes r
            WHERE r.source = ANY(:sources)
              AND """ + HEALTHY_COMPLETENESS_CONDITION + """
            ON CONFLICT (recipe_id)
            DO UPDATE SET
                source = EXCLUDED.source,
                synced_at = NOW()
            """
        ),
        {"sources": list(HEALTHY_SOURCES)},
    ).rowcount or 0

    deleted_non_healthy = db.execute(
        text(
            """
            DELETE FROM healthy_recipes hr
            USING recipes r
            WHERE hr.recipe_id = r.recipe_id
              AND (
                    r.source IS NULL
                    OR r.source <> ALL(:sources)
                    OR NOT (""" + HEALTHY_COMPLETENESS_CONDITION + """)
              )
            """
        ),
        {"sources": list(HEALTHY_SOURCES)},
    ).rowcount or 0

    deleted_orphans = db.execute(
        text(
            """
            DELETE FROM healthy_recipes hr
            WHERE NOT EXISTS (
                SELECT 1
                FROM recipes r
                WHERE r.recipe_id = hr.recipe_id
            )
            """
        )
    ).rowcount or 0

    total = db.execute(text("SELECT COUNT(*) FROM healthy_recipes")).scalar() or 0
    db.commit()
    return {
        "message": "Saglikli tarif senkronu tamamlandi.",
        "upserted": upserted,
        "deleted": deleted_non_healthy + deleted_orphans,
        "total": total,
    }
