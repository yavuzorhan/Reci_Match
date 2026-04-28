import os
import sys

from sqlalchemy import text


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal, engine
from app.db.models import Base, Ingredient, IngredientCategory
from app.utils.helpers import CATEGORY_NAME_TO_ID, infer_ingredient_category, normalize_ingredient_name


RAW_INGREDIENTS = {
    "Sebzeler": [
        "Domates", "Salatalık", "Biber", "Patlıcan", "Taze Fasulye", "Brokoli", "Karnabahar",
        "Brüksel Lahanası", "Kabak", "Havuç", "Patates", "Kuru Soğan", "Sarımsak", "Ispanak",
        "Pırasa", "Bamya", "Bezelye", "Marul", "Kıvırcık", "Pazı", "Semizotu", "Maydanoz",
        "Dereotu", "Roka", "Taze Nane", "Taze Soğan", "Enginar", "Kereviz", "Kuşkonmaz",
        "Lahana", "Kırmızı Lahana", "Turp", "Pancar", "Mısır", "Mantar", "Kapya Biber",
        "Dolmalık Biber", "Mor Soğan", "Taze Sarımsak", "Karnıyarık",
    ],
    "Meyveler": [
        "Elma", "Armut", "Muz", "Portakal", "Mandalina", "Limon", "Greyfurt", "Çilek", "Kiraz",
        "Vişne", "Erik", "Kayısı", "Şeftali", "Nektarin", "Kavun", "Karpuz", "Üzüm", "İncir",
        "Nar", "Ayva", "Yeni Dünya", "Kivi", "Avokado", "Ananas", "Mango", "Ahududu",
        "Böğürtlen", "Yaban Mersini", "Dut", "Narenciye",
    ],
    "Beyaz Et": [
        "Tavuk Eti", "Tavuk Göğsü", "Tavuk Baget", "Tavuk But", "Tavuk Kanat", "Tavuk Pirzola",
        "Tavuk Kalça", "Bütün Tavuk", "Hindi Eti", "Tavuk Suyu",
    ],
    "Kırmızı Et": [
        "Dana Eti", "Dana Kıyma", "Kuşbaşı Dana Eti", "Kuzu Eti", "Kuzu Kıyma", "Kuşbaşı Kuzu Eti",
        "Kuzu İncik", "Kuzu Pirzola", "Et Suyu", "Kemik Suyu",
    ],
    "Şarküteri": [
        "Dana Salam", "Dana Sosis", "Dana Sucuk", "Pastırma", "Hindi Füme", "Hindi Salam",
        "Hindi Sosis", "Tavuk Sosis", "Jambon", "Döner", "Kavurma",
    ],
    "Balık ve Deniz Ürünleri": [
        "Somon", "Levrek", "Çipura", "Hamsi", "İstavrit", "Palamut", "Mezgit", "Uskumru",
        "Sardalya", "Karides", "Kalamar", "Midye", "Ton Balığı", "Alabalık",
    ],
    "Süt Ürünleri": [
        "Süt", "Yoğurt", "Süzme Yoğurt", "Ayran", "Kefir", "Krema", "Tereyağı", "Kaymak",
        "Süt Kreması", "Çiğ Krema",
    ],
    "Peynirler": [
        "Beyaz Peynir", "Kaşar Peyniri", "Lor Peyniri", "Labne Peyniri", "Tulum Peyniri",
        "Mozzarella Peyniri", "Parmesan Peyniri", "Ezine Peyniri", "Keçi Peyniri", "Dil Peyniri",
        "Örgü Peyniri", "Hellim Peyniri", "Krem Peynir",
    ],
    "Bakliyatlar": [
        "Kırmızı Mercimek", "Yeşil Mercimek", "Sarı Mercimek", "Kuru Fasulye", "Nohut",
        "Barbunya", "Bakla", "Börülce", "Maş Fasulyesi", "Soya Fasulyesi",
    ],
    "Tahıllar ve Unlu Ürünler": [
        "Pilavlık Pirinç", "Pilavlık Bulgur", "Kısırlık Bulgur", "Makarna", "Buğday Unu",
        "Tam Buğday Unu", "İrmik", "Mısır Nişastası", "Galeta Unu", "Ekmek", "Tam Buğday Ekmeği",
        "Yulaf Ezmesi", "Arpa Şehriye", "Tel Şehriye", "Kadayıf", "Milföy Hamuru", "Lavaş",
        "Yufka", "Kuskus", "Tortilla Ekmeği", "Tırnak Pide", "Yaş Maya",
    ],
    "Baharatlar": [
        "Tuz", "Karabiber", "Pul Biber", "Kuru Kekik", "Kimyon", "Kuru Nane", "Kuru Fesleğen",
        "Biberiye", "Zerdeçal", "Zencefil", "Tarçın", "Karanfil", "Yenibahar", "Sumak", "Köri",
        "Mahlep", "Çörek Otu", "Susam", "Kakao", "Vanilin", "Toz Paprika",
    ],
    "Soslar ve Yağlar": [
        "Zeytinyağı", "Ayçiçek Yağı", "Mısırözü", "Domates Salçası", "Biber Salçası", "Nar Ekşisi",
        "Üzüm Sirkesi", "Elma Sirkesi", "Soya Sosu", "Acı Sos", "Hardal", "Mayonez", "Ketçap",
        "Tahin", "Pekmez", "Bal",
    ],
    "Çerezler": [
        "Ceviz", "Fındık", "Badem", "Antep Fıstığı", "Hindistan Cevizi", "Çam Fıstığı",
    ],
    "Diğer": [
        "Yumurta", "Toz Şeker", "Pudra Şekeri", "Kabartma Tozu", "Kuru Maya", "Kapari",
        "Kornişon Turşu", "Su", "Siyah Zeytin", "Yeşil Zeytin",
    ],
}


