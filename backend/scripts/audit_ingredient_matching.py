"""Audit recipe ingredient coverage and ingredient name quality.

Usage:
    python audit_ingredient_matching.py
"""
from __future__ import annotations

import os
import sys
from difflib import SequenceMatcher

from sqlalchemy import func, text

CURRENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from app.db.database import SessionLocal
from app.db.models import Ingredient, Recipe, RecipeIngredient, UnmatchedIngredient
from app.services.ingredient_matching_service import normalize_raw_ingredient


def _similarity(left: str, right: str) -> float:
    return round(SequenceMatcher(None, left, right).ratio() * 100, 2)


def list_recipes_with_few_ingredients(db, threshold: int = 3):
    rows = (
        db.query(
            Recipe.recipe_id,
            Recipe.recipe_name,
            Recipe.source_url,
            func.count(RecipeIngredient.recipe_ingredient_id).label("ingredient_count"),
        )
        .outerjoin(RecipeIngredient, Recipe.recipe_id == RecipeIngredient.recipe_id)
        .group_by(Recipe.recipe_id, Recipe.recipe_name, Recipe.source_url)
        .having(func.count(RecipeIngredient.recipe_ingredient_id) < threshold)
        .order_by(func.count(RecipeIngredient.recipe_ingredient_id).asc(), Recipe.recipe_id.asc())
        .all()
    )
    return rows


def list_unmatched_ingredients(db):
    try:
        return (
            db.query(UnmatchedIngredient)
            .order_by(UnmatchedIngredient.created_at.desc().nullslast(), UnmatchedIngredient.id.desc())
            .limit(200)
            .all()
        )
    except Exception:
        db.rollback()
        return []


def report_duplicate_or_similar_ingredients(db, min_score: float = 92.0):
    ingredients = db.query(Ingredient).filter(Ingredient.user_id.is_(None)).order_by(Ingredient.ingredient_id.asc()).all()
    normalized_groups: dict[str, list[Ingredient]] = {}
    for ingredient in ingredients:
        key = normalize_raw_ingredient(ingredient.ingredient_name).normalized_name
        normalized_groups.setdefault(key, []).append(ingredient)

    exact_duplicates = {key: values for key, values in normalized_groups.items() if len(values) > 1}

    similar_pairs = []
    normalized_items = [(normalize_raw_ingredient(item.ingredient_name).normalized_name, item) for item in ingredients]
    for index, (left_key, left) in enumerate(normalized_items):
        if not left_key:
            continue
        for right_key, right in normalized_items[index + 1:]:
            if not right_key or left_key == right_key:
                continue
            score = _similarity(left_key, right_key)
            if score >= min_score:
                similar_pairs.append((left, right, score))

    return exact_duplicates, similar_pairs


def print_section(title: str) -> None:
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)


def main() -> None:
    db = SessionLocal()
    try:
        print_section("Malzemesi olmayan veya 3'ten az malzemeli tarifler")
        sparse_recipes = list_recipes_with_few_ingredients(db, threshold=3)
        if not sparse_recipes:
            print("Sorun bulunmadi.")
        for row in sparse_recipes:
            print(f"#{row.recipe_id} | {row.recipe_name} | ingredient_count={row.ingredient_count} | {row.source_url or '-'}")

        print_section("Unmatched ingredient / import issue kayitlari")
        unmatched_rows = list_unmatched_ingredients(db)
        if not unmatched_rows:
            print("Kayit bulunmadi veya unmatched_ingredients tablosu henuz olusturulmadi.")
        for row in unmatched_rows:
            print(
                f"#{row.id} | recipe={row.recipe_id or '-'} | {row.issue_type} | "
                f"raw={row.raw_name or '-'} | normalized={row.normalized_name or '-'} | "
                f"suggested={row.suggested_match or '-'} | score={row.confidence_score or 0}"
            )

        print_section("Duplicate/similar ingredient isimleri")
        duplicates, similar_pairs = report_duplicate_or_similar_ingredients(db)
        if not duplicates and not similar_pairs:
            print("Benzer/duplicate ingredient bulunmadi.")
        for key, values in duplicates.items():
            names = ", ".join(f"#{item.ingredient_id}:{item.ingredient_name}" for item in values)
            print(f"Exact normalized duplicate [{key}]: {names}")
        for left, right, score in similar_pairs[:200]:
            print(f"Similar %{score}: #{left.ingredient_id}:{left.ingredient_name} <-> #{right.ingredient_id}:{right.ingredient_name}")

        print_section("Foreign key orphan kontrolu")
        orphan_rows = db.execute(
            text(
                """
                SELECT ri.recipe_ingredient_id, ri.recipe_id, ri.ingredient_id
                FROM recipe_ingredients ri
                LEFT JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
                WHERE i.ingredient_id IS NULL
                ORDER BY ri.recipe_ingredient_id
                """
            )
        ).mappings().all()
        if not orphan_rows:
            print("recipe_ingredients -> ingredients orphan kaydi bulunmadi.")
        for row in orphan_rows:
            print(dict(row))
    finally:
        db.close()


if __name__ == "__main__":
    main()
