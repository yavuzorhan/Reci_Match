import os
import sys
import re


base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(base_dir)

from app.db.database import SessionLocal
from app.db.models import Recipe
from app.services.healthy_recipe_service import HEALTHY_SOURCES, sync_healthy_recipes
from app.utils.recipe_translation import translate_multiline_text, translate_text

try:
    from deep_translator import GoogleTranslator
except ImportError:  # pragma: no cover
    GoogleTranslator = None


def _chunked(items: list[str], size: int) -> list[list[str]]:
    return [items[index:index + size] for index in range(0, len(items), size)]


def _translate_batch(texts: list[str]) -> list[str]:
    cleaned = [" ".join((text or "").split()).strip() for text in texts]
    if not cleaned:
        return cleaned

    if GoogleTranslator is None:
        return [translate_text(text) or text for text in cleaned]

    translator = GoogleTranslator(source="en", target="tr")
    translated: list[str] = []

    for group in _chunked(cleaned, 15):
        try:
            group_result = translator.translate_batch(group)
        except Exception:
            group_result = [translate_text(text) or text for text in group]

        if not isinstance(group_result, list):
            group_result = [translate_text(text) or text for text in group]

        translated.extend(
            [" ".join((item or original).split()).strip() for item, original in zip(group_result, group)]
        )

    return translated


def _split_preparation_steps(text: str) -> list[str]:
    cleaned = " ".join((text or "").split()).strip()
    if not cleaned:
        return []

    parts = re.split(r"(?=step\s+\d+)", cleaned, flags=re.IGNORECASE)
    return [part.strip() for part in parts if part.strip()]


def _translate_preparation(text: str | None) -> str | None:
    if not text:
        return text

    parts = _split_preparation_steps(text)
    if not parts:
        return translate_multiline_text(text)

    translated_parts = _translate_batch(parts)
    return "\n".join(translated_parts).strip()


def main():
    db = SessionLocal()
    try:
        recipes = (
            db.query(Recipe)
            .filter(Recipe.source.in_(HEALTHY_SOURCES))
            .order_by(Recipe.recipe_id.asc())
            .all()
        )

        updated = 0
        for recipe in recipes:
            original_name = recipe.recipe_name
            original_explanation = recipe.explanation
            original_preparation = recipe.preparation

            translated_name = _translate_batch([original_name])[0] if original_name else original_name
            translated_explanation = _translate_batch([original_explanation])[0] if original_explanation else original_explanation
            translated_preparation = _translate_preparation(original_preparation) or original_preparation

            changed = False
            if translated_name != original_name:
                recipe.recipe_name = translated_name
                changed = True
            if translated_explanation != original_explanation:
                recipe.explanation = translated_explanation
                changed = True
            if translated_preparation != original_preparation:
                recipe.preparation = translated_preparation
                changed = True

            if changed:
                updated += 1

        db.commit()
        sync_result = sync_healthy_recipes(db)
        print(f"Cevrilen tarif: {updated}")
        print(sync_result["message"])
        print(f"Healthy total: {sync_result['total']}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
