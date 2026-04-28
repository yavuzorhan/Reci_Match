import re
import unicodedata
from dataclasses import dataclass
from html import unescape
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


COLLECTION_URLS = {
    "Kahvaltı": [
        "https://www.eatingwell.com/breakfast-recipes-with-20-grams-of-protein-11847063",
        "https://www.eatingwell.com/high-protein-high-fiber-breakfast-recipes-to-start-your-day-11808266",
        "https://www.eatingwell.com/400-calorie-breakfast-recipes-that-arent-toast-11955087",
        "https://www.eatingwell.com/no-sugar-added-breakfast-recipes-for-better-blood-sugar-11955438",
    ],
    "Ana Yemek": [
        "https://www.eatingwell.com/low-carb-dinners-high-protein-11952766",
        "https://www.eatingwell.com/easy-weight-loss-chicken-dinner-recipes-11951840",
        "https://www.eatingwell.com/gallery/7944739/low-carb-dinner-recipes-in-30-minutes/",
        "https://www.eatingwell.com/gallery/7953647/low-carb-low-cholesterol-dinner-recipes/",
    ],
    "Tatlı": [
        "https://www.eatingwell.com/healthy-dessert-recipes/",
    ],
    "Ara Öğün": [
        "https://www.eatingwell.com/high-protein-snack-recipes-for-better-metabolism-11952306",
    ],
}


@dataclass
class HealthEvaluation:
    labels: list[str]
    accepted: bool


