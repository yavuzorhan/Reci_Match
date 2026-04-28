"""
Malzeme iş mantığı: kategorize listeleme, özel malzeme ekleme ve kiler yönetimi.
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.db.models import Ingredient, IngredientCategory, OwnedIngredient, DislikedIngredient
from app.utils.helpers import normalize_ingredient_name


CATEGORY_PRIORITY = {
    "Beyaz Et": 1,
    "Kırmızı Et": 2,
    "Şarküteri": 3,
    "Balık ve Deniz Ürünleri": 4,
    "Sebzeler": 5,
    "Meyveler": 6,
    "Bakliyatlar": 7,
    "Tahıllar ve Unlu Ürünler": 8,
    "Süt Ürünleri": 9,
    "Peynirler": 10,
    "Çerezler": 11,
    "Baharatlar": 12,
    "Soslar ve Yağlar": 13,
    "Diğer": 14,
}


def get_categorized_ingredients(user_id: int | None, db: Session) -> list[dict]:
    categories = db.query(IngredientCategory).all()
    sorted_cats = sorted(categories, key=lambda item: CATEGORY_PRIORITY.get(item.category_name, 100))

    result = []
    for category in sorted_cats:
        category_ingredients = [
            ingredient
            for ingredient in category.ingredients
            if ingredient.user_id is None or (user_id and ingredient.user_id == user_id)
        ]

        if not category_ingredients and category.category_name != "Diğer":
            continue

        result.append(
            {
                "id": category.category_id,
                "name": category.category_name,
                "ingredients": [
                    {"id": ingredient.ingredient_id, "name": ingredient.ingredient_name}
                    for ingredient in category_ingredients
                ],
            }
        )

    return result


def create_custom_ingredient(user_id: int, name: str, category_id: int | None, db: Session) -> dict:
    clean_name = normalize_ingredient_name(name)

    if not category_id:
        raise HTTPException(status_code=400, detail="Kategori seçimi zorunludur. Lütfen kategori seçin.")

    existing_global = db.query(Ingredient).filter(
        Ingredient.ingredient_name == clean_name,
        Ingredient.user_id.is_(None),
    ).first()
    if existing_global:
        return {
            "message": "Sistemde zaten bu malzeme var.",
            "ingredient": {"id": existing_global.ingredient_id, "name": existing_global.ingredient_name},
        }

    existing_user = db.query(Ingredient).filter(
        Ingredient.ingredient_name == clean_name,
        Ingredient.user_id == user_id,
    ).first()
    if existing_user:
        return {
            "message": "Bu malzeme zaten ekli.",
            "ingredient": {"id": existing_user.ingredient_id, "name": existing_user.ingredient_name},
        }

    new_ingredient = Ingredient(ingredient_name=clean_name, category_id=category_id, user_id=user_id)
    db.add(new_ingredient)
    db.commit()
    db.refresh(new_ingredient)
    return {
        "message": "Malzeme eklendi.",
        "ingredient": {"id": new_ingredient.ingredient_id, "name": new_ingredient.ingredient_name},
    }


def get_user_ingredients(user_id: int, db: Session) -> list[dict]:
    owned = db.query(OwnedIngredient).filter(OwnedIngredient.user_id == user_id).all()
    return [{"id": item.ingredient_id, "name": item.ingredient.ingredient_name} for item in owned]


def update_user_ingredients(user_id: int, ingredient_ids: list[int], db: Session) -> dict:
    db.query(OwnedIngredient).filter(OwnedIngredient.user_id == user_id).delete()
    for ingredient_id in ingredient_ids:
        db.add(OwnedIngredient(user_id=user_id, ingredient_id=ingredient_id))
    db.commit()
    return {"message": "Malzemeler güncellendi."}


def get_disliked_ingredients(user_id: int, db: Session) -> list[int]:
    disliked = db.query(DislikedIngredient).filter(DislikedIngredient.user_id == user_id).all()
    return [item.ingredient_id for item in disliked]


def update_disliked_ingredients(user_id: int, ingredient_ids: list[int], db: Session) -> dict:
    db.query(DislikedIngredient).filter(DislikedIngredient.user_id == user_id).delete()
    for ingredient_id in ingredient_ids:
        db.add(DislikedIngredient(user_id=user_id, ingredient_id=ingredient_id))
    db.commit()
    return {"message": "Sevilmeyen malzemeler güncellendi."}
