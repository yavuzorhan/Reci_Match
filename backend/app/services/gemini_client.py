from __future__ import annotations

import json
import os

try:
    from google import genai
    from google.genai import types as genai_types
    _GENAI_AVAILABLE = True
except ImportError:
    _GENAI_AVAILABLE = False


NUTRITION_SCHEMA = {
    "type": "object",
    "properties": {
        "calories_per_100g": {"type": "number"},
        "protein_per_100g": {"type": "number"},
        "carbs_per_100g": {"type": "number"},
        "fat_per_100g": {"type": "number"},
        "saturated_fat_per_100g": {"type": "number"},
        "fiber_per_100g": {"type": "number"},
        "sugar_per_100g": {"type": "number"},
        "sodium_mg_per_100g": {"type": "number"},
    },
    "required": ["calories_per_100g", "protein_per_100g", "carbs_per_100g", "fat_per_100g"],
}


def estimate_nutrition_with_gemini(name: str) -> dict | None:
    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not api_key:
        return None

    if not _GENAI_AVAILABLE:
        return None

    try:
        client = genai.Client(api_key=api_key)
        prompt = (
            "Detayli besin degerleri ver: kalori, protein, karbonhidrat, yag, doymus yag, "
            "lif, seker, sodyum. Bilinmiyorsa 0 yaz. Sadece JSON don, aciklama yapma. "
            f"Malzeme: {name}. Turkce yerel urunler icin Turk mutfagi baglamini dikkate al."
        )
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=NUTRITION_SCHEMA,
            ),
        )
        text = getattr(response, "text", "") or ""
        if not text:
            return None
        data = json.loads(text)
    except Exception as exc:
        exc_name = type(exc).__name__
        exc_str = (exc_name + str(exc)).lower()
        if "resourceexhausted" in exc_str or "429" in exc_str or "quota" in exc_str:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=429,
                detail="Gemini API günlük istek limiti doldu. Lütfen birkaç dakika sonra tekrar deneyin.",
            )
        return None
    return {
        "calorie_per_100g": data.get("calories_per_100g", 0),
        "protein_per_100g": data.get("protein_per_100g", 0),
        "carbohydrate_per_100g": data.get("carbs_per_100g", 0),
        "fat_per_100g": data.get("fat_per_100g", 0),
        "saturated_fat_per_100g": data.get("saturated_fat_per_100g", 0),
        "fiber_per_100g": data.get("fiber_per_100g", 0),
        "sugar_per_100g": data.get("sugar_per_100g", 0),
        "sodium_mg_per_100g": data.get("sodium_mg_per_100g", 0),
    }
