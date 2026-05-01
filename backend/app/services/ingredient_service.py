"""
Malzeme iş mantığı: kategorize listeleme, özel malzeme ekleme ve kiler yönetimi.
"""
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories import ingredient_repository
from app.services.ingredient_resolver_service import ensure_nutrition_for_ingredient
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
    categories = ingredient_repository.get_all_categories(db)
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


async def create_custom_ingredient(user_id: int, name: str, category_id: int | None, db: Session) -> dict:
    clean_name = normalize_ingredient_name(name)

    if not category_id:
        raise HTTPException(status_code=400, detail="Kategori seçimi zorunludur. Lütfen kategori seçin.")

    existing_global = ingredient_repository.find_global_ingredient_by_name(db, clean_name)
    if existing_global:
        nutrition_result = await ensure_nutrition_for_ingredient(db, existing_global, query_name=clean_name)
        db.commit()
        return {
            "message": "Sistemde zaten bu malzeme var.",
            "ingredient": {"id": existing_global.ingredient_id, "name": existing_global.ingredient_name},
            "nutrition_status": nutrition_result.status,
        }

    existing_user = ingredient_repository.find_user_ingredient_by_name(db, user_id, clean_name)
    if existing_user:
        nutrition_result = await ensure_nutrition_for_ingredient(db, existing_user, query_name=clean_name)
        db.commit()
        return {
            "message": "Bu malzeme zaten ekli.",
            "ingredient": {"id": existing_user.ingredient_id, "name": existing_user.ingredient_name},
            "nutrition_status": nutrition_result.status,
        }

    new_ingredient = ingredient_repository.create_ingredient(
        db,
        ingredient_name=clean_name,
        category_id=category_id,
        user_id=user_id,
    )
    nutrition_result = await ensure_nutrition_for_ingredient(db, new_ingredient, query_name=clean_name)
    db.commit()
    db.refresh(new_ingredient)
    return {
        "message": "Malzeme eklendi.",
        "ingredient": {"id": new_ingredient.ingredient_id, "name": new_ingredient.ingredient_name},
        "nutrition_status": nutrition_result.status,
    }


def get_user_ingredients(user_id: int, db: Session) -> list[dict]:
    owned = ingredient_repository.find_owned_ingredients_by_user(db, user_id)
    return [{"id": item.ingredient_id, "name": item.ingredient.ingredient_name} for item in owned]


def update_user_ingredients(user_id: int, ingredient_ids: list[int], db: Session) -> dict:
    ingredient_repository.delete_owned_ingredients_by_user(db, user_id)
    for ingredient_id in ingredient_ids:
        ingredient_repository.create_owned_ingredient(db, user_id, ingredient_id)
    db.commit()
    return {"message": "Malzemeler güncellendi."}


def get_disliked_ingredients(user_id: int, db: Session) -> list[int]:
    disliked = ingredient_repository.find_disliked_ingredients_by_user(db, user_id)
    return [item.ingredient_id for item in disliked]


def update_disliked_ingredients(user_id: int, ingredient_ids: list[int], db: Session) -> dict:
    ingredient_repository.delete_disliked_ingredients_by_user(db, user_id)
    for ingredient_id in ingredient_ids:
        ingredient_repository.create_disliked_ingredient(db, user_id, ingredient_id)
    db.commit()
    return {"message": "Sevilmeyen malzemeler güncellendi."}
