-- =============================================================================
-- DR-Chem migration 001 — extensions & shared helper functions
-- PostgreSQL 15+ / Supabase compatible / portable to standard PostgreSQL.
-- =============================================================================

BEGIN;

-- Fuzzy/trigram search (§2 Conventions: the only extension used).
-- Bundled with PostgreSQL and Supabase; standard CREATE EXTENSION is portable.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- gen_random_uuid() is built in since PG 13 (no pgcrypto needed).

-- Helper schema for shared SQL functions (portable; not Supabase-specific).
CREATE SCHEMA IF NOT EXISTS app;

-- Maintains updated_at = now() on every BEFORE UPDATE. Attached per table in
-- the migrations that create the tables (§2 Conventions: all tables carry
-- created_at/updated_at).
CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Resolves the acting user id on both hosts (§7.9):
--   * Supabase  -> auth.uid() (used dynamically so the function body parses
--                  on servers without the auth schema)
--   * plain PG  -> the connection pool must SET LOCAL app.current_user_id
CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v uuid;
BEGIN
  IF to_regprocedure('auth.uid()') IS NOT NULL THEN
    EXECUTE 'SELECT auth.uid()' INTO v;
    RETURN v;
  END IF;
  RETURN NULLIF(current_setting('app.current_user_id', true), '')::uuid;
END;
$$;

COMMIT;
