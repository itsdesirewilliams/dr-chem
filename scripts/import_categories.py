#!/usr/bin/env python3
"""Category importer — establishes the initial DR Chemicals catalogue taxonomy.

Source of truth (provided by the user, never invented):
  loba_urls_all.csv  →  columns: url, category, subcategory, article_no, product_name

Behaviour
  1. Every distinct source category becomes a `categories` row. When a row has
     a subcategory, the subcategory is created as a CHILD of its category
     (two levels, mirroring the source hierarchy).
  2. Names are preserved verbatim apart from safe normalisation: surrounding
     whitespace stripped, internal whitespace collapsed, and exact
     case/whitespace duplicates collapse to one row (first casing wins).
  3. Products are matched by article number (fallback: legacy_ref) and linked
     through product_categories to the MOST SPECIFIC source level only
     (subcategory when present, else the category) — never double-linked to
     an ancestor and its descendant.
  4. Idempotent: categories upsert by unique slug; links use
     ON CONFLICT (product_id, category_id) DO NOTHING.
  5. Product data is never touched; existing primary-category assignments are
     preserved (is_primary only when the product has none yet).

Usage:
  python scripts/import_categories.py [--csv PATH] [--database-url URL]
                                      [--dry-run] [--batch-size 200]

DATABASE_URL is read from the environment when --database-url is omitted.
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import sys
from collections import Counter

# Driver detection — psycopg 3 preferred, psycopg2 fallback (mirrors
# scripts/import_products.py).
DRIVER = None
try:  # psycopg 3
    import psycopg  # type: ignore

    DRIVER = "psycopg3"
except ImportError:  # pragma: no cover
    try:
        import psycopg2  # type: ignore

        DRIVER = "psycopg2"
    except ImportError:
        DRIVER = None


def connect(database_url: str):
    """Open a connection with autocommit off (explicit transaction control)."""
    if DRIVER == "psycopg3":
        return psycopg.connect(database_url)  # autocommit defaults to off
    return psycopg2.connect(database_url)


_WS = re.compile(r"\s+")


def norm_name(value):
    """Strip + collapse whitespace. Case is preserved (first casing wins)."""
    return _WS.sub(" ", (value or "").strip())


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "category"


class SlugPool:
    """In-run slug uniqueness (DB uniqueness is enforced separately)."""

    def __init__(self) -> None:
        self._seen: Counter = Counter()

    def next(self, base: str) -> str:
        self._seen[base] += 1
        if self._seen[base] == 1:
            return base
        return f"{base}-{self._seen[base]}"


def article_key(value) -> str:
    return (value or "").strip().lower()


def main() -> int:
    parser = argparse.ArgumentParser(description="Import source categories + product links.")
    parser.add_argument(
        "--csv",
        default=r"D:\dev\loba-extractor\input\loba_urls_all.csv",
        help="Path to loba_urls_all.csv",
    )
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL", ""),
        help="PostgreSQL URL (defaults to $DATABASE_URL)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Roll back at the end")
    parser.add_argument("--batch-size", type=int, default=200)
    args = parser.parse_args()

    if DRIVER is None:
        print("ERROR: install a PostgreSQL driver: pip install 'psycopg[binary]'", file=sys.stderr)
        return 2
    if not args.database_url:
        print("ERROR: DATABASE_URL is not set and --database-url was not given.", file=sys.stderr)
        return 2
    if not os.path.isfile(args.csv):
        print(f"ERROR: CSV not found: {args.csv}", file=sys.stderr)
        return 2

    # ---- 1. Read the source of truth -------------------------------------
    rows = []
    with open(args.csv, newline="", encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            cat = norm_name(row.get("category"))
            art = (row.get("article_no") or "").strip()
            if not cat or not art:
                continue
            rows.append(
                {
                    "article": art,
                    "category": cat,
                    "subcategory": norm_name(row.get("subcategory")),
                }
            )
    print(f"CSV rows with article+category: {len(rows)}")

    conn = connect(args.database_url)
    counts = Counter()
    unmatched_samples = []

    try:
        cur = conn.cursor()

        # ---- 2. Existing categories → id map (case-insensitive by name) ----
        cur.execute("SELECT id, slug, name FROM categories")
        by_lower_name = {}
        slug_pool = SlugPool()
        existing_slugs = set()
        for cid, slug, name in cur.fetchall():
            by_lower_name[name.strip().lower()] = cid
            existing_slugs.add(slug)
        for slug in sorted(existing_slugs):
            slug_pool._seen[slug] = 1  # reserve DB slugs so new ones never clash

        def ensure_category(name, parent_id):
            """Return the category id for `name`, creating it when needed."""
            key = name.lower()
            if key in by_lower_name:
                counts["categories_existing"] += 1
                return by_lower_name[key]

            base = slugify(name)
            slug = slug_pool.next(base)
            while slug in existing_slugs:  # paranoia: also respect the DB set
                slug = slug_pool.next(base)
            cur.execute(
                """
                INSERT INTO categories (parent_id, name, slug)
                VALUES (%s, %s, %s)
                ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
                RETURNING id
                """,
                (parent_id, name, slug),
            )
            cid = cur.fetchone()[0]
            by_lower_name[key] = cid
            existing_slugs.add(slug)
            counts["categories_created"] += 1
            return cid

        # ---- 3. Existing products → match maps (never modified) -----------
        cur.execute("SELECT id, article_number, legacy_ref FROM products")
        by_article = {}
        by_legacy = {}
        for pid, article, legacy in cur.fetchall():
            if article:
                by_article[article_key(article)] = pid
            if legacy:
                by_legacy[article_key(legacy)] = pid
        print(f"Products loaded for matching: {len(by_article)} article keys")

        # ---- 4. Walk rows: create categories, link most-specific level ----
        seen_pairs = set()
        pending = 0

        def flush():
            nonlocal pending
            if not args.dry_run:
                conn.commit()
            pending = 0

        for row in rows:
            art = row["article"]
            cat_name = row["category"]
            sub_name = row["subcategory"]

            # Most specific source level only — no ancestor+descendant pairs.
            target_name = sub_name or cat_name
            pair = (article_key(art), target_name.lower())
            if pair in seen_pairs:
                counts["rows_duplicate"] += 1
                continue
            seen_pairs.add(pair)

            pid = by_article.get(article_key(art)) or by_legacy.get(article_key(art))
            if pid is None:
                counts["products_unmatched"] += 1
                if len(unmatched_samples) < 20:
                    unmatched_samples.append(art)
                continue
            counts["products_matched"] += 1

            cat_id = ensure_category(cat_name, None)
            sub_id = ensure_category(sub_name, cat_id) if sub_name else None
            target_id = sub_id or cat_id

            # Link, preserving any existing primary assignment: is_primary is
            # proposed only when the product has no primary category yet.
            cur.execute(
                """
                INSERT INTO product_categories (product_id, category_id, is_primary)
                SELECT %s, %s, NOT EXISTS (
                    SELECT 1 FROM product_categories pc
                     WHERE pc.product_id = %s AND pc.is_primary
                )
                ON CONFLICT (product_id, category_id) DO NOTHING
                """,
                (pid, target_id, pid),
            )
            if cur.rowcount:
                counts["links_inserted"] += 1
            else:
                counts["links_existing"] += 1

            pending += 1
            if pending >= args.batch_size:
                flush()

        flush()

        if args.dry_run:
            conn.rollback()
        else:
            conn.commit()

        # ---- 5. Summary ----------------------------------------------------
        print("\n=== Import summary " + ("[DRY-RUN — rolled back] " if args.dry_run else "") + "===")
        for key in (
            "rows_duplicate",
            "products_matched",
            "products_unmatched",
            "categories_created",
            "categories_existing",
            "links_inserted",
            "links_existing",
        ):
            print(f"{key:>20}: {counts[key]}")
        if unmatched_samples:
            print("\nUnmatched article numbers (first 20):")
            for art in unmatched_samples:
                print(f"  - {art}")
        print("\nDone.")
        return 0
    except Exception as exc:  # noqa: BLE001 — report and roll back cleanly
        conn.rollback()
        print(f"ERROR: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())