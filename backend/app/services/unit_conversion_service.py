"""Recipe ingredient unit normalization and gram conversion helpers."""
from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import text
from sqlalchemy.orm import Session


DEFAULT_UNIT_PROFILE = "yemek_com_profile"

UNIT_VOLUME_PROFILES = {
    "yemek_com_profile": {
        "tablespoon": Decimal("15"),
        "dessert_spoon": Decimal("5"),
        "teaspoon": Decimal("5"),
        "cup": Decimal("200"),
        "tea_glass": Decimal("100"),
    },
    "tr_200ml_profile": {
        "tablespoon": Decimal("10"),
        "dessert_spoon": Decimal("5"),
        "teaspoon": Decimal("5"),
        "cup": Decimal("200"),
        "tea_glass": Decimal("100"),
    },
    "us_fda_profile": {
        "tablespoon": Decimal("15"),
        "dessert_spoon": Decimal("10"),
        "teaspoon": Decimal("5"),
        "cup": Decimal("240"),
        "tea_glass": Decimal("100"),
    },
}

UNIT_ALIASES = {
    "tablespoon": [
        "yemek ka\u015f\u0131\u011f\u0131",
        "yemek kasigi",
        "yemek ka\u015f\u0131g\u0131",
        "yemek kas\u0131\u011f\u0131",
        "yemek ta\u015f\u0131\u011f\u0131",
        "corba kasigi",
        "\u00e7orba ka\u015f\u0131\u011f\u0131",
        "yk",
        "y.k.",
        "tbsp",
        "tablespoon",
    ],
    "dessert_spoon": [
        "tatl\u0131 ka\u015f\u0131\u011f\u0131",
        "tatli kasigi",
        "tatl\u0131 kasigi",
        "tatli ka\u015f\u0131\u011f\u0131",
        "tk",
        "t.k.",
        "dessert spoon",
    ],
    "teaspoon": [
        "\u00e7ay ka\u015f\u0131\u011f\u0131",
        "cay kasigi",
        "\u00e7ay kasigi",
        "cay ka\u015f\u0131\u011f\u0131",
        "tsp",
        "teaspoon",
    ],
    "cup": ["su barda\u011f\u0131", "su bardagi", "bardak", "cup"],
    "tea_glass": ["\u00e7ay barda\u011f\u0131", "cay bardagi"],
    "piece": ["adet", "tane"],
    "gram": ["gram", "gr", "g"],
    "kilogram": ["kilogram", "kg"],
    "ml": ["ml", "mililitre"],
    "liter": ["litre", "l"],
    "uncertain": ["tutam", "biraz", "g\u00f6z karar\u0131", "goz karari", "ald\u0131k\u00e7a", "aldikca"],
}

LIQUID_INGREDIENT_KEYS = {
    "su",
    "sut",
    "s\u00fct",
    "tavuk suyu",
    "et suyu",
    "sebze suyu",
}

OIL_INGREDIENT_KEYS = {
    "sivi yag",
    "s\u0131v\u0131 ya\u011f",
    "zeytinyagi",
    "zeytinya\u011f\u0131",
    "aycicek yagi",
    "ay\u00e7i\u00e7ek ya\u011f\u0131",
}

UNCERTAIN_UNITS = {"uncertain"}


def _normalize_alias(value: str) -> str:
    if not value:
        return ""
    normalized = str(value).lower()
    replacements = (
        ("\u0131", "i"), ("\u0130", "i"), ("\u011f", "g"), ("\u011e", "g"),
        ("\u015f", "s"), ("\u015e", "s"), ("\u00f6", "o"), ("\u00d6", "o"),
        ("\u00fc", "u"), ("\u00dc", "u"), ("\u00e7", "c"), ("\u00c7", "c"),
    )
    for source, target in replacements:
        normalized = normalized.replace(source.lower(), target)
    normalized = unicodedata.normalize("NFKD", normalized)
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    normalized = re.sub(r"[^a-z0-9\s]", " ", normalized)
    return " ".join(normalized.split())


ALIAS_TO_UNIT_KEY = {
    _normalize_alias(alias): unit_key
    for unit_key, aliases in UNIT_ALIASES.items()
    for alias in aliases
}


@dataclass
class ConversionResult:
    grams: Decimal | None
    source: str | None
    confidence: str | None
    note: str | None
    unit_key: str | None


