-- =============================================================================
-- DR-Chem migration 003 — catalogue core: products
-- products (§4.1, incl. §4.1.1 collision-safe slug and §4.1.2 revision_number)
-- =============================================================================

BEGIN;

CREATE TABLE products (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  legacy_ref      text        NULL,
  name            text        NOT NULL,
  slug            text        NULL,
  article_number  text        NULL,
  summary         text        NULL,
  description     text        NULL,
  status          text        NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','active','inactive','archived')),
  is_featured     boolean     NOT NULL DEFAULT false,
  revision_number integer     NOT NULL DEFAULT 1
                  CHECK (revision_number > 0),
  published_at    timestamptz NULL,
  updated_by      uuid        NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id)
);

-- §4.1 Constraints: legacy_ref unique (idempotent re-import join key);
-- slug unique only when non-NULL so the 2,908-record import never blocks on
-- name collisions (§4.1.1); article_number unique; revision_number > 0.
CREATE UNIQUE INDEX products_legacy_ref_key
  ON products (legacy_ref) WHERE legacy_ref IS NOT NULL;
CREATE UNIQUE INDEX products_slug_key
  ON products (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX products_article_number_key
  ON products (article_number) WHERE article_number IS NOT NULL;

-- §4.1 Key indexes.
CREATE INDEX idx_products_status ON products (status);
CREATE INDEX idx_products_published_at ON products (published_at);
CREATE INDEX idx_products_updated_at ON products (updated_at);
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_products_article_number_trgm
  ON products USING gin (article_number gin_trgm_ops);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- Audit actor (§4.1): updated_by → users.id.
ALTER TABLE products
  ADD CONSTRAINT fk_products_users_updated_by
  FOREIGN KEY (updated_by) REFERENCES users (id);

COMMIT;
