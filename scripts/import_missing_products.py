#!/usr/bin/env python3
"""Import ONLY the reconciled missing canonical LOBA products.

Loads DATABASE_URL from .env.local (never printed). Reuses
scripts/import_products.py::Importer with the exact missing article list from
scripts/reconciliation_report.json, so the existing idempotent architecture is
authoritative.

Usage:
  python scripts/import_missing_products.py [--report scripts/import_report.json]
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent
ENV_LOCAL = PROJECT_ROOT / ".env.local"
CONCILIATION_REPORT = PROJECT_ROOT / "scripts" / "reconciliation_report.json"
DEFAULT_IMPORT_REPORT = PROJECT_ROOT / "scripts" / "import_report.json"

sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
import import_products  # noqa: E402
from reconcile_products import database_url, load_env_local  # noqa: E402


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--report",
        default=str(DEFAULT_IMPORT_REPORT),
        help="Import report JSON path.",
    )
    args = parser.parse_args(argv)

    recon_path = CONCILIATION_REPORT
    if not recon_path.exists():
        sys.exit("reconciliation_report.json not found; run reconcile_products.py first.")

    recon = json.loads(recon_path.read_text(encoding="utf-8"))
    missing = recon.get("missing", [])
    print(f"Missing canonical products to import: {len(missing)}")
    if not missing:
        print(json.dumps({"counts": {}, "message": "nothing to import"}))
        return 0

    source_dir = pathlib.Path(r"D:\dev\loba-extractor\output\canonical")
    db_url = database_url()
    conn = import_products.connect(db_url, autocommit=False)
    importer = import_products.Importer(
        conn=conn,
        source_dir=source_dir,
        batch_size=50,
        report_rows=True,
        database_url=db_url,
    )
    try:
        counts, errors, warnings = importer.run(only=list(missing))
    except Exception:
        try:
            importer.conn.rollback()
        except Exception:
            pass
        raise
    finally:
        try:
            importer.conn.close()
        except Exception:
            pass

    summary = {
        "requested_missing": missing,
        "requested_count": len(missing),
        "counts": counts,
        "errors": errors,
        "warnings": warnings,
    }
    pathlib.Path(args.report).write_text(
        json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(json.dumps({"counts": counts, "errors": errors}, indent=2))
    print(f"\nImport report written to {args.report}")
    return 0 if counts["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())