def ensure_unit_conversion_schema(db: Session) -> None:
    db.execute(text("""
        ALTER TABLE recipe_ingredients
        ADD COLUMN IF NOT EXISTS miktar_gram NUMERIC(10, 2)
    """))
    db.execute(text("""
        ALTER TABLE recipe_ingredients
        ADD COLUMN IF NOT EXISTS donusum_kaynagi VARCHAR(100)
    """))
    db.execute(text("""
        ALTER TABLE recipe_ingredients
        ADD COLUMN IF NOT EXISTS donusum_guveni VARCHAR(20)
    """))
    db.execute(text("""
        ALTER TABLE recipe_ingredients
        ADD COLUMN IF NOT EXISTS donusum_notu TEXT
    """))
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS ingredient_unit_conversions (
            conversion_id SERIAL PRIMARY KEY,
            ingredient_id INTEGER REFERENCES ingredients(ingredient_id) ON DELETE CASCADE,
            unit_key VARCHAR(50) NOT NULL,
            unit_aliases TEXT,
            grams_per_unit NUMERIC(10, 2),
            ml_per_unit NUMERIC(10, 2),
            density_g_per_ml NUMERIC(10, 4),
            source VARCHAR(100),
            confidence VARCHAR(20),
            note TEXT
        )
    """))
    db.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_ingredient_unit_conversions_lookup
        ON ingredient_unit_conversions (ingredient_id, unit_key)
    """))
    db.commit()


def seed_default_unit_conversions(
    db: Session,
    cup_ml: Decimal | None = None,
    commit: bool = True,
    unit_profile: str = DEFAULT_UNIT_PROFILE,
) -> int:
    ensure_unit_conversion_schema(db)
    rows = _default_conversion_rows(cup_ml=cup_ml, unit_profile=unit_profile)
    inserted = 0
    for row in rows:
        ingredient_id = _find_ingredient_id(db, row["ingredient_names"]) if row.get("ingredient_names") else None
        exists = db.execute(
            text("""
                SELECT 1
                FROM ingredient_unit_conversions
                WHERE ingredient_id IS NOT DISTINCT FROM :ingredient_id
                  AND unit_key = :unit_key
                LIMIT 1
            """),
            {"ingredient_id": ingredient_id, "unit_key": row["unit_key"]},
        ).first()
        if exists:
            continue
        db.execute(
            text("""
                INSERT INTO ingredient_unit_conversions (
                    ingredient_id, unit_key, unit_aliases, grams_per_unit, ml_per_unit,
                    density_g_per_ml, source, confidence, note
                )
                VALUES (
                    :ingredient_id, :unit_key, :unit_aliases, :grams_per_unit, :ml_per_unit,
                    :density_g_per_ml, :source, :confidence, :note
                )
            """),
            {
                "ingredient_id": ingredient_id,
                "unit_key": row["unit_key"],
                "unit_aliases": ", ".join(UNIT_ALIASES.get(row["unit_key"], [])),
                "grams_per_unit": row.get("grams_per_unit"),
                "ml_per_unit": row.get("ml_per_unit"),
                "density_g_per_ml": row.get("density_g_per_ml"),
                "source": row.get("source", "default_seed"),
                "confidence": row.get("confidence", "medium"),
                "note": row.get("note"),
            },
        )
        inserted += 1
    if commit:
        db.commit()
    return inserted


