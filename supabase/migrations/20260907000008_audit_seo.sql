-- =============================================================================
-- DR-Chem migration 008 — audit infrastructure, polymorphic referential
-- guards, SEO metadata
-- entity_registry, audit_logs (+ trigger guard), seo_metadata (+ trigger guard)
-- (§7.8, §12.3)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- entity_registry (§7.8) — the ONLY source of dynamic table names for the
-- polymorphic guards. Seeded with every auditable/SEO entity type; the
-- audit_logs.entity_type CHECK below permits exactly this list.
-- -----------------------------------------------------------------------------
CREATE TABLE entity_registry (
  entity_type text NOT NULL,
  table_name  text NOT NULL,
  CONSTRAINT entity_registry_pkey PRIMARY KEY (entity_type)
);

CREATE INDEX idx_entity_registry_table_name ON entity_registry (table_name);

INSERT INTO entity_registry (entity_type, table_name) VALUES
  ('product',       'products'),
  ('category',      'categories'),
  ('blog_post',     'blog_posts'),
  ('blog_category', 'blog_categories'),
  ('quote_request', 'quote_requests'),
  ('lead',          'leads'),
  ('contact',       'contacts'),
  ('enquiry',       'enquiries'),
  ('user',          'users'),
  ('company',       'companies'),
  ('document',      'documents');

-- Shared referential guard (§7.8/§12.3): resolves table_name from the seeded
-- registry (never user input -> no injection surface) and verifies the target
-- row exists. Plain PL/pgSQL — identical on Supabase and stock PostgreSQL.
CREATE OR REPLACE FUNCTION app.assert_entity_exists()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_table  text;
  v_exists boolean;
BEGIN
  SELECT table_name INTO v_table
    FROM entity_registry WHERE entity_type = NEW.entity_type;

  IF v_table IS NULL THEN
    RAISE EXCEPTION '%: entity_type "%" is not in entity_registry',
      TG_TABLE_NAME, NEW.entity_type;
  END IF;

  IF to_regclass(format('public.%I', v_table)) IS NULL THEN
    RAISE EXCEPTION '%: registered table "%" does not exist',
      TG_TABLE_NAME, v_table;
  END IF;

  EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE id = $1)', v_table)
    INTO v_exists
    USING NEW.entity_id;

  IF NOT v_exists THEN
    RAISE EXCEPTION '%: no % row with id "%" (entity_type "%")',
      TG_TABLE_NAME, v_table, NEW.entity_id, NEW.entity_type;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- audit_logs (§7.8) — append-only; loose polymorphic reference guarded by
-- app.assert_entity_exists(). entity_type CHECK mirrors the registry seeds.
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id            bigserial   NOT NULL,
  actor_user_id uuid        NULL,
  action        text        NOT NULL,
  entity_type   text        NOT NULL
                CHECK (entity_type IN
                  ('product','category','blog_post','blog_category',
                   'quote_request','lead','contact','enquiry',
                   'user','company','document')),
  entity_id     uuid        NOT NULL,
  changes       jsonb       NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT fk_audit_logs_users FOREIGN KEY (actor_user_id)
    REFERENCES users (id)
);

CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor_user_id ON audit_logs (actor_user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);

CREATE TRIGGER trg_audit_logs_referential_integrity
  BEFORE INSERT OR UPDATE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION app.assert_entity_exists();

-- -----------------------------------------------------------------------------
-- seo_metadata (§12.3) — one row per SEO-bearing entity, polymorphic,
-- guarded by the same entity_registry design.
-- -----------------------------------------------------------------------------
CREATE TABLE seo_metadata (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  entity_type       text        NOT NULL
                    CHECK (entity_type IN
                      ('product','category','blog_post','blog_category')),
  entity_id         uuid        NOT NULL,
  meta_title        text        NULL,
  meta_description  text        NULL,
  canonical_url     text        NULL,
  robots            text        NULL,
  og_image_media_key text       NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seo_metadata_pkey PRIMARY KEY (id)
);

-- Single unique index satisfies both the UNIQUE (entity_type, entity_id)
-- constraint and the per-entity lookup index (§12.3).
CREATE UNIQUE INDEX seo_metadata_entity_key
  ON seo_metadata (entity_type, entity_id);

CREATE TRIGGER trg_seo_metadata_referential_integrity
  BEFORE INSERT OR UPDATE ON seo_metadata
  FOR EACH ROW EXECUTE FUNCTION app.assert_entity_exists();

CREATE TRIGGER trg_seo_metadata_updated_at
  BEFORE UPDATE ON seo_metadata
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

COMMIT;
