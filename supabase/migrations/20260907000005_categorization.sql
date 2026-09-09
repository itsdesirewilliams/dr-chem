-- =============================================================================
-- DR-Chem migration 005 — categorization
-- categories (self-referencing hierarchy), product_categories (M2M)  (§5.1–§5.2)
-- =============================================================================

BEGIN;

CREATE TABLE categories (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid(),
  parent_id          uuid        NULL,
  name               text        NOT NULL,
  slug               text        NOT NULL,
  description        text        NULL,
  sort_order         smallint    NOT NULL DEFAULT 0,
  is_active          boolean     NOT NULL DEFAULT true,
  is_visible_in_menu boolean     NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  -- No self-parenting (§5.1). Longer cycles are rejected by the write path /
  -- importer using a bounded recursive walk — a portable declarative
  -- constraint cannot express them (§5.1 Integrity rules).
  CONSTRAINT categories_no_self_parent_check
    CHECK (parent_id IS NULL OR parent_id <> id),
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id)
    REFERENCES categories (id)
);

CREATE UNIQUE INDEX categories_slug_key ON categories (slug);
CREATE INDEX idx_categories_parent_id ON categories (parent_id);
CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- -----------------------------------------------------------------------------
-- product_categories (§5.2) — many-to-many; one primary per product
-- -----------------------------------------------------------------------------
CREATE TABLE product_categories (
  id          uuid     NOT NULL DEFAULT gen_random_uuid(),
  product_id  uuid     NOT NULL,
  category_id uuid     NOT NULL,
  is_primary  boolean  NOT NULL DEFAULT false,
  sort_order  smallint NOT NULL DEFAULT 0,
  CONSTRAINT product_categories_pkey PRIMARY KEY (id),
  CONSTRAINT fk_product_categories_products FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_product_categories_categories FOREIGN KEY (category_id)
    REFERENCES categories (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX product_categories_product_category_key
  ON product_categories (product_id, category_id);
-- Exactly one canonical (primary) category per product (§5.2).
CREATE UNIQUE INDEX product_categories_one_primary_per_product_key
  ON product_categories (product_id) WHERE is_primary;
CREATE INDEX idx_product_categories_category_product
  ON product_categories (category_id, product_id);
CREATE INDEX idx_product_categories_product_id
  ON product_categories (product_id);

-- §2 Convention: standard timestamp pair (§5.2 column table is abridged).
ALTER TABLE product_categories
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE TRIGGER trg_product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

COMMIT;