def convert_recipe_ingredient_amount(
    db: Session,
    ingredient_id: int,
    ingredient_name: str,
    amount,
    unit: str | None,
    unit_profile: str = DEFAULT_UNIT_PROFILE,
) -> ConversionResult:
    amount_value = _decimal_or_none(amount)
    if amount_value is None or amount_value <= 0:
        return ConversionResult(None, None, None, "Miktar bos veya gecersiz.", None)

    unit_key = normalize_unit_key(unit)
    if not unit_key:
        return ConversionResult(None, None, "low", "Birim bos oldugu icin gram hesaplanamadi.", None)
    if unit_key in UNCERTAIN_UNITS:
        return ConversionResult(None, "unit_alias", "low", "Belirsiz olcu birimi.", unit_key)

    if unit_key == "gram":
        return ConversionResult(_round_grams(amount_value), "direct_unit", "high", "Gram birimi dogrudan kullanildi.", unit_key)
    if unit_key == "kilogram":
        return ConversionResult(_round_grams(amount_value * Decimal("1000")), "direct_unit", "high", "Kilogram 1000 ile carpildi.", unit_key)
    if unit_key == "liter":
        unit_key = "ml"
        amount_value *= Decimal("1000")

    specific = _fetch_conversion(db, ingredient_id, unit_key)
    if specific and specific.get("grams_per_unit") is not None:
        return ConversionResult(
            _round_grams(amount_value * Decimal(str(specific["grams_per_unit"]))),
            specific.get("source") or "ingredient_unit_conversions",
            specific.get("confidence") or "medium",
            specific.get("note") or "Malzemeye ozel grams_per_unit kullanildi.",
            unit_key,
        )

    ml_per_unit = Decimal("1") if unit_key == "ml" else _ml_for_unit(db, ingredient_id, unit_key, unit_profile)
    if ml_per_unit is None:
        return ConversionResult(None, "unit_alias", "low", "Hacim profili bulunamadi.", unit_key)

    density = _density_for_ingredient(db, ingredient_id, unit_key, ingredient_name)
    if density is not None:
        confidence = specific.get("confidence") if specific else "medium"
        return ConversionResult(
            _round_grams(amount_value * ml_per_unit * density),
            specific.get("source") if specific else "density_fallback",
            confidence or "medium",
            "ml_per_unit ve density_g_per_ml ile hesaplandi.",
            unit_key,
        )

    return ConversionResult(None, "fallback_missing_density", "low", "Malzemeye ozel gram veya density bulunamadi.", unit_key)


def normalize_unit_key(unit: str | None) -> str | None:
    normalized = _normalize_alias(unit or "")
    if not normalized:
        return None
    if normalized in ALIAS_TO_UNIT_KEY:
        return ALIAS_TO_UNIT_KEY[normalized]
    for alias, unit_key in ALIAS_TO_UNIT_KEY.items():
        if len(alias) <= 2:
            continue
        if re.search(rf"(^|\s){re.escape(alias)}($|\s)", normalized):
            return unit_key
    return None


def _fetch_conversion(db: Session, ingredient_id: int, unit_key: str) -> dict | None:
    row = db.execute(
        text("""
            SELECT grams_per_unit, ml_per_unit, density_g_per_ml, source, confidence, note
            FROM ingredient_unit_conversions
            WHERE ingredient_id = :ingredient_id
              AND unit_key = :unit_key
            ORDER BY conversion_id ASC
            LIMIT 1
        """),
        {"ingredient_id": ingredient_id, "unit_key": unit_key},
    ).mappings().first()
    return dict(row) if row else None


def _ml_for_unit(
    db: Session,
    ingredient_id: int,
    unit_key: str,
    unit_profile: str = DEFAULT_UNIT_PROFILE,
) -> Decimal | None:
    specific = _fetch_conversion(db, ingredient_id, unit_key)
    if specific and specific.get("ml_per_unit") is not None:
        return Decimal(str(specific["ml_per_unit"]))
    return _volume_profile(unit_profile).get(unit_key)


def _density_for_ingredient(db: Session, ingredient_id: int, unit_key: str, ingredient_name: str) -> Decimal | None:
    specific = _fetch_conversion(db, ingredient_id, unit_key)
    if specific and specific.get("density_g_per_ml") is not None:
        return Decimal(str(specific["density_g_per_ml"]))
    normalized_name = _normalize_alias(ingredient_name)
    if normalized_name in {_normalize_alias(item) for item in LIQUID_INGREDIENT_KEYS}:
        return Decimal("1")
    if normalized_name in {_normalize_alias(item) for item in OIL_INGREDIENT_KEYS}:
        return Decimal("0.91")
    return None


def _find_ingredient_id(db: Session, names: list[str]) -> int | None:
    normalized_targets = {_normalize_alias(name) for name in names}
    rows = db.execute(text("SELECT ingredient_id, ingredient_name FROM ingredients")).mappings().all()
    for row in rows:
        if _normalize_alias(row["ingredient_name"]) in normalized_targets:
            return row["ingredient_id"]
    return None


