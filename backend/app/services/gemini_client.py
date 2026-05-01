"""Gemini structured nutrition fallback client."""
from __future__ import annotations

import json
import os


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

    try:
        import google.generativeai as genai
    except ImportError:
        return None

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(
        "gemini-2.5-flash",
        generation_config={
            "response_mime_type": "application/json",
            "response_schema": NUTRITION_SCHEMA,
        },
    )
    prompt = (
        "100 gram için makro değerlerini ver, sadece JSON dön, açıklama yapma. "
        f"Malzeme: {name}. Türkçe yerel ürünler için Türk mutfağı bağlamını dikkate al."
    )
    response = model.generate_content(prompt)
    text = getattr(response, "text", "") or ""
    if not text:
        return None
    data = json.loads(text)
    return {
        "calorie_per_100g": data.get("calories_per_100g", 0),
        "protein_per_100g": data.get("protein_per_100g", 0),
        "carbohydrate_per_100g": data.get("carbs_per_100g", 0),
        "fat_per_100g": data.get("fat_per_100g", 0),
        "saturated_fat_per_100g": data.get("saturated_fat_per_100g", 0),
        "fiber_per_100g": data.get("fiber_per_100g", 0),
        "sugar_per_100g": data.get("sugar_per_100g", 0),
        "sodium_mg_per_100g": data.get("sodium_mg_per_100g", 0),
        "fdc_id": None,
    }
