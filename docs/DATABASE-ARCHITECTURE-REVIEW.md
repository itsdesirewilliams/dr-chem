# DR-Chem — Database Architecture Review

> Reviewer role: database architect / systems designer.
> Reviewed: `docs/DATABASE-ARCHITECTURE.md` (the 16-section design document).
> Scope: correctness, over/under-engineering, necessity of the ~41 tables,
> relationships, importer feasibility, duplicates, FKs/cascades/nullability,
> PostgreSQL/Supabase compatibility, search, RBAC, blog/SEO, scalability,
> portability. **No SQL/migrations created.**
>
> Format: every recommendation is stated as
> **CURRENT → PROPOSED → REASON**.

---

## 0. Executive summary — is the architecture correct?

**Yes, the architecture is substantially correct and well-reasoned.** The
~41-table count is largely justified: the catalogue's child tables map
one-to-one onto the multi-valued facts of a chemistry catalogue, and the
polymorphic SEO/audit tables are the right consolidation, not over-splitting.
The design's strong points: normalisation discipline, partial-unique
"one primary" constraints, correct separation of PostgreSQL vs object storage,
portable CHECK-based enums, and a clean importer model.

Nothing below is a *blocking defect*. The findings are **one correction, six
consolidations, and several hardening suggestions**. The three genuinely
important ones are:

1. **Missing nullable constraint on `products.slug`** during import
   (importability risk) — see §3.3 and §5.1.
2. **`product_physical_properties` and `product_specifications` share a
   shape** and the doc distinguishes them by intent only — consider one
   consolidated `product_properties` table (§2.1, §6.4).
3. **No hard FK from `seo_metadata` / `audit_logs` to their entities** — a
   deliberate trade-off that should at least be mitigated with triggers
   (§9, §12).

Overall verdict: **adopt** — with the refinements below applied before
migration writing.

---

## 1. Table inventory (the "are ~41 tables necessary?" question)

Counted from the document (deduplicating joins and noting tracking tables):

| Table (module) | Count |
|---|---|
| `products` + 13 catalogue children (specs, physical properties, packings, documents, images, synonyms, CAS, molecular, HS+link, shelf-life, source URLs, revisions) | 15 |
| `categories`, `product_categories` | 2 |
| `product_search_terms` | 1 |
| `users`, `profiles`, `companies`, `countries`, `company_members` | 5 |
| RBAC (`roles`, `permissions`, `role_permissions`, `user_roles`) | 4 |
| `saved_favourites`, `audit_logs` | 2 |
| Business (`quote_requests`, `quote_request_items`, `leads`, `contacts`, `enquiries`) | 5 |
| Blog (`blog_categories`, `blog_posts`, `blog_post_categories`, `blog_tags`, `blog_post_tags`, `blog_post_products`) | 6 |
| `seo_metadata` | 1 |
| **Total** | **≈41** |

**Assessment: the table count is defensible.** A chemistry catalogue is
inherently multi-valued per product (many specs, properties, packings,
synonyms, CAS, images, documents, sources); those are not "tables that could
be merged" but the correct relational decomposition of a JSON document.
Normalising them into one broad table would recreate the EAV antipattern the
design correctly avoids (§16 addresses this explicitly).

The real question is whether any of the *entities* are unnecessary — answered
in §3 (consolidations) and §2 (gaps). Net: **~35 tables after the proposed
consolidation**, each with a distinct purpose.
---

## 2. Over-engineering — what could be safely consolidated

Bonus of the base document: it already resists the classic over-engineering
traps (no `product_notes` table, no `ltree`/`materialized_paths`, no separate
subcategory table, no orphan `categories.seo_*` columns).

### 2.1 `product_specifications` + `product_physical_properties` → one table

- **CURRENT:** two nearly identical tables:
  `product_specifications(id, product_id, name, value, unit, sort_order)` and
  `product_physical_properties(id, product_id, property, value_text,
  value_min, value_max, unit, sort_order)`.
- **PROPOSED:** a single `product_properties` table:
  `(id, product_id, property_type, name, value_text, value_min, value_max,
  unit, sort_order)` and a `CHECK (property_type IN ('spec','physical'))`.
- **REASON:** the two tables store the *same kind of fact* — a named
  key-value property of a product. The document itself draws the line by
  "intent" (commercial vs physical) which is a UI taxonomy, not a data-shape
  difference; both carry free text, and physical properties' numeric fields
  are the only delta. One table halves the importer's write path, keeps the
  same unique constraint `(product_id, name)`, and lets a future filter
  ("all products with density …") scan one index instead of two. If you want
  physical/numeric semantics to remain distinct, keep `property_type` and a
  CHECK that only *physical* rows allow `value_min/value_max`.

### 2.2 `company_members.role` vs RBAC split

