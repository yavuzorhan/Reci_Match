"""
Malzeme adlarını normalize eden ve kategori çıkarımı yapan yardımcılar.
"""
from __future__ import annotations

import json
import os
import re
import unicodedata

from app.utils.recipe_translation import translate_text

ALIASES_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "aliases.json",
)

_ALIASES_CACHE: dict[str, str] | None = None


CATEGORY_NAME_TO_ID = {
    "Sebzeler": 1,
    "Meyveler": 2,
    "Balık ve Deniz Ürünleri": 4,
    "Süt Ürünleri": 5,
    "Bakliyatlar": 6,
    "Tahıllar ve Unlu Ürünler": 7,
    "Baharatlar": 8,
    "Soslar ve Yağlar": 9,
    "Diğer": 10,
    "Peynirler": 13,
    "Beyaz Et": 14,
    "Şarküteri": 15,
    "Kırmızı Et": 16,
    "Çerezler": 17,
}


DIRECT_ALIASES = {
    "elma sirkesi": "elma sirkesi",
    "pirinc kremasi": "pirinc kremasi",
    "pirinc unu": "pirinc unu",
    "yumurta sarisi": "yumurta",
    "yumurta beyazi": "yumurta",
    "yumurta aki": "yumurta",
    "cirpilmis yumurta": "yumurta",
    "haslanmis yumurta": "yumurta",
    "omlet": "yumurta",
    "soyulmus patlican": "patlican",
    "kozlenmis patlican": "patlican",
    "orta boy patlican": "patlican",
    "bostan patlicani": "patlican",
    "kuru sogan": "sogan",
    "mor sogan": "sogan",
    "taze sogan": "sogan",
    "arpacik sogan": "sogan",
    "orta boy kuru sogan": "sogan",
    "yemeklik dogranmis sogan": "sogan",
    "rendelenmis sogan": "sogan",
    "dogranmis sogan": "sogan",
    "yesil biber": "biber",
    "sivri biber": "biber",
    "kapya biber": "biber",
    "kirmizi biber": "biber",
    "carliston biber": "biber",
    "dolmalik biber": "biber",
    "orta boy domates": "domates",
    "dogranmis domates": "domates",
    "rendelenmis domates": "domates",
    "domates rendesi": "domates",
    "haslanmis patates": "patates",
    "orta boy patates": "patates",
    "bebek patates": "patates",
    "patates puresi": "patates",
    "dere otu": "dereotu",
    "buyukce salatalik": "salatalik",
    "cekirdekleri cikarilmis zeytin": "zeytin",
    "baklavalik yufka": "yufka",
    "bayat ekmek ici": "ekmek",
    "ekmek ici": "ekmek",
    "sicak su": "su",
    "kaynar su": "su",
    "icme suyu": "su",
    "limonun suyu": "limon suyu",
    "soganin suyu": "sogan",
    "taze cekilmis tane karabiber": "karabiber",
    "degirmen karabiber": "karabiber",
    "bitter cikolata": "cikolata",
    "dovulmus ceviz": "ceviz",
    "avuc iri kirilmis ceviz": "ceviz",
    "cekirdeksiz uzum": "uzum",
    "suzme yogurt": "suzme yogurt",
    "labne peyniri": "labne peyniri",
    "beyaz peynir": "beyaz peynir",
    "kasar peyniri": "kasar peyniri",
    "rendelenmis kasar peyniri": "kasar peyniri",
    "lor peyniri": "lor peyniri",
    "krem peynir": "krem peynir",
    "mozzarella peyniri": "mozzarella peyniri",
    "parmesan peyniri": "parmesan peyniri",
    "tulum peyniri": "tulum peyniri",
    "ezine peyniri": "ezine peyniri",
    "keci peyniri": "keci peyniri",
    "dil peyniri": "dil peyniri",
    "orgu peyniri": "orgu peyniri",
    "hellim peyniri": "hellim peyniri",
    "tam yagli sut": "sut",
    "yarim yagli sut": "sut",
    "laktozsuz sut": "sut",
    "sut kremasi": "krema",
    "cig krema": "krema",
    "cay kremasi": "krema",
    "yogurt": "yogurt",
    "kefir": "kefir",
    "ayran": "ayran",
    "kaymak": "kaymak",
    "tereyagi": "tereyagi",
    "kirmizi mercimek": "kirmizi mercimek",
    "yesil mercimek": "yesil mercimek",
    "sari mercimek": "sari mercimek",
    "kuru fasulye": "kuru fasulye",
    "barbunya fasulyesi": "barbunya",
    "kuru barbunya": "barbunya",
    "borulce": "borulce",
    "kuru borulce": "borulce",
    "mas fasulyesi": "mas fasulyesi",
    "sogan tozu": "sogan",
    "sarimsak tozu": "sarimsak",
    "orta yagli kiyma": "dana kiyma",
    "az yagli kiyma": "dana kiyma",
    "kiyma": "dana kiyma",
    "dana kusbasi eti": "kusbasi dana eti",
    "kusbasi dana eti": "kusbasi dana eti",
    "kusbasi et": "kusbasi dana eti",
    "et kusbasi": "kusbasi dana eti",
    "kusbasilik dana eti": "kusbasi dana eti",
    "sotelik dana eti": "dana eti",
    "dana kontrfile": "dana eti",
    "bonfile": "dana eti",
    "antrikot": "dana eti",
    "et": "dana eti",
    "kirmizi et": "dana eti",
    "kuzu kusbasi eti": "kusbasi kuzu eti",
    "koyun eti": "kuzu eti",
    "tavuk gogsu": "tavuk gogsu",
    "tavuk gogus": "tavuk gogsu",
    "tavuk gogus eti": "tavuk gogsu",
    "kusbasi tavuk gogsu": "tavuk gogsu",
    "fileto tavuk gogsu": "tavuk gogsu",
    "parcalanmis tavuk": "tavuk eti",
    "butun tavuk": "butun tavuk",
    "tavuk": "tavuk eti",
    "tavuk eti": "tavuk eti",
    "tavuk budu": "tavuk but",
    "kemiksiz but eti tavuk": "tavuk but",
    "kemiksiz but eti": "tavuk but",
    "hindi": "hindi eti",
    "hindi eti": "hindi eti",
    "et suyu tablet": "et suyu",
    "tavuk bulyon": "tavuk suyu",
    "et bulyon": "et suyu",
    "alabalik": "alabalik",
    "cipura": "cipura",
    "bruksel lahanasi": "bruksel lahanasi",
    "cikolata": "cikolata",
    "corek otu": "corek otu",
    "kornison tursu": "kornison tursu",
    "sivi yag": "sivi yag",
    "yas maya": "yas maya",
    "dut": "dut",
    "pazi": "pazi",
    "semiz otu": "semizotu",
    "semizotu": "semizotu",
    "kivircik": "kivircik",
    "yeni dunya": "yeni dunya",
    "narenciye": "narenciye",
    "palamut": "palamut",
    "mezgit": "mezgit",
    "uskumru": "uskumru",
    "sardalya": "sardalya",
    "milfoy hamuru": "milfoy hamuru",
    "lavas": "lavas",
    "misirozu yagi": "misirozu",
    "misirozu yagi": "misirozu",
    "misirözü yağı": "misirozu",
    "misirözü": "misirozu",
    "toz paprika": "toz paprika",
    "kavurma": "kavurma",
    "karniyarik": "karniyarik",
    "ketcap": "ketcap",
    "eggs": "yumurta",
    "egg": "yumurta",
    "egg whites": "yumurta",
    "whole eggs": "yumurta",
    "whole eggs and egg whites": "yumurta",
    "olive oil": "zeytinyagi",
    "rapeseed oil": "sivi yag",
    "cold pressed rapeseed oil": "sivi yag",
    "sunflower oil": "aycicek yagi",
    "soy sauce": "soya sosu",
    "honey": "bal",
    "clear honey": "bal",
    "tomatoes": "domates",
    "cherry tomatoes": "domates",
    "vine tomatoes": "domates",
    "plum tomatoes": "domates",
    "tomato puree": "domates salcasi",
    "baby spinach": "ispanak",
    "bag baby spinach": "ispanak",
    "bag spinach": "ispanak",
    "spinach": "ispanak",
    "garlic clove": "sarimsak",
    "garlic cloves": "sarimsak",
    "onion": "sogan",
    "red onion": "sogan",
    "spring onions": "taze sogan",
    "leeks": "pirasa",
    "mushrooms": "mantar",
    "closed cup mushrooms": "mantar",
    "chestnut mushrooms": "mantar",
    "porridge oats": "yulaf",
    "oats": "yulaf",
    "frozen peas": "bezelye",
    "black beans": "fasulye",
    "mixed bean salad": "fasulye",
    "butter beans": "fasulye",
    "cannellini beans": "fasulye",
    "chickpeas": "nohut",
    "avocado": "avokado",
    "banana": "muz",
    "orange": "portakal",
    "lime": "limon",
    "strawberries": "cilek",
    "blueberries": "yaban mersini",
    "raspberries": "ahududu",
    "cinnamon": "tarcin",
    "ground cinnamon": "tarcin",
    "turmeric": "zerdecal",
    "ground cumin": "kimyon",
    "cumin seeds": "kimyon",
    "coriander": "kisnis",
    "ground coriander": "kisnis",
    "smoked paprika": "toz paprika",
    "sweet smoked paprika": "toz paprika",
    "cheddar": "kasar peyniri",
    "feta": "beyaz peynir",
    "ricotta": "lor peyniri",
    "mozzarella": "mozzarella peyniri",
    "parsley": "maydanoz",
    "dill": "dereotu",
    "kale": "lahana",
    "tofu": "tofu",
    "brown rice": "pirinc",
    "long grain rice": "pirinc",
    "couscous": "kuskus",
    "cornflour": "nisasta",
    "milk": "sut",
    "skimmed milk": "sut",
    "soya milk": "sut",
    "almond milk": "sut",
    "unsweetened almond milk": "sut",
    "potatoes": "patates",
    "potato": "patates",
    "ham": "jambon",
    "bread": "ekmek",
    "rye bread": "ekmek",
    "wholemeal toast": "ekmek",
    "toast": "ekmek",
    "flatbread": "lavas",
    "tortilla wrap": "lavas",
    "wholemeal tortilla wrap": "lavas",
    "wholemeal tortilla wraps": "lavas",
    "harissa flatbread": "lavas",
    "leeks washed and": "pirasa",
    "vanilla extract": "vanilya",
    "chipotle paste": "aci sos",
    "dark chocolate": "cikolata",
    "chia seeds": "chia tohumu",
    "ginger": "zencefil",
    "bay leaves": "defne yapragi",
    "bay leaf": "defne yapragi",
    "capers": "kapari",
    "salmon": "somon",
    "chilli": "biber",
    "chillies": "biber",
    "pumpkin seeds": "kabak cekirdegi",
    "flaked almonds": "badem",
    "celery sticks": "kereviz",
    "carrots": "havuc",
    "broccoli": "brokoli",
    "balsamic vinegar": "sirke",
    "red wine vinegar": "sirke",
    "brown sugar": "esmer seker",
    "caster sugar": "toz seker",
    "golden caster sugar": "toz seker",
}


