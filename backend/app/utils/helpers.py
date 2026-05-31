from __future__ import annotations

import json
import os
import re
import unicodedata
from functools import lru_cache

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ALIASES_FILE = os.path.join(BASE_DIR, "aliases.json")
NORMALIZATION_DATA_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "data",
    "ingredient_normalization.json",
)

_ALIASES_CACHE: dict[str, str] | None = None


def _ascii_fold(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    normalized = normalized.replace("ı", "i").replace("İ", "i")
    return " ".join(normalized.lower().split())


@lru_cache(maxsize=1)
def _normalization_data() -> dict:
    try:
        with open(NORMALIZATION_DATA_FILE, "r", encoding="utf-8") as file:
            return json.load(file)
    except Exception:
        return {}


def _data_dict(key: str) -> dict:
    value = _normalization_data().get(key, {})
    return value if isinstance(value, dict) else {}


def _data_list(key: str) -> list:
    value = _normalization_data().get(key, [])
    return value if isinstance(value, list) else []


def get_aliases() -> dict[str, str]:
    global _ALIASES_CACHE
    if _ALIASES_CACHE is not None:
        return _ALIASES_CACHE

    aliases = {_ascii_fold(key): _ascii_fold(value) for key, value in _data_dict("aliases").items()}
    if os.path.exists(ALIASES_FILE):
        try:
            with open(ALIASES_FILE, "r", encoding="utf-8") as file:
                raw_aliases = json.load(file)
            aliases.update({_ascii_fold(key): _ascii_fold(value) for key, value in raw_aliases.items()})
        except Exception:
            pass

    _ALIASES_CACHE = aliases
    return aliases


def _display_name(canonical_key: str) -> str:
    return _data_dict("canonical_display").get(canonical_key, canonical_key)


def _clean_ingredient_text(name: str) -> str:
    text = _ascii_fold(name)
    text = text.replace("•", " ")
    text = re.sub(r"\([^)]*\)", " ", text)
    text = re.sub(r"[\[\]{};:|]", " ", text)
    text = re.sub(r"\b\d+[.,]?\d*(?:\s*[-/]\s*\d+[.,]?\d*)?\b", " ", text)
    text = re.sub(r"\b\d+[a-z]+\b", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _ingredient_tokens(text: str) -> list[str]:
    stop_words = set(_data_list("generic_stop_words"))
    return [
        token
        for token in re.split(r"[^a-z0-9]+", text)
        if token and token not in stop_words
    ]


def _match_meat_and_poultry(token_set: set[str]) -> str | None:
    if "tavuk" in token_set:
        if {"gogus", "gogsu"} & token_set:
            return "tavuk gogsu"
        if "baget" in token_set:
            return "tavuk baget"
        if "kanat" in token_set:
            return "tavuk kanat"
        if "pirzola" in token_set:
            return "tavuk pirzola"
        if {"but", "budu"} & token_set:
            return "tavuk but"
        if "kalca" in token_set:
            return "tavuk kalca"
        if "sosis" in token_set:
            return "tavuk sosis"
        if "suyu" in token_set:
            return "tavuk suyu"
        if "butun" in token_set:
            return "butun tavuk"
        return "tavuk eti"

    if "dana" in token_set or {"kiyma", "antrikot", "bonfile"} & token_set:
        if "kiyma" in token_set:
            return "dana kiyma"
        if "kusbasi" in token_set:
            return "kusbasi dana eti"
        if "salam" in token_set:
            return "dana salam"
        if "sosis" in token_set:
            return "dana sosis"
        if "sucuk" in token_set:
            return "dana sucuk"
        if "suyu" in token_set:
            return "et suyu"
        return "dana eti"

    if "kuzu" in token_set:
        if "kiyma" in token_set:
            return "kuzu kiyma"
        if "kusbasi" in token_set:
            return "kusbasi kuzu eti"
        if "incik" in token_set:
            return "kuzu incik"
        if "pirzola" in token_set:
            return "kuzu pirzola"
        return "kuzu eti"

    if "hindi" in token_set:
        if "fume" in token_set:
            return "hindi fume"
        if "salam" in token_set:
            return "hindi salam"
        if "sosis" in token_set:
            return "hindi sosis"
        return "hindi eti"

    if "kiyma" in token_set:
        return "dana kiyma"
    if "kusbasi" in token_set and "et" in token_set:
        return "kusbasi dana eti"
    if "et" in token_set:
        return "et suyu" if "suyu" in token_set else "dana eti"
    return None


def canonicalize_ingredient_name(name: str) -> str:
    if not name:
        return ""

    text = _clean_ingredient_text(name)
    aliases = get_aliases()
    if text in aliases:
        return _display_name(aliases[text])

    for source, target in _data_list("phrase_rules"):
        if source in text:
            return _display_name(target)

    tokens = _ingredient_tokens(text)
    compact_text = " ".join(tokens).strip()
    token_set = set(tokens)

    if compact_text in aliases:
        return _display_name(aliases[compact_text])

    for source, target in _data_list("phrase_rules"):
        if source in compact_text:
            return _display_name(target)

    meat_match = _match_meat_and_poultry(token_set)
    if meat_match:
        return _display_name(meat_match)

    for root, keywords in _data_list("root_keywords"):
        if token_set & set(keywords):
            return _display_name(root)

    return compact_text or text


def normalize_ingredient_name(name: str) -> str:
    return canonicalize_ingredient_name(name)


def infer_ingredient_category(ingredient_name: str) -> tuple[str, int]:
    category_ids = _data_dict("category_name_to_id")
    normalized = _ascii_fold(ingredient_name)
    tokens = set(normalized.split())

    def category(name: str) -> tuple[str, int]:
        return name, int(category_ids.get(name, category_ids.get("Diğer", 10)))

    if {"salam", "sosis", "sucuk", "fume", "jambon", "pastirma", "doner", "kavurma"} & tokens:
        return category("Şarküteri")
    if "tavuk" in tokens or "hindi" in tokens or normalized == "beyaz et":
        return category("Beyaz Et")
    if {"dana", "kuzu", "antrikot", "bonfile", "kiyma", "kusbasi", "ilik"} & tokens or normalized in {"et", "kirmizi et", "et suyu"}:
        return category("Kırmızı Et")
    if {"somon", "balik", "hamsi", "istavrit", "cipura", "levrek", "karides", "kalamar", "midye", "alabalik", "palamut", "mezgit", "uskumru", "sardalya"} & tokens or normalized == "ton baligi":
        return category("Balık ve Deniz Ürünleri")
    if {"ceviz", "findik", "badem", "antep", "fistik", "hindistan"} & tokens:
        return category("Çerezler")
    if "peynir" in tokens or "peyniri" in tokens or {"labne", "mozzarella", "parmesan", "hellim"} & tokens:
        return category("Peynirler")
    if {"sut", "yogurt", "kefir", "ayran", "krema", "tereyagi", "kaymak"} & tokens:
        return category("Süt Ürünleri")
    if {"mercimek", "nohut", "fasulye", "bakla", "barbunya", "borulce", "mas"} & tokens:
        return category("Bakliyatlar")
    if normalized in {"pirinc kremasi", "pirinç kreması"}:
        return category("Tahıllar ve Unlu Ürünler")
    if {"un", "bulgur", "pirinc", "pirinç", "makarna", "sehriye", "yufka", "ekmek", "irmik", "galeta", "bugday", "kadayif", "nisasta", "kuskus", "tortilla", "pide", "biskuvi", "yulaf", "milfoy", "hamuru", "lavas", "maya"} & tokens:
        return category("Tahıllar ve Unlu Ürünler")
    if normalized == "elma sirkesi":
        return category("Soslar ve Yağlar")
    if {"salca", "salcasi", "sos", "sirke", "eksi", "yag", "zeytinyagi", "aycicek", "hardal", "mayonez", "ketcap", "soya", "tahin", "pekmez", "bal", "misirozu"} & tokens:
        return category("Soslar ve Yağlar")
    if {"tuz", "karabiber", "kimyon", "kekik", "nane", "tarcin", "zerdecal", "zencefil", "mahlep", "sumak", "yenibahar", "karanfil", "susam", "biberiye", "kakao", "vanilya", "vanilin", "kori", "paprika", "kisnis", "chia"} & tokens or normalized in {"pul biber", "corek otu", "toz paprika"}:
        return category("Baharatlar")
    if {"domates", "salatalik", "biber", "patlican", "brokoli", "karnabahar", "kabak", "havuc", "patates", "sogan", "sarimsak", "ispanak", "pirasa", "bamya", "bezelye", "marul", "maydanoz", "dereotu", "roka", "enginar", "kereviz", "kuskonmaz", "lahana", "turp", "pancar", "misir", "mantar", "zeytin", "brugsel", "bruksel", "pazi", "semizotu", "kivircik"} & tokens or normalized == "karniyarik":
        return category("Sebzeler")
    if {"elma", "armut", "muz", "portakal", "mandalina", "limon", "greyfurt", "cilek", "kiraz", "visne", "erik", "kayisi", "seftali", "nektarin", "kavun", "karpuz", "uzum", "incir", "nar", "ayva", "kivi", "avokado", "ananas", "mango", "ahududu", "bogurtlen", "mersini", "dut", "narenciye"} & tokens or normalized == "yeni dunya":
        return category("Meyveler")

    return category("Diğer")