- **CURRENT:** `company_members` has its own hardcoded `role CHECK
  ('owner','admin','member','billing')` while a full RBAC table set exists
  elsewhere.
- **PROPOSED:** keep the column but document it clearly as **company-roles**
  (a "what role within this company", not a platform permission); do not
  merge it into `user_roles`.
- **REASON:** these are two genuinely different access scopes (company-scoped
  vs platform-scoped). Merging them would force global-admin semantics onto
  company membership and require awkward compound lookups. The CHECK list is
  an OK start; consider a lookup table later if companies ever get custom
  role names. Minor — the design is not wrong, just worth a sentence.

### 2.3 `categories` + `blog_categories` stay separate (do NOT consolidate)

- **CURRENT:** two self-referencing category trees (product `categories` and
  `blog_categories`), each with its own M2M.
- **PROPOSED:** keep them separate.
- **REASON:** product categories drive navigation/breadcrumbs and are
  catalogue-typed (hundreds of entries, SEO-heavy); blog categories are a
  small editorial taxonomy with distinct slugs (`/blog/...`). A single shared
  tree would force a discriminating `entity_type` column and complicate every
  category query with a type predicate. This is correct as designed — only a
  *display* unification belongs in the app layer.

### 2.4 `roles`/`permissions`/`role_permissions`/`user_roles` stay 4 tables

- **CURRENT:** full normalised RBAC (4 tables).
- **PROPOSED:** keep — do not collapse to `user_roles(user_id, role_code)`.
- **REASON:** the requirements explicitly ask for "roles/permissions",
  "admin/staff", and the platform plans fine-grained capabilities
  (`products.publish`, `quotes.manage`). Four tables is the minimal correct
  normal form for many-to-many users↔roles↔permissions, and `audit_logs`
  needs stable role/permission names. Collapsing trades correctness for a
  negligible row savings. (See §9 for hardening note on `is_system`.)

### 2.5 `profiles` as a 1:1 extension of `users`

- **CURRENT:** separate `profiles` table keyed by the same PK as `users`.
- **PROPOSED:** keep it separate (this is not over-engineering).
- **REASON:** `users` stays lean and mirrors Supabase Auth; profile is
  optional/editorial. The 1:1 PK FK is the correct, portable idiom (not a
  `UNIQUE` constraint on a nullable `profile_id`). Correct as designed.
---

## 3. Under-engineering — what's missing

### 3.1 Concurrency / optimistic-lock version column on `products`

- **CURRENT:** `products` has `updated_at` but no `revision`/`version` int;
  `product_revisions` is an external history log.
- **PROPOSED:** add `revision_number integer NOT NULL DEFAULT 1` to
  `products`; increment it (in the same transaction) whenever product facts
  change; keep `product_revisions` as the audit-detail log keyed by
  `(product_id, revision_number)`.
- **REASON:** bulk imports and concurrent admin edits need
  optimistic-concurrency (`update … where revision_number = ?`). Without a
  monotonic counter, "last writer wins" silently drops changes in a
  multi-admin catalogue. `updated_at` alone is not a concurrency token.

### 3.2 Missing date/versioning for documents and packings

- **CURRENT:** `documents` has `version` at header level;
  `product_packings` has single `price`/`currency` columns.
- **PROPOSED:** (a) keep `documents.version` but add
  `supersedes_document_id` self-FK for explicit replacement chains;
  (b) add `valid_from`/`valid_to` (nullable `timestamptz`) on packings, or
  move price to a separate `packing_prices` table if history matters.
- **REASON:** for regulated chemical data, "the SDS we sold in April was
  version 3" is a real requirement; a linear version int loses the
  replace-chain. Packing prices change; a single price column destroys the
  audit trail of what was quoted. If price history is not a hard requirement,
  a `valid_from` on the packing suffices without a new table.

### 3.3 Slug generation under unique constraint — import could fail

- **CURRENT:** `products.slug` is `NOT NULL` + `UNIQUE`, and the mapping
  table shows `name → slug` (slugified). The importer would otherwise fail
  hard on the first duplicate name in all 2,908 records.
- **PROPOSED:** allow `slug` to be `NULL` at import (or make the unique index
  partial `WHERE slug IS NOT NULL`), then backfill; or document a mandatory
  derivate rule: `slug = lower(name) || '-' || substr(legacy_ref, 1, 6)` when
  name-duplication would collide.
