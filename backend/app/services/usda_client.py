"""USDA FoodData Central client for offline import jobs."""
from __future__ import annotations

import math
import os
import time
import unicodedata

import requests


USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1"
REQUEST_DELAY_SECONDS = 0.35
MAX_RETRIES = 4


NUTRIENT_NAME_MAP = {
    "energy": "calories_per_100g",
    "energy (atwater general factors)": "calories_per_100g",
    "energy (atwater specific factors)": "calories_per_100g",
    "protein": "protein_per_100g",
    "carbohydrate, by difference": "carbs_per_100g",
    "carbohydrates": "carbs_per_100g",
    "total lipid (fat)": "fat_per_100g",
    "fatty acids, total saturated": "saturated_fat_per_100g",
    "fiber, total dietary": "fiber_per_100g",
    "sugars, total including nlea": "sugar_per_100g",
    "total sugars": "sugar_per_100g",
    "sodium, na": "sodium_mg_per_100g",
    "sugars, added": "added_sugar_per_100g",
    "fatty acids, total trans": "trans_fat_per_100g",
    "cholesterol": "cholesterol_mg_per_100g",
    "potassium, k": "potassium_mg_per_100g",
    "calcium, ca": "calcium_mg_per_100g",
    "iron, fe": "iron_mg_per_100g",
    "vitamin d (d2 + d3), international units": "vitamin_d_mcg_per_100g",
    "vitamin d (d2 + d3)": "vitamin_d_mcg_per_100g",
}


ZERO_WHEN_MISSING_FIELDS = {
    "fiber_per_100g",
    "sugar_per_100g",
    "added_sugar_per_100g",
    "trans_fat_per_100g",
    "saturated_fat_per_100g",
    "cholesterol_mg_per_100g",
}


class UsdaClient:
    def __init__(self, api_key: str | None = None, request_delay_seconds: float = REQUEST_DELAY_SECONDS):
        self.api_key = (api_key or os.getenv("USDA_API_KEY") or "").strip()
        if not self.api_key:
            raise ValueError("USDA_API_KEY tanimli degil. Anahtari backend/.env icine eklemelisin.")
        self.request_delay_seconds = request_delay_seconds
        self.session = requests.Session()
        self.session.trust_env = False

    def search_foods(self, query: str, page_size: int = 10) -> list[dict]:
        payload = {
            "query": query,
            "pageSize": page_size,
            "dataType": ["Foundation", "SR Legacy", "Survey (FNDDS)"],
        }
        response = self._request_with_retry(
            "POST",
            f"{USDA_API_BASE}/foods/search",
            json=payload,
        )
        return response.json().get("foods", [])

    def get_food_details(self, fdc_id: int, search_food: dict | None = None) -> dict:
        response = self._request_with_retry(
            "GET",
            f"{USDA_API_BASE}/food/{fdc_id}",
            allow_not_found=True,
        )
        if response is not None and response.status_code < 400:
            return response.json()

        fallback = self._request_with_retry(
            "POST",
            f"{USDA_API_BASE}/foods",
            json={"fdcIds": [fdc_id]},
        )
        foods = fallback.json() if fallback.content else []
        if isinstance(foods, list) and foods:
            return foods[0]

        if search_food:
            return search_food

        raise ValueError(f"USDA detay verisi cekilemedi: {fdc_id}")

    def extract_nutrients(self, food: dict) -> dict:
        normalized = {
            "fdc_id": int(food["fdcId"]),
        }

        for nutrient in food.get("foodNutrients", []):
            nutrient_info = nutrient.get("nutrient") or {}
            name = self._normalize_text(nutrient_info.get("name") or nutrient.get("nutrientName") or "")
            mapped_field = NUTRIENT_NAME_MAP.get(name)
            if not mapped_field:
                continue

            amount = nutrient.get("amount")
            if amount is None:
                continue

            unit_name = (nutrient_info.get("unitName") or nutrient.get("unitName") or "").upper()
            if mapped_field == "vitamin_d_mcg_per_100g" and unit_name == "IU":
                normalized[mapped_field] = round(float(amount) * 0.025, 4)
            else:
                # Eger birden fazla enerji tanimi varsa, calories_per_100g alanini doldururken
                # ilk buldugumuz gecerli degeri koruyalim (genelde Energy kcal en dogrusudur)
                if mapped_field == "calories_per_100g" and normalized.get("calories_per_100g") is not None:
                    continue
                normalized[mapped_field] = float(amount)

        for field in ZERO_WHEN_MISSING_FIELDS:
            normalized.setdefault(field, 0.0)

        return normalized

    def _request_with_retry(
        self,
        method: str,
        url: str,
        *,
        json: dict | None = None,
        allow_not_found: bool = False,
    ):
        last_error: Exception | None = None

        for attempt in range(1, MAX_RETRIES + 1):
            if self.request_delay_seconds > 0:
                time.sleep(self.request_delay_seconds)

            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    params={"api_key": self.api_key},
                    json=json,
                    timeout=30,
                )
                if response.status_code == 429:
                    retry_after = response.headers.get("Retry-After")
                    wait_seconds = float(retry_after) if retry_after else min(8.0, math.pow(2, attempt - 1))
                    time.sleep(wait_seconds)
                    continue
                if allow_not_found and response.status_code == 404:
                    return response

                response.raise_for_status()
                return response
            except requests.RequestException as exc:
                last_error = exc
                if attempt == MAX_RETRIES:
                    break
                time.sleep(min(8.0, math.pow(2, attempt - 1)))

        raise ValueError(f"USDA istegi basarisiz oldu: {last_error}")

    def _normalize_text(self, value: str) -> str:
        normalized = unicodedata.normalize("NFKD", value or "")
        normalized = "".join(char for char in normalized if not unicodedata.combining(char))
        translation = str.maketrans({
            "ı": "i", "İ": "i",
            "ğ": "g", "Ğ": "g",
            "ş": "s", "Ş": "s",
            "ö": "o", "Ö": "o",
            "ü": "u", "Ü": "u",
            "ç": "c", "Ç": "c",
        })
        return " ".join(normalized.translate(translation).lower().split())
