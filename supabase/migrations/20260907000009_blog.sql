-- =============================================================================
-- DR-Chem migration 009 — blog platform
-- blog_categories, blog_posts, blog_post_categories, blog_tags,
-- blog_post_tags, blog_post_products  (§9.1–§9.5)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- blog_categories (§9.1) — self-referencing tree
-- -----------------------------------------------------------------------------
CREATE TABLE blog_categories (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  parent_id   uuid        NULL,
  name        text        NOT NULL,
  slug        text        NOT NULL,
  description text        NULL,
  sort_order  smallint    NOT NULL DEFAULT 0,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blog_categories_pkey PRIMARY KEY (id),
  CONSTRAINT blog_categories_no_self_parent_check
    CHECK (parent_id IS NULL OR parent_id <> id),
  CONSTRAINT fk_blog_categories_parent FOREIGN KEY (parent_id)
    REFERENCES blog_categories (id)
);

CREATE UNIQUE INDEX blog_categories_slug_key ON blog_categories (slug);
CREATE INDEX idx_blog_categories_parent_id ON blog_categories (parent_id);
CREATE TRIGGER trg_blog_categories_updated_at
  BEFORE UPDATE ON blog_categories
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- -----------------------------------------------------------------------------
-- blog_posts (§9.2)
-- -----------------------------------------------------------------------------
CREATE TABLE blog_posts (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  author_id         uuid        NOT NULL,
  title             text        NOT NULL,
  slug              text        NOT NULL,
  excerpt           text        NULL,
  content           text        NOT NULL,
  status            text        NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','scheduled','published','archived')),
  published_at      timestamptz NULL,
  cover_storage_key text        NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blog_posts_pkey PRIMARY KEY (id),
  CONSTRAINT fk_blog_posts_users FOREIGN KEY (author_id)
    REFERENCES users (id)
);

CREATE UNIQUE INDEX blog_posts_slug_key ON blog_posts (slug);
CREATE INDEX idx_blog_posts_status_published ON blog_posts (status, published_at);
CREATE INDEX idx_blog_posts_author_id ON blog_posts (author_id);
CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- -----------------------------------------------------------------------------
-- blog_post_categories (§9.3) — one primary category per post
-- -----------------------------------------------------------------------------
CREATE TABLE blog_post_categories (
  id               uuid     NOT NULL DEFAULT gen_random_uuid(),
  blog_post_id     uuid     NOT NULL,
  blog_category_id uuid     NOT NULL,
  is_primary       boolean  NOT NULL DEFAULT false,
  sort_order       smallint NOT NULL DEFAULT 0,
  CONSTRAINT blog_post_categories_pkey PRIMARY KEY (id),
  CONSTRAINT fk_blog_post_categories_posts FOREIGN KEY (blog_post_id)
    REFERENCES blog_posts (id) ON DELETE CASCADE,
  CONSTRAINT fk_blog_post_categories_categories FOREIGN KEY (blog_category_id)
    REFERENCES blog_categories (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX blog_post_categories_post_category_key
  ON blog_post_categories (blog_post_id, blog_category_id);
CREATE UNIQUE INDEX blog_post_categories_one_primary_per_post_key
  ON blog_post_categories (blog_post_id) WHERE is_primary;
CREATE INDEX idx_blog_post_categories_category
  ON blog_post_categories (blog_category_id);

-- -----------------------------------------------------------------------------
-- blog_tags / blog_post_tags (§9.4) — shared tag rows, never duplicated
-- -----------------------------------------------------------------------------
CREATE TABLE blog_tags (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  slug       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blog_tags_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX blog_tags_name_key ON blog_tags (name);
CREATE UNIQUE INDEX blog_tags_slug_key ON blog_tags (slug);

CREATE TABLE blog_post_tags (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  blog_post_id uuid NOT NULL,
  blog_tag_id  uuid NOT NULL,
  CONSTRAINT blog_post_tags_pkey PRIMARY KEY (id),
  CONSTRAINT fk_blog_post_tags_posts FOREIGN KEY (blog_post_id)
    REFERENCES blog_posts (id) ON DELETE CASCADE,
  CONSTRAINT fk_blog_post_tags_tags FOREIGN KEY (blog_tag_id)
    REFERENCES blog_tags (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX blog_post_tags_post_tag_key
  ON blog_post_tags (blog_post_id, blog_tag_id);
CREATE INDEX idx_blog_post_tags_tag ON blog_post_tags (blog_tag_id);

-- -----------------------------------------------------------------------------
-- blog_post_products (§9.5, §12.1) — editorial post↔product links
-- -----------------------------------------------------------------------------
CREATE TABLE blog_post_products (
  id           uuid     NOT NULL DEFAULT gen_random_uuid(),
  blog_post_id uuid     NOT NULL,
  product_id   uuid     NOT NULL,
  sort_order   smallint NOT NULL DEFAULT 0,
  label        text     NULL,
  CONSTRAINT blog_post_products_pkey PRIMARY KEY (id),
  CONSTRAINT fk_blog_post_products_posts FOREIGN KEY (blog_post_id)
    REFERENCES blog_posts (id) ON DELETE CASCADE,
  CONSTRAINT fk_blog_post_products_products FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX blog_post_products_post_product_key
  ON blog_post_products (blog_post_id, product_id);
CREATE INDEX idx_blog_post_products_product ON blog_post_products (product_id);

-- §2 Convention: standard timestamp pair (§9.3–§9.5 specs are abridged).
ALTER TABLE blog_tags
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE blog_post_categories
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE blog_post_tags
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE blog_post_products
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER trg_blog_tags_updated_at
  BEFORE UPDATE ON blog_tags
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_blog_post_categories_updated_at
  BEFORE UPDATE ON blog_post_categories
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_blog_post_tags_updated_at
  BEFORE UPDATE ON blog_post_tags
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_blog_post_products_updated_at
  BEFORE UPDATE ON blog_post_products
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

COMMIT;
