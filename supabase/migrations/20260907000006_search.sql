-- =============================================================================
-- DR-Chem migration 006 — search
-- product_search_terms (§6.2) — derived, importer-populated search index
-- =============================================================================

BEGIN;

CREATE TABLE product_search_terms (
  id              uuid          NOT NULL DEFAULT gen_random_uuid(),
  product_id      uuid          NOT NULL,
  term            text          NOT NULL,
  source_type     text          NOT NULL
                  CHECK (source_type IN
                    ('name','article_number','cas','synonym','formula',
                     'category','spec','hs_code','other')),
  weight          numeric(3,2)  NOT NULL DEFAULT 1.00,
  language        char(2)       NOT NULL DEFAULT 'en',
  normalized_term text          NOT NULL,
  ts_config       regconfig     NOT NULL DEFAULT 'simple'::regconfig,
  -- Derived column (§6.2): 'simple' keeps chemical names and CAS strings
  -- intact; per-row 'english' can be enabled later without a table change.
  search_vector   tsvector      GENERATED ALWAYS AS
                    (to_tsvector(ts_config, term)) STORED,
  CONSTRAINT product_search_terms_pkey PRIMARY KEY (id),
  CONSTRAINT fk_product_search_terms_products FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX product_search_terms_product_source_term_key
  ON product_search_terms (product_id, source_type, lower(term));
CREATE INDEX idx_product_search_terms_product_id
  ON product_search_terms (product_id);
CREATE INDEX idx_product_search_terms_search_vector
  ON product_search_terms USING gin (search_vector);
CREATE INDEX idx_product_search_terms_term_trgm
  ON product_search_terms USING gin (term gin_trgm_ops);
CREATE INDEX idx_product_search_terms_normalized_term_trgm
  ON product_search_terms USING gin (normalized_term gin_trgm_ops);
CREATE INDEX idx_product_search_terms_term ON product_search_terms (term);
-- Keyset pagination tie-breaker support (§6.5): stable total order on the
-- immutable product id.
CREATE INDEX idx_product_search_terms_product_id_keyset
  ON product_search_terms (product_id DESC, id DESC);

-- §2 Convention: standard timestamp pair (§6.2 column table is abridged).
ALTER TABLE product_search_terms
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE TRIGGER trg_product_search_terms_updated_at
  BEFORE UPDATE ON product_search_terms
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

COMMIT;
