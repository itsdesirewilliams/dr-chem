#!/usr/bin/env python3
"""DR-Chem — Safety data verification.

Validates safety import against the database.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

# --- psycopg driver compatibility --------------------------------------------
def _resolve_driver():
    try:
        import psycopg as _psy
        return "psycopg3", _psy.connect
    except ImportError:
        pass
    try:
        import psycopg2 as _psy
        return "psycopg2", _psy.connect
    except ImportError:
        pass
    return None, None


DRIVER, _connect = _resolve_driver()


def connect(database_url: str, autocommit: bool = True):
    _, fn = _resolve_driver()
    if fn is None:
        raise SystemExit("No PostgreSQL driver found.")
    return fn(database_url, autocommit=autocommit)


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="DR-Chem — safety import verification.",
    )
    parser.add_argument(
        "--database-url",
        default=os.environ.get("DATABASE_URL"),
        help="PostgreSQL connection URL (or set DATABASE_URL).",
    )
    parser.add_argument(
        "--report",
        default=None,
        help="Write verification report to this path.",
    )
    args = parser.parse_args(argv)

    if not args.database_url:
        sys.exit("DATABASE_URL is not set.")

    conn = connect(args.database_url)
    cur = conn.cursor()

    report = {}

    # 1. Total products
    cur.execute("SELECT count(*) FROM products WHERE status IN ('active', 'draft')")
    report["total_active_products"] = cur.fetchone()[0]

    # 2. Safety records
    cur.execute("SELECT count(*) FROM product_safety")
    report["total_safety_records"] = cur.fetchone()[0]

    # 3. Products with safety
    cur.execute("""
        SELECT count(DISTINCT ps.product_id)
        FROM product_safety ps
        JOIN products p ON p.id = ps.product_id
        WHERE p.status IN ('active', 'draft')
    """)
    report["products_with_safety"] = cur.fetchone()[0]

    # 4. Products without safety
    report["products_without_safety"] = (
        report["total_active_products"] - report["products_with_safety"]
    )

    # 5. GHS rows
    cur.execute("SELECT count(*) FROM product_safety_ghs")
    report["total_ghs_rows"] = cur.fetchone()[0]

    # 6. GHS code distribution
    cur.execute("""
        SELECT ghs_code, count(*) as cnt
        FROM product_safety_ghs
        GROUP BY ghs_code
        ORDER BY cnt DESC
    """)
    report["ghs_distribution"] = dict(cur.fetchall())

    # 7. Field-level counts
    fields = [
        "signal_word", "un_number", "imco_class", "packing_group",
        "hazardous_statement", "precaution_statement",
        "risk_statement", "safety_statement", "revision_date"
    ]
    field_counts = {}
    for field in fields:
        cur.execute(f"""
            SELECT count(*) FROM product_safety WHERE {field} IS NOT NULL
        """)
        field_counts[field] = cur.fetchone()[0]
    report["field_counts"] = field_counts

    # 8. Orphan check
    cur.execute("""
        SELECT count(*) FROM product_safety ps
        WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = ps.product_id)
    """)
    report["orphan_safety_records"] = cur.fetchone()[0]

    # 9. Duplicate safety per product
    cur.execute("""
        SELECT count(*) FROM (
            SELECT product_id, count(*) as cnt
            FROM product_safety
            GROUP BY product_id
            HAVING count(*) > 1
        ) t
    """)
    report["duplicate_safety_per_product"] = cur.fetchone()[0]

    # 10. Duplicate GHS per safety
    cur.execute("""
        SELECT count(*) FROM (
            SELECT product_safety_id, ghs_code, count(*) as cnt
            FROM product_safety_ghs
            GROUP BY product_safety_id, ghs_code
            HAVING count(*) > 1
        ) t
    """)
    report["duplicate_ghs_per_safety"] = cur.fetchone()[0]

    # 11. Sample products with safety
    cur.execute("""
        SELECT p.legacy_ref, p.name, ps.signal_word, ps.un_number,
               ps.imco_class, ps.packing_group,
               ps.hazardous_statement, ps.precaution_statement,
               ps.risk_statement, ps.safety_statement,
               ps.revision_date,
               array_agg(ghs.ghs_code) as ghs_codes
        FROM product_safety ps
        JOIN products p ON p.id = ps.product_id
        LEFT JOIN product_safety_ghs ghs ON ghs.product_safety_id = ps.id
        WHERE p.status IN ('active', 'draft')
        GROUP BY ps.id, p.legacy_ref, p.name
        ORDER BY p.name
        LIMIT 20
    """)
    cols = [d[0] for d in cur.description]
    report["sample_safety_records"] = [dict(zip(cols, row)) for row in cur.fetchall()]

    cur.close()
    conn.close()

    print(json.dumps(report, indent=2, default=str))

    if args.report:
        Path(args.report).write_text(
            json.dumps(report, indent=2, default=str, ensure_ascii=False),
            encoding="utf-8"
        )
        print(f"\nReport written to {args.report}")

    # Exit with error if issues found
    issues = []
    if report["orphan_safety_records"]:
        issues.append(f"Orphan safety records: {report['orphan_safety_records']}")
    if report["duplicate_safety_per_product"]:
        issues.append(f"Duplicate safety per product: {report['duplicate_safety_per_product']}")
    if report["duplicate_ghs_per_safety"]:
        issues.append(f"Duplicate GHS per safety: {report['duplicate_ghs_per_safety']}")

    if issues:
        print("\nISSUES FOUND:", file=sys.stderr)
        for issue in issues:
            print(f"  - {issue}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())