PHRASE_RULES = [
    ("pirinc kremasi", "pirinc kremasi"),
    ("kuru uzum", "kuru uzum"),
    ("domates salcasi", "domates salcasi"),
    ("biber salcasi", "biber salcasi"),
    ("nar eksisi", "nar eksisi"),
    ("limon suyu", "limon suyu"),
    ("portakal suyu", "portakal suyu"),
    ("soya sosu", "soya sosu"),
    ("elma sirkesi", "elma sirkesi"),
    ("uzum sirkesi", "sirke"),
    ("sirke", "sirke"),
    ("tavuk suyu", "tavuk suyu"),
    ("et suyu", "et suyu"),
    ("kemik suyu", "kemik suyu"),
    ("kabartma tozu", "kabartma tozu"),
    ("karbonat", "karbonat"),
    ("galeta unu", "galeta unu"),
    ("misir nisastasi", "misir nisastasi"),
    ("bugday nisastasi", "bugday nisastasi"),
    ("nisasta", "nisasta"),
    ("misir unu", "misir unu"),
    ("misirozu", "misirozu"),
    ("toz seker", "toz seker"),
    ("pudra sekeri", "pudra sekeri"),
    ("esmer seker", "esmer seker"),
    ("vanilin", "vanilin"),
    ("vanilya", "vanilya"),
    ("kakao", "kakao"),
    ("hindistan cevizi", "hindistan cevizi"),
    ("ceviz ici", "ceviz"),
    ("findik ici", "findik"),
    ("antep fistigi", "antep fistigi"),
    ("dolmalik fistik", "dolmalik fistik"),
    ("cam fistigi", "cam fistigi"),
    ("kus uzumu", "kus uzumu"),
    ("asma yapragi", "yaprak"),
    ("defne yapragi", "defne yapragi"),
    ("bal kabagi", "bal kabagi"),
    ("besamel sos", "besamel sos"),
    ("zeytinyagi", "zeytinyagi"),
    ("tereyagi", "tereyagi"),
    ("aycicek yagi", "aycicek yagi"),
    ("aci sos", "aci sos"),
    ("toz paprika", "toz paprika"),
    ("ketcap", "ketcap"),
    ("hardal", "hardal"),
    ("mayonez", "mayonez"),
    ("tahin", "tahin"),
    ("pekmez", "pekmez"),
]


