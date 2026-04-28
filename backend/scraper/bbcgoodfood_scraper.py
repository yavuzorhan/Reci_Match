import re
import unicodedata
from dataclasses import dataclass
from html import unescape
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


HEALTHY_COLLECTION_PATHS = {
    "Kahvaltı": [
        "/recipes/collection/healthy-breakfast-recipes",
        "/recipes/collection/healthy-breakfast-recipes-to-lose-weight",
    ],
    "Ana Yemek": [
        "/recipes/collection/healthy-recipes",
        "/recipes/collection/healthy-dinner-recipes",
        "/recipes/collection/quick-and-healthy-recipes",
        "/recipes/collection/easy-healthy-recipes",
        "/recipes/collection/healthy-family-recipes",
        "/recipes/collection/healthy-meal-two-recipes",
        "/recipes/collection/heart-healthy-recipes",
    ],
    "Tatlı": [
        "/recipes/collection/healthy-desserts-recipes",
        "/recipes/collection/healthy-summer-desserts",
    ],
}


@dataclass
class HealthEvaluation:
    labels: list[str]
    accepted: bool


class BBCGoodFoodScraper:
    def __init__(self):
        self.base_url = "https://www.bbcgoodfood.com"
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
        collection_paths: list[str],
        target_link_count: int,
        delay_seconds: float = 0.25,
    ) -> list[str]:
        links: list[str] = []
        seen: set[str] = set()

        for collection_path in collection_paths:
            soup = self._get_soup(urljoin(self.base_url, collection_path))
            for link in self._extract_recipe_links(soup):
                if link in seen:
                    continue
                seen.add(link)
                links.append(link)
                if len(links) >= target_link_count:
                    return links
            if delay_seconds:
                self._sleep(delay_seconds)

        return links

    def parse_recipe_detail(self, recipe_url: str, forced_category: str | None = None) -> dict | None:
        soup = self._get_soup(recipe_url)
        full_text = self._clean_text_block(soup.get_text("\n", strip=True))
        lines = [line.strip() for line in full_text.splitlines() if line.strip()]

        title = (
            self._extract_meta_content(soup, "property", "og:title")
            or self._text_or_none(soup.find("h1"))
        )
        title = self._clean_title(title or "")
        if not title:
            return None

        description = (
            self._extract_meta_content(soup, "name", "description")
            or self._extract_description(lines, title)
        )
        image_url = self._extract_meta_content(soup, "property", "og:image")

        serving = self._parse_serving(lines)
        prep_minutes = self._parse_prefixed_time(lines, "Prep:")
        cook_minutes = self._parse_prefixed_time(lines, "Cook:")
        total_time_minutes = (prep_minutes or 0) + (cook_minutes or 0) if (prep_minutes or cook_minutes) else None

        ingredients = self._extract_ingredients(lines)
        instructions = self._extract_instructions(lines)
        if not ingredients or not instructions:
            return None

        calorie, fat, carbohydrate, protein = self._extract_nutrition(lines)
        if any(value is None for value in [calorie, protein, carbohydrate, fat]):
            return None

        recipe_category = forced_category or self._classify_recipe_category(recipe_url, title)
        health_evaluation = self._evaluate_health(recipe_category, description, calorie, protein, carbohydrate)
        if not health_evaluation.accepted:
            return None

        cooking_type = self._infer_cooking_type(title, instructions)
        cooking_method = self._infer_cooking_method(title, instructions)
        if serving is None or total_time_minutes is None or not image_url:
            return None

        return {
            "title": title,
            "description": self._compose_description(description, health_evaluation.labels),
            "category": ", ".join(health_evaluation.labels) if health_evaluation.labels else "Healthy",
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
            "source": "bbcgoodfood",
        }

    def _get_soup(self, url: str) -> BeautifulSoup:
        response = self.session.get(url, headers=self.headers, timeout=self.timeout)
        response.raise_for_status()
        return BeautifulSoup(response.text, "html.parser")

    def _extract_recipe_links(self, soup: BeautifulSoup) -> list[str]:
        links: list[str] = []
        seen: set[str] = set()

        for anchor in soup.select("a[href]"):
            href = anchor.get("href") or ""
            absolute = urljoin(self.base_url, href)
            if absolute in seen or not self._is_recipe_url(absolute):
                continue
            seen.add(absolute)
            links.append(absolute)

        return links

    def _extract_description(self, lines: list[str], title: str) -> str:
        title_indexes = [index for index, line in enumerate(lines) if line == title]
        for index in reversed(title_indexes):
            if index + 1 < len(lines):
                for candidate in lines[index + 1:index + 12]:
                    if len(candidate) >= 60 and "rating" not in self._ascii_fold(candidate):
                        return candidate
        return ""

    def _parse_serving(self, lines: list[str]) -> int | None:
        for line in lines:
            match = re.search(r"Serves\s+(\d+)", line, flags=re.IGNORECASE)
            if match:
                return int(match.group(1))
        return None

    def _parse_prefixed_time(self, lines: list[str], prefix: str) -> int | None:
        for index, line in enumerate(lines):
            if prefix.lower() not in line.lower():
                continue
            inline_value = line.split(prefix, 1)[1].strip()
            if inline_value:
                return self._parse_time_text(inline_value)
            if index + 1 < len(lines):
                return self._parse_time_text(lines[index + 1])
        return None

    def _extract_ingredients(self, lines: list[str]) -> list[dict]:
        ingredient_indexes = [index for index, line in enumerate(lines) if line == "Ingredients"]
        if not ingredient_indexes:
            return []

        start_index = ingredient_indexes[-1] + 1
        if start_index < len(lines) and lines[start_index] == "Nutrition":
            start_index += 1

        section: list[str] = []
        for line in lines[start_index:]:
            if line in {"Method", "Nutrition: Per serving"} or line.startswith("Nutrition: Per serving"):
                break
            section.append(line)

        ingredients: list[str] = []
        current_parts: list[str] = []
        amount_start_pattern = r"^(?:\d+(?:[./]\d+)?|\d+[a-zA-Z]+|[¼½¾])(?:\s|$)"

        for raw in section:
            line = raw.strip()
            if not line or line.lower().startswith("keep the screen awake"):
                break
            if re.match(amount_start_pattern, line) and current_parts:
                ingredients.append(" ".join(current_parts).strip())
                current_parts = [line]
                continue

            if not current_parts:
                current_parts = [line]
            else:
                current_parts.append(line)

        if current_parts:
            ingredients.append(" ".join(current_parts).strip())

        parsed = [self._parse_ingredient_line(item) for item in ingredients if item]
        return [item for item in parsed if item.get("name")]

    def _extract_nutrition(self, lines: list[str]) -> tuple[float | None, float | None, float | None, float | None]:
        section = self._extract_section(lines, "Nutrition", ["Method"])
        if not section:
            return None, None, None, None

        joined = " ".join(section)
        calorie = self._parse_number_after_label(joined, ["kcal", "calories"])
        fat = self._parse_number_after_label(joined, ["fat"])
        carbohydrate = self._parse_number_after_label(joined, ["carbs", "carbohydrate"])
        protein = self._parse_number_after_label(joined, ["protein"])
        return calorie, fat, carbohydrate, protein

    def _extract_instructions(self, lines: list[str]) -> str:
        section = self._extract_section(lines, "Method", ["Recipe from", "Comments", "Rate this recipe"])
        if not section:
            return ""

        steps: list[str] = []
        current = ""
        for line in section:
            if not line or line.startswith("### step"):
                if current:
                    steps.append(current.strip())
                    current = ""
                continue
            if line.startswith("*"):
                line = line.lstrip("* ").strip()
            if current:
                current = f"{current} {line}"
            else:
                current = line

        if current:
            steps.append(current.strip())

        return "\n".join(step for step in steps if step)

    def _extract_section(self, lines: list[str], start_label: str, end_labels: list[str]) -> list[str]:
        start_candidates: list[int] = []
        for index, line in enumerate(lines):
            normalized = self._ascii_fold(line)
            if normalized in {self._ascii_fold(start_label), f"## {self._ascii_fold(start_label)}"}:
                start_candidates.append(index + 1)
            if normalized == self._ascii_fold(f"## {start_label}"):
                start_candidates.append(index + 1)

        if not start_candidates:
            return []
        start_index = start_candidates[-1]

        collected: list[str] = []
        end_keys = {self._ascii_fold(label) for label in end_labels}
        for line in lines[start_index:]:
            normalized = self._ascii_fold(line)
            if normalized in end_keys or any(normalized.startswith(key) for key in end_keys):
                break
            collected.append(line)
        return collected

    def _parse_ingredient_line(self, line: str) -> dict:
        normalized = " ".join(line.split())
        normalized = re.sub(r"^[•*-]+\s*", "", normalized).strip()
        if not normalized:
            return {"name": "", "amount": None, "unit": None}

        match = re.match(
            r"^(?P<amount>\d+(?:[./]\d+)?|[¼½¾])\s+(?P<rest>.+)$",
            normalized,
        )
        if not match:
            return {"name": self._clean_ingredient_name(normalized), "amount": None, "unit": None}

        amount = self._normalize_fraction(match.group("amount"))
        rest = match.group("rest").strip()
        tokens = rest.split()
        known_units = {
            "g", "kg", "ml", "l", "tbsp", "tsp", "cup", "cups", "can", "cans",
            "clove", "cloves", "bunch", "bunches", "slice", "slices", "small",
            "medium", "large", "thumb-sized", "pack", "packs",
        }
        unit = tokens[0] if tokens and tokens[0].lower() in known_units else None
        name = " ".join(tokens[1:]) if unit else rest
        return {"name": self._clean_ingredient_name(name), "amount": amount, "unit": unit}

    def _evaluate_health(
        self,
        recipe_category: str,
        description: str,
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

        if carbohydrate is not None and carbohydrate <= carb_limit:
            labels.append("Düşük Karbonhidrat")
        if protein is not None and protein >= protein_limit:
            labels.append("Yüksek Protein")
        if calorie is not None and calorie <= calorie_limit:
            labels.append("Düşük Kalori")

        folded = self._ascii_fold(description)
        if "healthy" in folded and not labels:
            labels.append("Düşük Kalori")

        return HealthEvaluation(labels=labels, accepted=bool(labels))

    def _classify_recipe_category(self, recipe_url: str, title: str) -> str:
        haystack = self._ascii_fold(" ".join([recipe_url, title]))
        if any(token in haystack for token in ["breakfast", "brunch", "porridge", "oats", "smoothie", "toast", "egg"]):
            return "Kahvaltı"
        if any(token in haystack for token in ["dessert", "pudding", "mousse", "cake", "banana bread", "frozen yogurt", "ice cream", "tart"]):
            return "Tatlı"
        return "Ana Yemek"

    def _infer_cooking_type(self, title: str, instructions: str) -> str:
        haystack = self._ascii_fold(" ".join([title, instructions]))
        if any(token in haystack for token in ["oven", "bake", "roast", "traybake", "sheet pan"]):
            return "Fırın"
        if any(token in haystack for token in ["pan", "fry", "skillet", "stir-fry", "shakshuka"]):
            return "Tava"
        if any(token in haystack for token in ["pot", "simmer", "boil", "stew", "casserole", "soup", "curry"]):
            return "Tencere"
        if any(token in haystack for token in ["grill", "barbecue"]):
            return "Fırın"
        return "Tencere"

    def _infer_cooking_method(self, title: str, instructions: str) -> str:
        haystack = self._ascii_fold(" ".join([title, instructions]))
        rules = [
            ("Fırınlama", ["bake", "roast", "oven"]),
            ("Soteleme", ["fry", "saute", "stir-fry", "pan"]),
            ("Haşlama", ["boil", "simmer", "poach"]),
            ("Fırınlama", ["grill", "barbecue"]),
            ("Diğer", ["mix", "stir together", "whizz", "blend"]),
        ]
        for label, keywords in rules:
            if any(keyword in haystack for keyword in keywords):
                return label
        return "Diğer"

    def _compose_description(self, description: str, health_labels: list[str]) -> str:
        if not description:
            return "BBC Good Food kaynağından seçilmiş sağlıklı tarif."
        prefix = " | ".join(health_labels)
        return f"{prefix} - {description}" if prefix else description

    def _extract_meta_content(self, soup: BeautifulSoup, attr_name: str, attr_value: str) -> str | None:
        tag = soup.find("meta", attrs={attr_name: attr_value})
        if tag and tag.get("content"):
            return tag["content"].strip()
        return None

    def _text_or_none(self, node) -> str | None:
        if not node:
            return None
        text = node.get_text(" ", strip=True)
        return text or None

    def _parse_time_text(self, value: str | None) -> int | None:
        if not value:
            return None
        text = self._ascii_fold(str(value))
        hours = re.search(r"(\d+)\s*h", text)
        minutes = re.search(r"(\d+)\s*m", text)
        mins_full = re.search(r"(\d+)\s*min", text)
        total = 0
        if hours:
            total += int(hours.group(1)) * 60
        if minutes:
            total += int(minutes.group(1))
        elif mins_full:
            total += int(mins_full.group(1))
        return total or None

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

    def _normalize_fraction(self, value: str) -> str:
        replacements = {
            "¼": "0.25",
            "½": "0.5",
            "¾": "0.75",
        }
        return replacements.get(value, value)

    def _clean_ingredient_name(self, value: str) -> str:
        text = " ".join((value or "").split())
        if not text:
            return ""

        text = re.sub(r"\([^)]*\)", " ", text)
        text = re.sub(
            r"\b(to serve|for the sauce|for the dressing|for the topping|for garnish|plus extra|or blitz.*|using a food processor.*)\b.*$",
            "",
            text,
            flags=re.IGNORECASE,
        )
        text = re.sub(
            r"\b(chopped|finely chopped|roughly chopped|halved|sliced|diced|peeled|crushed|grated|beaten|drained|rinsed|cooked|uncooked|fresh|optional)\b",
            "",
            text,
            flags=re.IGNORECASE,
        )
        text = re.sub(r"\b(?:x\s+)?\d+\s*(?:g|kg|ml|l)\b", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\b(?:can|cans|jar|jars|pack|packs)\b", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s+", " ", text).strip(" ,.-")

        if " or " in text:
            text = text.split(" or ", 1)[0].strip(" ,.-")
        if "," in text:
            text = text.split(",", 1)[0].strip(" ,.-")

        return text

    def _clean_title(self, value: str) -> str:
        cleaned = re.sub(r"\s+recipe\s*$", "", value, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*-\s*Good Food\s*$", "", cleaned, flags=re.IGNORECASE)
        return cleaned.strip(" -")

    def _clean_text_block(self, value: str | None) -> str:
        if not value:
            return ""
        text = BeautifulSoup(unescape(str(value)), "html.parser").get_text("\n", strip=True)
        text = text.replace("\\n", "\n")
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
        if parsed.netloc not in {"www.bbcgoodfood.com", "bbcgoodfood.com"}:
            return False
        if not parsed.path.startswith("/recipes/"):
            return False
        if parsed.path.startswith("/recipes/collection"):
            return False
        if parsed.path.count("/") != 2:
            return False
        return True

    def _sleep(self, seconds: float) -> None:
        if not seconds:
            return
        import time
        time.sleep(seconds)
