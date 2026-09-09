# Applying DR-Chem Migrations to Supabase

> Status: **Runbook only — no migration has been executed yet.**
> This document explains the exact manual commands to link this repository to
> the Supabase project, inspect migration status, apply the schema migrations,
> and verify the result.
>
> Authoritative schema design: [`DATABASE-ARCHITECTURE.md`](./DATABASE-ARCHITECTURE.md)

---

## 1. Where the migrations live

The Supabase CLI reads migration files from **`supabase/migrations/`** only —
there is no configuration option to point it at a custom directory. The
migrations therefore live at:

```
supabase/migrations/
├── 20260907000001_extensions.sql               (was 001_extensions.sql)
├── 20260907000002_identity_organisations.sql   (002 — users, RBAC, companies, countries)
├── 20260907000003_products.sql                 (003 — products + slug/revision rules)
├── 20260907000004_catalogue.sql                (004 — property_definitions, product_properties,
│                                                packings, synonyms, CAS, molecular, HS codes,
│                                                shelf life, source URLs, revisions, documents, images)
├── 20260907000005_categorization.sql           (005 — categories, product_categories)
├── 20260907000006_search.sql                   (006 — product_search_terms)
├── 20260907000007_business.sql                 (007 — favourites, quotes, leads, contacts, enquiries)
├── 20260907000008_audit_seo.sql                (008 — entity_registry, audit_logs, seo_metadata + guards)
├── 20260907000009_blog.sql                     (009 — blog platform)
├── 20260907000010_rls.sql                      (010 — RLS enablement + policies)
└── 20260907000011_seed_rbac.sql                (011 — roles/permissions seeds)
```

- The numeric prefixes were renamed to the CLI-required `<timestamp>_<name>.sql`
  format; **file contents are unchanged** and the execution order is identical
  to the original 001→011 sequence (the CLI applies files in filename order).
- `supabase/config.toml` is a minimal CLI project file (`project_id` only).
- `supabase/.branches/` and `supabase/.temp/` (CLI local artifacts) are
  git-ignored.
- Never edit an applied migration file. New schema changes go into **new**
  migration files (see §7).

## 2. Prerequisites (what you need before starting)

| Item | Where it comes from |
|---|---|
| Supabase CLI installed | https://supabase.com/docs/guides/local-development/cli/getting-started (`npm i -g supabase` or scoop/choco) — **not installed for you** |
| Supabase account + project created | Supabase dashboard |
| **Project reference** (`<project-ref>`) | Dashboard → Project Settings → General → Reference ID |
| **Database password** | Dashboard → Project Settings → Database (reset if lost; never commit it) |
| **Access token** (only if `supabase login` cannot open a browser) | Supabase Account → Access Tokens |

No credentials are stored in this repository. The CLI stores the access token
in your user profile (`~/.supabase`); the database password is supplied
interactively or via the `SUPABASE_DB_PASSWORD` environment variable.

## 3. One-time: log in and link the project

Run from the repository root (`D:\dev\dr-chem`):

```powershell
# 1. Authenticate (opens a browser; or set SUPABASE_ACCESS_TOKEN first)
supabase login

# 2. Link this repo to the Supabase project
supabase link --project-ref <your-project-ref>
```

`supabase link` creates `supabase/.temp/project-ref` (git-ignored). It does
**not** touch the database.

## 4. Inspect migration status (read-only)

```powershell
# List local migration files and show which have NOT yet been applied
supabase migration list
```

- Expected on first run: all 11 files under **Local** / "not yet applied" on the
  remote, and an empty **Remote** list.
- This command never changes the database.

## 5. Apply the migrations (the real step)

```powershell
supabase db push
```

- Applies every unapplied migration in filename (timestamp) order:
  `20260907000001` → `20260907000011`, exactly the original 001→011 sequence.
- Prompts for confirmation; add `--dry-run` first if you want a preview:
  `supabase db push --dry-run`.
- The CLI records each applied migration in the remote
  `supabase_migrations.schema_migrations` table, so re-running `db push`
  is a no-op (idempotent at the migration-list level).
- The database password is asked for interactively (or set
  `$env:SUPABASE_DB_PASSWORD` for the session — do not persist it).
- Individual transactions: each migration file wraps its DDL in its own
  `BEGIN/COMMIT`; a failing migration aborts that file and `db push` stops.

## 6. Verify the result

```powershell
# 1. CLI-level: every migration shows as applied
supabase migration list

# 2. Confirm the schema objects (run in the Supabase dashboard SQL editor,
#    or: supabase db --help / any psql session)
```

SQL verification queries (paste into Dashboard → SQL Editor):

```sql
-- 41 tables expected
SELECT count(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Extension
SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';

-- Key objects created by the migrations
SELECT count(*) FROM information_schema.triggers
 WHERE trigger_schema = 'public';                       -- updated_at + guards
SELECT count(*) FROM pg_policies
 WHERE schemaname = 'public';                           -- RLS policies
SELECT count(*) FROM public.roles;                      -- seed data (3 roles)
SELECT count(*) FROM public.permissions;                -- seed data
SELECT count(*) FROM public.entity_registry;            -- 11 rows
```

Spot checks:

- `product_search_terms.search_vector` exists as a generated stored column.
- `products` has the partial unique slug index
  (`product_slug_unique_key` / `WHERE slug IS NOT NULL`).
- Inserting an `audit_logs` row for an unknown `entity_id` must raise the
  `app.assert_entity_exists()` exception (guard works).

## 7. After this point: never rewrite history

- The applied migration files are frozen. Fix-forward only: add a **new**
  `supabase/migrations/<timestamp>_<name>.sql`
  (generate the name with `supabase migration new <name>`).
- If the remote ever drifts, diff with `supabase db diff` — do not hand-edit
  applied files.

## 8. Prerequisites still needed from Supabase (checklist)

- [ ] **Project reference** (`<project-ref>`) — Dashboard → Project Settings → General
- [ ] **Database password** — Dashboard → Project Settings → Database
      (reset if lost; never commit; used by `db push` only)
- [ ] **Supabase CLI installed locally** (`supabase --version` to confirm)
- [ ] **`supabase login` completed** (or `SUPABASE_ACCESS_TOKEN` set)
- [ ] Confirm the target project is the **intended environment** — `db push`
      writes directly to it (there is no undo)

