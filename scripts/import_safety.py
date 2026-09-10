#!/usr/bin/env python3
"""DR-Chem — Safety data importer.

Imports safety information from canonical JSON files into the
product_safety and product_safety_ghs tables.

Idempotent: keyed by product legacy_ref (article_no).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

# --- psycopg driver compatibility --------------------------------------------
def _resolve_driver():
    try:
        import psycopg as _psy  # psycopg 3
        return "psycopg3", _psy.connect
    except ImportError:
        pass
    try:
        import psycopg2 as _psy  # psycopg 2
        return "psycopg2", _psy.connect
    except ImportError:
        pass
    return None, None


DRIVER, _connect = _resolve_driver()


def connect(database_url: str, autocommit: bool = False):
    _, fn = _resolve_driver()
    if fn is None:
        raise SystemExit(
            "No PostgreSQL driver found. Install one:\n"
            "  pip install psycopg2-binary   (or: pip install psycopg[binary])"
        )
    return fn(database_url, autocommit=autocommit)


# --- constants ---------------------------------------------------------------
DEFAULT_SOURCE_DIR = r"D:\dev\loba-extractor\output\canonical"
DEFAULT_BATCH_SIZE = 100

GHS_RE = re.compile(r"^GHS0[2-9]$", re.IGNORECASE)
UN_RE = re.compile(r"^\d{4}$")
DATE_RE = re.compile(r"^(\d{1,2})[-/](\w{3})[-/](\d{4})$")


# --- text helpers ------------------------------------------------------------
def parse_revision_date(raw):
    """Parse '08-Nov-2013' -> date object."""
    if not raw or not isinstance(raw, str):
        return None, None
    try:
        return datetime.strptime(raw.strip(), "%d-%b-%Y").date(), None
    except ValueError:
        return None, f"unparseable revision_date {raw!r}"


def parse_date_flexible(raw):
    """Try multiple date formats."""
    if not raw or not isinstance(raw, str):
        return None, None
    raw = raw.strip()
    for fmt in ("%d-%b-%Y", "%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(raw, fmt).date(), None
        except ValueError:
            pass
    return None, f"unparseable date {raw!r}"


# --- Importer ----------------------------------------------------------------
class SafetyImporter:
    """Streams canonical JSON records and imports safety data."""

    def __init__(self, conn, source_dir: Path, batch_size: int, report_rows: bool):
        self.conn = conn
        self.source_dir = source_dir
        self.batch_size = batch_size
        self.report_rows = report_rows
        self.counts = {
            "processed": 0,
            "safety_inserted": 0,
            "safety_updated": 0,
            "ghs_inserted": 0,
            "skipped": 0,
            "failed": 0,
        }
        self.errors = []
        self.warnings = [] if report_rows else None

    def warn(self, article, message):
        if self.report_rows:
            self.warnings.append({"article_no": article, "warning": message})

    def fail(self, article, filename, reason):
        self.counts["failed"] += 1
        self.errors.append(
            {"article_no": article, "file": filename, "reason": reason}
        )

    def run(self, limit=None):
        files = sorted(self.source_dir.glob("*.json"))
        if limit:
            files = files[:limit]
        if not files:
            raise FileNotFoundError(
                f"No JSON files found in {self.source_dir!s}"
            )

        for path in files:
            self.counts["processed"] += 1
            self._process_one(path)
            if self.counts["processed"] % self.batch_size == 0:
                self.conn.commit()

        self.conn.commit()
        return self.counts, self.errors, self.warnings

    def _process_one(self, path: Path):
        with self.conn.cursor() as cur:
            cur.execute("SAVEPOINT per_record")
        try:
            with open(path, "r", encoding="utf-8") as fh:
                record = json.load(fh)
            if not isinstance(record, dict):
                raise ValueError("top-level JSON is not an object")

            article = (
                record.get("article_no")
                if isinstance(record.get("article_no"), str)
                else None
            ) or path.stem

            safety = record.get("safety")
            if not safety or not isinstance(safety, dict):
                self.counts["skipped"] += 1
                return

            # Check if there's any actual safety data
            has_safety = any([
                safety.get("ghs_symbols"),
                safety.get("signal_word"),
                safety.get("un_number"),
                safety.get("imco_class"),
                safety.get("packing_group"),
                safety.get("hazardous_statement"),
                safety.get("precaution_statement"),
                safety.get("risk_statement"),
                safety.get("safety_statement"),
                safety.get("revision_date"),
            ])
            if not has_safety:
                self.counts["skipped"] += 1
                return

            source_url = record.get("source_url")
            if not source_url:
                source = record.get("source")
                if isinstance(source, dict):
                    source_url = source.get("url")

            with self.conn.cursor() as cur:
                status = self._import_safety(
                    cur,
                    article,
                    safety,
                    record.get("revision_date"),
                    source_url,
                )
            self.counts[status] += 1

        except Exception as exc:
            with self.conn.cursor() as cur:
                cur.execute("ROLLBACK TO SAVEPOINT per_record")
            self.fail(article, path.name, f"{type(exc).__name__}: {exc}")

    def _import_safety(
        self,
        cur,
        article,
        safety,
        product_revision_date=None,
        source_url=None,
    ):
        """Import safety data for one product. Returns 'safety_inserted' or 'safety_updated'."""
        # Get product_id by legacy_ref = article_no
        cur.execute(
            "SELECT id FROM products WHERE legacy_ref = %s",
            (article,),
        )
        row = cur.fetchone()
        if not row:
            raise ValueError(f"Product not found for article_no: {article}")
        product_id = row[0]

        # Parse revision date - use safety revision_date, fallback to product revision_date
        safety_rev = safety.get("revision_date")
        rev_source = safety_rev if safety_rev else product_revision_date
        rev_date, warn = parse_revision_date(rev_source)
        if warn:
            self.warn(article, warn)

        # Check if safety record exists
        cur.execute(
            "SELECT id FROM product_safety WHERE product_id = %s",
            (product_id,),
        )
        existing = cur.fetchone()

        ghs_symbols = safety.get("ghs_symbols") or []
        # Filter valid GHS codes
        ghs_symbols = [g for g in ghs_symbols if GHS_RE.match(g)]

        if existing is None:
            # Insert new safety record
            cur.execute(
                """
                INSERT INTO product_safety
                    (product_id, signal_word, un_number, imco_class, packing_group,
                     hazardous_statement, precaution_statement, risk_statement,
                     safety_statement, revision_date, source_url)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    product_id,
                    safety.get("signal_word"),
                    safety.get("un_number"),
                    safety.get("imco_class"),
                    safety.get("packing_group"),
                    safety.get("hazardous_statement"),
                    safety.get("precaution_statement"),
                    safety.get("risk_statement"),
                    safety.get("safety_statement"),
                    rev_date,
                    source_url,
                ),
            )
            safety_id = cur.fetchone()[0]
            status = "safety_inserted"
        else:
            safety_id = existing[0]
            # Update existing record (only non-null source fields)
            cur.execute(
                """
                UPDATE product_safety SET
                    signal_word = COALESCE(%s, signal_word),
                    un_number = COALESCE(%s, un_number),
                    imco_class = COALESCE(%s, imco_class),
                    packing_group = COALESCE(%s, packing_group),
                    hazardous_statement = COALESCE(%s, hazardous_statement),
                    precaution_statement = COALESCE(%s, precaution_statement),
                    risk_statement = COALESCE(%s, risk_statement),
                    safety_statement = COALESCE(%s, safety_statement),
                    revision_date = COALESCE(%s, revision_date),
                    source_url = COALESCE(%s, source_url),
                    updated_at = now()
                WHERE id = %s
                """,
                (
                    safety.get("signal_word"),
                    safety.get("un_number"),
                    safety.get("imco_class"),
                    safety.get("packing_group"),
                    safety.get("hazardous_statement"),
                    safety.get("precaution_statement"),
                    safety.get("risk_statement"),
                    safety.get("safety_statement"),
                    rev_date,
                    source_url,
                    safety_id,
                ),
            )
            status = "safety_updated"

        # Handle GHS symbols - delete existing and re-insert for idempotency
        cur.execute(
            "DELETE FROM product_safety_ghs WHERE product_safety_id = %s",
            (safety_id,),
        )
        for ghs in ghs_symbols:
            cur.execute(
                """
                INSERT INTO product_safety_ghs (product_safety_id, ghs_code)
                VALUES (%s, %s)
                ON CONFLICT (product_safety_id, ghs_code) DO NOTHING
                """,
                (safety_id, ghs.upper()),
            )
            if cur.rowcount:
                self.counts["ghs_inserted"] += 1

        return status