GENERIC_STOP_WORDS = {
    "adet", "adetlik", "gram", "gr", "kg", "ml", "lt", "litre", "bardagi", "bardak", "kasigi",
    "kasik", "cay", "caybardagi", "yemek", "tatli", "su", "paket", "demet", "dal", "dis", "tane",
    "dilim", "fincan", "kase", "kup", "top", "boy", "orta", "buyuk", "kucuk", "yarim", "ceyrek",
    "tepeleme", "yaklasik", "kadar", "biraz", "az", "cok", "arzuya", "gore", "icin", "uzeri",
    "ekstra", "olarak", "ve", "veya", "ile", "da", "de", "bulamak", "kullanacagiz", "kullanabilir",
    "kullanabilirsiniz", "olur", "olabilir", "gerekirse", "robotta", "cekilmis", "temizlenmis",
    "ayiklanmis", "dogranmis", "rendelenmis", "ezilmis", "cirpilmis", "haslanmis", "soyulmus",
    "kizartmak", "konserve", "kisilik", "bir", "iki", "uc", "dort", "bes", "alti", "yedi", "sekiz",
    "dokuz", "on", "birkac", "bolca", "azicik", "sunum", "oluyor", "afiyet", "olsun", "harci",
    "malzeme", "malzemesi", "ici", "iciin", "ic", "uzerine", "bagli", "istege", "hazir", "pismemis",
    "sosu", "soslu", "tarifi", "tatlandirmak", "servis", "sunumluk",
    "plus", "drops", "drop", "finely", "roughly", "thinly", "thickly", "cut", "into", "wedges",
    "deseeded", "halved", "quartered", "washed", "dried", "picked", "warmed", "torn", "kept",
    "separate", "small", "medium", "large", "extra", "fat", "reduced", "mature", "wholemeal",
    "warmed", "thin", "strips", "pieces", "leaves", "leaf", "handful", "generous", "closed",
    "cup", "cups", "bag", "frozen", "cold", "pressed", "sweet", "smoked", "english", "mustard",
    "powder", "made", "up", "baby", "red", "yellow", "green", "white", "black", "brown",
    "golden", "boneless", "skinless", "fillets", "fillet", "breasts", "breast", "whole",
    "tsp", "tbsp",
}


