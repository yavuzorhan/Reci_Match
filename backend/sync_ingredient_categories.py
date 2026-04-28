import os
import sys

from sqlalchemy import text


base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(base_dir)

from app.db.database import engine
from app.utils.helpers import infer_ingredient_category


EXPECTED_CATEGORIES = [
    (1, "Sebzeler"),
    (2, "Meyveler"),
    (4, "Balık ve Deniz Ürünleri"),
    (5, "Süt Ürünleri"),
    (6, "Bakliyatlar"),
    (7, "Tahıllar ve Unlu Ürünler"),
    (8, "Baharatlar"),
    (9, "Soslar ve Yağlar"),
    (10, "Diğer"),
    (13, "Peynirler"),
    (14, "Beyaz Et"),
    (15, "Şarküteri"),
    (16, "Kırmızı Et"),
    (17, "Çerezler"),
]


def ensure_categories(conn) -> None:
    existing_rows = conn.execute(
        text("SELECT category_id, category_name FROM ingredient_categories ORDER BY category_id")
    ).fetchall()
    existing_by_id = {row.category_id: row.category_name for row in existing_rows}
    existing_by_name = {row.category_name: row.category_id for row in existing_rows}

    if existing_by_id.get(14) == "Et ve Tavuk Ürünleri":
        conn.execute(
            text("UPDATE ingredient_categories SET category_name = 'Beyaz Et' WHERE category_id = 14")
        )
        existing_by_id[14] = "Beyaz Et"
        existing_by_name.pop("Et ve Tavuk Ürünleri", None)
        existing_by_name["Beyaz Et"] = 14

    for category_id, category_name in EXPECTED_CATEGORIES:
        current_name = existing_by_id.get(category_id)
        if current_name is None:
            if category_name in existing_by_name:
                conn.execute(
                    text(
                        """
                        UPDATE ingredient_categories
                        SET category_id = :category_id
                        WHERE category_name = :category_name
                        """
                    ),
                    {"category_id": category_id, "category_name": category_name},
                )
            else:
                conn.execute(
                    text(
                        """
                        INSERT INTO ingredient_categories (category_id, category_name)
                        VALUES (:category_id, :category_name)
                        """
                    ),
                    {"category_id": category_id, "category_name": category_name},
                )
        elif current_name != category_name:
            conn.execute(
                text(
                    """
                    UPDATE ingredient_categories
                    SET category_name = :category_name
                    WHERE category_id = :category_id
                    """
                ),
                {"category_id": category_id, "category_name": category_name},
            )

    conn.execute(
        text(
            """
            DELETE FROM ingredient_categories
            WHERE category_name = 'Et ve Tavuk Ürünleri'
              AND category_id <> 14
            """
        )
    )


def main():
    updated = 0

    with engine.begin() as conn:
        ensure_categories(conn)

        rows = conn.execute(
            text("SELECT ingredient_id, ingredient_name, category, category_id FROM ingredients ORDER BY ingredient_id")
        ).fetchall()

        for ingredient_id, ingredient_name, category, category_id in rows:
            next_category, next_category_id = infer_ingredient_category(ingredient_name)
            if category == next_category and category_id == next_category_id:
                continue

            conn.execute(
                text(
                    """
                    UPDATE ingredients
                    SET category = :category,
                        category_id = :category_id
                    WHERE ingredient_id = :ingredient_id
                    """
                ),
                {
                    "ingredient_id": ingredient_id,
                    "category": next_category,
                    "category_id": next_category_id,
                },
            )
            updated += 1

    print(f"Kategori senkronizasyonu tamamlandı. Güncellenen malzeme: {updated}")


if __name__ == "__main__":
    main()
