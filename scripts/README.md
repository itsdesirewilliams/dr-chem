# DR-Chem — JSON Importer

Imports the 2,908 canonical product records produced by
[loba-extractor](D:\dev\loba-extractor) into the PostgreSQL schema defined in
[`docs/DATABASE-ARCHITECTURE.md`](../docs/DATABASE-ARCHITECTURE.md) and realised
by the migrations in [`supabase/migrations/`](../supabase/migrations/).

> This directory is the only place the importer should be created. Nothing
> outside `scripts/` is touched by Step 8.

## Files

| File | Purpose |
|---|---|
| `import_products.py` | The importer (single-file Python, ~900 lines). |
| `requirements.txt`   | Python runtime dependencies (one of the two PG drivers). |
| `self_test.py`       | Tiny, offline check of the pure-Python helpers (slug, parse, …). |

## What it does

- Streams one JSON file at a time. The dataset is never held in RAM.
- Idempotent: products are keyed by `legacy_ref = article_no`; child inserts
  use `ON CONFLICT DO NOTHING` (or null-filling `ON CONFLICT DO UPDATE`) so
  re-runs converge.
- Batched transactions (default 100 records) with a per-record `SAVEPOINT`
  so a single bad record is reported and skipped — the run continues.
- Validates each record before writing (required `article_no`, `product_name`;
  CAS regex; revision date format; URL shape; numeric parse for `value` and
  `molecular_weight`).
- Never overwrites valid existing data with missing/null source fields —
  existing `name` / `summary` / `description` are preserved.
- Preserves source wording verbatim in `product_properties.value_text`,
  `product_packings.title`, `product_shelf_life.notes` etc.
- Collision-safe slugs exactly per [`DATABASE-ARCHITECTURE.md` §4.1.1](../docs/DATABASE-ARCHITECTURE.md).
- Uses the consolidated `product_properties` + `property_definitions`
  tables; the removed `product_specifications` / `product_physical_properties`
  tables are not touched.
- `product_hs_codes` junction retained (not collapsed).
- `product_properties.value_text` is excluded from primary FTS initially —
  only property *labels* are indexed (roadmap Step 4 decision).
- Uses the standard PostgreSQL `psycopg` or `psycopg2` driver over
  `DATABASE_URL`. No Supabase-specific APIs. Connect as the table owner (the
  Supabase `postgres` role) so RLS does not block the import.

## Prerequisites

1. **Migrations applied** — `supabase/migrations/*.sql` must already be in the
   target database. See [`docs/SUPABASE-MIGRATIONS.md`](../docs/SUPABASE-MIGRATIONS.md).
2. **Source data present** —
   `D:\dev\loba-extractor\output\canonical\` (2,908 `*.json` files).
3. **Python driver** — `pip install -r scripts/requirements.txt` (or
   `pip install psycopg2-binary`).
4. **`DATABASE_URL`** in the environment (or passed via `--database-url`).
   Use the **connection-pooler** URL from Supabase Dashboard → Project
   Settings → Database on port `6543` for IPv4-friendly access, or the
   direct session-mode URL on `5432`.

## Run

```powershell
# Full run (uses the documented defaults)
$env:DATABASE_URL = "postgresql://postgres:<password>@<host>:5432/postgres"
python scripts/import_products.py

# Smoke test: first 10 records only, write a JSON report
python scripts/import_products.py --limit 10 --report scripts/import_report.json

# Capture per-row warnings in the report
python scripts/import_products.py --limit 100 --verbose-warnings --report scripts/report.json

# Custom source folder / batch size
python scripts/import_products.py --source-dir D:\dev\other-canonical --batch-size 250
```

Exit code: `0` on full success, `1` if any record failed (the run itself
continues; the per-record failures are listed in the report and on stdout).

## Self-test (no DB)

```powershell
$env:PYTHONPATH = "scripts"
python scripts/self_test.py
```

## What gets imported (per record)

| Source JSON key(s) | Target |
|---|---|
| `article_no` | `products.legacy_ref` (unique) **and** `products.article_number` |
| `product_name` | `products.name`; `product_search_terms(source='name')` |
| `description` | `products.description` |
| `grade` | `products.summary` |
| `synonyms[]` | `product_synonyms`; `product_search_terms(source='synonym')` |
| `cas_no` | `product_cas_numbers`; `product_search_terms(source='cas')` |
| `molecular_formula` + `molecular_weight` | `product_molecular_data`; `product_search_terms(source='formula')` |
| `hs_code` | `hs_codes` + `product_hs_codes`; `product_search_terms(source='hs_code')` |
| `shelf_life` | `product_shelf_life` (parsed `period_value`+`period_unit`, original text in `notes`) |
| `physical_properties[]` | `product_properties` (via `property_definitions(property_type='physical')`) |
| `specifications[]` | `product_properties` (via `property_definitions(property_type='spec')`); **labels** also indexed as `source='spec'` |
| `packings[]` | `product_packings` |
| `documents.msds[]` | `documents(document_type='sds')` |
| `documents.coa` | `documents(document_type='coa')` |
| `structure_image` | `product_images(is_primary=true)` |
| `source_url` | `product_source_urls(source_type='catalogue', is_primary=true)` |
| `revision_date` | `product_revisions` |

## Output

A console summary plus an optional JSON `--report`:

```jsonc
{
  "counts": {
    "processed": 2908,
    "inserted":  2908,   // first run
    "updated":   0,
    "skipped":   0,
    "failed":    0
  },
  "errors": [                // per-record failures, with article_no + reason
    { "article_no": "12345", "file": "12345.json",
      "reason": "ValueError: missing/empty required field: product_name" }
  ],
  "warnings": [              // only with --verbose-warnings
    { "article_no": "12345", "warning": "invalid CAS format: '12345'"}
  ],
  "source_dir": "D:\\dev\\loba-extractor\\output\\canonical",
  "batch_size": 100,
  "limit": null,
  "driver": "psycopg3"
}
```

Re-runs are idempotent: a second pass over the same data should report
`updated: 0` for every record (assuming the source is unchanged) and
`failed: 0`. `inserted` counts the rows that did not previously exist.

## Notes & known limitations

- `product_search_terms` is **rebuilt** for each product on every run
  (delete + re-insert). That is the simplest way to keep the derived index
  in sync with the source data; the index never drifts.
- The source `coa` field is either a `{url, type}` object or a list; both
  shapes are handled.
- The `coa` URL is always a *lookup page* in this dataset, never a direct
  document. The importer still stores the metadata so downstream tooling
  can re-fetch.
- Documents and images are *metadata only* — the binary content is not
  fetched. A separate indexing job is required to populate object storage
  (the URLs are kept verbatim in `storage_key` so it can re-fetch).
- `product_specifications` / `product_physical_properties` are not written
  to. They were removed in architecture Step 4 and consolidated into
  `product_properties` + `property_definitions`.

