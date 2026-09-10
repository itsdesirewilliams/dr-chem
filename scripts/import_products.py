#!/usr/bin/env python3
"""DR-Chem — canonical JSON -> PostgreSQL importer.

Imports the 2,908 canonical product records produced by loba-extractor into
the DR-Chem schema (docs/DATABASE-ARCHITECTURE.md, migrations in
supabase/migrations/). The schema is the source of truth; nothing here
redesigns it.

Design rules implemented (per architecture / roadmap decisions):
  * Streams one JSON file at a time — the dataset is never held in RAM.
  * Idempotent: products are keyed by ``legacy_ref = article_no``; every child
    insert is ``ON CONFLICT DO NOTHING`` (or null-filling) so re-runs converge.
  * Never overwrites valid existing data with missing/null source fields.
  * Preserves source wording: property labels, spec values, pack sizes and
    shelf-life strings are stored verbatim; ``product_shelf_life.notes`` keeps
    the original text.
  * Collision-safe slugs exactly as documented in §4.1.1 (base slug, then
    ``-<first 6 chars of legacy_ref>``, then ``-1``, ``-2``, ...).
  * ``product_properties``/``property_definitions`` (the consolidated tables)
    — the removed spec/physical tables are not touched.
  * ``product_hs_codes`` junction retained (§4.10) — not collapsed.
  * ``product_properties.value_text`` is excluded from primary FTS initially;
    spec search terms use property LABELS only (roadmap Step 4 decision).
  * Batched transactions with a per-record SAVEPOINT: a single bad record is
    reported and skipped; connection loss triggers bounded batch retry/reconnect.
  * Plain PostgreSQL over DATABASE_URL (psycopg2 or psycopg v3) — no
    Supabase-specific APIs. Connect as the table owner (e.g. the Supabase
    ``postgres`` role) so RLS does not block the import.

Usage:
    set DATABASE_URL=postgresql://...   (or export, or pass --database-url)
    python scripts/import_products.py [--source-dir PATH] [--batch-size N]
                                      [--offset N] [--limit N] [--report PATH]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import unicodedata
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from urllib.parse import urlparse

# --- psycopg driver compatibility --------------------------------------------
def _resolve_driver():
    """Returns ('psycopg3'|'psycopg2', connect_callable).

    Importing the module never raises on missing driver — `main()` only
    fails when it actually tries to open a connection. That makes the
    pure helpers (slugify, def_code, parse_*) importable for tests.
    """
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
    """Lazily import the chosen driver and open a connection.

    `autocommit` defaults to False so the importer's explicit
    SAVEPOINTs and per-batch commit() calls work as designed. Setting it
    at connect time avoids the psycopg3 pitfall where `autocommit = False`
    raises ProgrammingError once the connection is in INTRANS state.

    Raises a clear error if neither driver is installed.
    """
    _, fn = _resolve_driver()
    if fn is None:
        raise SystemExit(
            "No PostgreSQL driver found. Install one:\n"
            "  pip install psycopg2-binary   (or: pip install psycopg[binary])"
        )
    # Both psycopg2 and psycopg3 accept `autocommit` as a connect kwarg.
    return fn(database_url, autocommit=autocommit)

# --- constants ---------------------------------------------------------------
DEFAULT_SOURCE_DIR = r"D:\dev\loba-extractor\output\canonical"
DEFAULT_BATCH_SIZE = 100
MAX_CONNECTION_RETRIES = 3
MAX_TRANSIENT_RETRIES = 3
MAX_PROPERTY_DEFINITION_RETRIES = 3

CAS_RE = re.compile(r"^[0-9]{2,7}-[0-9]{2}-[0-9]$")
HS_RE = re.compile(r"^[0-9]{4}\.[0-9]{2,4}$")
URL_RE = re.compile(r"^https?://\S+$")
SHELF_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(hours?|days?|months?|years?)", re.I)

# §6.2 weights: 1.0 name/cas, 0.9 article/formula, 0.8 synonym/category,
# 0.7 spec-property/hs. value_text is deliberately NOT indexed (Step 4).
TERM_WEIGHTS = {
    "name": "1.00",
    "cas": "1.00",
    "article_number": "0.90",
    "formula": "0.90",
    "synonym": "0.80",
    "spec": "0.70",
    "hs_code": "0.70",
}

MIME_BY_EXT = {
    ".pdf": "application/pdf",
    ".gif": "image/gif",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".html": "text/html",
}


# --- text helpers ------------------------------------------------------------
def slugify(name: str) -> str:
    """§4.1.1 step 1: lowercase, strip diacritics, non-alphanumerics -> '-'."""
    text = unicodedata.normalize("NFKD", name)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^a-z0-9]+", "-", text.lower())
    return text.strip("-")


def normalize_term(term: str) -> str:
    """§6.2 normalized_term: unicode-folded, lower-cased, punctuation-stripped."""
    text = unicodedata.normalize("NFKD", term)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^0-9a-z]+", " ", text.casefold())
    return re.sub(r"\s+", " ", text).strip()


def def_code(prop_type: str, label: str) -> str:
    """Stable, idempotent property_definitions.code for a source label."""
    slug = re.sub(r"[^a-z0-9]+", "_", label.lower()).strip("_")
    return f"{prop_type}:{slug or 'unnamed'}"


def parse_decimal(raw):
    """Parse a numeric string; returns (Decimal, None) or (None, warning)."""
    if raw is None:
        return None, None
    text = str(raw).strip().replace(",", "")
    if not text:
        return None, None
    try:
        return Decimal(text), None
    except (InvalidOperation, ValueError):
        return None, f"unparseable numeric value {raw!r}"


def parse_shelf_life(raw):
    """Map shelf-life text to the database's normalized units.

    Database constraint allows exactly:
      hours, days, months, years

    Examples:
      '60 Months' -> (Decimal('60'), 'months')
      '24 Months (3 years)' -> (Decimal('24'), 'months')
      '12 Months' -> (Decimal('12'), 'months')
      '5 Years' -> (Decimal('5'), 'years')
      '30 Days' -> (Decimal('30'), 'days')
      '48 Hours' -> (Decimal('48'), 'hours')

    The caller preserves the original source wording separately.
    """
    if not raw or not isinstance(raw, str):
        return None, None

    match = SHELF_RE.search(raw)
    if not match:
        return None, None

    value = match.group(1).replace(",", ".")
    raw_unit = match.group(2).lower()

    unit_map = {
        "hour": "hours",
        "hours": "hours",
        "day": "days",
        "days": "days",
        "month": "months",
        "months": "months",
        "year": "years",
        "years": "years",
    }

    unit = unit_map.get(raw_unit)
    if unit is None:
        return None, None

    try:
        return Decimal(value), unit
    except (InvalidOperation, ValueError):
        return None, None


def parse_revision_date(raw):
    if not raw or not isinstance(raw, str):
        return None, None
    try:
        return datetime.strptime(raw.strip(), "%d-%b-%Y").date(), None
    except ValueError:
        return None, f"unparseable revision_date {raw!r}"


def url_parts(url: str):
    """(original_filename or None, mime_type or None) derived from a URL."""
    path = urlparse(url).path
    name = path.rsplit("/", 1)[-1] if "/" in path else path
    ext = Path(name).suffix.lower()
    return (name if ext else None), MIME_BY_EXT.get(ext)


class ConnectionLostError(RuntimeError):
    """Raised when the database connection cannot safely continue the batch."""


class TransientTransactionError(RuntimeError):
    """Raised for PostgreSQL transaction failures that are safe to retry."""


class Importer:
    """Streams canonical JSON records into the DR-Chem schema."""

    def __init__(self, conn, source_dir: Path, batch_size: int, report_rows: bool, database_url: str):
        self.conn = conn
        self.database_url = database_url
        self.source_dir = source_dir
        self.batch_size = batch_size
        self.report_rows = report_rows
        self.counts = {
            "processed": 0,
            "inserted": 0,
            "updated": 0,
            "skipped": 0,
            "failed": 0,
        }
        self.errors = []  # {"article_no", "file", "reason"}
        self.warnings = [] if report_rows else None
        # §4.1.1: pre-existing slugs + every slug minted this run.
        self._used_slugs = set()
        self._def_cache = {}  # property_definitions.code -> id
        self._article_gate = None  # optional set of article numbers to import
        self.missing_articles = None  # populated by --missing-only
        self._progress_total = None
        self._progress_started_at = None
        self._progress_last_reported = 0

    # -- small helpers --------------------------------------------------------

    def _log(self, message):
        """Diagnostic sink. Prints to stderr so stdout (the final report)
        stays JSON-clean. Guarded so logging never breaks the import."""
        try:
            print(message, file=sys.stderr, flush=True)
        except Exception:  # noqa: BLE001
            pass

    def _log_progress(self):
        """Print compact live progress at 10-product intervals."""
        total = self._progress_total
        if not total:
            return

        processed = self.counts["processed"]
        if processed <= 0:
            return
        if processed != total and processed % 10 != 0:
            return
        if processed == self._progress_last_reported:
            return

        elapsed_seconds = int(time.monotonic() - self._progress_started_at)
        minutes, seconds = divmod(elapsed_seconds, 60)
        percent = (processed / total) * 100
        self._log(
            f"[progress] {processed}/{total} ({percent:.1f}%) | "
            f"inserted={self.counts['inserted']} | "
            f"failed={self.counts['failed']} | "
            f"elapsed={minutes:02d}:{seconds:02d}"
        )
        self._progress_last_reported = processed

    @staticmethod
    def _is_connection_failure(exc):
        """Return True only for errors that indicate the connection cannot be trusted."""
        if isinstance(exc, ConnectionLostError):
            return True
        text = str(exc).lower()
        if "server closed the connection unexpectedly" in text:
            return True
        if "connection is closed" in text:
            return True
        if "connection reset" in text:
            return True
        if "connection refused" in text:
            return True
        if "could not receive data from server" in text:
            return True
        if "could not send data to server" in text:
            return True
        return False

    @staticmethod
    def _is_transient_transaction_failure(exc):
        """Return True for PostgreSQL errors that should retry the whole batch.

        57014 (statement_timeout) is included: the timeout aborts the entire
        transaction, so any definition rows inserted earlier in that batch are
        rolled back with it. The batch driver rolls back, clears caches,
        re-seeds shared lookups and retries — records never fail permanently
        because of a timeout.
        """
        sqlstate = getattr(exc, "sqlstate", None) or getattr(exc, "pgcode", None)
        if sqlstate in {"40001", "40P01", "57014"}:  # serialization / deadlock / timeout
            return True
        return False

    def _reconnect(self):
        """Replace a dead connection and invalidate transaction-scoped caches."""
        try:
            self.conn.close()
        except Exception:
            pass
        self.conn = connect(self.database_url, autocommit=False)
        self._def_cache.clear()
        self.load_existing_slugs()

    def warn(self, article, message):
        if self.report_rows:
            self.warnings.append({"article_no": article, "warning": message})

    def fail(self, article, filename, reason):
        self.counts["failed"] += 1
        self.errors.append(
            {"article_no": article, "file": filename, "reason": reason}
        )

    def load_existing_slugs(self):
        with self.conn.cursor() as cur:
            cur.execute("SELECT slug FROM products WHERE slug IS NOT NULL")
            self._used_slugs = {row[0] for row in cur.fetchall()}

    def _load_existing_articles(self):
        """Normalized set of article numbers / legacy refs already in products."""
        with self.conn.cursor() as cur:
            cur.execute("SELECT article_number, legacy_ref FROM products")
            rows = cur.fetchall()
        existing = set()
        for article, legacy in rows:
            for value in (article, legacy):
                if isinstance(value, str) and value.strip():
                    existing.add(value.strip().lower())
        return existing

    def list_missing_articles(self):
        """Canonical article numbers (filenames) absent from products. Read-only."""
        existing = self._load_existing_articles()
        return sorted(
            {
                path.stem.strip()
                for path in sorted(self.source_dir.glob("*.json"))
                if path.stem.strip().lower() not in existing
            }
        )

    def _slug_for(self, cur, name: str, legacy_ref: str) -> str:
        """Collision-safe slug strategy (§4.1.1). Deterministic + idempotent."""
        base = slugify(name) or "product"
        # Serialize slug allocation for the same base across concurrent
        # importer processes. The unique index remains the final database
        # guarantee, while this prevents the normal SELECT-then-INSERT race.
        cur.execute(
            "SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))",
            (base,),
        )
        candidates = [base, f"{base}-{legacy_ref[:6].lower()}"]
        counter = 1
        while True:
            for candidate in candidates:
                if candidate not in self._used_slugs:
                    cur.execute(
                        "SELECT 1 FROM products WHERE slug = %s", (candidate,)
                    )
                    if cur.fetchone() is None:
                        self._used_slugs.add(candidate)
                        return candidate
            candidates = [f"{base}-{counter}"]
            counter += 1

    def _property_definition_id(self, cur, prop_type: str, label: str):
        """Return a stable property-definition ID without stale-lookup races.

        The lookup is a SINGLE atomic statement:
            INSERT ... ON CONFLICT (code) DO UPDATE
                SET label = property_definitions.label   -- no-op, keeps the
                RETURNING id                             -- first source wording

        The returned row is either newly inserted or already present, so the
        ID is always visible to every later statement in this transaction.
        This removes the entire class of stale-cache FK failures on
        ``product_properties`` (e.g. a statement_timeout rolling back a
        transaction whose definition IDs were already cached).

        Creation is serialized per code (advisory xact lock) so concurrent
        importer processes do not contend on the unique ``code`` index.
        Statement timeouts (57014) and deadlocks escalate to the batch driver,
        which rolls back, clears caches, re-seeds and retries the batch.
        """
        code = def_code(prop_type, label)
        if code in self._def_cache:
            return self._def_cache[code]

        cur.execute(
            "SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))",
            (f"property_definition:{code}",),
        )
        cur.execute(
            """
            INSERT INTO property_definitions (code, property_type, label)
            VALUES (%s, %s, %s)
            ON CONFLICT (code) DO UPDATE
                SET label = property_definitions.label
            RETURNING id
            """,
            (code, prop_type, label),
        )
        def_id = cur.fetchone()[0]
        self._def_cache[code] = def_id
        return def_id

    def _preseed_property_definitions(self, files):
        """Create all source property definitions once before product writes.

        This removes the shared-index INSERT hotspot from concurrent product
        transactions. Definitions are deterministic and committed separately;
        product imports only reference them afterward.
        """
        definitions = {}
        for path in files:
            try:
                with open(path, "r", encoding="utf-8") as fh:
                    record = json.load(fh)
            except Exception:
                continue
            if not isinstance(record, dict):
                continue
            for prop_type, key in (("spec", "specifications"), ("physical", "physical_properties")):
                items = record.get(key) or []
                if not isinstance(items, list):
                    continue
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    label = item.get("property")
                    if not isinstance(label, str) or not label.strip():
                        continue
                    label_clean = label.strip()
                    code = def_code(prop_type, label_clean)
                    definitions.setdefault(code, (prop_type, label_clean))

        # One transaction-level lock makes two concurrent importer processes
        # take turns during the one-time seed instead of racing on the index.
        with self.conn.cursor() as cur:
            cur.execute(
                "SELECT pg_advisory_xact_lock(hashtextextended(%s, 0))",
                ("drchem:shared-lookups:preseed",),
            )
            for code in sorted(definitions):
                prop_type, label = definitions[code]
                cur.execute(
                    """
                    INSERT INTO property_definitions (code, property_type, label)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (code) DO NOTHING
                    """,
                    (code, prop_type, label),
                )

            # HS codes are another shared lookup table. Pre-create them so
            # concurrent product transactions do not race on its unique index.
            hs_codes = set()
            for path in files:
                try:
                    with open(path, "r", encoding="utf-8") as fh:
                        record = json.load(fh)
                except Exception:
                    continue
                if not isinstance(record, dict):
                    continue
                raw_hs = record.get("hs_code")
                if isinstance(raw_hs, str) and raw_hs.strip():
                    hs_codes.add(raw_hs.strip())

            for code in sorted(hs_codes):
                cur.execute(
                    "INSERT INTO hs_codes (code) VALUES (%s) ON CONFLICT (code) DO NOTHING",
                    (code,),
                )
            self.conn.commit()

        self._def_cache.clear()
        with self.conn.cursor() as cur:
            cur.execute("SELECT code, id FROM property_definitions")
            self._def_cache = {code: def_id for code, def_id in cur.fetchall()}
        self._log(
            f"[preseed] shared lookups ready: "
            f"property_definitions={len(self._def_cache)}, hs_codes={len(hs_codes)}"
        )

    def _ensure_primary(self, cur, sql_insert, params):
        """Insert a row flagged is_primary=true only if no primary exists yet.

        Used by tables with a partial unique (product_id) WHERE is_primary
        index (CAS numbers, images, HS codes, categories): the first source
        value becomes primary, later ones never violate the constraint.
        """
        table = sql_insert.split("INTO ", 1)[1].split(" ", 1)[0]
        cur.execute(
            f"SELECT 1 FROM {table} WHERE product_id = %s AND is_primary",
            (params[0],),
        )
        has_primary = cur.fetchone() is not None
        cur.execute(sql_insert, params + (not has_primary,))

    # -- record import --------------------------------------------------------

    def import_record(self, cur, record: dict, filename: str):
        """Import one canonical record. Returns 'inserted'|'updated'|'skipped'."""
        article = record.get("article_no")
        if not isinstance(article, str) or not article.strip():
            raise ValueError("missing/empty required field: article_no")
        article = article.strip()
        legacy_ref = article

        name = record.get("product_name")
        if not isinstance(name, str) or not name.strip():
            raise ValueError(f"missing/empty required field: product_name ({article})")
        name = name.strip()

        summary = record.get("grade") if isinstance(record.get("grade"), str) else None
        description = record.get("description")
        description = description.strip() if isinstance(description, str) else None

        # ---- products upsert (keyed by legacy_ref = article_no) --------------
        cur.execute(
            """
            SELECT id, revision_number, slug, name, summary, description
            FROM products WHERE legacy_ref = %s
            """,
            (legacy_ref,),
        )
        row = cur.fetchone()
        if row is None:
            slug = self._slug_for(cur, name, legacy_ref)
            cur.execute(
                """
                INSERT INTO products
                    (legacy_ref, name, slug, article_number, summary,
                     description, status)
                VALUES (%s, %s, %s, %s, %s, %s, 'draft')
                RETURNING id
                """,
                (legacy_ref, name, slug, article, summary, description),
            )
            product_id = cur.fetchone()[0]
            status = "inserted"
        else:
            product_id, revision, existing_slug = row[0], row[1], row[2]
            changed = []

            # COALESCE-style update: never null out valid existing data.
            for column, new_value in (
                ("name", name),
                ("summary", summary),
                ("description", description),
            ):
                if new_value is not None:
                    cur.execute(
                        f"UPDATE products SET {column} = %s "
                        f"WHERE id = %s AND {column} IS DISTINCT FROM %s",
                        (new_value, product_id, new_value),
                    )
                    if cur.rowcount:
                        changed.append(column)

            # Slug is the public URL key: mint it only when still missing.
            if not existing_slug:
                slug = self._slug_for(cur, name, legacy_ref)
                cur.execute(
                    "UPDATE products SET slug = %s WHERE id = %s",
                    (slug, product_id),
                )
                changed.append("slug")

            # §4.1.2: bump the optimistic-concurrency token when anything
            # on the product row itself changed.
            if changed:
                cur.execute(
                    "UPDATE products SET revision_number = %s WHERE id = %s",
                    (revision + 1, product_id),
                )
            status = "updated" if changed else "skipped"

        self._import_children(cur, product_id, record, article)
        return status

    # -- child rows: every list/relationship for the product -----------------

    def _import_children(self, cur, product_id, record, article):
        self._import_synonyms(cur, product_id, record.get("synonyms"), article)
        self._import_cas(cur, product_id, record.get("cas_no"), article)
        self._import_molecular(
            cur, product_id,
            record.get("molecular_formula"), record.get("molecular_weight"),
            article,
        )
        self._import_hs_code(cur, product_id, record.get("hs_code"), article)
        self._import_shelf_life(
            cur, product_id, record.get("shelf_life"), article
        )
        self._import_source_url(
            cur, product_id, record.get("source_url"), article
        )
        self._import_revision_date(
            cur, product_id, record.get("revision_date"), article
        )
        self._import_specifications(
            cur, product_id, record.get("specifications"), article
        )
        self._import_physical_properties(
            cur, product_id, record.get("physical_properties"), article
        )
        self._import_packings(
            cur, product_id, record.get("packings"), article
        )
        self._import_documents(
            cur, product_id, record.get("documents"), article
        )
        self._import_structure_image(
            cur, product_id, record.get("structure_image"), article
        )
        self._import_search_terms(cur, product_id, record, article)

    # -- each child -----------------------------------------------------------

    def _import_synonyms(self, cur, product_id, synonyms, article):
        if not synonyms:
            return
        seen = set()
        for i, syn in enumerate(synonyms):
            if not isinstance(syn, str):
                continue
            text = syn.strip()
            if not text or text.lower() in seen:
                continue
            seen.add(text.lower())
            cur.execute(
                """
                INSERT INTO product_synonyms (product_id, synonym, sort_order)
                VALUES (%s, %s, %s)
                ON CONFLICT (product_id, lower(synonym)) DO NOTHING
                """,
                (product_id, text, i),
            )

    def _import_cas(self, cur, product_id, cas_no, article):
        if not isinstance(cas_no, str):
            return
        value = cas_no.strip()
        if not value or not CAS_RE.match(value):
            self.warn(article, f"invalid CAS format: {cas_no!r}")
            return
        cur.execute(
            "SELECT 1 FROM product_cas_numbers WHERE product_id = %s AND is_primary",
            (product_id,),
        )
        is_primary = cur.fetchone() is None
        cur.execute(
            """
            INSERT INTO product_cas_numbers (product_id, cas_number, is_primary)
            VALUES (%s, %s, %s)
            ON CONFLICT (product_id, cas_number) DO NOTHING
            """,
            (product_id, value, is_primary),
        )

    def _import_molecular(self, cur, product_id, formula, weight, article):
        formula_text = formula.strip() if isinstance(formula, str) else None
        weight_decimal, warn = parse_decimal(weight)
        if warn:
            self.warn(article, warn)
        if not formula_text and weight_decimal is None:
            return
        if not formula_text:
            self.warn(article, "molecular weight present without formula")
            return
        cur.execute(
            "SELECT 1 FROM product_molecular_data WHERE product_id = %s",
            (product_id,),
        )
        has_any = cur.fetchone() is not None
        cur.execute(
            """
            INSERT INTO product_molecular_data
                (product_id, formula, molecular_weight, is_primary)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (product_id, formula) DO NOTHING
            """,
            (product_id, formula_text, weight_decimal, not has_any),
        )

    def _import_hs_code(self, cur, product_id, hs_code, article):
        if not isinstance(hs_code, str):
            return
        code = hs_code.strip()
        if not code:
            return
        if not HS_RE.match(code):
            self.warn(article, f"non-standard HS code: {code!r}")
        cur.execute(
            "INSERT INTO hs_codes (code) VALUES (%s) ON CONFLICT (code) DO NOTHING",
            (code,),
        )
        cur.execute("SELECT id FROM hs_codes WHERE code = %s", (code,))
        hs_id = cur.fetchone()[0]
        cur.execute(
            "SELECT 1 FROM product_hs_codes WHERE product_id = %s AND is_primary",
            (product_id,),
        )
        is_primary = cur.fetchone() is None
        cur.execute(
            """
            INSERT INTO product_hs_codes (product_id, hs_code_id, is_primary)
            VALUES (%s, %s, %s)
            ON CONFLICT (product_id, hs_code_id) DO NOTHING
            """,
            (product_id, hs_id, is_primary),
        )

    def _import_shelf_life(self, cur, product_id, shelf_life, article):
        if not isinstance(shelf_life, str) or not shelf_life.strip():
            return
        period_value, period_unit = parse_shelf_life(shelf_life)
        # Always preserve the original text in `notes`.
        cur.execute(
            """
            INSERT INTO product_shelf_life
                (product_id, period_value, period_unit, notes)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (product_id) DO UPDATE
              SET period_value = COALESCE(product_shelf_life.period_value, EXCLUDED.period_value),
                  period_unit  = COALESCE(product_shelf_life.period_unit,  EXCLUDED.period_unit),
                  notes        = COALESCE(product_shelf_life.notes,        EXCLUDED.notes)
            """,
            (product_id, period_value, period_unit, shelf_life.strip()),
        )

    def _import_source_url(self, cur, product_id, url, article):
        if not isinstance(url, str) or not url.strip():
            return
        if not URL_RE.match(url):
            self.warn(article, f"non-URL source_url: {url!r}")
            return
        cur.execute(
            "SELECT 1 FROM product_source_urls WHERE product_id = %s",
            (product_id,),
        )
        is_primary = cur.fetchone() is None
        cur.execute(
            """
            INSERT INTO product_source_urls
                (product_id, url, source_type, is_primary)
            VALUES (%s, %s, 'catalogue', %s)
            ON CONFLICT (product_id, url) DO NOTHING
            """,
            (product_id, url.strip(), is_primary),
        )

    def _import_revision_date(self, cur, product_id, raw, article):
        if not isinstance(raw, str) or not raw.strip():
            return
        rev_date, warn = parse_revision_date(raw)
        if warn:
            self.warn(article, warn)
            return
        cur.execute(
            """
            INSERT INTO product_revisions (product_id, revision_date, summary)
            VALUES (%s, %s, %s)
            ON CONFLICT (product_id, revision_date) DO NOTHING
            """,
            (product_id, rev_date, None),
        )

    def _import_specifications(self, cur, product_id, specs, article):
        self._import_property_list(cur, product_id, specs, "spec", article)

    def _import_physical_properties(self, cur, product_id, props, article):
        self._import_property_list(cur, product_id, props, "physical", article)

    def _import_property_list(self, cur, product_id, items, prop_type, article):
        if not items:
            return
        seen_labels = set()
        valid_items = []
        for i, item in enumerate(items):
            if not isinstance(item, dict):
                continue
            label = item.get("property")
            if not isinstance(label, str) or not label.strip():
                continue
            valid_items.append((i, item))

        # Acquire shared property-definition locks in deterministic order.
        # This prevents A->B / B->A lock ordering between concurrent imports.
        valid_items.sort(key=lambda pair: def_code(prop_type, pair[1]["property"].strip()))

        for i, item in valid_items:
            if not isinstance(item, dict):
                continue
            label = item.get("property")
            value = item.get("value")
            if not isinstance(label, str) or not label.strip():
                continue
            label_clean = label.strip()
            if label_clean in seen_labels:
                continue  # source has dupes; honour first occurrence
            seen_labels.add(label_clean)
            if value is None or (isinstance(value, str) and not value.strip()):
                continue
            value_text = (
                value.strip() if isinstance(value, str) else str(value).strip()
            )
            if not value_text:
                continue
            def_id = self._property_definition_id(cur, prop_type, label_clean)
            try:
                cur.execute(
                    """
                    INSERT INTO product_properties
                        (product_id, property_definition_id, value_text, sort_order)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (product_id, property_definition_id) DO NOTHING
                    """,
                    (product_id, def_id, value_text, i),
                )
            except Exception as prop_exc:
                self._log(
                    f"[ERROR] property insert failed: article={article} "
                    f"product_id={product_id} prop_type={prop_type!r} "
                    f"property={label_clean!r} value={value_text!r}; "
                    f"{type(prop_exc).__name__}: {prop_exc}; "
                    f"conn.closed={getattr(self.conn, 'closed', '?')}"
                )
                raise

    def _import_packings(self, cur, product_id, packings, article):
        if not packings:
            return
        seen_codes = set()
        for i, pack in enumerate(packings):
            if not isinstance(pack, dict):
                continue
            raw_code = pack.get("package_code")
            if not isinstance(raw_code, str) or not raw_code.strip():
                continue
            code = raw_code.strip()
            if code in seen_codes:
                continue
            seen_codes.add(code)
            size_value, warn = parse_decimal(pack.get("pack_size"))
            if warn:
                self.warn(article, f"packing {code}: {warn}")
            size_unit = None
            if isinstance(pack.get("pack_size"), str):
                token = pack["pack_size"].strip()
                # Pick up the last non-numeric word (e.g. "ml", "Liters", "kg").
                last = re.findall(r"[A-Za-zµμ]+", token)
                if last:
                    size_unit = last[-1]
            title = pack.get("pack_size") if isinstance(pack.get("pack_size"), str) else None
            cur.execute(
                """
                INSERT INTO product_packings
                    (product_id, code, title, size_value, size_unit, is_active)
                VALUES (%s, %s, %s, %s, %s, true)
                ON CONFLICT (product_id, code) DO NOTHING
                """,
                (product_id, code, title, size_value, size_unit),
            )

    def _import_documents(self, cur, product_id, docs, article):
        """docs is {msds: [{language,url}], coa: {url,type}} from the source.

        Only document metadata is stored here. The actual file content
        (PDF/HTML) is not fetched; that is a separate indexing job (§10).
        URLs are kept as 'storage_key' so downstream jobs can re-fetch.
        """
        if not isinstance(docs, dict):
            return

        for msd in docs.get("msds") or []:
            if not isinstance(msd, dict):
                continue
            url = msd.get("url")
            if not isinstance(url, str) or not url.strip():
                continue
            filename, mime = url_parts(url)
            language = msd.get("language") if isinstance(msd.get("language"), str) else None
            title = f"MSDS {language}" if language else "MSDS"
            description = "Material Safety Data Sheet"
            cur.execute(
                """
                INSERT INTO documents
                    (product_id, document_type, title, description,
                     storage_key, original_filename, mime_type, version,
                     is_active)
                VALUES (%s, 'sds', %s, %s, %s, %s, %s, 1, true)
                ON CONFLICT DO NOTHING
                """,
                (product_id, title, description, url, filename, mime),
            )

        coa = docs.get("coa")
        if isinstance(coa, dict) and isinstance(coa.get("url"), str) and coa["url"].strip():
            url = coa["url"].strip()
            filename, mime = url_parts(url)
            cur.execute(
                """
                INSERT INTO documents
                    (product_id, document_type, title, description,
                     storage_key, original_filename, mime_type, version,
                     is_active)
                VALUES (%s, 'coa', 'Certificate of Analysis',
                    'Product COA', %s, %s, %s, 1, true)
                ON CONFLICT DO NOTHING
                """,
                (product_id, url, filename, mime),
            )
        elif isinstance(coa, list):
            for item in coa:
                if not isinstance(item, dict):
                    continue
                url = item.get("url")
                if not isinstance(url, str) or not url.strip():
                    continue
                filename, mime = url_parts(url)
                cur.execute(
                    """
                    INSERT INTO documents
                        (product_id, document_type, title, description,
                         storage_key, original_filename, mime_type, version,
                         is_active)
                    VALUES (%s, 'coa', 'Certificate of Analysis',
                        'Product COA', %s, %s, %s, 1, true)
                    ON CONFLICT DO NOTHING
                    """,
                    (product_id, url.strip(), filename, mime),
                )

    def _import_structure_image(self, cur, product_id, url, article):
        """structure_image becomes a product_images row (is_primary=True)."""
        if not isinstance(url, str) or not url.strip():
            return
        if not URL_RE.match(url):
            self.warn(article, f"non-URL structure_image: {url!r}")
            return
        cur.execute(
            "SELECT 1 FROM product_images WHERE product_id = %s",
            (product_id,),
        )
        is_primary = cur.fetchone() is None
        cur.execute(
            """
            INSERT INTO product_images
                (product_id, storage_key, alt_text, is_primary, sort_order)
            VALUES (%s, %s, %s, %s, 0)
            ON CONFLICT (product_id, storage_key) DO NOTHING
            """,
            (product_id, url.strip(), "Chemical structure", is_primary),
        )
        cur.execute(
            "SELECT 1 FROM product_source_urls WHERE product_id = %s AND url = %s",
            (product_id, url.strip()),
        )
        if cur.fetchone() is None:
            cur.execute(
                """
                INSERT INTO product_source_urls
                    (product_id, url, source_type, is_primary)
                VALUES (%s, %s, 'datasheet', false)
                ON CONFLICT (product_id, url) DO NOTHING
                """,
                (product_id, url.strip()),
            )

    def _import_search_terms(self, cur, product_id, record, article):
        """Rebuild this product's product_search_terms rows.

        Step 4 (roadmap) excludes product_properties.value_text from primary
        FTS initially; the property *LABEL* is included as 'spec' so users can
        search for 'Density' across the catalogue.
        """
        cur.execute(
            "DELETE FROM product_search_terms WHERE product_id = %s",
            (product_id,),
        )

        def add_term(source_type, term):
            if not isinstance(term, str) or not term.strip():
                return
            value = term.strip()
            cur.execute(
                """
                INSERT INTO product_search_terms
                    (product_id, term, source_type, weight, language,
                     normalized_term)
                VALUES (%s, %s, %s, %s, 'en', %s)
                ON CONFLICT (product_id, source_type, lower(term)) DO NOTHING
                """,
                (
                    product_id,
                    value,
                    source_type,
                    TERM_WEIGHTS[source_type],
                    normalize_term(value),
                ),
            )

        if isinstance(record.get("product_name"), str):
            add_term("name", record["product_name"])
        if isinstance(record.get("article_no"), str):
            add_term("article_number", record["article_no"])
        if isinstance(record.get("cas_no"), str):
            add_term("cas", record["cas_no"])
        if isinstance(record.get("molecular_formula"), str):
            add_term("formula", record["molecular_formula"])
        for syn in record.get("synonyms") or []:
            add_term("synonym", syn)
        for spec in record.get("specifications") or []:
            if isinstance(spec, dict) and isinstance(spec.get("property"), str):
                add_term("spec", spec["property"])
        if isinstance(record.get("hs_code"), str):
            add_term("hs_code", record["hs_code"])

    # -- batch driver ---------------------------------------------------------

    def run(self, limit=None, offset=0, only=None, missing_only=False):
        """Stream the source directory in batches, retrying transient connection loss.

        only:         iterable of article numbers — process ONLY these canonical
                      records (targeted re-import).
        missing_only: compare every canonical article number against the
                      products table first and process only the absent ones
                      (targeted recovery without re-importing the catalogue).
        """
        files = sorted(self.source_dir.glob("*.json"))
        # Apply offset AFTER sorting, BEFORE limit.
        if offset:
            files = files[offset:]
        if limit:
            files = files[:limit]
        if not files:
            raise FileNotFoundError(
                f"No JSON files found in {self.source_dir!s}. "
                "Use --source-dir to point at a different folder."
            )

        gate = None
        self.missing_articles = None

        if missing_only:
            existing = self._load_existing_articles()
            missing = sorted(
                {
                    path.stem.strip()
                    for path in files
                    if path.stem.strip().lower() not in existing
                }
            )
            self.missing_articles = missing
            self._log(
                f"[missing-only] {len(missing)} canonical article(s) absent "
                f"from products:"
            )
            for article in missing:
                self._log(f"  - {article}")
            gate = {article.lower() for article in missing}

        if only:
            wanted = {
                value.strip().lower() for value in only if value and value.strip()
            }
            self._log(f"[only] restricting run to {len(wanted)} article(s)")
            gate = wanted if gate is None else (gate & wanted)

        self._article_gate = gate

        self._progress_total = len(files)
        self._progress_started_at = time.monotonic()
        self._progress_last_reported = 0

        self.load_existing_slugs()
        self._preseed_property_definitions(files)

        # Process one outer transaction at a time. If the connection dies,
        # the whole uncommitted batch is retried so no partial batch state is
        # counted as successful.
        for batch_start in range(0, len(files), self.batch_size):
            batch = files[batch_start:batch_start + self.batch_size]
            batch_attempt = 0

            while True:
                counts_before = self.counts.copy()
                errors_before = len(self.errors)
                warnings_before = len(self.warnings) if self.warnings is not None else None

                try:
                    for batch_pos, path in enumerate(batch, start=1):
                        idx = batch_start + batch_pos
                        self.counts["processed"] += 1

                        try:
                            with open(path, "r", encoding="utf-8") as fh:
                                record = json.load(fh)
                        except Exception:
                            self.fail(path.stem, path.name, "invalid JSON file")
                            continue

                        article = (
                            record.get("article_no")
                            if isinstance(record.get("article_no"), str)
                            else None
                        ) or path.stem

                        if (
                            self._article_gate is not None
                            and article.strip().lower() not in self._article_gate
                        ):
                            self.counts["skipped"] += 1
                            continue

                        self._process_one(record, article, path.name, idx)
                        self._log_progress()

                    self.conn.commit()
                    self._log(
                        f"[batch {batch_start + 1}-{batch_start + len(batch)}] OK"
                    )
                    break

                except ConnectionLostError as exc:
                    # Everything in this batch is uncommitted and therefore
                    # must be retried from its beginning after reconnecting.
                    self.counts = counts_before
                    del self.errors[errors_before:]
                    if self.warnings is not None and warnings_before is not None:
                        del self.warnings[warnings_before:]

                    batch_attempt += 1
                    if batch_attempt > MAX_CONNECTION_RETRIES:
                        self._log(
                            f"[FATAL] connection recovery failed after "
                            f"{MAX_CONNECTION_RETRIES} retries for batch "
                            f"{batch_start + 1}-{batch_start + len(batch)}: "
                            f"{type(exc).__name__}: {exc}"
                        )
                        raise

                    self._log(
                        f"[RECOVERY] database connection lost during batch "
                        f"{batch_start + 1}-{batch_start + len(batch)}; "
                        f"reconnecting (attempt {batch_attempt}/{MAX_CONNECTION_RETRIES})"
                    )
                    time.sleep(min(2 ** (batch_attempt - 1), 4))
                    self._reconnect()

                except TransientTransactionError as exc:
                    # Deadlocks/serialization failures are transaction-scoped;
                    # the connection is normally still healthy. Roll back the
                    # aborted transaction and retry the whole batch on the
                    # same connection, avoiding an unnecessary reconnect.
                    self.counts = counts_before
                    del self.errors[errors_before:]
                    if self.warnings is not None and warnings_before is not None:
                        del self.warnings[warnings_before:]

                    batch_attempt += 1
                    if batch_attempt > MAX_TRANSIENT_RETRIES:
                        self._log(
                            f"[FATAL] transient transaction failure persisted "
                            f"after {MAX_TRANSIENT_RETRIES} retries for batch "
                            f"{batch_start + 1}-{batch_start + len(batch)}: "
                            f"{type(exc).__name__}: {exc}"
                        )
                        raise

                    try:
                        self.conn.rollback()
                        # A transaction rollback invalidates any cached
                        # property-definition IDs created in that transaction.
                        self._def_cache.clear()
                    except Exception:
                        # If rollback itself fails, reconnect and let the next
                        # attempt start from a clean connection.
                        self._reconnect()
                    try:
                        # Re-seed shared lookups so the retry cannot reference
                        # definition rows whose uncommitted inserts were rolled
                        # back together with the batch.
                        self._preseed_property_definitions(batch)
                    except Exception as preseed_exc:  # noqa: BLE001
                        self._log(
                            f"[RECOVERY] post-rollback re-seed failed: "
                            f"{type(preseed_exc).__name__}: {preseed_exc}; "
                            f"reconnecting instead"
                        )
                        self._reconnect()
                    self._log(
                        f"[RECOVERY] retrying batch "
                        f"{batch_start + 1}-{batch_start + len(batch)} "
                        f"after transient transaction failure "
                        f"(attempt {batch_attempt}/{MAX_TRANSIENT_RETRIES})"
                    )
                    time.sleep(min(2 ** (batch_attempt - 1), 4))

        return self.counts, self.errors, self.warnings

    def _process_one(self, record, article, filename, idx, _retried=False):
        """Process one record inside its own SAVEPOINT.

        Ordinary data errors are isolated to the record. A connection-level
        failure is escalated to the batch driver so the entire uncommitted
        batch can be retried safely. A stale foreign-key lookup (23503) —
        e.g. a cached shared-lookup ID that no longer resolves — is retried
        exactly once after invalidating the lookup caches.
        """
        try:
            with self.conn.cursor() as cur:
                cur.execute("SAVEPOINT per_record")
            if not isinstance(record, dict):
                raise ValueError("top-level JSON is not an object")
            with self.conn.cursor() as cur:
                status = self.import_record(cur, record, filename)
            self.counts[status] += 1
            with self.conn.cursor() as cur:
                cur.execute("RELEASE SAVEPOINT per_record")
        except Exception as exc:  # noqa: BLE001 -- any failure is per-record unless connection is lost
            closed = getattr(self.conn, "closed", None)

            # Connection failures are batch-level: preserve the original
            # exception and let run() reconnect/retry the whole batch.
            if self._is_connection_failure(exc) or closed:
                self._log(
                    f"[ERROR] database connection failure at product {idx} "
                    f"(article={article}, file={filename}): "
                    f"{type(exc).__name__}: {exc} "
                    f"(conn.closed={closed})"
                )
                raise ConnectionLostError(
                    f"product {idx} article={article} file={filename}: "
                    f"{type(exc).__name__}: {exc}"
                ) from exc

            # PostgreSQL deadlocks/serialization failures invalidate the
            # current transaction. Escalate them to the batch driver so the
            # entire transaction is retried rather than treating the record
            # as a permanent data error.
            if self._is_transient_transaction_failure(exc):
                self._log(
                    f"[RECOVERY] transient transaction failure at product {idx} "
                    f"(article={article}, file={filename}): "
                    f"{type(exc).__name__}: {exc}"
                )
                raise TransientTransactionError(
                    f"product {idx} article={article} file={filename}: "
                    f"{type(exc).__name__}: {exc}"
                ) from exc

            # Ordinary database/data error: preserve the original error and
            # isolate the record with its SAVEPOINT.
            self._log(
                f"[ERROR] product {idx} failed "
                f"(article={article}, file={filename}): "
                f"{type(exc).__name__}: {exc} (conn.closed={closed})"
            )
            if closed:
                # Defensive branch; normally caught above.
                raise ConnectionLostError(
                    f"product {idx} article={article} file={filename}: "
                    f"{type(exc).__name__}: {exc}"
                ) from exc

            # Stale foreign-key lookups (23503): a cached shared-lookup ID
            # (property_definitions, hs_codes, …) that no longer resolves.
            # Recover the record ONCE: roll back to the savepoint, invalidate
            # every lookup cache and re-run the record against committed state.
            sqlstate = getattr(exc, "sqlstate", None) or getattr(exc, "pgcode", None)
            if sqlstate == "23503" and not _retried:
                try:
                    with self.conn.cursor() as cur:
                        cur.execute("ROLLBACK TO SAVEPOINT per_record")
                except Exception as rb_exc:  # noqa: BLE001
                    self._log(
                        f"[ERROR] SAVEPOINT rollback also failed: "
                        f"{type(rb_exc).__name__}: {rb_exc} "
                        f"(original error above is preserved)"
                    )
                self._def_cache.clear()
                self._log(
                    f"[RECOVERY] stale foreign-key lookup at product {idx} "
                    f"(article={article}, file={filename}): "
                    f"{type(exc).__name__}: {exc}; caches invalidated, "
                    f"retrying record once"
                )
                return self._process_one(
                    record, article, filename, idx, _retried=True
                )

            try:
                with self.conn.cursor() as cur:
                    cur.execute("ROLLBACK TO SAVEPOINT per_record")
                # The savepoint rollback may have removed a property_definition
                # row that was inserted earlier in this record. Never retain
                # its ID in the process cache.
                self._def_cache.clear()
            except Exception as rb_exc:  # noqa: BLE001
                self._log(
                    f"[ERROR] SAVEPOINT rollback also failed: "
                    f"{type(rb_exc).__name__}: {rb_exc} "
                    f"(original error above is preserved)"
                )
            self.fail(
                article,
                filename,
                f"{type(exc).__name__}: {exc} (conn.closed={closed})",
            )


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="DR-Chem — canonical JSON -> PostgreSQL importer.",
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
        help="Maximum number of records to process after the offset.",
    )
    parser.add_argument(
        "--offset",
        type=int,
        default=0,
        help="Skip the first OFFSET canonical JSON records before importing.",
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

    # Open the connection with autocommit OFF so the importer's explicit
    # SAVEPOINTs and per-batch commit() calls work without the
    # "can't change 'autocommit' now" error (psycopg3 raises if autocommit
    # is toggled while a transaction is already open).
    conn = connect(args.database_url, autocommit=False)
    importer = Importer(
        conn=conn,
        source_dir=source_dir,
        batch_size=max(1, args.batch_size),
        report_rows=report_rows,
        database_url=args.database_url,
    )
    try:
        counts, errors, warnings = importer.run(limit=args.limit, offset=args.offset)
    except Exception:
        # Best-effort cleanup: end any open transaction so close() is clean.
        try:
            importer.conn.rollback()
        except Exception:
            pass
        raise
    finally:
        # importer.conn may be a replacement connection after recovery.
        # Close the current connection, not only the original `conn` object.
        try:
            importer.conn.close()
        except Exception:
            pass

    summary = {
        "counts": counts,
        "errors": errors,
        "warnings": warnings if report_rows else None,
        "source_dir": str(source_dir),
        "batch_size": args.batch_size,
        "limit": args.limit,
        "offset": args.offset,
        "driver": DRIVER,
    }

    # Console output (also the run log).
    print(json.dumps({"counts": counts, "errors": errors}, indent=2))

    if args.report:
        Path(args.report).write_text(
            json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        print(f"Report written to {args.report}")

    return 0 if counts["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())