- **REASON:** chemical catalogues contain thousands of near-identical names
  ("Ethanol 99.5%", "Ethanol absolute", "Ethanol <200 proof", "Ethanol
  anhydrous"). Relying on "the importer slugs correctly" with a hard UNIQUE is
  a guaranteed first-run failure. Either relax the constraint or spec the
  collision-resolution rule now, not during migration. **This is the one
  blocking importability finding.**

### 3.4 CAS uniqueness across products

- **CURRENT:** `product_cas_numbers` has `UNIQUE (product_id, cas_number)` —
  the same CAS can appear on *many* products.
- **PROPOSED:** add a **global** unique index on `(cas_number)` for canonical
  CAS rows, or at least a surfaced warning count in the importer.
- **REASON:** a CAS number is a global registry identifier; two products
  sharing a CAS is either a real duplicate (should be merged in the source) or
  a data-quality signal the importer should not silently swallow. A partial
  unique `WHERE is_primary` is a safe middle ground (allows multi-CAS
  alternates + duplicate source CAS, but a product's primary CAS cannot be
  repeated globally).
### 3.5 No explicit `is_quoteable` / price-availability flag on packings

- **CURRENT:** `product_packings.is_active` only.
- **PROPOSED:** add `is_quoteable boolean DEFAULT true` (or fold into
  `status`).
- **REASON:** a catalogue may list a packing that cannot be quoted/purchased
  yet; a dedicated flag prevents the quote workflow from offering
  non-quoteable stock without abusing `is_active` (which would hide it from
  the catalogue entirely).

### 3.6 Contacts/leads: no merged-with / duplicate detection

- **CURRENT:** `contacts` has a global `lower(email)` index as a hint, but no
  merge semantics; `leads` snapshots can diverge from `contacts`.
- **PROPOSED:** add `merged_into_contact_id uuid NULL` FK → `contacts.id` and
  a `duplicate_of_contact_id uuid NULL` column, both with partial unique
  guards; or introduce a `contact_duplicates` advisory table.
- **REASON:** CRM hygiene is a known weak spot; without a merge mechanism,
  deduplication becomes app-only and drifts. This is cheap to add now and
  expensive to retrofit once leads flow.

### 3.7 Missing explicit "approval / review" state machine for product edits

- **CURRENT:** `products.status` (`draft/active/inactive/archived`) +
  `updated_by`; `audit_logs` stores changes.
- **PROPOSED:** add `pending_review boolean` or a `review_status text` state
  to `products`, set by `updated_by` on non-staff edits.
- **REASON:** the admin requirement ("active/inactive/published states") will
  eventually mean "a staff member must approve catalogue edits". Doing this as
  a column now avoids a migration later. Optional but aligned with the stated
  roadmap.

### 3.8 Search terms: no stopword / synonym normalisation signal

- **CURRENT:** `product_search_terms.term` is free text; the FTS vector uses
  the `simple` config.
- **PROPOSED:** keep `simple` (correct for chemical names) but add a
  `normalized_term` column (unicode-folded, punctuation-stripped) with a
  trigram index; use it for the type-ahead. Optionally note that any future
  dictionary-level synonym normalisation (e.g. "EtOH"↔"ethanol") is handled at
  import time.
- **REASON:** `simple` config does not strip unicode diacritics or fold
  case/punctuation the way users type them; a normalised column is a cheap,
  index-friendly addition that makes the fuzzy path far more tolerant.
---

## 4. Product/category relationships & hierarchical categories

**Verdict: correct.** Adjacency-list (`parent_id`) self-FK is the right
portable model; M2M through `product_categories` with `is_primary` +
partial-unique already covers "one product → many categories, one canonical".

### 4.1 Referential action on `product_categories`

- **CURRENT:** doc says "FK → `products.id` (CASCADE)" — but does **not**
  specify whether category deletion cascades.
- **PROPOSED:** make **both** FKs `ON DELETE CASCADE`; add `ON UPDATE CASCADE`
  is moot for `gen_random_uuid()` PKs (they never change), but be explicit.
- **REASON:** deleting a product or a category should not leave orphan
  junction rows. `CASCADE` on both ends is the safe default for pure junction
  tables. (Products is *never* hard-deleted in this design — rows move to
  `archived` — so in practice CASCADE rarely fires; still, spec it.)

### 4.2 Missing cycle prevention in the category tree

- **CURRENT:** `CHECK (parent_id <> id)` forbids self-parenting but **not**
  longer cycles (A→B→A).
- **PROPOSED:** enforce no-cycles at the application/import layer now, and
  document that any truly recursive validation requires a trigger (portable,
  if slightly unwieldy) or deferred app-layer check.
- **REASON:** recursive CTEs loop forever on a cycle. A database CHECK cannot
  express "no ancestor cycle" declaratively (it would need a recursive query
  inside a constraint), so this is inherently an app/importer concern — worth
  stating explicitly so the importer validates the category tree before
  insert.

### 4.3 Allowing a product in parent + child simultaneously

- **CURRENT:** the schema permits a product to appear in *both* `Solvents`
  and `Solvents > Aprotic` — the very same chemical in parent *and* descendant.
- **PROPOSED (app rule, not DDL):** the importer add a rule — if a product is
  linked to a category that has a parent chain, it must **not** also link to
  the ancestor (or must mark one primary). Document it as a data rule.
- **REASON:** this is the classic hierarchical-categorization trap: without
  the rule, category pages double-count products ("Solvents" shows it and
  "Aprotic" shows it, and searches match twice). Perfectly expressible in
  queries, but the *importer* should guarantee canonical data.

### 4.4 Category depth expectation

- **CURRENT:** doc supports "arbitrary depth" with recursive CTE.
- **PROPOSED:** declare a **practical max depth** (e.g. 3–4 levels: Industry →
  Group → Subgroup → Class, plus a hidden root) at import time.
- **REASON:** unbounded depth is fine in SQL but expensive in URL design and
  breadcrumbs; the 2,908-record catalogue almost certainly fits in 3–4 levels.
  Pinning an expected depth now prevents category-page URL sprawl later.

### 4.5 `hs_codes` + `product_hs_codes` verified

**CURRENT → PROPOSED:** keep. Normalising HS codes into a shared lookup
prevents per-product code-string duplication and enables tariff filtering.
Correct — no change.
---

## 5. Importability of all 2,908 canonical JSON records

**Verdict: generally sound, with three import-specific hazards** (one
blocking, two requiring an explicit decision).

### 5.1 Blocking: slug collisions (already flagged as §3.3)

- **CURRENT:** `products.slug NOT NULL + UNIQUE`; importer maps
  `name → slug` with no collision-resolution rule stated.
- **PROPOSED:** two acceptable options:
  - (a) make `slug` nullable + partial unique (backfill post-import), or
  - (b) state the rule: `slug = f"{kebab(name)}-{legacy_ref[-6:]}"` on
    collision.
- **REASON:** with ~2,908 chemistry names there *will* be duplicates; this is
  deterministic and testable, and prevents a failed import. This is the single
  most important fix before migration.

### 5.2 Hazard: HS-code / CAS multiplicity

- **CURRENT:** mapping allows `hs_code` **or** `customs_codes[]`, and allows
  multiple CAS per product.
- **PROPOSED:** state, pre-import: does the canonical data contain, per
  product, *at most one* HS code (then `product_hs_codes` is overkill and a
  simple nullable `products.hs_code_id` suffices), or *many*? Keep
  `product_hs_codes` only if "many" is real.
- **REASON:** this affects how many junction tables/import passes are needed.
  From typical chemical-catalogue JSON, most products ship exactly one HS
  code — in which case the junction is a needless indirection for the common
  path. Decide from the data, not from generality.

### 5.3 Hazard: category tree bootstrap

- **CURRENT:** importer "syncs `categories` (create missing), tree-aware".
- **PROPOSED:** require the importer to (a) validate the category tree for
  cycles (§4.2) and (b) upsert with deterministic `legacy_ref`-style natural
  keys (e.g. `UNIQUE (parent_id, name)`) so re-runs don't duplicate
  categories.
- **REASON:** an idempotent category upsert needs an endpoint other than a
  fresh UUID; without a natural key the second import creates a second
  root that points at the same products.

### 5.4 Hazard: unit normalisation

- **CURRENT:** doc notes `"25 g" → size_value=25, size_unit='g'` but gives no
  unit dictionary.
- **PROPOSED:** seed a small `unit` lookup (or CHECK list) for packings and
  physical properties (`g, kg, mg, L, mL, µL, mol, mmol, m, cm, K, °C, …`)
  and have the importer reject unknown units with a report.
- **REASON:** free-text units are the top source of "the same product appears
  twice" and "the sort is wrong" bugs. A fixed vocabulary at import time is
  cheap now and painful later.

### 5.5 Estimations sanity check

The ~20 terms/product and ~7 synonyms/product estimates are plausible for a
chemical catalogue. No action needed; the numbers support the search-table
split.
---

## 6. Duplicate data & unnecessary normalization

**Verdict: well-normalised overall; two concrete duplication risks to address.**

### 6.1 `audit_logs.changes` is justified duplication — approved

- **CURRENT:** `audit_logs.changes jsonb` snapshots before/after columns.
- **PROPOSED:** keep; it is the correct, bounded exception to "no duplicated
  data" — it is *history by design*, not live duplication.
- **REASON:** an immutable, JSON change-snapshot is audit-appropriate, small
  per row, never re-normalised, and avoids a dozen history tables.
  Correct as designed.

### 6.2 `leads.contact_*` snapshot columns duplicate `contacts`

- **CURRENT:** `leads` embeds `contact_name`/`contact_email`/`contact_phone`
  as "channel of record" while `contacts` also stores email/name.
- **PROPOSED:** keep the **three snapshot columns**, but (a) make them
  write-once at lead creation (never updated after the `contact_id` FK is
  set), (b) document the rule: `contact_id` is the live record; snapshots
  exist only to preserve the original inbound channel.
- **REASON:** this is standard CRM "snapshot at intake" behaviour — the
  alternative (force a `contacts` row per anonymous web lead) pollutes the
  contact dedupe. The snapshots are explicitly *historical provenance*, not a
  state to keep in sync. Approved with the write-once rule.

### 6.3 `product_search_terms` duplication

- **CURRENT:** `product_search_terms` re-stores names/synonyms/CAS/formulas as
  text rows, duplicating the source columns.
- **PROPOSED:** keep the table (it is a *derived search projection*, not
  source duplication), but state clearly it is **derived, rebuilt by the
  importer, and not edited manually**; make the importer's rebuild
  transactional (delete + insert per batch) — already specified in §11.1 of
  the base doc.
- **REASON:** a denormalised search index is the accepted cost of fast,
  ranked, fuzzy search from plain PostgreSQL — this is a deliberate,
  documented materialisation, not accidental duplication. The only risk would
  be manual edits causing drift, which the "import owns it" rule prevents.

### 6.4 Avoidable duplication: spec/property `name` strings

- **CURRENT:** `product_specifications.name` and
  `product_physical_properties.property` repeat enumerable strings
  (`density`, `purity`, `grade`...) across ~20k rows.
- **PROPOSED:** when consolidating into `product_properties` (§2.1), add a
  `property_definitions` lookup (a tiny table: id, module, code, label,
  unit_default, is_numeric) keyed by `property_id`, and keep a nullable
  `property_code` on the property row as the import key.
- **REASON:** this removes the "100 products each with 'density'" string
  repetition, standardises units and numeric semantics in one place (ties
  directly into §5.4 unit normalisation), and gives the admin UI a clean list
  of known property codes. Cheap, portable, and reduces the biggest incidental
  duplication in the catalogue. (Using a lookup for spec *values* too would
  be over-normalisation — the values themselves are genuinely open text.)
---

## 7. Foreign keys, cascade behavior, uniqueness, nullable fields

**Verdict: generally disciplined. Key items, ordered by importance.**

### 7.1 Storage-key / URL uniqueness on `product_images` (approve)

- **CURRENT:** `UNIQUE (product_id, storage_key)` ensures no duplicate image
  per product.
- **PROPOSED:** additionally add a **global unique index on `storage_key`**
  (a file should be referenced exactly once, even for a reused image).
- **REASON:** storage-key uniqueness is a classic orphan guard: two rows
  pointing at the same object key breaks object deletion and CDN-cache
  invalidation. Cheap, safe.

### 7.2 FKs that are nullable vs the child rows they guard

- **CURRENT:** `documents.product_id`, `product_images.product_id`,
  `quote_request_items.product_id`, `enquiries.product_id` are nullable and
  CASCADE.
- **PROPOSED:** on **children** (documents/images/items/enquiries) that keep a
  `product_id`, prefer `ON DELETE SET NULL` (portable, safe for
  "orphan-preserving" children) — **unless** the child's meaning *depends* on
  the parent, in which case CASCADE. Document the choice per table.
- **REASON:** mixing nullable object FKs with CASCADE creates rows that
  silently lose their anchor; SET NULL is the honest representation of "this
  side may be absent". For pure junction rows (`product_categories`,
  `blog_post_*`) CASCADE on both ends is still correct — the row *is* the
  relationship.