ENGLISH_PHRASE_RULES = [
    ("olive oil", "zeytinyagi"),
    ("rapeseed oil", "sivi yag"),
    ("sunflower oil", "aycicek yagi"),
    ("soy sauce", "soya sosu"),
    ("tomato puree", "domates salcasi"),
    ("cherry tomatoes", "domates"),
    ("vine tomatoes", "domates"),
    ("plum tomatoes", "domates"),
    ("baby spinach", "ispanak"),
    ("bag spinach", "ispanak"),
    ("bag baby spinach", "ispanak"),
    ("garlic cloves", "sarimsak"),
    ("garlic clove", "sarimsak"),
    ("red onion", "sogan"),
    ("spring onions", "taze sogan"),
    ("closed cup mushrooms", "mantar"),
    ("chestnut mushrooms", "mantar"),
    ("porridge oats", "yulaf"),
    ("frozen peas", "bezelye"),
    ("black beans", "fasulye"),
    ("mixed bean salad", "fasulye"),
    ("butter beans", "fasulye"),
    ("cannellini beans", "fasulye"),
    ("whole eggs and egg whites", "yumurta"),
    ("egg whites", "yumurta"),
    ("whole eggs", "yumurta"),
    ("potatoes", "patates"),
    ("ham", "jambon"),
    ("rye bread", "ekmek"),
    ("bread", "ekmek"),
    ("flatbread", "lavas"),
    ("tortilla wrap", "lavas"),
    ("leeks washed and", "pirasa"),
    ("vanilla extract", "vanilya"),
    ("chipotle paste", "aci sos"),
    ("dark chocolate", "cikolata"),
    ("chia seeds", "chia tohumu"),
    ("ginger", "zencefil"),
    ("bay leaves", "defne yapragi"),
    ("capers", "kapari"),
    ("salmon", "somon"),
    ("chilli", "biber"),
    ("pumpkin seeds", "kabak cekirdegi"),
]


ROOT_KEYWORDS = [
    ("yumurta", {"yumurta", "omlet"}),
    ("patlican", {"patlican"}),
    ("patates", {"patates"}),
    ("domates", {"domates"}),
    ("sogan", {"sogan"}),
    ("sarimsak", {"sarimsak"}),
    ("biber", {"biber"}),
    ("pirinc", {"pirinc"}),
    ("pirasa", {"pirasa"}),
    ("salatalik", {"salatalik"}),
    ("kabak", {"kabak"}),
    ("ispanak", {"ispanak"}),
    ("mantar", {"mantar"}),
    ("fasulye", {"fasulye"}),
    ("havuc", {"havuc"}),
    ("brokoli", {"brokoli"}),
    ("bruksel lahanasi", {"bruksel", "lahanasi"}),
    ("karnabahar", {"karnabahar"}),
    ("bezelye", {"bezelye"}),
    ("bakla", {"bakla"}),
    ("barbunya", {"barbunya"}),
    ("borulce", {"borulce"}),
    ("pazi", {"pazi"}),
    ("semizotu", {"semizotu"}),
    ("kivircik", {"kivircik"}),
    ("bugday", {"bugday"}),
    ("bulgur", {"bulgur"}),
    ("yufka", {"yufka"}),
    ("zeytin", {"zeytin"}),
    ("uzum", {"uzum"}),
    ("su", {"su"}),
    ("krema", {"krema"}),
    ("ceviz", {"ceviz"}),
    ("findik", {"findik"}),
    ("badem", {"badem"}),
    ("antep fistigi", {"antep", "fistik", "fistigi"}),
    ("hindistan cevizi", {"hindistan", "cevizi"}),
    ("maydanoz", {"maydanoz"}),
    ("dereotu", {"dereotu"}),
    ("yogurt", {"yogurt"}),
    ("sut", {"sut"}),
    ("un", {"un"}),
    ("elma", {"elma"}),
    ("armut", {"armut"}),
    ("muz", {"muz"}),
    ("portakal", {"portakal"}),
    ("mandalina", {"mandalina"}),
    ("limon", {"limon"}),
    ("greyfurt", {"greyfurt"}),
    ("cilek", {"cilek"}),
    ("kiraz", {"kiraz"}),
    ("visne", {"visne"}),
    ("erik", {"erik"}),
    ("kayisi", {"kayisi"}),
    ("seftali", {"seftali"}),
    ("nektarin", {"nektarin"}),
    ("kavun", {"kavun"}),
    ("karpuz", {"karpuz"}),
    ("incir", {"incir"}),
    ("nar", {"nar"}),
    ("ayva", {"ayva"}),
    ("kivi", {"kivi"}),
    ("avokado", {"avokado"}),
    ("ananas", {"ananas"}),
    ("mango", {"mango"}),
    ("dut", {"dut"}),
    ("yeni dunya", {"yeni", "dunya"}),
    ("narenciye", {"narenciye"}),
    ("ahududu", {"ahududu"}),
    ("bogurtlen", {"bogurtlen"}),
    ("yaban mersini", {"yaban", "mersini"}),
    ("kefir", {"kefir"}),
    ("ayran", {"ayran"}),
    ("kaymak", {"kaymak"}),
    ("suzme yogurt", {"suzme", "yogurt"}),
    ("beyaz peynir", {"beyaz", "peynir"}),
    ("kasar peyniri", {"kasar", "peyniri"}),
    ("lor peyniri", {"lor", "peyniri"}),
    ("labne peyniri", {"labne", "peyniri"}),
    ("mozzarella peyniri", {"mozzarella"}),
    ("parmesan peyniri", {"parmesan"}),
    ("tulum peyniri", {"tulum", "peyniri"}),
    ("ezine peyniri", {"ezine", "peyniri"}),
    ("keci peyniri", {"keci", "peyniri"}),
    ("dil peyniri", {"dil", "peyniri"}),
    ("orgu peyniri", {"orgu", "peyniri"}),
    ("hellim peyniri", {"hellim"}),
    ("kirmizi mercimek", {"kirmizi", "mercimek"}),
    ("yesil mercimek", {"yesil", "mercimek"}),
    ("sari mercimek", {"sari", "mercimek"}),
    ("nohut", {"nohut"}),
    ("kuru fasulye", {"kuru", "fasulye"}),
    ("mas fasulyesi", {"mas", "fasulyesi"}),
    ("palamut", {"palamut"}),
    ("mezgit", {"mezgit"}),
    ("uskumru", {"uskumru"}),
    ("sardalya", {"sardalya"}),
    ("milfoy hamuru", {"milfoy", "hamuru"}),
    ("lavas", {"lavas"}),
]


