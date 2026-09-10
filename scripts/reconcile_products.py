#!/usr/bin/env python3
"""Reconcile the LOBA canonical dataset against the DR-Chem products table.

Identity rules:
  * Primary key:     canonical article_no == products.article_number,
                     legacy_ref is also matched (the importer's join key).
  * Secondary check: canonical source_url -> product_source_urls.url
                     (only "catalogue" source_type rows).
  * Product name is never used as an identity key.

Reads DATABASE_URL from .env.local (never printed). Usage:
  python scripts/reconcile_products.py [--report PATH]
Prints the missing article numbers and writes the report JSON.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent
ENV_LOCAL = PROJECT_ROOT / ".env.local"
CANONICAL_DIR = pathlib.Path(r"D:\dev\loba-extractor\output\canonical")
DEFAULT_REPORT = PROJECT_ROOT / "scripts" / "reconciliation_report.json"


def load_env_local(path: pathlib.Path) -> dict:
    env = {}
    if not path.exists():
        return env
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
            value = value[1:-1]
        env[key] = value
    return env


def database_url() -> str:
    env = load_env_local(ENV_LOCAL)
    url = env.get("DATABASE_URL") or ""
    if not url:
        sys.exit("DATABASE_URL not found in .env.local")
    return url


def connect(url: str):
    try:
        import psycopg  # type: ignore
    except ImportError:  # pragma: no cover
        import psycopg2  # type: ignore

        return psycopg2.connect(url)
    return psycopg.connect(url)


def load_canonical():
    """Return {article_no: {"source_url", "product_name", "file"}} for 2,908 files."""
    records = {}
    for path in sorted(CANONICAL_DIR.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        article = str(data.get("article_no") or "").strip()
        source_url = str(data.get("source_url") or "").strip()
        if not article or not source_url:
            raise ValueError(f"{path.name}: missing article_no/source_url")
        records[article] = {
            "source_url": source_url,
            "product_name": str(data.get("product_name") or "").strip(),
            "file": path.name,
        }
    return records


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--report", default=str(DEFAULT_REPORT), help="Report JSON path."
    )
    args = parser.parse_args(argv)

    records = load_canonical()
    source_articles = set(records.keys())
    source_keys = {a.lower() for a in source_articles}

    conn = connect(database_url())
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, ltrim(article_number), ltrim(legacy_ref) FROM products"
            )
            db_products = cur.fetchall()
            cur.execute(
                "SELECT product_id, url FROM product_source_urls "
                "WHERE source_type = 'catalogue'"
            )
            urls_by_product = {}
            for pid, url in cur.fetchall():
                urls_by_product.setdefault(pid, set()).add(str(url).strip())
    finally:
        conn.close()

    db_by_key = {}
    db_by_id = {}
    for pid, article, legacy in db_products:
        article = article.strip() if article else ""
        legacy = legacy.strip() if legacy else ""
        db_by_id[pid] = {"article": article or legacy or ""}
        for value in (article, legacy):
            if value:
                db_by_key.setdefault(value.lower(), pid)

    missing = []
    secondary_url_matched = []
    for article in sorted(records.keys()):
        if article.lower() in db_by_key:
            continue
        wanted = records[article]["source_url"]
        pid = next(
            (p for p, urls in urls_by_product.items() if wanted in urls), None
        )
        if pid is not None:
            secondary_url_matched.append(article)
        else:
            missing.append(article)

    extras = [
        {"id": str(pid), "article": meta["article"]}
        for pid, meta in db_by_id.items()
        if not (meta["article"] and meta["article"].strip().lower() in source_keys)
    ]

    # Duplicate article keys in the database.
    groups = {}
    for key, pid in db_by_key.items():
        groups.setdefault(key, []).append(pid)
    dup_keys = sorted(k for k, v in groups.items() if len(v) > 1)

    report = {
        "source_count": len(source_articles),
        "database_product_count": len(db_by_id),
        "missing_count": len(missing),
        "missing": missing,
        "secondary_url_matched_count": len(secondary_url_matched),
        "secondary_url_matched": secondary_url_matched,
        "extra_db_count": len(extras),
        "extra_db_samples": extras[:20],
        "duplicate_db_article_count": len(dup_keys),
        "duplicate_db_article_keys": dup_keys,
    }

    pathlib.Path(args.report).write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"\nReport written to {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())