### 7.3 Composite-unique priority on child tables (approve)

- **CURRENT:** nearly every child has `UNIQUE (product_id, <key>)`; the
  partial unique on `is_primary` guarantees per-product canonicals.
- **PROPOSED:** keep — approve explicitly.
- **REASON:** these are the importer's idempotency anchors. The
  `UNIQUE … WHERE is_primary` partial unique is the right pattern for
  "exactly one primary per product" and avoids the flaky
  "uniquely nullable column" failed-insert problem.

### 7.4 `profiles.id = users.id` 1:1 (approve)

- **CURRENT:** PK **and** FK on `profiles.id`.
- **PROPOSED:** keep.
- **REASON:** the only portable way to make a 1:1 in SQL. Correct as designed.

### 7.5 `audit_logs` polymorphic FK (approve with a caveat)

- **CURRENT:** no FK from `audit_logs` to the entity; `entity_type` +
  `entity_id` only.
- **PROPOSED:** keep the loose reference (a hard multi-table FK is
  impossible), but add: (a) a trigger/API check that `entity_id` exists in
  the `entity_type` table, and (b) document "audit rows are immutable;
  deletion is by retention job".
- **REASON:** a polymorphic table cannot have a single FK; the trade-off is
  acknowledged in the base doc (§7.8). The missing piece is the *reference
  enforcement* — without it, `audit_logs.entity_id` can silently point at a
  deleted row and the admin "history" tab shows a ghost.