def _default_conversion_rows(
    cup_ml: Decimal | None = None,
    unit_profile: str = DEFAULT_UNIT_PROFILE,
) -> list[dict]:
    profile = dict(_volume_profile(unit_profile))
    if cup_ml is not None:
        profile["cup"] = Decimal(str(cup_ml))
    cup_value = profile["cup"]
    return [
        {"unit_key": "tablespoon", "ml_per_unit": profile["tablespoon"], "source": unit_profile, "confidence": "medium", "note": "Profil hacim degeri."},
        {"unit_key": "dessert_spoon", "ml_per_unit": profile["dessert_spoon"], "source": unit_profile, "confidence": "medium", "note": "Profil hacim degeri."},
        {"unit_key": "teaspoon", "ml_per_unit": profile["teaspoon"], "source": unit_profile, "confidence": "medium", "note": "Profil hacim degeri."},
        {"unit_key": "cup", "ml_per_unit": cup_value, "source": unit_profile, "confidence": "medium", "note": f"Config cup profile: {cup_value} ml."},
        {"unit_key": "tea_glass", "ml_per_unit": profile["tea_glass"], "source": unit_profile, "confidence": "medium", "note": "Profil hacim degeri."},
        *_ingredient_rows(["su"], {"tablespoon": profile["tablespoon"], "dessert_spoon": profile["dessert_spoon"], "teaspoon": profile["teaspoon"], "cup": cup_value}, "high", "Su icin 1 ml = 1 g."),
        *_ingredient_rows(["s\u00fct", "sut"], {"tablespoon": profile["tablespoon"], "dessert_spoon": profile["dessert_spoon"], "teaspoon": profile["teaspoon"], "cup": cup_value}, "medium", "Sut icin yaklasik 1 ml = 1 g."),
        *_ingredient_rows(["zeytinya\u011f\u0131", "zeytinyagi", "s\u0131v\u0131 ya\u011f", "sivi yag"], {"tablespoon": 13.5, "teaspoon": 4.5, "cup": 216}, "medium", "Yag yogunlugu yaklasik 0.91 g/ml."),
        *_ingredient_rows(["tereya\u011f\u0131", "tereyagi"], {"tablespoon": 14, "dessert_spoon": 5, "teaspoon": 5}, "medium", "Tereyagi yaklasik olcu degeri."),
        *_ingredient_rows(["un"], {"tablespoon": 9, "cup": 130}, "medium", "Un icin orta deger."),
        *_ingredient_rows(["toz \u015feker", "toz seker", "\u015feker", "seker"], {"tablespoon": 13, "cup": 200}, "medium", "Toz seker yaklasik deger."),
        *_ingredient_rows(["yo\u011furt", "yogurt"], {"tablespoon": 15, "cup": 230}, "medium", "Yogurt yaklasik deger."),
        *_ingredient_rows(["bal", "pekmez"], {"tablespoon": 20}, "medium", "Bal/pekmez yogun deger."),
        *_ingredient_rows(["pirin\u00e7", "pirinc"], {"cup": 190}, "medium", "Pirinc icin 180-200 g araligi orta deger."),
        *_ingredient_rows(["bulgur"], {"cup": 170}, "medium", "Bulgur icin 160-180 g araligi orta deger."),
        *_ingredient_rows(["yumurta"], {"piece": 50}, "medium", "Orta boy yumurta yaklasik deger."),
        *_ingredient_rows(["domates"], {"piece": 115}, "medium", "Orta boy domates yaklasik deger."),
        *_ingredient_rows(["so\u011fan", "sogan"], {"piece": 100}, "medium", "Orta boy sogan yaklasik deger."),
        *_ingredient_rows(["patates"], {"piece": 150}, "medium", "Orta boy patates yaklasik deger."),
        *_ingredient_rows(["tuz"], {"teaspoon": 6, "dessert_spoon": 6}, "medium", "Ince tuz icin yaklasik 5 ml degeri."),
        *_ingredient_rows(["karabiber"], {"teaspoon": 2.3, "dessert_spoon": 2.3}, "medium", "Toz karabiber icin yaklasik 5 ml degeri."),
    ]


def _ingredient_rows(names: list[str], unit_values: dict, confidence: str, note: str) -> list[dict]:
    return [
        {
            "ingredient_names": names,
            "unit_key": unit_key,
            "grams_per_unit": Decimal(str(value)),
            "source": "default_ingredient_seed",
            "confidence": confidence,
            "note": note,
        }
        for unit_key, value in unit_values.items()
    ]


def _volume_profile(unit_profile: str) -> dict[str, Decimal]:
    return UNIT_VOLUME_PROFILES.get(unit_profile, UNIT_VOLUME_PROFILES[DEFAULT_UNIT_PROFILE])


def _decimal_or_none(value) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except Exception:
        return None


def _round_grams(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
