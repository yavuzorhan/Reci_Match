"""Conservative ingredient normalization and matching for recipe imports."""
from __future__ import annotations

from dataclasses import dataclass
from difflib import SequenceMatcher
import re
import unicodedata

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Ingredient, IngredientAlias, UnmatchedIngredient


UNIT_WORDS = {
    "adet", "tane", "gram", "gr", "g", "kg", "kilogram", "ml", "lt", "litre",
    "bardak", "bardagi", "bardağı", "su", "cay", "çay", "yemek", "tatli", "tatlı",
    "kasik", "kaşık", "kasigi", "kaşığı", "fincan", "kase", "paket", "demet",
    "dal", "dis", "diş", "dilim", "tutam", "avuç", "avuc", "cup", "cups",
    "tbsp", "tsp", "tablespoon", "teaspoon",
}

QUANTITY_WORDS = {
    "yarim", "yarım", "ceyrek", "çeyrek", "bir", "iki", "uc", "üç", "dort",
    "dört", "bes", "beş", "alti", "altı", "birkac", "birkaç", "az", "biraz",
    "bolca", "yaklasik", "yaklaşık", "tepeleme", "silme",
}

PREPARATION_WORDS = {
    "dogranmis", "doğranmış", "dogranmış", "doğranmis", "kup", "küp",
    "rendelenmis", "rendelenmiş", "ince", "kiyilmis", "kıyılmış",
    "haslanmis", "haşlanmış", "ogutulmus", "öğütülmüş", "cekilmis", "çekilmiş",
    "cirpilmis", "çırpılmış", "dovulmus", "dövülmüş", "soyulmus", "soyulmuş",
    "ayiklanmis", "ayıklanmış", "temizlenmis", "temizlenmiş", "fileto",
    "julyen", "iri", "ufak", "ezilmis", "ezilmiş", "kavrulmus", "kavrulmuş",
}

RISK_WORDS = {
    "kuru", "kurutulmus", "kurutulmuş", "salca", "salça", "salcasi", "salçası",
    "un", "unu", "nisasta", "nişasta", "toz", "esmer", "tam", "bugday",
    "buğday", "light", "suzme", "süzme", "konserve", "füme", "fume",
    "peynir", "peyniri", "kirma", "kırma",
}

SAFE_DERIVED_TO_BASE = {
    "limon suyu": "limon",
    "limonun suyu": "limon",
    "sariimsak rendesi": "sarimsak",
    "sarimsak rendesi": "sarimsak",
    "zeytin yagi": "zeytinyagi",
    "zeytin yağı": "zeytinyagi",
    "ogutulmus yulaf": "yulaf",
    "öğütülmüş yulaf": "yulaf",
    "yulaf unu": "yulaf",
    "tavuk gogsu fileto": "tavuk gogsu",
    "tavuk göğsü fileto": "tavuk gogsu",
    "fileto tavuk gogsu": "tavuk gogsu",
}

DEFAULT_SAFE_ALIASES = {
    "öğütülmüş yulaf": "yulaf",
    "ogutulmus yulaf": "yulaf",
    "yulaf ezmesi": "yulaf",
    "zeytin yağı": "zeytinyagi",
    "zeytin yagi": "zeytinyagi",
    "tavuk göğsü fileto": "tavuk gogsu",
    "tavuk gogsu fileto": "tavuk gogsu",
    "fileto tavuk göğsü": "tavuk gogsu",
    "rendelenmiş havuç": "havuc",
    "dogranmis sogan": "sogan",
    "doğranmış soğan": "sogan",
    "ince kıyılmış maydanoz": "maydanoz",
    "haşlanmış yumurta": "yumurta",
    "sarımsak rendesi": "sarimsak",
}


@dataclass(frozen=True)
class NormalizedIngredient:
    raw_name: str
    cleaned_name: str
    normalized_name: str
    preparation_terms: tuple[str, ...]
    risk_terms: tuple[str, ...]