### 7.6 Nullability of money/business fields

- **CURRENT:** packings/quote items allow `price`, `currency`, quantity
  prices nullable with sensible defaults.
- **PROPOSED:** keep nullable (they genuinely may be unknown), but add the
  CHECK `(price IS NULL) = (currency IS NULL)` on `product_packings` — a price
  without a currency (or vice-versa) is a bug.
- **REASON:** this is a cheap data-integrity win that catches importer
  mistakes; "price known but currency unknown" is meaningless data.
---

## 8. PostgreSQL / Supabase compatibility

**Verdict: fully compatible.** The base document's restraint (no native enum
types, no `citext`, no `ltree`, `gen_random_uuid()` defaults, partial-unique
indexes, `pg_trgm` only) keeps everything on stock PostgreSQL ≥ 15 *and*
Supabase. Confirmations and a few markings:

### 8.1 Everything used is portable

- `uuid`/`gen_random_uuid()` (PG ≥ 13 core)
- `pg_trgm` (bundled; enabled in Supabase by default)
- stored generated columns (`GENERATED ALWAYS ... STORED`, PG ≥ 12)
- partial indexes and partial unique constraints (core)
- CHECK constraints, recursive CTEs, `jsonb` (core)
- `timestamptz`, `numeric`, `text`, `char(2/3)` (core)
- **No** Supabase-only features (`auth.*` mentioned *only* as a mapping note)

