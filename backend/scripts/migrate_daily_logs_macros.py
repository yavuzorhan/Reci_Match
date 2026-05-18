"""
daily_logs tablosuna makro sütunlarini ekle (idempotent).

SQL:
  ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS protein_intake NUMERIC(6,2);
  ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS carbohydrate_intake NUMERIC(6,2);
  ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS fat_intake NUMERIC(6,2);
"""
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import text
from app.db.database import SessionLocal


MIGRATION_SQL = """
ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS protein_intake NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS carbohydrate_intake NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS fat_intake NUMERIC(6,2);
"""

CHECK_SQL = """
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'daily_logs'
  AND column_name IN ('protein_intake', 'carbohydrate_intake', 'fat_intake')
ORDER BY column_name;
"""


def main() -> None:
    with SessionLocal() as db:
        print("Migration basliyor: daily_logs makro sutunlari...\n")
        db.execute(text(MIGRATION_SQL))
        db.commit()
        print("[OK] ALTER TABLE basariyla calistirildi.\n")

        result = db.execute(text(CHECK_SQL)).fetchall()
        found = [row[0] for row in result]
        expected = ["carbohydrate_intake", "fat_intake", "protein_intake"]
        for col in expected:
            status = "MEVCUT" if col in found else "EKSIK"
            print(f"  {col:30s} -> {status}")

        if set(found) >= set(expected):
            print("\n[BASARI] Tum makro sutunlari daily_logs tablosunda mevcut.")
        else:
            print("\n[HATA] Bazi sutunlar hala eksik!")
            sys.exit(1)


if __name__ == "__main__":
    main()
