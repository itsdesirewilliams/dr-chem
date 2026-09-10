#!/usr/bin/env python3
"""Post-import data integrity verification.

Checks the DR-Chem database directly (not importer output) against the 2,908
canonical LOBA records. Identity key = article_no (with legacy_ref fallback),
secondary = source_url -> product_source_urls.

Reads DATABASE_URL from .env.local (never printed).
Usage: python scripts/verify_import.py [--report scripts/verification_report.json]
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent
ENV_LOCAL = PROJECT_ROOT / ".env.local"
CANONICAL_DIR = pathlib.Path(r"D:\dev\loba-extractor\output\canonical")
DEFAULT_REPORT = PROJECT_ROOT / "scripts" / "verification_report.json"

sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
from reconcile_products import database_url, connect  # noqa: E402


def load_canonical():
    records = {}
    for path in sorted(CANONICAL_DIR.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        article = str(data.get("article_no") or "").strip()
        source_url = str(data.get("source_url") or "").strip()
        records[article] = {
            "source_url": source_url,
            "product_name": str(data.get("product_name") or "").strip(),
            "file": path.name,
            "json": data,
        }
    return records


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", default=str(DEFAULT_REPORT))
    args = parser.parse_args(argv)

    records = load_canonical()
    source_articles = set(records.keys())
    source_keys = {a.lower() for a in source_articles}

    conn = connect(database_url())
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, ltrim(article_number), ltrim(legacy_ref), "
                "ltrim(name), status FROM products"
            )
            db_products = cur.fetchall()
            cur.execute(
                "SELECT product_id, url, source_type FROM product_source_urls"
            )
            urls_by_product = {}
            for pid, url, stype in cur.fetchall():
                urls_by_product.setdefault(pid, []).append(
                    (str(url).strip(), stype)
                )
            cur.execute("SELECT count(*) FROM product_search_terms")
            search_term_total = cur.fetchone()[0]
            cur.execute(
                "SELECT product_id, count(*) FROM product_categories "
                "GROUP BY product_id"
            )
            cat_links = dict(cur.fetchall())
    finally:
        conn.close()

    db_by_key = {}
    db_by_id = {}
    for pid, article, legacy, name, status in db_products:
        article = article.strip() if article else ""
        legacy = legacy.strip() if legacy else ""
        db_by_id[pid] = {
            "article": article or legacy or "",
            "legacy": legacy,
            "name": name,
            "status": status,
        }
        for value in (article, legacy):
            if value:
                db_by_key.setdefault(value.lower(), pid)

    present = [a for a in source_articles if a.lower() in db_by_key]
    missing = [a for a in source_articles if a.lower() not in db_by_key]

    # Duplicate article keys mapping to >1 distinct product id.
    groups = {}
    for key, pid in db_by_key.items():
        groups.setdefault(key, set()).add(pid)
    dup_keys = sorted(k for k, v in groups.items() if len(v) > 1)
    dup_ids = sorted(pid for v in groups.values() if len(v) > 1 for pid in v)

    # Source-URL correspondence for every present article.
    url_mismatch = []
    url_catalogue_missing = []
    for article in present:
        rec = records[article]
        pid = db_by_key[article.lower()]
        attached = [u for u, _ in urls_by_product.get(pid, [])]
        if rec["source_url"] not in attached:
            url_mismatch.append(
                {"article": article, "expected": rec["source_url"]}
            )
        if not any(stype == "catalogue" for _, stype in urls_by_product.get(pid, [])):
            url_catalogue_missing.append(article)

    # Required identity fields on DB rows (name + article present).
    identity_problems = []
    for article in sorted(source_articles):
        pid = db_by_key.get(article.lower())
        if pid is None:
            continue
        meta = db_by_id[pid]
        if not meta["article"] or not meta["name"]:
            identity_problems.append(
                {"article": article, "pid": str(pid), "name": meta["name"]}
            )

    missing_cats = sorted(
        a for a in present if db_by_key[a.lower()] not in cat_links
    )

    report = {
        "source_count": len(source_articles),
        "database_product_count": len(db_by_id),
        "present_count": len(present),
        "missing_count": len(missing),
        "missing": missing,
        "duplicate_db_article_count": len(dup_keys),
        "duplicate_db_article_keys": dup_keys,
        "duplicate_db_product_ids": [str(p) for p in dup_ids],
        "url_mismatch_count": len(url_mismatch),
        "url_mismatch_samples": url_mismatch[:10],
        "url_catalogue_missing_count": len(url_catalogue_missing),
        "url_catalogue_missing_samples": url_catalogue_missing[:10],
        "identity_problem_count": len(identity_problems),
        "identity_problems": identity_problems[:10],
        "missing_category_link_count": len(missing_cats),
        "missing_category_links": missing_cats[:20],
        "product_search_terms_total": search_term_total,
    }

    pathlib.Path(args.report).write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"\nReport written to {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())