**Verdict: portable.** The `auth.users`/Storage references are *adapter*
notes, not schema dependencies.

### 8.2 One naming caveat for Supabase

- **CURRENT:** tables are named `products`, `categories`, `users`, etc.
- **PROPOSED:** keep them — but note that Supabase's bundled auth uses
  `auth.users`; the app's `public.users` is separate. Ensure the Postgres role
  and RLS policies reference `public.users` explicitly.
- **REASON:** name collision is only a *namespace* concern (two schemas), not
  a conflict. Explicitly naming the schema in queries/policies avoids
  confusion when an auth-triggered handler references `public.users`.

### 8.3 `numeric(12,4)` for money

- **CURRENT:** `numeric(12,4)` for prices.
- **PROPOSED:** keep, or use `numeric(14,2)` for quote/price display; the key
  is `numeric`, never `float`/`double precision` for money.
- **REASON:** `numeric` is exact and portable; 12,4 allows up to 99,999,999.99
  which exceeds any chemical-quote price in practice. Minor, optional;
  approval to keep as designed.

### 8.4 Supabase RLS not yet addressed

- **CURRENT:** the base doc defines schema, constraints, indexes — but says
  nothing about **Row Level Security** policies.
- **PROPOSED:** add a short RLS section (or a pointer to a future migration):
  "all catalogue/blog tables public-read; user-scoped tables (quotes,
  favourites, contacts, leads) restricted via `auth.uid()`; admin/staff via
  role grants".
- **REASON:** Supabase insists every table have RLS enabled (or be explicitly
  public). This is configuration, not schema — but flags it now so the
  migration ticket includes it. Without it, the first deployment on Supabase
  is either fully-open or fully-locked.
---

## 9. Search architecture using FTS + pg_trgm

**Verdict: strong and appropriate.** The FTS-vector-on-derived-table approach
is a well-known, direct PostgreSQL pattern; `pg_trgm` is the correct companion
for chemistry names. Refinements:

### 9.1 `simple` text-search config vs generic search

- **CURRENT:** `search_vector` uses `to_tsvector('simple', term)` — no
  stemming. This is *good* for chemistry (prevents "polymer"→"polymer" loss)
  but means generic English queries ("buying", "bought") don't stem.
- **PROPOSED:** keep `simple` but add a `ts_config` column (default `'simple'`)
  on `product_search_terms` to allow a per-term config override.
- **REASON:** chemical names dominate; `simple` is correct. But blog search (a
  future natural-language body) will want `'english'` config per-field. A
  per-row `ts_config` keeps one search table future-proof without splitting
  it.

### 9.2 Ranking weights need tuning against the 2,908 set

- **CURRENT:** fixed weights (name 1.0, CAS 1.0, article 0.9, synonym 0.8,
  category 0.8, formula 0.85, spec/HS 0.7).
- **PROPOSED:** keep them as defaults but add a `weight` tuning test once the
  first 100 products are imported — specifically verify that a CAS hit
  outranks a spec hit and that a "generic" word hit doesn't float above an
  exact-name hit.
- **REASON:** weights are judgment calls; the only way to validate them is
  against real data. This is a search-quality task, not a schema change.

### 9.3 Ranked results paging