CANONICAL_DISPLAY = {
    "aci sos": "acı sos",
    "ahududu": "ahududu",
    "alabalik": "alabalık",
    "ananas": "ananas",
    "antep fistigi": "antep fıstığı",
    "arpa sehriye": "arpa şehriye",
    "armut": "armut",
    "avokado": "avokado",
    "aycicek yagi": "ayçiçek yağı",
    "ayran": "ayran",
    "ayva": "ayva",
    "badem": "badem",
    "bakla": "bakla",
    "bal kabagi": "bal kabağı",
    "barbunya": "barbunya",
    "besamel sos": "beşamel sos",
    "beyaz peynir": "beyaz peynir",
    "biber": "biber",
    "biber salcasi": "biber salçası",
    "bogurtlen": "böğürtlen",
    "borulce": "börülce",
    "brokoli": "brokoli",
    "bruksel lahanasi": "brüksel lahanası",
    "bugday": "buğday",
    "bugday nisastasi": "buğday nişastası",
    "bulgur": "bulgur",
    "butun tavuk": "bütün tavuk",
    "cam fistigi": "çam fıstığı",
    "ceviz": "ceviz",
    "cikolata": "çikolata",
    "cipura": "çipura",
    "cilek": "çilek",
    "corek otu": "çörek otu",
    "defne yapragi": "defne yaprağı",
    "dereotu": "dereotu",
    "dana eti": "dana eti",
    "dana kiyma": "dana kıyma",
    "dana salam": "dana salam",
    "dana sosis": "dana sosis",
    "dana sucuk": "dana sucuk",
    "dil peyniri": "dil peyniri",
    "dolmalik fistik": "dolmalık fıstık",
    "domates": "domates",
    "domates salcasi": "domates salçası",
    "dut": "dut",
    "ekmek": "ekmek",
    "elma": "elma",
    "elma sirkesi": "elma sirkesi",
    "erik": "erik",
    "esmer seker": "esmer şeker",
    "et suyu": "et suyu",
    "ezine peyniri": "ezine peyniri",
    "fasulye": "fasulye",
    "findik": "fındık",
    "galeta unu": "galeta unu",
    "greyfurt": "greyfurt",
    "hamsi": "hamsi",
    "hardal": "hardal",
    "havuc": "havuç",
    "hellim peyniri": "hellim peyniri",
    "hindi eti": "hindi eti",
    "hindi fume": "hindi füme",
    "hindi salam": "hindi salam",
    "hindi sosis": "hindi sosis",
    "hindistan cevizi": "hindistan cevizi",
    "ispanak": "ıspanak",
    "kabak": "kabak",
    "kabartma tozu": "kabartma tozu",
    "kakao": "kakao",
    "karbonat": "karbonat",
    "karniyarik": "karnıyarık",
    "karnabahar": "karnabahar",
    "kasar peyniri": "kaşar peyniri",
    "kavun": "kavun",
    "kavurma": "kavurma",
    "kayisi": "kayısı",
    "kaymak": "kaymak",
    "keci peyniri": "keçi peyniri",
    "kefir": "kefir",
    "kemik suyu": "kemik suyu",
    "ketcap": "ketçap",
    "kirmizi mercimek": "kırmızı mercimek",
    "kiraz": "kiraz",
    "kivircik": "kıvırcık",
    "kivi": "kivi",
    "kornison tursu": "kornişon turşu",
    "krema": "krema",
    "kuru fasulye": "kuru fasulye",
    "kus uzumu": "kuş üzümü",
    "kusbasi dana eti": "kuşbaşı dana eti",
    "kusbasi kuzu eti": "kuşbaşı kuzu eti",
    "kuzu eti": "kuzu eti",
    "kuzu incik": "kuzu incik",
    "kuzu kiyma": "kuzu kıyma",
    "kuzu pirzola": "kuzu pirzola",
    "labne peyniri": "labne peyniri",
    "lavas": "lavaş",
    "limon": "limon",
    "limon suyu": "limon suyu",
    "lor peyniri": "lor peyniri",
    "mandalina": "mandalina",
    "mango": "mango",
    "mantar": "mantar",
    "mas fasulyesi": "maş fasulyesi",
    "maydanoz": "maydanoz",
    "mayonez": "mayonez",
    "mezgit": "mezgit",
    "milfoy hamuru": "milföy hamuru",
    "misir nisastasi": "mısır nişastası",
    "misir unu": "mısır unu",
    "misirozu": "mısırözü",
    "mozzarella peyniri": "mozzarella peyniri",
    "muz": "muz",
    "nar": "nar",
    "nar eksisi": "nar ekşisi",
    "narenciye": "narenciye",
    "nektarin": "nektarin",
    "nisasta": "nişasta",
    "nohut": "nohut",
    "orgu peyniri": "örgü peyniri",
    "palamut": "palamut",
    "parmesan peyniri": "parmesan peyniri",
    "patates": "patates",
    "patlican": "patlıcan",
    "pazi": "pazı",
    "pekmez": "pekmez",
    "pirasa": "pırasa",
    "pirinc": "pirinç",
    "pirinc kremasi": "pirinç kreması",
    "pirinc unu": "pirinç unu",
    "portakal": "portakal",
    "portakal suyu": "portakal suyu",
    "pudra sekeri": "pudra şekeri",
    "salatalik": "salatalık",
    "sardalya": "sardalya",
    "sari mercimek": "sarı mercimek",
    "sarimsak": "sarımsak",
    "seftali": "şeftali",
    "semizotu": "semizotu",
    "sirke": "sirke",
    "sivi yag": "sıvı yağ",
    "sogan": "soğan",
    "soya sosu": "soya sosu",
    "su": "su",
    "susam": "susam",
    "sut": "süt",
    "suzme yogurt": "süzme yoğurt",
    "tahin": "tahin",
    "tarcin": "tarçın",
    "tavuk baget": "tavuk baget",
    "tavuk but": "tavuk but",
    "tavuk eti": "tavuk eti",
    "tavuk gogsu": "tavuk göğsü",
    "tavuk kalca": "tavuk kalça",
    "tavuk kanat": "tavuk kanat",
    "tavuk pirzola": "tavuk pirzola",
    "tavuk sosis": "tavuk sosis",
    "tavuk suyu": "tavuk suyu",
    "tereyagi": "tereyağı",
    "toz paprika": "toz paprika",
    "toz seker": "toz şeker",
    "tulum peyniri": "tulum peyniri",
    "un": "un",
    "uskumru": "uskumru",
    "uzum": "üzüm",
    "vanilin": "vanilin",
    "vanilya": "vanilya",
    "visne": "vişne",
    "yaban mersini": "yaban mersini",
    "yaprak": "yaprak",
    "yas maya": "yaş maya",
    "yeni dunya": "yeni dünya",
    "yesil mercimek": "yeşil mercimek",
    "yogurt": "yoğurt",
    "yufka": "yufka",
    "yumurta": "yumurta",
    "zeytin": "zeytin",
    "zeytinyagi": "zeytinyağı",
    "taze sogan": "taze soğan",
    "jambon": "jambon",
    "kisnis": "kişniş",
    "zerdecal": "zerdeçal",
    "lahana": "lahana",
    "tofu": "tofu",
    "somon": "somon",
    "kapari": "kapari",
    "chia tohumu": "chia tohumu",
    "kabak cekirdegi": "kabak çekirdeği",
}