def ensure_category_rows(db) -> dict[str, IngredientCategory]:
    categories: dict[str, IngredientCategory] = {}

    for category_name, category_id in CATEGORY_NAME_TO_ID.items():
        category = db.query(IngredientCategory).filter(IngredientCategory.category_id == category_id).first()
        if category is None:
            category = db.query(IngredientCategory).filter(IngredientCategory.category_name == category_name).first()

        if category is None:
            category = IngredientCategory(category_id=category_id, category_name=category_name)
            db.add(category)
            db.flush()
        else:
            category.category_id = category_id
            category.category_name = category_name

        categories[category_name] = category

    return categories


def seed_data():
    db = SessionLocal()
    try:
        print("1. Tablolar kontrol ediliyor...")
        Base.metadata.create_all(bind=engine)

        print("2. category_id kolonu kontrol ediliyor...")
        with engine.connect() as conn:
            conn.execute(
                text(
                    """
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1
                            FROM information_schema.columns
                            WHERE table_name = 'ingredients' AND column_name = 'category_id'
                        ) THEN
                            ALTER TABLE ingredients
                            ADD COLUMN category_id INTEGER REFERENCES ingredient_categories(category_id);
                        END IF;
                    END $$;
                    """
                )
            )
            conn.commit()

        print("3. Kategori kayıtları hazırlanıyor...")
        categories = ensure_category_rows(db)
        db.commit()

        print("4. Malzemeler ekleniyor ve kategori alanları dolduruluyor...")
        total_added = 0
        total_updated = 0
        ingredient_index = {
            ingredient.ingredient_name: ingredient
            for ingredient in db.query(Ingredient).all()
            if ingredient.user_id is None
        }

        for raw_category_name, items in RAW_INGREDIENTS.items():
            for item_name in items:
                normalized_name = normalize_ingredient_name(item_name.strip())
                inferred_category_name, _ = infer_ingredient_category(normalized_name)
                target_category = categories.get(inferred_category_name, categories[raw_category_name])

                ingredient = ingredient_index.get(normalized_name)
                if ingredient is None:
                    ingredient = db.query(Ingredient).filter(
                        Ingredient.ingredient_name == normalized_name,
                        Ingredient.user_id.is_(None),
                    ).first()
                    if ingredient is not None:
                        ingredient_index[normalized_name] = ingredient
                if ingredient is None:
                    ingredient = Ingredient(
                        ingredient_name=normalized_name,
                        category=target_category.category_name,
                        category_id=target_category.category_id,
                    )
                    db.add(ingredient)
                    db.flush()
                    ingredient_index[normalized_name] = ingredient
                    total_added += 1
                else:
                    if ingredient.category != target_category.category_name or ingredient.category_id != target_category.category_id:
                        ingredient.category = target_category.category_name
                        ingredient.category_id = target_category.category_id
                        total_updated += 1

        db.commit()
        print(f"Bitti. {total_added} yeni malzeme eklendi, {total_updated} kayıt güncellendi.")
    except Exception as exc:
        db.rollback()
        print(f"Hata oluştu: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