- **CURRENT:** doc suggests `ts_rank(...) * weight` with no cursor pattern.
- **PROPOSED:** specify a **keyset (cursor) pagination** strategy by
  `(rank DESC, product_id DESC)` — never OFFSET on large result sets.
- **REASON:** at ~60k search rows with fuzzy expansions, OFFSET degrades badly
  after page ~10. Keyset on a stable tie-breaker (product_id) gives
  deterministic, index-friendly paging and is portable.

### 9.4 Fuzzy fallback vs empty result

- **CURRENT:** doc covers fuzzy matching but not the empty-result path.
- **PROPOSED:** document a two-stage flow: (1) exact/ranked FTS → if rows<X,
  (2) trigram `similarity(term)` fallback; and (3) "no results" synonyms
  suggestion.
- **REASON:** users typing "ethnol" should get "ethanol" products; defining
  the fallback ladder now keeps the search UX consistent and testable.
---

## 10. User / RBAC design & security boundaries

**Verdict: solid — the clearest part of the design.** The splitting of
company-roles vs platform-roles (§2.2), the `auth.users`↔`users` mirroring,
and the `audit_logs` actor model are all correct. Notes:

### 10.1 `users.id` mirroring Supabase Auth

- **CURRENT:** `users.id = auth.users.id` when hosted; `password_hash`
  nullable.
- **PROPOSED:** keep — explicitly.
- **REASON:** this is the cleanest portable boundary: a Supabase Auth signup
  trigger copies `auth.users` → `public.users`, and self-hosted auth writes
  `password_hash`; the app never forks identity logic. Correct.

### 10.2 RBAC seed integrity

- **CURRENT:** `roles.is_system` is documented but not enforced.
- **PROPOSED:** in the migration, protect seed rows from deletion (revoke
  DELETE on system roles/permissions, or a `deleted_at` sentinel on a system
  flag), app-level.
- **REASON:** a soft-delete-by-set-null pattern on system roles breaks every
  permission check and audit trail. Cheap guard now, silent breach later.

### 10.3 RLS (ties to §8.4)

- **CURRENT:** no RLS policy in the base doc.
- **PROPOSED:** add explicit `CREATE POLICY` guidance for (a) public read on
  `products`/`categories`/`blog_posts`, (b) owner-scope on
  `saved_favourites`, `quote_requests`, (c) company-scope via
  `company_members` on `contacts`/`leads`, (d) role-gated writes.
- **REASON:** RLS is the security boundary on Supabase; without policy
  statements the *first deploy* is either wide-open or fully-locked. This is
  the single largest *security* gap in the base document (a configuration gap,
  not a schema gap).

### 10.4 Sessions / refresh tokens ownership

- **CURRENT:** not addressed.
- **PROPOSED:** leave session handling to Supabase Auth; do **not** build
  personal-access-token or refresh-token tables in this module yet.
- **REASON:** auth tokens are ephemeral infra, not core domain data; putting
---

## 11. Blog → Product → Category → SEO relationships

**Verdict: correct and clean.** The `blog_post_products` M2M, the separate
blog/product category trees (§2.3), and the polymorphic `seo_metadata` are all
sound. Refinements:

### 11.1 `seo_metadata` polymorphism — approve, with FK trigger

- **CURRENT:** `seo_metadata` uses `(entity_type, entity_id)` with a UNIQUE
  constraint and no hard FK; base doc explicitly accepts the trade-off (§12.3).
- **PROPOSED:** keep the design, but attach a **trigger** on
  `seo_metadata` that validates `entity_id` exists in the referenced table (the
  same pattern suggested for `audit_logs` in §7.5). Cheap, portable,
  incremental.
- **REASON:** a polymorphic table needs a working referential guard; the
  UNIQUE constraint prevents duplicates but not dangling rows. Without this,
  deleting a product leaves SEO metadata pointing at a dead row and the
  canonical-URL logic silently falls back to defaults.

### 11.2 `blog_post_products` — order + explicit certainty

- **CURRENT:** `blog_post_products(id, post_id, product_id, sort_order,
  label)`.
- **PROPOSED:** keep, and add `is_promoted boolean DEFAULT false` (editorial
  pin) if "featured" products inside an article is ever wanted; otherwise the
  `sort_order` suffices. Optional.
- **REASON:** the current shape covers "products mentioned in / related to"
  cleanly. A promotion flag is the only likely future need and is a non-breaking
  column add.

### 11.3 SEO defaults vs stored

- **CURRENT:** base doc stores explicit SEO rows optionally, app falls back to
  product/category name.
- **PROPOSED:** approve. Add a note that `robots` should default to
  `index,follow` server-side when no row exists.
- **REASON:** SEO-as-a-progressive-enhancement is correct; explicit `robots`
  rows that override the default only when editorialised keeps the "no row =
  indexable" invariant simple. No schema change.

