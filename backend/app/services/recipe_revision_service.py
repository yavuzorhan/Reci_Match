"""AI-assisted recipe revision preview and save service."""
from __future__ import annotations

import hashlib
import json
import re
from os import getenv

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.repositories import recipe_repository
from app.schemas.recipe_revision import RecipeRevisionRequest, RevisedRecipePayload
from app.services import recipe_service

try:
    from google import genai
    from google.genai import types as genai_types
    _GEMINI_AVAILABLE = True
except ImportError:
    _GEMINI_AVAILABLE = False


REVISION_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "recipe_name": {"type": "string"},
        "explanation": {"type": "string"},
        "preparation": {"type": "string"},
        "recipe_category": {"type": "string"},
        "cooking_type": {"type": "string"},
        "cooking_method": {"type": "string"},
        "total_time_minutes": {"type": "integer"},
        "serving": {"type": "integer"},
        "image_url": {"type": "string"},
        "ingredients": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ingredient_name": {"type": "string"},
                    "amount": {"type": "number"},
                    "unit": {"type": "string"},
                },
                "required": ["ingredient_name"],
            },
        },
    },
    "required": ["recipe_name", "ingredients", "preparation"],
}


async def revise_recipe(
    db: Session,
    recipe_id: int,
    user_id: int,
    modifications: RecipeRevisionRequest,
) -> dict:
    if modifications.original_recipe_id is not None and modifications.original_recipe_id != recipe_id:
        raise HTTPException(status_code=400, detail="Revize edilecek tarif ID'si path ile uyusmuyor.")

    recipe = recipe_repository.find_recipe_by_id_with_relations(db, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Tarif bulunamadi.")

    normalized_modifications = modifications.model_dump(exclude_none=True)
    modifications_hash = _hash_modifications(normalized_modifications)
    cached = recipe_repository.find_revision_cache(db, recipe_id, modifications_hash)
    if cached:
        return {
            "status": "success",
            "cached": True,
            "revised_recipe": RevisedRecipePayload.model_validate_json(cached.response_json).model_dump(),
        }

    recipe_json = recipe_service.serialize_recipe_detail(recipe)
    revised = _revise_with_gemini(recipe_json, normalized_modifications)
    revised_payload = RevisedRecipePayload.model_validate(revised)

    recipe_repository.create_revision_cache(
        db,
        recipe_id,
        modifications_hash,
        revised_payload.model_dump_json(),
    )
    db.commit()
    return {"status": "success", "cached": False, "revised_recipe": revised_payload.model_dump()}


async def save_revised_recipe(
    db: Session,
    recipe_id: int,
    user_id: int,
    revised_recipe: RevisedRecipePayload,
) -> dict:
    original = recipe_repository.find_recipe_by_id(db, recipe_id)
    if not original:
        raise HTTPException(status_code=404, detail="Tarif bulunamadi.")

    payload = revised_recipe.model_dump()
    result = await recipe_service.create_custom_recipe(
        user_id=user_id,
        name=payload.get("recipe_name") or f"{original.recipe_name} Revize",
        recipe_category=payload.get("recipe_category") or original.recipe_category,
        explanation=payload.get("explanation"),
        preparation=payload.get("preparation"),
        cooking_type=payload.get("cooking_type") or original.cooking_type,
        cooking_method=payload.get("cooking_method") or original.cooking_method,
        serving=payload.get("serving") or original.serving or 1,
        calorie=None,
        image_url=payload.get("image_url") or original.image_url,
        ingredients=[
            {
                "ingredient_name": item["ingredient_name"],
                "amount": item.get("amount"),
                "unit": item.get("unit"),
            }
            for item in payload.get("ingredients", [])
        ],
        db=db,
    )
    if result.get("status") == "manual_required":
        ing_name = result.get("ingredient_name", "Bilinmeyen malzeme")
        raise HTTPException(
            status_code=422,
            detail=f"'{ing_name}' malzemesi sistemde bulunamadı. Tarifi elle oluşturabilirsiniz.",
        )
    if result.get("status") == "success":
        result["redirect_to"] = "/recipes"
    return result


def _hash_modifications(modifications: dict) -> str:
    payload = json.dumps(modifications, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _revise_with_gemini(recipe_json: dict, modifications: dict) -> dict:
    if not _GEMINI_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Gemini paketi yüklü değil. Lütfen: pip install google-genai"
        )

    api_key = (getenv("GEMINI_API_KEY") or "").strip()
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY .env dosyasında tanımlı değil."
        )

    client = genai.Client(api_key=api_key)
    original_ingredient_names = [
        item.get("name")
        for item in recipe_json.get("ingredients", [])
        if item.get("name")
    ]
    requested_additions = [
        item.get("name")
        for item in modifications.get("add_ingredients", [])
        if item.get("name")
    ]
    requested_removals = modifications.get("remove_ingredients", [])

    prompt = f"""Asagidaki tarifi verilen degisikliklere gore revize et.
Tarifin kimligini bozma. Sadece gerekli minimum degisiklikleri yap.
Halisunasyon yapma: Orijinal tarifte olmayan bilgileri kesin bilgi gibi uydurma.

Orijinal tarif:
{json.dumps(recipe_json, ensure_ascii=False)}

Istenen degisiklikler:
{json.dumps(modifications, ensure_ascii=False)}

Orijinal malzemeler:
{json.dumps(original_ingredient_names, ensure_ascii=False)}

Kullanicinin eklemek istedigi malzemeler:
{json.dumps(requested_additions, ensure_ascii=False)}

Kullanicinin cikarmak istedigi malzemeler:
{json.dumps(requested_removals, ensure_ascii=False)}

Su kurallara uy:
- Sadece orijinal malzemeleri, kullanicinin ekledigi malzemeleri ve cikarilan malzemeyi telafi etmek icin zorunlu olan en fazla 1 yapisal alternatifi kullan.
- Yeni ve alakasiz malzeme uydurma.
- Cikarilan malzeme tarifin dokusunu, baglayiciligini, yag dengesini veya pisirme teknigini etkiliyorsa yapisal olarak benzer bir alternatif oner; gerekmiyorsa yerine malzeme ekleme.
- Gramajlari kullanicinin miktar degisikliklerine ve tarifin porsiyon dengesine gore orantili ayarla.
- Pisirme suresini yalnizca malzeme/miktar degisikligi bunu gerektiriyorsa guncelle.
- Hazirlanis adimlarini yeni malzeme listesine gore yeniden yaz.
- Saglik skoru, besin degeri veya kullanicinin saglik durumu hakkinda iddia uretme.
- JSON dondur, baska aciklama ekleme.

Donmen gereken JSON semasi:
{json.dumps(REVISION_RESPONSE_SCHEMA, ensure_ascii=False)}
"""
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=REVISION_RESPONSE_SCHEMA,
            ),
        )
    except Exception as exc:
        exc_str = (type(exc).__name__ + str(exc)).lower()
        if "resourceexhausted" in exc_str or "429" in exc_str or "quota" in exc_str:
            raise HTTPException(
                status_code=429,
                detail="Gemini API günlük istek limiti doldu. Lütfen birkaç dakika sonra tekrar deneyin.",
            )
        raise HTTPException(status_code=502, detail=f"Gemini API hatası: {exc}")

    parsed = _parse_json_response(getattr(response, "text", "") or "")

    # Filter out ingredients Gemini hallucinated — only original + requested additions allowed
    if parsed.get("ingredients"):
        from app.utils.recipe_helpers import ascii_fold
        removed_norms = {ascii_fold(r) for r in requested_removals if r}
        allowed_norms = (
            {ascii_fold(n) for n in original_ingredient_names if n} - removed_norms
            | {ascii_fold(n) for n in requested_additions if n}
        )
        if allowed_norms:
            filtered = [
                item for item in parsed["ingredients"]
                if ascii_fold(item.get("ingredient_name", "")) in allowed_norms
            ]
            if filtered:
                parsed["ingredients"] = filtered

    return parsed


def _parse_json_response(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        match = re.search(r"```(?:json)?\s*(.*?)```", cleaned, flags=re.DOTALL | re.IGNORECASE)
        if match:
            cleaned = match.group(1).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="Gemini revizyon cevabi JSON formatinda degil.") from exc
