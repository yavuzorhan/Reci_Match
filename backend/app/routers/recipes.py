import requests
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.recipe import CustomRecipeCreate, RecipeRecommendationRequest
from app.schemas.recipe_revision import RecipeRevisionRequest, RecipeRevisionResponse, RecipeRevisionSaveRequest
from app.services import recipe_service
from app.services import recipe_revision_service
from app.services.healthy_recipe_service import sync_healthy_recipes

router = APIRouter(prefix="/api", tags=["Recipes"])


@router.get("/recipe-image")
def proxy_recipe_image(url: str = Query(...)):
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Gecersiz resim adresi.")

    session = requests.Session()
    session.trust_env = False

    try:
        image_response = session.get(
            url,
            timeout=20,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        image_response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Resim alinamadi: {exc}") from exc

    return Response(
        content=image_response.content,
        media_type=image_response.headers.get("content-type", "image/jpeg"),
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/recipes")
def get_recipes(
    user_id: int | None = Query(default=None),
    ids: list[int] | None = Query(default=None),
    source: str | None = Query(default=None),
    recipe_category: str | None = Query(default=None),
    healthy_only: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    return recipe_service.get_recipes(user_id, ids, source, recipe_category, healthy_only, db)


@router.get("/recipes/{recipe_id}")
def get_recipe_detail(recipe_id: int, db: Session = Depends(get_db)):
    return recipe_service.get_recipe_detail(recipe_id, db)


@router.post("/recipes/recommendations")
def get_recipe_recommendations(
    req: RecipeRecommendationRequest,
    db: Session = Depends(get_db),
):
    return recipe_service.get_recommendations(
        selected_ingredient_ids=req.selected_ingredient_ids,
        pantry_ingredient_ids=req.pantry_ingredient_ids,
        disliked_ingredient_ids=req.disliked_ingredient_ids,
        cooking_types=req.cooking_types,
        exclude_disliked=req.exclude_disliked,
        user_id=req.user_id,
        source=req.source,
        healthy_only=req.healthy_only,
        db=db,
    )


@router.post("/healthy-recipes/sync")
def sync_curated_healthy_recipes(db: Session = Depends(get_db)):
    return sync_healthy_recipes(db)


@router.post("/recipes/{recipe_id}/revise", response_model=RecipeRevisionResponse)
async def revise_recipe(
    recipe_id: int,
    req: RecipeRevisionRequest,
    user_id: int = Query(...),
    db: Session = Depends(get_db),
):
    return await recipe_revision_service.revise_recipe(db, recipe_id, user_id, req)


@router.post("/recipes/{recipe_id}/revise/save")
async def save_revised_recipe(
    recipe_id: int,
    req: RecipeRevisionSaveRequest,
    db: Session = Depends(get_db),
):
    return await recipe_revision_service.save_revised_recipe(db, recipe_id, req.user_id, req.revised_recipe)


@router.post("/users/{user_id}/custom-recipes")
async def create_custom_recipe(
    user_id: int,
    req: CustomRecipeCreate,
    db: Session = Depends(get_db),
):
    return await recipe_service.create_custom_recipe(
        user_id=user_id,
        name=req.resolved_name(),
        recipe_category=req.recipe_category,
        explanation=req.resolved_explanation(),
        preparation=req.resolved_preparation(),
        cooking_type=req.cooking_type,
        cooking_method=req.cooking_method,
        serving=req.resolved_serving(),
        calorie=req.calorie,
        image_url=req.image_url,
        ingredients=[ing.model_dump() for ing in req.ingredients],
        db=db,
    )


@router.put("/users/{user_id}/custom-recipes/{recipe_id}")
async def update_custom_recipe(
    user_id: int,
    recipe_id: int,
    req: CustomRecipeCreate,
    db: Session = Depends(get_db),
):
    return await recipe_service.update_custom_recipe(
        user_id=user_id,
        recipe_id=recipe_id,
        name=req.resolved_name(),
        recipe_category=req.recipe_category,
        explanation=req.resolved_explanation(),
        preparation=req.resolved_preparation(),
        cooking_type=req.cooking_type,
        cooking_method=req.cooking_method,
        serving=req.resolved_serving(),
        calorie=req.calorie,
        image_url=req.image_url,
        ingredients=[ing.model_dump() for ing in req.ingredients],
        db=db,
    )


@router.delete("/users/{user_id}/custom-recipes/{recipe_id}")
def delete_custom_recipe(
    user_id: int,
    recipe_id: int,
    db: Session = Depends(get_db),
):
    return recipe_service.delete_custom_recipe(user_id=user_id, recipe_id=recipe_id, db=db)


@router.post("/recipes/{recipe_id}/image")
async def upload_recipe_image(
    recipe_id: int,
    user_id: int = Query(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    return await recipe_service.upload_recipe_image(user_id=user_id, recipe_id=recipe_id, upload_file=image, db=db)


@router.post("/recipes/custom")
async def create_custom_recipe_compat(
    req: CustomRecipeCreate,
    db: Session = Depends(get_db),
):
    user_id = getattr(req, "creator_id", None)
    if not user_id:
        raise HTTPException(status_code=400, detail="Kullanici bilgisi zorunludur.")
    return await recipe_service.create_custom_recipe(
        user_id=user_id,
        name=req.resolved_name(),
        recipe_category=req.recipe_category,
        explanation=req.resolved_explanation(),
        preparation=req.resolved_preparation(),
        cooking_type=req.cooking_type,
        cooking_method=req.cooking_method,
        serving=req.resolved_serving(),
        calorie=req.calorie,
        image_url=req.image_url,
        ingredients=[ing.model_dump() for ing in req.ingredients],
        db=db,
    )