### 11.4 Blog categories: same cycle concern as product categories

- **CURRENT:** `blog_categories.parent_id` self-FK, `CHECK (parent_id <> id)`.
- **PROPOSED:** apply §4.2's cycle-prevention note here too (application-layer
  validation on write).
- **REASON:** identical to the product tree; a recursive CTE over a cycle in
---

## 12. Future scalability without unnecessary complexity

**Verdict: appropriately scaled — no premature distribution, no risky
features.** The base doc's call to avoid partitioning until needed, and to
treat `product_search_terms` and `audit_logs` as the only two candidates, is
right.

- **Approved:** leaving `audit_logs` unbounded but append-only (partition
  later by month), no `ltree` yet, no materialised search denormalisation
  beyond one derived table, no read-replica mentions (correct at this scale).
- **Proposed (cheap, now):** a `SHOULD_PARTITION` note against these two
  tables in the migration header, and a `data_retention_days` on `audit_logs`
  (nullable) to keep the retention policy a first-class fact rather than a
  cron constant.
- **Proposed (defer, don't build now):** `pgvector` for similarity search,
  `timescale`/`citus` extensions, materialized views for the search index
  (rebuilt by importer instead — correct at 2,908–300k products).
- **Reason:** the 100× growth claim (§11/§16) is plausible and index-led;
  partition/extension decisions are reversible, and adding them now adds
  operational surface with no measurable benefit at this stage.

---

## 13. Portability to ordinary PostgreSQL outside Supabase

**Verdict: genuinely portable.** Confirmed by a feature-by-feature pass:

| Feature used | Stock PG ≥ 15 | Supabase |
|---|---|---|
| `uuid` + `gen_random_uuid()` | ✅ | ✅ |
| `pg_trgm` (bundled) | ✅ | ✅ (enabled by default) |
| Generated stored columns | ✅ (≥12) | ✅ |
| Partial indexes / partial unique | ✅ | ✅ |
| CHECK constraints | ✅ | ✅ |
| Recursive CTEs | ✅ | ✅ |
| `jsonb` | ✅ | ✅ |
| `numeric`, `timestamptz`, `char(2/3)` | ✅ | ✅ |
| `auth.users` / Storage | n/a (adapter note only) | adapter |

The design's explicit avoidance of `citext`, native PG enums, and Supabase
`auth.uid()`-dependent schema keeps it drop-in portable. The only
Supabase-adjacent items are *runtime policy* (RLS — §8.4/§10.3) and *storage
adapters* (`storage_key` columns), neither of which changes the schema. When
self-hosting, the same DDL runs unmodified; RLS can be silently omitted and
object-storage adapters swapped.

---

## 14. Consolidated priority list (before writing migrations)

**Must fix (blocking):**

1. `products.slug` nullability / collision rule (§3.3, §5.1) — otherwise the
   first import can fail on duplicate names.
2. Decide `product_hs_codes` vs `products.hs_code_id` from the actual JSON
   (§5.2) — some products may ship exactly one HS code.
3. Add the explicit category-cycle validation and "no parent+child link" rule
   to the importer spec (§4.2, §4.3).

**Strongly recommended:**

4. Consolidate `product_specifications` + `product_physical_properties` into
   `product_properties` with a `property_definitions` lookup (§2.1, §6.4).
5. Add `revision_number`/optimistic-lock to `products` (§3.1).
6. Add global-unique `storage_key` indexes (§7.1) and
   `(price IS NULL) = (currency IS NULL)` CHECKs (§7.6).
7. Add trigger-based referential guards for `seo_metadata` and `audit_logs`
   (§7.5, §11.1).

**Worth documenting (no schema change):**

8. RLS policy map for Supabase (§8.4, §10.3).
9. Search fallback ladder + keyset pagination (§9.3–9.4).
10. `product_search_terms` is derived, import-owned (§6.3) — never hand-edit.

---

## 15. Callout: how the review reaches its verdict

The audit is deliberately conservative: consolidation is only recommended
where two tables store the same *kind* of fact with the same query shape
(specs/physical properties), never where a split expresses a real business
distinction. Wherever the document is right (table count, UUIDs, partial
uniques, RBAC split, storage split, portability, search approach), the review
**says so explicitly** rather than inventing churn for the sake of it.

**Final verdict: the DR-Chem architecture is ready to move to migration
authoring once the three blocking fixes (§14, items 1–3) are resolved in the
importer/DDL spec. The ~41 tables are justified; after the recommended
consolidation the design lands near ~35–38 tables, still well-shaped, and
nothing in the review alters the core data model.**
  blog categories also hangs. Consistent rule, both trees.
  them in `public.users` creates security surface without domain value. When
  self-hosted later, add an `auth_sessions` table at that point — do not
  pre-build.