import json
import re
from html import unescape
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


class YemekComScraper:
    def __init__(self):
        self.base_url = "https://yemek.com"
        self.session = requests.Session()
        self.session.trust_env = False
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        }
        self.timeout = 25

    def collect_recipe_links(
        self,
        category_paths: list[str],
        target_link_count: int,
        max_pages_per_category: int = 3,
    ) -> list[str]:
        links: list[str] = []
        seen: set[str] = set()

        for category_path in category_paths:
            for page in range(1, max_pages_per_category + 1):
                try:
                    page_links = self.get_category_recipe_links(category_path, page=page)
                except Exception:
                    break
                if not page_links:
                    break

                for link in page_links:
                    if link in seen:
                        continue
                    seen.add(link)
                    links.append(link)
                    if len(links) >= target_link_count:
                        return links

        return links

    def get_category_recipe_links(self, category_path: str, page: int = 1) -> list[str]:
        url = self._category_page_url(category_path, page)
        data = self._load_next_data(url)
        recipe_search = data.get("props", {}).get("pageProps", {}).get("initialState", {}).get("recipeSearch", {})
        recipe_rows = recipe_search.get("recipeData") or []

        links: list[str] = []
        for item in recipe_rows:
            permalink = item.get("Permalink")
            if not permalink:
                continue
            absolute_url = urljoin(self.base_url, permalink)
            if not self._is_recipe_url(absolute_url):
                continue
            links.append(absolute_url)
        return links

    def parse_recipe_detail(self, recipe_url: str) -> dict | None:
        data = self._load_next_data(recipe_url)
        page_state = data.get("props", {}).get("pageProps", {}).get("initialState", {})
        content = page_state.get("content") or {}
        schema_recipe = self._extract_schema_recipe(data)

        title = (
            content.get("TitleCustomized")
            or content.get("ShortTitle")
            or content.get("ContentTitle")
            or schema_recipe.get("name")
            or ""
        ).strip()
        title = self._clean_title(title)
        if not title:
            return None

        servings = self._parse_servings(content.get("Servings") or schema_recipe.get("recipeYield"))
        per_serving_calorie = self._parse_float(content.get("PerServingCalories")) or self._parse_float(
            self._nested_get(schema_recipe, "nutrition", "calories")
        )
        protein, fat, carbohydrate = self._parse_nutritional_value(content.get("NutritionalValue"))

        total_calorie = round(per_serving_calorie * servings, 2) if per_serving_calorie is not None and servings else None
        total_protein = round(protein * servings, 2) if protein is not None and servings else None
        total_fat = round(fat * servings, 2) if fat is not None and servings else None
        total_carbohydrate = round(carbohydrate * servings, 2) if carbohydrate is not None and servings else None

        prep_time = self._parse_int(content.get("PrepTime"))
        cook_time = self._parse_int(content.get("CookTime"))
        total_time = None
        if prep_time is not None or cook_time is not None:
            total_time = (prep_time or 0) + (cook_time or 0)
        else:
            total_time = self._parse_iso_minutes(schema_recipe.get("totalTime"))

        ingredients = self._parse_ingredients(content.get("IngredientGroups") or [], schema_recipe.get("recipeIngredient"))
        instructions = self._parse_instructions(content.get("InstructionGroups") or [], schema_recipe.get("recipeInstructions"))
        image_url = self._extract_image_url(content, schema_recipe)
        description = self._extract_description(content, data, schema_recipe)
        category = self._extract_category(content, data, schema_recipe)
        recipe_category = self._classify_recipe_category(recipe_url, title, category, description, instructions)
        cooking_type = self._infer_cooking_type(title, instructions)
        cooking_method = self._infer_cooking_method(title, instructions)

        if not ingredients or not instructions:
            return None

        return {
            "title": title,
            "description": description,
            "category": category,
            "recipe_category": recipe_category,
            "cooking_type": cooking_type,
            "cooking_method": cooking_method,
            "total_time_minutes": total_time,
            "serving": servings,
            "calorie": total_calorie,
            "protein": total_protein,
            "carbohydrate": total_carbohydrate,
            "fat": total_fat,
            "ingredients": ingredients,
            "instructions": instructions,
            "image_url": image_url,
            "source_url": recipe_url,
            "source": "yemekcom",
        }

    def _category_page_url(self, category_path: str, page: int) -> str:
        normalized = "/" + category_path.strip("/") + "/"
        if page <= 1:
            return urljoin(self.base_url, normalized)
        return urljoin(self.base_url, f"{normalized}sayfa/{page}/")

    def _load_next_data(self, url: str) -> dict:
        response = self.session.get(url, headers=self.headers, timeout=self.timeout)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        next_data_tag = soup.find("script", id="__NEXT_DATA__")
        if not next_data_tag or not next_data_tag.string:
            raise ValueError(f"__NEXT_DATA__ bulunamadı: {url}")
        return json.loads(next_data_tag.string)

    def _extract_schema_recipe(self, data: dict) -> dict:
        scripts = data.get("props", {}).get("pageProps", {}).get("initialProps", {})
        _ = scripts
        return {}

    def _parse_ingredients(self, groups: list[dict], schema_ingredients) -> list[dict]:
        results: list[dict] = []
        if groups:
            for group in groups:
                for item in group.get("Items") or []:
                    ingredient = item.get("Ingredient") or {}
                    name = (ingredient.get("Name") or "").strip()
                    if not name:
                        continue
                    quantity = (item.get("Quantity") or "").strip() or None
                    unit = ((item.get("Unit") or {}).get("Name") or "").strip() or None
                    note = (item.get("Note") or "").strip()
                    if note:
                        name = f"{name} ({note})"
                    results.append({"name": name, "amount": quantity, "unit": unit})
            return results

        if isinstance(schema_ingredients, list):
            flattened = []
            for item in schema_ingredients:
                if isinstance(item, list):
                    flattened.extend(item)
                else:
                    flattened.append(item)
            for raw_line in flattened:
                if not raw_line:
                    continue
                parsed = self._parse_ingredient_line(str(raw_line))
                results.append(parsed)
        return results

    def _parse_instructions(self, groups: list[dict], schema_instructions) -> str:
        steps: list[str] = []
        if groups:
            for group in groups:
                for instruction in group.get("Instructions") or []:
                    description = self._clean_text_block(instruction.get("Description") or "")
                    if description:
                        steps.append(description)
        elif isinstance(schema_instructions, list):
            flattened = []
            for item in schema_instructions:
                if isinstance(item, list):
                    flattened.extend(item)
                else:
                    flattened.append(item)
            for item in flattened:
                if isinstance(item, dict):
                    text = self._clean_text_block(item.get("text") or item.get("name") or "")
                else:
                    text = self._clean_text_block(str(item))
                if text:
                    steps.append(text)
        return "\n".join(dict.fromkeys(steps))

    def _parse_nutritional_value(self, html: str | None) -> tuple[float | None, float | None, float | None]:
        if not html:
            return None, None, None

        text = BeautifulSoup(unescape(html), "html.parser").get_text(" ", strip=True)
        text = self._ascii_fold(text)

        carbohydrate = self._match_metric(text, "karbonhidrat")
        protein = self._match_metric(text, "protein")
        fat = self._match_metric(text, "yag")
        return protein, fat, carbohydrate

    def _extract_image_url(self, content: dict, schema_recipe: dict) -> str | None:
        featured_image = content.get("FeaturedImage")
        if isinstance(featured_image, str) and featured_image.strip():
            return featured_image.strip()
        if isinstance(featured_image, dict):
            media_data = featured_image.get("MediaData") or {}
            for key in ["ymk-original", "ymk-large", "ymk-medium", "ymk-thumbnail"]:
                candidate = self._nested_get(media_data, key, "Path")
                if candidate:
                    return candidate

        schema_images = content.get("SchemaImages") or schema_recipe.get("image")
        if isinstance(schema_images, dict):
            for key in ["ymk-original", "ymk-large", "ymk-medium", "ymk-thumbnail", "ymk-max-image"]:
                candidate = self._nested_get(schema_images, key, "Path")
                if candidate:
                    return candidate
        if isinstance(schema_images, list):
            for image_url in reversed(schema_images):
                if image_url:
                    return image_url
        if isinstance(schema_images, str) and schema_images:
            return schema_images
        return None

    def _extract_description(self, content: dict, data: dict, schema_recipe: dict) -> str | None:
        content_text = (content.get("ContentText") or "").strip()
        if content_text:
            return self._clean_text_block(content_text)

        seo_metas = data.get("props", {}).get("pageProps", {}).get("initialState", {}).get("seo", {}).get("Metas") or []
        for meta in seo_metas:
            if meta.get("name") == "description" and meta.get("content"):
                return meta["content"].strip()
        return schema_recipe.get("description")

    def _extract_category(self, content: dict, data: dict, schema_recipe: dict) -> str | None:
        for value in [content.get("CategoryName"), schema_recipe.get("recipeCategory")]:
            if isinstance(value, str) and value.strip():
                return value.strip()

        breadcrumbs = data.get("props", {}).get("pageProps", {}).get("initialState", {}).get("content", {}).get("Breadcrumbs") or []
        if len(breadcrumbs) >= 2:
            name = breadcrumbs[-2].get("Name") if isinstance(breadcrumbs[-2], dict) else None
            if name:
                return str(name).strip()
        return None

    def _parse_servings(self, value) -> int | None:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return int(round(value))

        text = self._ascii_fold(str(value))
        numbers = [int(piece) for piece in re.findall(r"\d+", text)]
        if not numbers:
            return None
        if len(numbers) == 1:
            return numbers[0]
        return int(round(sum(numbers) / len(numbers)))

    def _parse_int(self, value) -> int | None:
        if value is None or value == "":
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            match = re.search(r"\d+", str(value))
            return int(match.group(0)) if match else None

    def _parse_float(self, value) -> float | None:
        if value is None or value == "":
            return None
        if isinstance(value, (int, float)):
            return float(value)
        match = re.search(r"\d+(?:[.,]\d+)?", str(value))
        if not match:
            return None
        return float(match.group(0).replace(",", "."))

    def _parse_iso_minutes(self, value: str | None) -> int | None:
        if not value:
            return None
        match = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?", value.strip())
        if not match:
            return None
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        return (hours * 60) + minutes

    def _parse_ingredient_line(self, raw_line: str) -> dict:
        line = " ".join(raw_line.split())
        match = re.match(r"^(?P<amount>\d+(?:[.,]\d+)?(?:/\d+(?:[.,]\d+)?)?)\s+(?P<rest>.+)$", line)
        if not match:
            return {"name": line, "amount": None, "unit": None}

        amount = match.group("amount")
        rest = match.group("rest").strip()
        tokens = rest.split()
        unit = tokens[0] if tokens else None
        name = " ".join(tokens[1:]).strip() if len(tokens) > 1 else rest
        return {"name": name or rest, "amount": amount, "unit": unit}

    def _clean_title(self, value: str) -> str:
        cleaned = re.sub(r"\(\s*resimli\s*-\s*videolu\s*\)", "", value, flags=re.IGNORECASE)
        cleaned = re.sub(r"\(\s*videolu\s*\)", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\bvideolu\b", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s{2,}", " ", cleaned)
        return cleaned.strip(" -–")

    def _infer_cooking_type(self, title: str, instructions: str) -> str | None:
        title_text = self._ascii_fold(title)
        instruction_text = self._ascii_fold(instructions)
        haystack = f"{title_text} {instruction_text}"

        if "airfryer" in haystack:
            return "Airfryer"
        if any(keyword in haystack for keyword in ["duduklu", "duduklude"]):
            return "Düdüklü"
        if any(keyword in title_text for keyword in ["firin", "graten", "guvec", "tepsi"]):
            return "Fırın"
        if any(keyword in title_text for keyword in ["pilav", "corba", "sutlac", "yahni", "yemegi", "fasulye", "dolma"]):
            return "Tencere"
        if any(keyword in title_text for keyword in ["menemen", "omlet", "krep", "pankek", "sote", "mucver"]):
            return "Tava"
        if any(keyword in haystack for keyword in ["firin", "tepsi", "guvec"]):
            return "Fırın"
        if any(keyword in haystack for keyword in ["tencere", "kaynat", "hasil", "pilav", "corba", "yemegi"]):
            return "Tencere"
        if any(keyword in haystack for keyword in ["tava", "sote", "kavur", "cevir"]):
            return "Tava"
        return None

    def _infer_cooking_method(self, title: str, instructions: str) -> str | None:
        title_text = self._ascii_fold(title)
        instruction_text = self._ascii_fold(instructions)
        haystack = f"{title_text} {instruction_text}"

        method_rules = [
            ("Fırınlama", ["firinla", "firinda", "tepsi", "graten", "guvec"]),
            ("Kızartma", ["kizart", "deep fry", "panele", "pane"]),
            ("Haşlama", ["hasla", "kaynat", "suda pisir"]),
            ("Soteleme", ["sotele", "sote", "cevir", "wok"]),
            ("Izgara", ["izgara", "mangal", "grill"]),
            ("Buharda", ["buharda"]),
            ("Kavurma", ["kavur", "muhurle"]),
            ("Dolgu", ["dolma", "sar", "ici doldur"]),
            ("Yogurma", ["yogur", "hamur"]),
        ]

        for label, keywords in method_rules:
            if any(keyword in haystack for keyword in keywords):
                return label
        return None

    def _classify_recipe_category(
        self,
        recipe_url: str,
        title: str,
        raw_category: str | None,
        description: str | None,
        instructions: str,
    ) -> str | None:
        haystack = self._ascii_fold(" ".join(filter(None, [recipe_url, title, raw_category, description, instructions])))

        if any(keyword in haystack for keyword in ["corba", "mercimek corbasi", "ezogelin", "tarhana"]):
            return "Çorba"
        if any(keyword in haystack for keyword in ["kahvalti", "menemen", "muhlama", "kuymak", "yumurta", "omlet", "sucuklu", "gozleme", "kaygana", "pankek", "krep"]):
            return "Kahvaltı"
        if any(keyword in haystack for keyword in ["tatli", "baklava", "sutlac", "kurabiye", "kek", "pasta", "muhallebi", "helva", "brownie", "waffle"]):
            return "Tatlı"
        if any(keyword in haystack for keyword in ["meze", "haydari", "cacik", "atom", "humus", "salata", "tarator", "ezme"]):
            return "Meze"
        if any(keyword in haystack for keyword in ["borek", "pogaca", "acma", "simit", "ekmek", "pide", "lahmacun", "pizza", "corek", "kruvasan", "milfoy", "poale", "unlu"]):
            return "Un Mamulleri"
        if any(keyword in haystack for keyword in ["ana yemek", "tavuk", "et", "kofte", "pilav", "makarna", "dolma", "sarma", "yahni", "sebze yemegi", "guvec", "kebap"]):
            return "Ana Yemek"
        return None

    def _match_metric(self, text: str, label: str) -> float | None:
        match = re.search(rf"(\d+(?:[.,]\d+)?)\s*gram\s+{label}", text)
        if not match:
            return None
        return float(match.group(1).replace(",", "."))

    def _is_recipe_url(self, url: str) -> bool:
        if not url.startswith(f"{self.base_url}/tarif/"):
            return False
        path = url.replace(self.base_url, "")
        if path.count("/") < 3:
            return False
        excluded = {
            "/tarif/",
            "/tarif/video/",
            "/tarif/sizden-gelenler/",
            "/tarif/dr-oetker-airfryer-lezzetleri/",
        }
        return path not in excluded

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
        return " ".join(value.translate(translation).lower().split())

    def _nested_get(self, data: dict, *keys):
        current = data
        for key in keys:
            if not isinstance(current, dict):
                return None
            current = current.get(key)
        return current

    def _clean_text_block(self, value: str) -> str:
        if not value:
            return ""
        text = BeautifulSoup(unescape(value), "html.parser").get_text("\n", strip=True)
        text = re.sub(r"\n{2,}", "\n", text)
        text = re.sub(r"[ \t]+", " ", text)
        return text.strip()