# --- CLI ---------------------------------------------------------------------
def main(argv=None):
    parser = argparse.ArgumentParser(
        description="DR-Chem — canonical JSON safety -> PostgreSQL importer.",
    )
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL"),
        help="PostgreSQL connection URL (or set DATABASE_URL).",
    )
    parser.add_argument(
        "--source-dir",
        default=DEFAULT_SOURCE_DIR,
        help="Directory of canonical *.json files (default: %(default)s).",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help="Records per outer transaction (default: %(default)s).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Stop after this many records (smoke-test / dry run).",
    )
    parser.add_argument(
        "--report",
        default=None,
        help="Write a JSON report to this path.",
    )
    parser.add_argument(
        "--verbose-warnings",
        action="store_true",
        help="Capture per-row warnings in the report (default: counts only).",
    )
    args = parser.parse_args(argv)

    if not args.database_url:
        sys.exit(
            "DATABASE_URL is not set. Use --database-url or export it before "
            "running."
        )

    source_dir = Path(args.source_dir)
    if not source_dir.is_dir():
        sys.exit(f"Source directory not found: {source_dir}")

    report_rows = args.verbose_warnings

    conn = connect(args.database_url, autocommit=False)
    importer = SafetyImporter(
        conn=conn,
        source_dir=source_dir,
        batch_size=max(1, args.batch_size),
        report_rows=report_rows,
    )
    try:
        counts, errors, warnings = importer.run(limit=args.limit)
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        raise
    finally:
        conn.close()

    summary = {
        "counts": counts,
        "errors": errors,
        "warnings": warnings if report_rows else None,
        "source_dir": str(source_dir),
        "batch_size": args.batch_size,
        "limit": args.limit,
        "driver": DRIVER,
    }

    print(json.dumps({"counts": counts, "errors": errors}, indent=2))

    if args.report:
        Path(args.report).write_text(
            json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        print(f"Report written to {args.report}")

    return 0 if counts["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())