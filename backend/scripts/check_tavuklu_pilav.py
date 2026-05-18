"""
Tavuklu Pilav tarifinin veritabani malzeme kontrolu.

Kullanim:
  python backend/scripts/check_tavuklu_pilav.py           # sadece kontrol
  python backend/scripts/check_tavuklu_pilav.py --apply  # eksik malzemeyi ekle
"""
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.database import SessionLocal
from app.db.models import Ingredient, Recipe, RecipeIngredient

APPLY = "--apply" in sys.argv


def main() -> None:
    with SessionLocal() as db:
        # ── 1. Tavuklu Pilav tarifini bul ─────────────────────────────────────
        recipe = (
            db.query(Recipe)
            .filter(Recipe.recipe_name.ilike("%tavuklu pilav%"))
            .first()
        )
        if not recipe:
            print("HATA: Tavuklu Pilav tarifi veritabaninda bulunamadi!")
            sys.exit(1)

        print(f"\nTarif   : {recipe.recipe_name} (ID: {recipe.recipe_id})")
        print(f"Porsiyon: {recipe.serving}")
        print(f"Kalori  : {recipe.calorie}")
        print(f"Kaynak  : {recipe.source_url or '-'}")

        # ── 2. Mevcut malzemeleri listele ─────────────────────────────────────
        rows = (
            db.query(RecipeIngredient, Ingredient)
            .join(Ingredient, Ingredient.ingredient_id == RecipeIngredient.ingredient_id)
            .filter(RecipeIngredient.recipe_id == recipe.recipe_id)
            .all()
        )

        print(f"\nMevcut malzemeler ({len(rows)} adet):")
        has_chicken = False
        for ri, ing in rows:
            amount_str = f"{ri.amount} " if ri.amount else ""
            unit_str = f"{ri.unit} " if ri.unit else ""
            print(f"   - {amount_str}{unit_str}{ing.ingredient_name}")
            name_lower = ing.ingredient_name.lower()
            if "tavuk" in name_lower and (
                "göğ" in name_lower or "gog" in name_lower or "gogus" in name_lower
            ):
                has_chicken = True

        # ── 3. Tavuk göğsü kontrolü ───────────────────────────────────────────
        if has_chicken:
            print("\n[OK] Tavuk göğsü zaten mevcut — düzeltme gerekmez.")
            return

        print("\n[UYARI] Tavuk göğsü malzemesi EKSİK!")

        # Veritabanında tavuk göğsü kaydını ara
        chicken = (
            db.query(Ingredient)
            .filter(Ingredient.ingredient_name.ilike("%tavuk göğ%"))
            .first()
        )
        if not chicken:
            # Geniş arama
            chicken = (
                db.query(Ingredient)
                .filter(Ingredient.ingredient_name.ilike("%tavuk%"))
                .first()
            )

        if not chicken:
            print("[HATA] Veritabanında 'tavuk' içeren hiçbir malzeme bulunamadı!")
            print("   Önce malzemeyi ingredients tablosuna ekleyin.")
            sys.exit(1)

        print(f"\n[BULUNDU] Eşleşen malzeme: {chicken.ingredient_name} (ID: {chicken.ingredient_id})")

        if not APPLY:
            print("\n[BILGI] Eklemek için: python scripts/check_tavuklu_pilav.py --apply")
            return

        # ── 4. Eksik malzemeyi ekle ───────────────────────────────────────────
        already = (
            db.query(RecipeIngredient)
            .filter(
                RecipeIngredient.recipe_id == recipe.recipe_id,
                RecipeIngredient.ingredient_id == chicken.ingredient_id,
            )
            .first()
        )
        if already:
            print("[BILGI] Bu malzeme zaten recipe_ingredients tablosunda kayıtlı.")
            return

        new_ri = RecipeIngredient(
            recipe_id=recipe.recipe_id,
            ingredient_id=chicken.ingredient_id,
            amount="300",
            unit="gram",
        )
        db.add(new_ri)
        db.commit()
        print(f"\n[BASARI] '{chicken.ingredient_name}' tarife eklendi (300 gram).")


if __name__ == "__main__":
    main()