def _ascii_fold(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    normalized = normalized.replace("ı", "i").replace("İ", "i")
    return " ".join(normalized.lower().split())


def get_aliases() -> dict[str, str]:
    global _ALIASES_CACHE
    if _ALIASES_CACHE is not None:
        return _ALIASES_CACHE

    aliases: dict[str, str] = {}
    if os.path.exists(ALIASES_FILE):
        try:
            with open(ALIASES_FILE, "r", encoding="utf-8") as file:
                raw_aliases = json.load(file)
            aliases = {_ascii_fold(key): _ascii_fold(value) for key, value in raw_aliases.items()}
        except Exception:
            aliases = {}

    aliases.update(DIRECT_ALIASES)
    _ALIASES_CACHE = aliases
    return aliases


def _display_name(canonical_key: str) -> str:
    return CANONICAL_DISPLAY.get(canonical_key, canonical_key)


def _canonicalize_english_ingredient_name(name: str) -> str:
    text = _ascii_fold(name)
    text = re.sub(r"\([^)]*\)", " ", text)
    text = re.sub(r"[\[\]{};:|]", " ", text)
    text = re.sub(r"\b\d+[.,]?\d*(?:\s*[-/]\s*\d+[.,]?\d*)?\b", " ", text)
    text = re.sub(r"\b\d+[a-z]+\b", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    aliases = get_aliases()
    if text in aliases:
        return _display_name(aliases[text])

    for source, target in ENGLISH_PHRASE_RULES:
        if source in text:
            return _display_name(target)

    tokens = [
        token
        for token in re.split(r"[^a-z0-9]+", text)
        if token and token not in GENERIC_STOP_WORDS
    ]
    compact_text = " ".join(tokens).strip()
    token_set = set(tokens)

    if compact_text in aliases:
        return _display_name(aliases[compact_text])

    if {"egg", "eggs"} & token_set:
        return _display_name("yumurta")
    if {"tomato", "tomatoes"} & token_set:
        return _display_name("domates")
    if {"spinach"} & token_set:
        return _display_name("ispanak")
    if {"garlic", "clove", "cloves"} <= token_set or "garlic" in token_set:
        return _display_name("sarimsak")
    if {"onion", "onions"} & token_set:
        if "spring" in token_set:
            return _display_name("taze sogan")
        if "leek" in token_set or "leeks" in token_set:
            return _display_name("pirasa")
        return _display_name("sogan")
    if {"mushroom", "mushrooms"} & token_set:
        return _display_name("mantar")
    if {"oat", "oats"} & token_set:
        return _display_name("yulaf")
    if {"pepper", "peppers"} & token_set:
        return _display_name("biber")
    if {"avocado", "avocados"} & token_set:
        return _display_name("avokado")
    if {"banana", "bananas"} & token_set:
        return _display_name("muz")
    if {"orange", "oranges"} & token_set:
        return _display_name("portakal")
    if {"lime", "limes"} & token_set:
        return _display_name("limon")
    if {"strawberry", "strawberries"} & token_set:
        return _display_name("cilek")
    if {"blueberry", "blueberries"} & token_set:
        return _display_name("yaban mersini")
    if {"raspberry", "raspberries"} & token_set:
        return _display_name("ahududu")
    if {"parsley"} & token_set:
        return _display_name("maydanoz")
    if {"dill"} & token_set:
        return _display_name("dereotu")
    if {"cinnamon"} & token_set:
        return _display_name("tarcin")
    if {"turmeric"} & token_set:
        return _display_name("zerdecal")
    if {"cumin"} & token_set:
        return _display_name("kimyon")
    if {"coriander"} & token_set:
        return _display_name("kisnis")
    if {"paprika"} & token_set:
        return _display_name("toz paprika")
    if {"cheddar"} & token_set:
        return _display_name("kasar peyniri")
    if {"ricotta"} & token_set:
        return _display_name("lor peyniri")
    if {"feta"} & token_set:
        return _display_name("beyaz peynir")
    if {"mozzarella"} & token_set:
        return _display_name("mozzarella peyniri")
    if {"yogurt", "yoghurt"} & token_set:
        return _display_name("yogurt")
    if {"milk"} & token_set:
        return _display_name("sut")
    if {"oil"} & token_set:
        return _display_name("sivi yag")
    if {"bean", "beans"} & token_set:
        return _display_name("fasulye")
    if {"pea", "peas"} & token_set:
        return _display_name("bezelye")
    if {"chickpea", "chickpeas"} & token_set:
        return _display_name("nohut")
    if {"rice"} & token_set:
        return _display_name("pirinc")
    if {"chicken"} & token_set:
        if {"breast", "breasts"} & token_set:
            return _display_name("tavuk gogsu")
        return _display_name("tavuk eti")

    translated = translate_text(name)
    if translated and _ascii_fold(translated) != _ascii_fold(name):
        return canonicalize_ingredient_name(translated)

    return compact_text or text


def canonicalize_ingredient_name(name: str) -> str:
    if not name:
        return ""

    text = _ascii_fold(name)
    text = text.replace("•", " ")
    text = re.sub(r"\([^)]*\)", " ", text)
    text = re.sub(r"[\[\]{};:|]", " ", text)
    text = re.sub(r"\b\d+[.,]?\d*(?:\s*[-/]\s*\d+[.,]?\d*)?\b", " ", text)
    text = re.sub(r"\b\d+[a-z]+\b", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    if re.search(r"\b[a-z]{3,}\b", text):
        english_candidate = _canonicalize_english_ingredient_name(name)
        if english_candidate and _ascii_fold(english_candidate) != text:
            return english_candidate

    aliases = get_aliases()
    if text in aliases:
        return _display_name(aliases[text])

    for source, target in PHRASE_RULES:
        if source in text:
            return _display_name(target)

    tokens = [
        token
        for token in re.split(r"[^a-z0-9]+", text)
        if token and token not in GENERIC_STOP_WORDS
    ]
    compact_text = " ".join(tokens).strip()
    token_set = set(tokens)

    if compact_text in aliases:
        return _display_name(aliases[compact_text])

    for source, target in PHRASE_RULES:
        if source in compact_text:
            return _display_name(target)

    if "tavuk" in token_set:
        if {"gogus", "gogsu"} & token_set:
            return _display_name("tavuk gogsu")
        if "baget" in token_set:
            return _display_name("tavuk baget")
        if "kanat" in token_set:
            return _display_name("tavuk kanat")
        if "pirzola" in token_set:
            return _display_name("tavuk pirzola")
        if {"but", "budu"} & token_set:
            return _display_name("tavuk but")
        if "kalca" in token_set:
            return _display_name("tavuk kalca")
        if "sosis" in token_set:
            return _display_name("tavuk sosis")
        if "suyu" in token_set:
            return _display_name("tavuk suyu")
        if "butun" in token_set:
            return _display_name("butun tavuk")
        return _display_name("tavuk eti")

    if "dana" in token_set or {"kiyma", "antrikot", "bonfile"} & token_set:
        if "kiyma" in token_set:
            return _display_name("dana kiyma")
        if "kusbasi" in token_set:
            return _display_name("kusbasi dana eti")
        if "salam" in token_set:
            return _display_name("dana salam")
        if "sosis" in token_set:
            return _display_name("dana sosis")
        if "sucuk" in token_set:
            return _display_name("dana sucuk")
        if "suyu" in token_set:
            return _display_name("et suyu")
        return _display_name("dana eti")

    if "kuzu" in token_set:
        if "kiyma" in token_set:
            return _display_name("kuzu kiyma")
        if "kusbasi" in token_set:
            return _display_name("kusbasi kuzu eti")
        if "incik" in token_set:
            return _display_name("kuzu incik")
        if "pirzola" in token_set:
            return _display_name("kuzu pirzola")
        return _display_name("kuzu eti")

    if "hindi" in token_set:
        if "fume" in token_set:
            return _display_name("hindi fume")
        if "salam" in token_set:
            return _display_name("hindi salam")
        if "sosis" in token_set:
            return _display_name("hindi sosis")
        return _display_name("hindi eti")

    if "kiyma" in token_set:
        return _display_name("dana kiyma")
    if "kusbasi" in token_set and "et" in token_set:
        return _display_name("kusbasi dana eti")
    if "et" in token_set:
        if "suyu" in token_set:
            return _display_name("et suyu")
        return _display_name("dana eti")

    for root, keywords in ROOT_KEYWORDS:
        if token_set & keywords:
            return _display_name(root)

    return compact_text or text


def normalize_ingredient_name(name: str) -> str:
    return canonicalize_ingredient_name(name)


def infer_ingredient_category(ingredient_name: str) -> tuple[str, int]:
    normalized = _ascii_fold(ingredient_name)
    tokens = set(normalized.split())

    if {"salam", "sosis", "sucuk", "fume", "jambon", "pastirma", "doner", "kavurma"} & tokens:
        return "Şarküteri", CATEGORY_NAME_TO_ID["Şarküteri"]

    if "tavuk" in tokens or "hindi" in tokens or normalized == "beyaz et":
        return "Beyaz Et", CATEGORY_NAME_TO_ID["Beyaz Et"]

    if (
        {"dana", "kuzu", "antrikot", "bonfile", "kiyma", "kusbasi", "ilik"} & tokens
        or normalized in {"et", "kirmizi et", "et suyu"}
    ):
        return "Kırmızı Et", CATEGORY_NAME_TO_ID["Kırmızı Et"]

    if {"somon", "balik", "hamsi", "istavrit", "cipura", "levrek", "karides", "kalamar", "midye", "alabalik", "palamut", "mezgit", "uskumru", "sardalya"} & tokens or normalized == "ton baligi":
        return "Balık ve Deniz Ürünleri", CATEGORY_NAME_TO_ID["Balık ve Deniz Ürünleri"]

    if {"ceviz", "findik", "badem", "antep", "fistik", "hindistan"} & tokens:
        return "Çerezler", CATEGORY_NAME_TO_ID["Çerezler"]

    if "peynir" in tokens or "peyniri" in tokens or {"labne", "mozzarella", "parmesan", "hellim"} & tokens:
        return "Peynirler", CATEGORY_NAME_TO_ID["Peynirler"]

    if {"sut", "yogurt", "kefir", "ayran", "krema", "tereyagi", "kaymak"} & tokens:
        return "Süt Ürünleri", CATEGORY_NAME_TO_ID["Süt Ürünleri"]

    if {"mercimek", "nohut", "fasulye", "bakla", "barbunya", "borulce", "mas"} & tokens:
        return "Bakliyatlar", CATEGORY_NAME_TO_ID["Bakliyatlar"]

    if normalized in {"pirinc kremasi", "pirinç kreması"}:
        return "Tahıllar ve Unlu Ürünler", CATEGORY_NAME_TO_ID["Tahıllar ve Unlu Ürünler"]

    if {"un", "bulgur", "pirinc", "pirinç", "makarna", "sehriye", "yufka", "ekmek", "irmik", "galeta", "bugday", "kadayif", "nisasta", "kuskus", "tortilla", "pide", "biskuvi", "yulaf", "milfoy", "hamuru", "lavas", "maya"} & tokens:
        return "Tahıllar ve Unlu Ürünler", CATEGORY_NAME_TO_ID["Tahıllar ve Unlu Ürünler"]

    if normalized == "elma sirkesi":
        return "Soslar ve Yağlar", CATEGORY_NAME_TO_ID["Soslar ve Yağlar"]

    if {"salca", "sos", "sirke", "eksi", "yag", "zeytinyagi", "aycicek", "hardal", "mayonez", "ketcap", "soya", "tahin", "pekmez", "bal", "misirozu"} & tokens:
        return "Soslar ve Yağlar", CATEGORY_NAME_TO_ID["Soslar ve Yağlar"]

    if {"tuz", "karabiber", "kimyon", "kekik", "nane", "tarcin", "zerdecal", "zencefil", "mahlep", "sumak", "yenibahar", "karanfil", "susam", "biberiye", "kakao", "vanilya", "vanilin", "kori", "paprika", "kisnis", "chia"} & tokens or normalized in {"pul biber", "corek otu", "toz paprika"}:
        return "Baharatlar", CATEGORY_NAME_TO_ID["Baharatlar"]

    if {"domates", "salatalik", "biber", "patlican", "brokoli", "karnabahar", "kabak", "havuc", "patates", "sogan", "sarimsak", "ispanak", "pirasa", "bamya", "bezelye", "marul", "maydanoz", "dereotu", "roka", "enginar", "kereviz", "kuskonmaz", "lahana", "turp", "pancar", "misir", "mantar", "zeytin", "brugsel", "bruksel", "pazi", "semizotu", "kivircik"} & tokens or normalized == "karniyarik":
        return "Sebzeler", CATEGORY_NAME_TO_ID["Sebzeler"]

    if {"elma", "armut", "muz", "portakal", "mandalina", "limon", "greyfurt", "cilek", "kiraz", "visne", "erik", "kayisi", "seftali", "nektarin", "kavun", "karpuz", "uzum", "incir", "nar", "ayva", "kivi", "avokado", "ananas", "mango", "ahududu", "bogurtlen", "mersini", "dut", "narenciye"} & tokens or normalized == "yeni dunya":
        return "Meyveler", CATEGORY_NAME_TO_ID["Meyveler"]

    return "Diğer", CATEGORY_NAME_TO_ID["Diğer"]
