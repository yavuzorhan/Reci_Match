import json
import re
import unicodedata
from dataclasses import dataclass
from html import unescape
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag


HEALTHY_PATHS = {
    "Kahvaltı": [
        "/category/recipes/breakfast/",
    ],
    "Ana Yemek": [
        "/category/recipes/dinner/",
        "/category/recipes/lunch/",
        "/category/recipes/salad/",
    ],
    "Tatlı": [
        "/category/recipes/dessert/",
    ],
    "Ara Öğün": [
        "/category/recipes/snacks/",
    ],
}


@dataclass
class HealthEvaluation:
    labels: list[str]
    accepted: bool


class SkinnytasteScraper:
    def __init__(self):
        self.base_url = "https://www.skinnytaste.com"
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

    def collect_recipe_links(
        self,
        category_paths: list[str],
        target_link_count: int,
        max_pages_per_category: int = 10,
        delay_seconds: float = 0.3,
    ) -> list[str]:
        links: list[str] = []
        seen: set[str] = set()

        for category_path in category_paths:
            for page in range(1, max_pages_per_category + 1):
                url = self._category_page_url(category_path, page)
                soup = self._get_soup(url)
                page_links = self._extract_recipe_links(soup)
                if not page_links:
                    break

                new_count = 0
                for link in page_links:
                    if link in seen:
                        continue
                    seen.add(link)
                    links.append(link)
                    new_count += 1
                    if len(links) >= target_link_count:
                        return links

                if new_count == 0:
                    break

                if delay_seconds:
                    self._sleep(delay_seconds)

        return links

    def parse_recipe_detail(self, recipe_url: str) -> dict | None:
        soup = self._get_soup(recipe_url)
        schema_recipe = self._extract_schema_recipe(soup)

        title = (
            self._extract_meta_content(soup, "property", "og:title")
            or (schema_recipe.get("name") if schema_recipe else None)
            or self._text_or_none(soup.find("h1"))
            or self._find_heading_following_text(soup, "## ")
        )
        title = self._clean_title(title or "")
        if not title:
            return None

        description = (
            self._extract_meta_content(soup, "name", "description")
            or (schema_recipe.get("description") if schema_recipe else None)
            or self._extract_recipe_summary(soup)
        )
        description = self._clean_text_block(description)

        image_url = (
            self._extract_meta_content(soup, "property", "og:image")
            or self._first_image_from_schema(schema_recipe)
        )

        visible_recipe = self._extract_visible_recipe_block(soup)
        recipe_categories = self._extract_categories(soup, schema_recipe)
        recipe_category = self._classify_recipe_category(recipe_url, title, recipe_categories)

        serving = (
            self._parse_servings(self._extract_label_value(visible_recipe, "Yield"))
            or self._parse_servings(self._extract_label_value(visible_recipe, "Servings"))
            or self._parse_servings(schema_recipe.get("recipeYield") if schema_recipe else None)
        )
        prep_minutes = self._parse_time_text(self._extract_label_value(visible_recipe, "Prep"))
        cook_minutes = self._parse_time_text(self._extract_label_value(visible_recipe, "Cook"))
        total_time_minutes = (
            self._parse_time_text(self._extract_label_value(visible_recipe, "Total"))
            or self._sum_times(prep_minutes, cook_minutes)
            or self._parse_iso_minutes(schema_recipe.get("totalTime") if schema_recipe else None)
        )
        if total_time_minutes is None:
            total_time_minutes = self._sum_times(
                self._parse_iso_minutes(schema_recipe.get("prepTime") if schema_recipe else None),
                self._parse_iso_minutes(schema_recipe.get("cookTime") if schema_recipe else None),
            )

        nutrition_text = (
            self._extract_nutrition_text(visible_recipe)
            or self._nutrition_text_from_schema(schema_recipe)
        )
        calorie = (
            self._parse_number_after_label(nutrition_text, ["Calories", "Cals"])
            or self._parse_number(schema_recipe.get("nutrition", {}).get("calories") if schema_recipe else None)
        )
        protein = self._parse_number_after_label(nutrition_text, ["Protein"])
        carbohydrate = self._parse_number_after_label(nutrition_text, ["Carbohydrates", "Carbs"])
        fat = self._parse_number_after_label(nutrition_text, ["Fat"])

        ingredients = self._extract_ingredients(soup, schema_recipe)
        instructions = self._extract_instructions(soup, schema_recipe)
        if not ingredients or not instructions:
            return None

        health_evaluation = self._evaluate_health(recipe_category, recipe_categories, calorie, protein, carbohydrate)
        if not health_evaluation.accepted:
            return None

        cooking_type = self._infer_cooking_type(title, instructions, recipe_categories)
        cooking_method = self._infer_cooking_method(title, instructions, recipe_categories)

        if total_time_minutes is None or image_url is None or serving is None:
            return None
        if any(value is None for value in [calorie, protein, carbohydrate, fat]):
            return None

        return {
            "title": title,
            "description": self._compose_description(description, health_evaluation.labels),
            "category": ", ".join(recipe_categories) if recipe_categories else None,
            "recipe_category": recipe_category,
            "cooking_type": cooking_type,
            "cooking_method": cooking_method,
            "total_time_minutes": total_time_minutes,
            "serving": serving,
            "calorie": calorie,
            "protein": protein,
            "carbohydrate": carbohydrate,
            "fat": fat,
            "ingredients": ingredients,
            "instructions": instructions,
            "image_url": image_url,
            "source_url": recipe_url,
            "source": "skinnytaste",
        }

    def _get_soup(self, url: str) -> BeautifulSoup:
        response = self.session.get(url, headers=self.headers, timeout=self.timeout)
        if response.status_code == 403:
            raise RuntimeError(
                "Skinnytaste isteği engellendi (HTTP 403). Cloudflare/anti-bot nedeniyle bu ortamda erişim kısıtlı."
            )
        response.raise_for_status()
        return BeautifulSoup(response.text, "html.parser")

    def _category_page_url(self, category_path: str, page: int) -> str:
        normalized = "/" + category_path.strip("/") + "/"
        if page <= 1:
            return urljoin(self.base_url, normalized)
        return urljoin(self.base_url, f"{normalized}page/{page}/")

    def _extract_recipe_links(self, soup: BeautifulSoup) -> list[str]:
        links: list[str] = []
        seen: set[str] = set()

        for anchor in soup.select("a[href]"):
            href = anchor.get("href")
            if not href:
                continue
            absolute = urljoin(self.base_url, href)
            if absolute in seen or not self._is_recipe_url(absolute):
                continue
            seen.add(absolute)
            links.append(absolute)
        return links

    def _extract_schema_recipe(self, soup: BeautifulSoup) -> dict:
        for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
            raw = script.string or script.get_text(strip=True)
            if not raw:
                continue
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                continue
            recipe = self._find_recipe_node(payload)
            if recipe:
                return recipe
        return {}

    def _find_recipe_node(self, payload) -> dict | None:
        if isinstance(payload, list):
            for item in payload:
                recipe = self._find_recipe_node(item)
                if recipe:
                    return recipe
            return None

        if not isinstance(payload, dict):
            return None

        node_type = payload.get("@type")
        if isinstance(node_type, list) and "Recipe" in node_type:
            return payload
        if node_type == "Recipe":
            return payload

        for key in ["@graph", "itemListElement", "mainEntity"]:
            child = payload.get(key)
            recipe = self._find_recipe_node(child)
            if recipe:
                return recipe
        return None

    def _extract_visible_recipe_block(self, soup: BeautifulSoup) -> Tag | BeautifulSoup:
        for selector in [
            ".wprm-recipe-container",
            ".tasty-recipes",
            ".recipe-card",
            "article",
        ]:
            block = soup.select_one(selector)
            if block:
                return block
        return soup

    def _extract_label_value(self, block: Tag | BeautifulSoup, label: str) -> str | None:
        label_fold = self._ascii_fold(label)
        text = self._clean_text_block(block.get_text("\n", strip=True))
        lines = [line.strip() for line in text.splitlines() if line.strip()]

        for index, line in enumerate(lines):
            line_fold = self._ascii_fold(line)
            if line_fold.startswith(f"{label_fold}:"):
                return line.split(":", 1)[1].strip()
            if line_fold == label_fold and index + 1 < len(lines):
                return lines[index + 1].strip()
        return None

    def _extract_recipe_summary(self, soup: BeautifulSoup) -> str | None:
        paragraphs = soup.select("article p")
        for paragraph in paragraphs[:8]:
            text = self._clean_text_block(paragraph.get_text(" ", strip=True))
            if len(text) >= 80:
                return text
        return None

    def _extract_categories(self, soup: BeautifulSoup, schema_recipe: dict) -> list[str]:
        categories: list[str] = []

        schema_categories = schema_recipe.get("recipeCategory") if schema_recipe else None
        if isinstance(schema_categories, str):
            categories.extend([item.strip() for item in schema_categories.split(",") if item.strip()])
        elif isinstance(schema_categories, list):
            categories.extend([str(item).strip() for item in schema_categories if str(item).strip()])

        text = soup.get_text("\n", strip=True)
        categories_marker = "### Categories"
        if categories_marker in text:
            segment = text.split(categories_marker, 1)[1]
            lines = [line.strip() for line in segment.splitlines() if line.strip()]
            for line in lines[:25]:
                if line.startswith("### ") or line.startswith("## "):
                    break
                if len(line) > 80:
                    continue
                categories.append(line)

        unique: list[str] = []
        seen: set[str] = set()
        for item in categories:
            folded = self._ascii_fold(item)
            if not folded or folded in seen:
                continue
            seen.add(folded)
            unique.append(item)
        return unique

    def _extract_nutrition_text(self, block: Tag | BeautifulSoup) -> str | None:
        text = self._clean_text_block(block.get_text("\n", strip=True))
        marker = "### Nutrition"
        if marker in text:
            segment = text.split(marker, 1)[1]
            lines = [line.strip() for line in segment.splitlines() if line.strip()]
            if lines:
                return " ".join(lines[:3])

        nutrition_line = re.search(
            r"Serving:.*?Calories:.*?(?:Sugar:.*?|Fiber:.*?|Fat:.*)",
            text,
            flags=re.IGNORECASE | re.DOTALL,
        )
        if nutrition_line:
            return nutrition_line.group(0)

        return None

    def _nutrition_text_from_schema(self, schema_recipe: dict) -> str | None:
        if not schema_recipe:
            return None
        nutrition = schema_recipe.get("nutrition") or {}
        if not isinstance(nutrition, dict):
            return None
        parts = []
        for label, key in [
            ("Calories", "calories"),
            ("Protein", "proteinContent"),
            ("Carbohydrates", "carbohydrateContent"),
            ("Fat", "fatContent"),
        ]:
            value = nutrition.get(key)
            if value:
                parts.append(f"{label}: {value}")
        return ", ".join(parts) if parts else None

    def _extract_ingredients(self, soup: BeautifulSoup, schema_recipe: dict) -> list[dict]:
        for selector in [
            ".wprm-recipe-ingredient",
            ".tasty-recipes-ingredients li",
            "[class*='ingredient'] li",
        ]:
            nodes = soup.select(selector)
            if nodes:
                parsed = []
                for node in nodes:
                    raw = self._clean_text_block(node.get_text(" ", strip=True))
                    if not raw:
                        continue
                    parsed.append(self._parse_ingredient_line(raw))
                if parsed:
                    return parsed

        recipe_block = self._extract_visible_recipe_block(soup)
        text = recipe_block.get_text("\n", strip=True)
        if "### Ingredients" in text:
            segment = text.split("### Ingredients", 1)[1]
            lines = [line.strip("• ▢\t ") for line in segment.splitlines() if line.strip()]
            collected = []
            for line in lines:
                if line.startswith("### "):
                    break
                if line.lower().startswith("cook mode"):
                    continue
                collected.append(self._parse_ingredient_line(line))
            if collected:
                return collected

        schema_ingredients = schema_recipe.get("recipeIngredient") if schema_recipe else None
        if isinstance(schema_ingredients, list):
            return [
                self._parse_ingredient_line(self._clean_text_block(str(item)))
                for item in schema_ingredients
                if self._clean_text_block(str(item))
            ]
        return []

    def _extract_instructions(self, soup: BeautifulSoup, schema_recipe: dict) -> str:
        for selector in [
            ".wprm-recipe-instruction-text",
            ".tasty-recipes-instructions li",
            "[class*='instruction'] li",
        ]:
            nodes = soup.select(selector)
            if nodes:
                steps = [
                    self._clean_text_block(node.get_text(" ", strip=True))
                    for node in nodes
                ]
                steps = [step for step in steps if step]
                if steps:
                    return "\n".join(steps)

        recipe_block = self._extract_visible_recipe_block(soup)
        text = recipe_block.get_text("\n", strip=True)
        if "### Instructions" in text:
            segment = text.split("### Instructions", 1)[1]
            lines = [line.strip("• \t") for line in segment.splitlines() if line.strip()]
            steps = []
            for line in lines:
                if line.startswith("### "):
                    break
                if line.lower().startswith(("last step:", "notes", "did you make this")):
                    break
                steps.append(line)
            if steps:
                return "\n".join(steps)

        schema_instructions = schema_recipe.get("recipeInstructions") if schema_recipe else None
        steps = []
        if isinstance(schema_instructions, list):
            for item in schema_instructions:
                if isinstance(item, dict):
                    value = item.get("text") or item.get("name")
                else:
                    value = str(item)
                value = self._clean_text_block(value)
                if value:
                    steps.append(value)
        return "\n".join(steps)

    def _parse_ingredient_line(self, line: str) -> dict:
        normalized = " ".join(line.split())
        normalized = re.sub(r"^[•▢\-\u2022]+\s*", "", normalized).strip()
        if not normalized:
            return {"name": "", "amount": None, "unit": None}

        match = re.match(
            r"^(?P<amount>\d+(?:[./]\d+)?|[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+)\s+(?P<rest>.+)$",
            normalized,
        )
        if not match:
            return {"name": normalized, "amount": None, "unit": None}

        amount = self._normalize_fraction(match.group("amount"))
        rest = match.group("rest").strip()
        tokens = rest.split()
        if len(tokens) >= 2 and tokens[0].lower() in {
            "cup", "cups", "tbsp", "tsp", "teaspoon", "teaspoons", "tablespoon", "tablespoons",
            "ounce", "ounces", "lb", "pound", "pounds", "clove", "cloves", "slice", "slices",
            "small", "medium", "large", "package", "packages", "can", "cans",
        }:
            unit = tokens[0]
            name = " ".join(tokens[1:])
        else:
            unit = None
            name = rest

        return {"name": name.strip(" ,"), "amount": amount, "unit": unit}

    def _evaluate_health(
        self,
        recipe_category: str,
        recipe_categories: list[str],
        calorie: float | None,
        protein: float | None,
        carbohydrate: float | None,
    ) -> HealthEvaluation:
        labels: list[str] = []
        category_fold = self._ascii_fold(" ".join(recipe_categories))
        is_main = recipe_category == "Ana Yemek"
        is_breakfast = recipe_category == "Kahvaltı"
        is_dessert_like = recipe_category in {"Tatlı", "Ara Öğün"}

        carb_limit = 25 if is_main else 20
        protein_limit = 25 if is_main else 15
        calorie_limit = 550 if is_main else 400 if is_breakfast else 250

        if carbohydrate is not None and carbohydrate <= carb_limit:
            labels.append("Düşük Karbonhidrat")
        if protein is not None and protein >= protein_limit:
            labels.append("Yüksek Protein")
        if calorie is not None and calorie <= calorie_limit:
            labels.append("Düşük Kalori")

        if "low carb" in category_fold and "Düşük Karbonhidrat" not in labels:
            labels.append("Düşük Karbonhidrat")
        if "high protein" in category_fold and "Yüksek Protein" not in labels:
            labels.append("Yüksek Protein")
        if any(token in category_fold for token in ["under 30 minutes", "meal prep"]) and is_dessert_like and calorie is not None and calorie <= calorie_limit:
            if "Düşük Kalori" not in labels:
                labels.append("Düşük Kalori")

        return HealthEvaluation(labels=labels, accepted=bool(labels))

    def _classify_recipe_category(self, recipe_url: str, title: str, categories: list[str]) -> str:
        haystack = self._ascii_fold(" ".join([recipe_url, title, *categories]))
        if any(token in haystack for token in ["breakfast", "brunch", "frittata", "omelet", "omelette", "egg", "pancake", "oatmeal", "toast"]):
            return "Kahvaltı"
        if any(token in haystack for token in ["dessert", "cookie", "cake", "muffin", "brownie", "bar", "sweet"]):
            return "Tatlı"
        if any(token in haystack for token in ["snack", "dip", "smoothie", "energy bite"]):
            return "Ara Öğün"
        return "Ana Yemek"

    def _infer_cooking_type(self, title: str, instructions: str, categories: list[str]) -> str:
        haystack = self._ascii_fold(" ".join([title, instructions, *categories]))
        if "air fryer" in haystack or "airfryer" in haystack:
            return "Airfryer"
        if any(token in haystack for token in ["oven", "bake", "sheet pan", "roast", "casserole"]):
            return "Fırın"
        if any(token in haystack for token in ["grill", "grilled"]):
            return "Izgara"
        if any(token in haystack for token in ["skillet", "saute", "stir-fry", "pan", "fry"]):
            return "Tava"
        if any(token in haystack for token in ["slow cooker", "pressure cooker", "soup", "boil", "simmer", "pot"]):
            return "Tencere"
        if any(token in haystack for token in ["no cook", "salad", "dressing", "smoothie"]):
            return "Hazır"
        return "Diğer"

    def _infer_cooking_method(self, title: str, instructions: str, categories: list[str]) -> str:
        haystack = self._ascii_fold(" ".join([title, instructions, *categories]))
        rules = [
            ("Airfryer", ["air fryer", "airfryer"]),
            ("Fırınlama", ["oven", "bake", "roast", "sheet pan", "broil"]),
            ("Izgara", ["grill", "grilled"]),
            ("Soteleme", ["saute", "stir-fry", "skillet"]),
            ("Haşlama", ["boil", "simmer", "poach"]),
            ("Karıştırma", ["mix", "toss", "stir together"]),
            ("Blender", ["blend", "food processor"]),
            ("Soğuk Hazırlık", ["no cook", "chill", "refrigerate"]),
        ]
        for label, keywords in rules:
            if any(keyword in haystack for keyword in keywords):
                return label
        return "Diğer"

    def _compose_description(self, description: str, health_labels: list[str]) -> str:
        if not description:
            return "Sağlıklı menü için seçilmiş Skinnytaste tarifi."
        prefix = " | ".join(health_labels)
        return f"{prefix} - {description}" if prefix else description

    def _extract_meta_content(self, soup: BeautifulSoup, attr_name: str, attr_value: str) -> str | None:
        tag = soup.find("meta", attrs={attr_name: attr_value})
        if tag and tag.get("content"):
            return tag["content"].strip()
        return None

    def _first_image_from_schema(self, schema_recipe: dict) -> str | None:
        image_value = schema_recipe.get("image") if schema_recipe else None
        if isinstance(image_value, str) and image_value.strip():
            return image_value.strip()
        if isinstance(image_value, list):
            for item in image_value:
                if isinstance(item, str) and item.strip():
                    return item.strip()
                if isinstance(item, dict) and item.get("url"):
                    return str(item["url"]).strip()
        if isinstance(image_value, dict):
            candidate = image_value.get("url")
            if candidate:
                return str(candidate).strip()
        return None

    def _find_heading_following_text(self, soup: BeautifulSoup, prefix: str) -> str | None:
        for heading in soup.find_all(["h1", "h2", "h3"]):
            text = self._text_or_none(heading)
            if text and not text.startswith(prefix):
                return text
        return None

    def _text_or_none(self, node: Tag | None) -> str | None:
        if not node:
            return None
        text = node.get_text(" ", strip=True)
        return text or None

    def _parse_servings(self, value) -> int | None:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return int(round(value))
        numbers = [int(piece) for piece in re.findall(r"\d+", str(value))]
        return numbers[0] if numbers else None

    def _parse_time_text(self, value: str | None) -> int | None:
        if not value:
            return None
        text = self._ascii_fold(str(value))
        hours = re.search(r"(\d+)\s*h", text)
        minutes = re.search(r"(\d+)\s*m", text)
        mins_full = re.search(r"(\d+)\s*minute", text)
        total = 0
        if hours:
            total += int(hours.group(1)) * 60
        if minutes:
            total += int(minutes.group(1))
        elif mins_full:
            total += int(mins_full.group(1))
        if total:
            return total
        digits = re.search(r"\d+", text)
        return int(digits.group(0)) if digits else None

    def _parse_iso_minutes(self, value: str | None) -> int | None:
        if not value:
            return None
        match = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?", str(value).strip())
        if not match:
            return None
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        return hours * 60 + minutes

    def _sum_times(self, left: int | None, right: int | None) -> int | None:
        if left is None and right is None:
            return None
        return (left or 0) + (right or 0)

    def _parse_number_after_label(self, text: str | None, labels: list[str]) -> float | None:
        if not text:
            return None
        for label in labels:
            match = re.search(
                rf"{re.escape(label)}\s*:?\s*(\d+(?:[.,]\d+)?)",
                text,
                flags=re.IGNORECASE,
            )
            if match:
                return float(match.group(1).replace(",", "."))
        return None

    def _parse_number(self, value) -> float | None:
        if value is None:
            return None
        match = re.search(r"\d+(?:[.,]\d+)?", str(value))
        if not match:
            return None
        return float(match.group(0).replace(",", "."))

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

    def _clean_title(self, value: str) -> str:
        cleaned = re.sub(r"\s*-\s*Skinnytaste\s*$", "", value, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s{2,}", " ", cleaned)
        return cleaned.strip(" -")

    def _clean_text_block(self, value: str | None) -> str:
        if not value:
            return ""
        text = BeautifulSoup(unescape(str(value)), "html.parser").get_text("\n", strip=True)
        text = re.sub(r"\n{2,}", "\n", text)
        text = re.sub(r"[ \t]+", " ", text)
        return text.strip()

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
        if parsed.netloc not in {"www.skinnytaste.com", "skinnytaste.com"}:
            return False
        if not parsed.path or parsed.path == "/":
            return False
        blocked_prefixes = (
            "/category/",
            "/recipe-index/",
            "/about/",
            "/meal-plans/",
            "/free-",
            "/7-day-",
            "/book",
            "/contact",
            "/shop",
            "/how-to-",
        )
        if parsed.path.startswith(blocked_prefixes):
            return False
        if any(part in parsed.path for part in ["/page/", "/tag/"]):
            return False
        if parsed.path.count("/") < 2:
            return False
        return True

    def _sleep(self, seconds: float) -> None:
        if not seconds:
            return
        import time
        time.sleep(seconds)
