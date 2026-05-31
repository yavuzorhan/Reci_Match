from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(base_dir)

from scraper.yemekcom_scraper import YemekComScraper


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=str(Path(base_dir) / "audit_yemekcom_results.json"))
    parser.add_argument("--output", default=str(Path(base_dir) / "rescrape_yemekcom_results.json"))
    parser.add_argument("--dry-run", action="store_true", default=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    rows = json.loads(Path(args.input).read_text(encoding="utf-8"))
    suspicious = [row for row in rows if row.get("should_deactivate") and row.get("source_url")]
    scraper = YemekComScraper()
    results = []
    for row in suspicious:
        try:
            parsed = scraper.parse_recipe_detail(row["source_url"])
            results.append({"recipe_id": row["recipe_id"], "source_url": row["source_url"], "parsed": parsed})
            print(f"OK {row['recipe_id']} {row['source_url']}")
        except Exception as exc:
            results.append({"recipe_id": row["recipe_id"], "source_url": row["source_url"], "error": str(exc)})
            print(f"FAIL {row['recipe_id']} {exc}")
    Path(args.output).write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"checked": len(suspicious), "output": args.output}, ensure_ascii=False))


if __name__ == "__main__":
    main()