@dataclass(frozen=True)
class IngredientMatch:
    ingredient: Ingredient | None
    normalized: NormalizedIngredient
    match_type: str
    confidence_score: float
    suggested_match: str | None = None
    suggested_ingredient_id: int | None = None

    @property
    def accepted(self) -> bool:
        return self.ingredient is not None


def fold_text(value: str | None) -> str:
    if not value:
        return ""
    text = unicodedata.normalize("NFKD", value)
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = text.replace("ı", "i").replace("İ", "i")
    text = text.lower()
    text = re.sub(r"[^a-z0-9çğıöşü\s-]", " ", text)
    return " ".join(text.split())


def normalize_raw_ingredient(raw_text: str | None) -> NormalizedIngredient:
    raw_name = (raw_text or "").strip()
    folded = fold_text(raw_name)
    folded = re.sub(r"\([^)]*\)", " ", folded)
    folded = re.sub(r"\b\d+[.,]?\d*(?:\s*[-/]\s*\d+[.,]?\d*)?\b", " ", folded)
    folded = re.sub(r"\b\d+\s*[a-zçğıöşü]+\b", " ", folded)
    folded = re.sub(r"\s+", " ", folded).strip()

    tokens = [token for token in folded.split() if token]
    cleaned_tokens: list[str] = []
    preparation_terms: list[str] = []

    for token in tokens:
        if token in UNIT_WORDS or token in QUANTITY_WORDS:
            continue
        if token in PREPARATION_WORDS:
            preparation_terms.append(token)
            continue
        cleaned_tokens.append(token)

    cleaned_name = " ".join(cleaned_tokens).strip()
    risk_terms = tuple(token for token in cleaned_tokens if token in RISK_WORDS)

    return NormalizedIngredient(
        raw_name=raw_name,
        cleaned_name=cleaned_name,
        normalized_name=cleaned_name,
        preparation_terms=tuple(preparation_terms),
        risk_terms=risk_terms,
    )


def _ingredient_key(ingredient_name: str) -> str:
    return normalize_raw_ingredient(ingredient_name).normalized_name


def _similarity(left: str, right: str) -> float:
    direct = SequenceMatcher(None, left, right).ratio()
    sorted_left = " ".join(sorted(left.split()))
    sorted_right = " ".join(sorted(right.split()))
    token_sorted = SequenceMatcher(None, sorted_left, sorted_right).ratio()
    return round(max(direct, token_sorted) * 100, 2)


def _all_global_ingredients(db: Session) -> list[Ingredient]:
    return db.query(Ingredient).filter(Ingredient.user_id.is_(None)).all()


def _find_by_normalized_name(db: Session, normalized_name: str) -> Ingredient | None:
    for ingredient in _all_global_ingredients(db):
        if _ingredient_key(ingredient.ingredient_name) == normalized_name:
            return ingredient
    return None


def _find_alias(db: Session, normalized_name: str) -> IngredientAlias | None:
    return (
        db.query(IngredientAlias)
        .filter(func.lower(IngredientAlias.normalized_alias_name) == normalized_name.lower())
        .first()
    )


def _best_fuzzy_candidate(db: Session, normalized_name: str) -> tuple[Ingredient | None, float]:
    best_ingredient = None
    best_score = 0.0
    for ingredient in _all_global_ingredients(db):
        score = _similarity(normalized_name, _ingredient_key(ingredient.ingredient_name))
        if score > best_score:
            best_ingredient = ingredient
            best_score = score
    return best_ingredient, best_score


def _has_risky_mismatch(normalized_name: str, candidate_name: str, risk_terms: tuple[str, ...]) -> bool:
    if not risk_terms:
        return False
    candidate_tokens = set(_ingredient_key(candidate_name).split())
    normalized_tokens = set(normalized_name.split())

    if normalized_tokens == candidate_tokens:
        return False

    return not set(risk_terms).issubset(candidate_tokens)