class EatingWellScraper:
    def __init__(self):
        self.base_url = "https://www.eatingwell.com"
        self.timeout = 25
        self.session = requests.Session()
        self.session.trust_env = False
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
            "Referer": self.base_url,
        }

    def collect_recipe_links(self, collection_urls: list[str], delay_seconds: float = 0.25) -> list[str]:
        links: list[str] = []
        seen: set[str] = set()

        for collection_url in collection_urls:
            soup = self._get_soup(collection_url)
            for link in self._extract_recipe_links_from_collection(soup):
                if link in seen:
                    continue
                seen.add(link)
                links.append(link)
            self._sleep(delay_seconds)

        return links

    def parse_recipe_detail(self, recipe_url: str, forced_category: str | None = None) -> dict | None:
        soup = self._get_soup(recipe_url)
        title = self._clean_text(self._first_heading(soup) or "")
        if not title:
            return None

        description = self._clean_text(self._meta_content(soup, "name", "description"))
        total_time = self._parse_time(self._line_after(soup, "Total Time:"))
        active_time = self._parse_time(self._line_after(soup, "Active Time:"))
        serving = self._parse_servings(self._line_after(soup, "Servings:"))
        nutrition_profile = self._extract_nutrition_profile(soup)
        ingredients = self._extract_ingredients(soup)
        instructions = self._extract_instructions(soup)
        nutrition_text = self._extract_nutrition_text(soup)
        image_url = self._extract_image_url(soup)

        if not total_time:
            total_time = active_time

        calorie = self._parse_metric(nutrition_text, "Calories")
        protein = self._parse_metric(nutrition_text, "Protein")
        carbohydrate = self._parse_metric(nutrition_text, "Carbohydrates")
        fat = self._parse_metric(nutrition_text, "Fat")

        recipe_category = forced_category or self._infer_recipe_category(recipe_url, title, nutrition_profile)
        health = self._evaluate_health(recipe_category, nutrition_profile, calorie, protein, carbohydrate)
        if not health.accepted:
            return None

        if not all([serving, total_time, image_url, ingredients, instructions]):
            return None
        if any(value is None for value in [calorie, protein, carbohydrate, fat]):
            return None

        return {
            "title": title,
            "description": self._compose_description(description, health.labels),
            "category": ", ".join(nutrition_profile) if nutrition_profile else None,
            "recipe_category": recipe_category,
            "cooking_type": self._infer_cooking_type(title, instructions),
            "cooking_method": self._infer_cooking_method(title, instructions),
            "total_time_minutes": total_time,
            "serving": serving,
            "calorie": calorie,
            "protein": protein,
            "carbohydrate": carbohydrate,
            "fat": fat,
            "ingredients": ingredients,
            "instructions": instructions,
            "image_url": image_url,
            "source_url": recipe_url,
            "source": "eatingwell",
        }

    def _get_soup(self, url: str) -> BeautifulSoup:
        response = self.session.get(url, headers=self.headers, timeout=self.timeout)
        if response.status_code == 402:
            raise RuntimeError(
                "EatingWell isteği engellendi (HTTP 402). Bu ortamda site bot/erişim koruması uyguluyor."
            )
        response.raise_for_status()
        return BeautifulSoup(response.text, "html.parser")

    def _extract_recipe_links_from_collection(self, soup: BeautifulSoup) -> list[str]:
        links: list[str] = []
        seen: set[str] = set()

        for anchor in soup.find_all("a", href=True):
            href = anchor.get("href")
            text = self._clean_text(anchor.get_text(" ", strip=True))
            if text != "View Recipe":
                continue
            absolute = urljoin(self.base_url, href)
            if absolute in seen or not self._is_recipe_url(absolute):
                continue
            seen.add(absolute)
            links.append(absolute)
        return links

    def _extract_ingredients(self, soup: BeautifulSoup) -> list[dict]:
        marker = soup.find(lambda tag: tag.name in {"h2", "h3"} and "ingredients" in self._ascii_fold(tag.get_text(" ", strip=True)))
        if not marker:
            return []

        ingredients: list[dict] = []
        for sibling in marker.find_all_next():
            if sibling == marker:
                continue
            if sibling.name in {"h2", "h3"} and sibling is not marker:
                break
            if sibling.name == "li":
                line = self._clean_text(sibling.get_text(" ", strip=True))
                if not line:
                    continue
                if "oops! something went wrong" in self._ascii_fold(line):
                    continue
                ingredients.append(self._parse_ingredient_line(line))
        return ingredients

    def _extract_instructions(self, soup: BeautifulSoup) -> str:
        marker = soup.find(lambda tag: tag.name in {"h2", "h3"} and "directions" in self._ascii_fold(tag.get_text(" ", strip=True)))
        if not marker:
            return ""

        steps: list[str] = []
        for sibling in marker.find_all_next():
            if sibling == marker:
                continue
            if sibling.name in {"h2", "h3"} and sibling is not marker:
                break
            if sibling.name == "p":
                line = self._clean_text(sibling.get_text(" ", strip=True))
                if line and line not in steps:
                    steps.append(line)
        return "\n".join(steps)

    def _extract_nutrition_profile(self, soup: BeautifulSoup) -> list[str]:
        profile: list[str] = []
        marker = soup.find(string=re.compile(r"Nutrition Profile:", re.IGNORECASE))
        if marker:
            parent = marker.parent
            text = self._clean_text(parent.get_text(" ", strip=True))
            if text:
                text = text.replace("Nutrition Profile:", "").strip()
                if text:
                    profile.extend([item.strip() for item in re.split(r"\s{2,}|,", text) if item.strip()])
            for link in parent.find_all_next("a", href=True, limit=20):
                label = self._clean_text(link.get_text(" ", strip=True))
                if label and label not in profile:
                    profile.append(label)

        return list(dict.fromkeys(profile))

    def _extract_nutrition_text(self, soup: BeautifulSoup) -> str:
        marker = soup.find(lambda tag: tag.name in {"h3", "h4"} and "nutrition information" in self._ascii_fold(tag.get_text(" ", strip=True)))
        if not marker:
            return ""

        lines: list[str] = []
        for sibling in marker.find_all_next():
            if sibling == marker:
                continue
            if sibling.name in {"h2", "h3"} and sibling is not marker:
                break
            text = self._clean_text(sibling.get_text(" ", strip=True))
            if text:
                lines.append(text)
        return " ".join(lines)

    def _extract_image_url(self, soup: BeautifulSoup) -> str | None:
        for prop, value in [("property", "og:image"), ("name", "twitter:image")]:
            tag = soup.find("meta", attrs={prop: value})
            if tag and tag.get("content"):
                return tag["content"].strip()
        return None

    def _first_heading(self, soup: BeautifulSoup) -> str | None:
        heading = soup.find("h1")
        return heading.get_text(" ", strip=True) if heading else None

    def _line_after(self, soup: BeautifulSoup, label: str) -> str | None:
        folded_label = self._ascii_fold(label)
        text = soup.get_text("\n", strip=True)
        lines = [self._clean_text(line) for line in text.splitlines() if self._clean_text(line)]

        for index, line in enumerate(lines):
            if self._ascii_fold(line) == folded_label and index + 1 < len(lines):
                return lines[index + 1]
            if self._ascii_fold(line).startswith(folded_label):
                parts = line.split(":", 1)
                if len(parts) == 2 and parts[1].strip():
                    return parts[1].strip()
        return None

    def _parse_ingredient_line(self, line: str) -> dict:
        normalized = re.sub(r"^[*•\-\u2022]+\s*", "", line).strip()
        match = re.match(r"^(?P<amount>\d+(?:[./]\d+)?|[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+)\s+(?P<rest>.+)$", normalized)
        if not match:
            return {"name": normalized, "amount": None, "unit": None}

        amount = self._normalize_fraction(match.group("amount"))
        rest = match.group("rest").strip()
        tokens = rest.split()
        units = {
            "teaspoon", "teaspoons", "tsp", "tablespoon", "tablespoons", "tbsp",
            "cup", "cups", "pound", "pounds", "lb", "ounce", "ounces",
            "clove", "cloves", "large", "medium", "small", "can", "cans",
        }
        if tokens and tokens[0].lower() in units:
            return {"name": " ".join(tokens[1:]).strip(" ,"), "amount": amount, "unit": tokens[0]}
        return {"name": rest.strip(" ,"), "amount": amount, "unit": None}

    def _infer_recipe_category(self, recipe_url: str, title: str, profile: list[str]) -> str:
        haystack = self._ascii_fold(" ".join([recipe_url, title, *profile]))
        if any(token in haystack for token in ["breakfast", "brunch", "egg", "oat", "toast", "smoothie"]):
            return "Kahvaltı"
        if any(token in haystack for token in ["dessert", "cookie", "cake", "brownie", "muffin"]):
            return "Tatlı"
        if any(token in haystack for token in ["snack", "dip", "bar", "bite"]):
            return "Ara Öğün"
        return "Ana Yemek"

    def _evaluate_health(
        self,
        recipe_category: str,
        profile: list[str],
        calorie: float | None,
        protein: float | None,
        carbohydrate: float | None,
    ) -> HealthEvaluation:
        labels: list[str] = []
        is_main = recipe_category == "Ana Yemek"
        is_breakfast = recipe_category == "Kahvaltı"

        carb_limit = 25 if is_main else 20
        protein_limit = 25 if is_main else 15
        calorie_limit = 550 if is_main else 400 if is_breakfast else 250
        folded_profile = self._ascii_fold(" ".join(profile))

        if carbohydrate is not None and carbohydrate <= carb_limit:
            labels.append("Düşük Karbonhidrat")
        if protein is not None and protein >= protein_limit:
            labels.append("Yüksek Protein")
        if calorie is not None and calorie <= calorie_limit:
            labels.append("Düşük Kalori")

        if "low-carb" in folded_profile or "low carb" in folded_profile:
            labels.append("Düşük Karbonhidrat")
        if "high-protein" in folded_profile or "high protein" in folded_profile:
            labels.append("Yüksek Protein")
        if any(token in folded_profile for token in ["low-calorie", "low calorie", "weight loss"]):
            labels.append("Düşük Kalori")

        labels = list(dict.fromkeys(labels))
        return HealthEvaluation(labels=labels, accepted=bool(labels))

    def _infer_cooking_type(self, title: str, instructions: str) -> str:
        haystack = self._ascii_fold(f"{title} {instructions}")
        if any(token in haystack for token in ["sheet-pan", "roast", "roasted", "bake", "oven"]):
            return "Fırın"
        if any(token in haystack for token in ["grill", "grilled"]):
            return "Izgara"
        if any(token in haystack for token in ["skillet", "stir-fry", "saute", "pan"]):
            return "Tava"
        if any(token in haystack for token in ["soup", "pot", "simmer", "boil"]):
            return "Tencere"
        return "Diğer"

    def _infer_cooking_method(self, title: str, instructions: str) -> str:
        haystack = self._ascii_fold(f"{title} {instructions}")
        rules = [
            ("Fırınlama", ["bake", "roast", "sheet-pan", "oven"]),
            ("Izgara", ["grill", "grilled"]),
            ("Soteleme", ["saute", "stir-fry", "skillet"]),
            ("Haşlama", ["boil", "simmer", "poach"]),
            ("Karıştırma", ["mix", "toss", "whisk"]),
        ]
        for label, keywords in rules:
            if any(keyword in haystack for keyword in keywords):
                return label
        return "Diğer"

    def _compose_description(self, description: str | None, labels: list[str]) -> str:
        base = description or "EatingWell kaynağından alınan sağlıklı tarif."
        if not labels:
            return base
        return f"{' | '.join(labels)} - {base}"

    def _parse_metric(self, text: str, label: str) -> float | None:
        match = re.search(rf"{re.escape(label)}\s+(\d+(?:[.,]\d+)?)", text, flags=re.IGNORECASE)
        if not match:
            return None
        return float(match.group(1).replace(",", "."))

    def _parse_time(self, value: str | None) -> int | None:
        if not value:
            return None
        text = self._ascii_fold(value)
        hours = re.search(r"(\d+)\s*hr", text)
        minutes = re.search(r"(\d+)\s*min", text)
        total = 0
        if hours:
            total += int(hours.group(1)) * 60
        if minutes:
            total += int(minutes.group(1))
        if total:
            return total
        numbers = re.findall(r"\d+", text)
        return int(numbers[0]) if numbers else None

    def _parse_servings(self, value: str | None) -> int | None:
        if not value:
            return None
        numbers = re.findall(r"\d+", value)
        return int(numbers[0]) if numbers else None

    def _meta_content(self, soup: BeautifulSoup, attr_name: str, attr_value: str) -> str | None:
        tag = soup.find("meta", attrs={attr_name: attr_value})
        return tag.get("content") if tag and tag.get("content") else None

    def _normalize_fraction(self, value: str) -> str:
        replacements = {
            "¼": "0.25",
            "½": "0.5",
            "¾": "0.75",
            "⅓": "0.33",
            "⅔": "0.67",
            "⅛": "0.125",
            "⅜": "0.375",
            "⅝": "0.625",
            "⅞": "0.875",
        }
        return replacements.get(value, value)

    def _clean_text(self, value: str | None) -> str:
        if not value:
            return ""
        text = BeautifulSoup(unescape(str(value)), "html.parser").get_text(" ", strip=True)
        return re.sub(r"\s+", " ", text).strip()

    def _ascii_fold(self, value: str) -> str:
        translation = str.maketrans(
            {
                "ç": "c", "Ç": "c",
                "ğ": "g", "Ğ": "g",
                "ı": "i", "İ": "i",
                "ö": "o", "Ö": "o",
                "ş": "s", "Ş": "s",
                "ü": "u", "Ü": "u",
            }
        )
        normalized = unicodedata.normalize("NFKD", value.translate(translation))
        normalized = "".join(char for char in normalized if not unicodedata.combining(char))
        return " ".join(normalized.lower().split())

    def _is_recipe_url(self, url: str) -> bool:
        parsed = urlparse(url)
        if parsed.netloc not in {"www.eatingwell.com", "eatingwell.com"}:
            return False
        if parsed.path.count("/") < 1:
            return False
        if any(parsed.path.startswith(prefix) for prefix in ["/gallery/", "/healthy-", "/about/", "/meal-plans/"]):
            return False
        return bool(re.search(r"-\d+$", parsed.path.strip("/")))

    def _sleep(self, seconds: float) -> None:
        if not seconds:
            return
        import time
        time.sleep(seconds)