def match_ingredient(db: Session, raw_ingredient_name: str) -> IngredientMatch:
    normalized = normalize_raw_ingredient(raw_ingredient_name)
    normalized_name = normalized.normalized_name

    if not normalized_name:
        return IngredientMatch(None, normalized, "empty", 0.0)

    exact = _find_by_normalized_name(db, normalized_name)
    if exact:
        return IngredientMatch(exact, normalized, "exact", 100.0, exact.ingredient_name, exact.ingredient_id)

    alias = _find_alias(db, normalized_name)
    if alias:
        return IngredientMatch(alias.ingredient, normalized, "alias", 100.0, alias.ingredient.ingredient_name, alias.ingredient_id)

    safe_target = SAFE_DERIVED_TO_BASE.get(normalized_name)
    if safe_target:
        safe_ingredient = _find_by_normalized_name(db, safe_target)
        if safe_ingredient:
            return IngredientMatch(
                safe_ingredient,
                normalized,
                "safe_derived",
                96.0,
                safe_ingredient.ingredient_name,
                safe_ingredient.ingredient_id,
            )

    candidate, score = _best_fuzzy_candidate(db, normalized_name)
    if candidate and score >= 90 and not _has_risky_mismatch(normalized_name, candidate.ingredient_name, normalized.risk_terms):
        return IngredientMatch(candidate, normalized, "fuzzy", score, candidate.ingredient_name, candidate.ingredient_id)

    return IngredientMatch(
        None,
        normalized,
        "unmatched",
        score,
        candidate.ingredient_name if candidate else None,
        candidate.ingredient_id if candidate else None,
    )


def log_unmatched_ingredient(
    db: Session,
    *,
    match: IngredientMatch,
    recipe_id: int | None,
    recipe_name: str | None,
    source_url: str | None,
    issue_type: str = "unmatched_ingredient",
) -> UnmatchedIngredient:
    entry = UnmatchedIngredient(
        recipe_id=recipe_id,
        recipe_name=recipe_name,
        source_url=source_url,
        raw_name=match.normalized.raw_name[:255] if match.normalized.raw_name else None,
        normalized_name=match.normalized.normalized_name[:150] if match.normalized.normalized_name else None,
        suggested_match=match.suggested_match[:150] if match.suggested_match else None,
        suggested_ingredient_id=match.suggested_ingredient_id,
        confidence_score=match.confidence_score,
        issue_type=issue_type,
        status="pending",
    )
    db.add(entry)
    return entry


def log_import_issue(
    db: Session,
    *,
    recipe_id: int | None,
    recipe_name: str | None,
    source_url: str | None,
    issue_type: str,
    message: str,
) -> UnmatchedIngredient:
    entry = UnmatchedIngredient(
        recipe_id=recipe_id,
        recipe_name=recipe_name,
        source_url=source_url,
        raw_name=None,
        normalized_name=None,
        suggested_match=message[:150] if message else None,
        confidence_score=0.0,
        issue_type=issue_type,
        status="pending",
    )
    db.add(entry)
    return entry


def validate_recipe_ingredient_matches(raw_count: int, matched_count: int, minimum_matched: int = 3) -> tuple[bool, str | None]:
    if raw_count < minimum_matched:
        return False, f"Recipe has only {raw_count} raw ingredients; minimum is {minimum_matched}."
    if matched_count < minimum_matched:
        return False, f"Recipe has only {matched_count} matched ingredients; minimum is {minimum_matched}."
    return True, None


def seed_default_ingredient_aliases(db: Session) -> int:
    created = 0
    for alias_name, canonical_name in DEFAULT_SAFE_ALIASES.items():
        normalized_alias = normalize_raw_ingredient(alias_name).normalized_name
        if _find_alias(db, normalized_alias):
            continue
        ingredient = _find_by_normalized_name(db, normalize_raw_ingredient(canonical_name).normalized_name)
        if ingredient is None:
            continue
        db.add(
            IngredientAlias(
                ingredient_id=ingredient.ingredient_id,
                alias_name=alias_name,
                normalized_alias_name=normalized_alias,
            )
        )
        created += 1
    return created
