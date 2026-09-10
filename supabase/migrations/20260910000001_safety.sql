-- =============================================================================
-- DR-Chem migration — product safety information (LOBA source)
-- §4.x Safety: normalized storage for GHS symbols and hazard/precaution statements
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- product_safety — one row per product (optional, only when LOBA provides data)
-- -----------------------------------------------------------------------------
CREATE TABLE product_safety (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  product_id            uuid        NOT NULL,
  signal_word           text        NULL,
  un_number             text        NULL,
  imco_class            text        NULL,
  packing_group         text        NULL,
  hazardous_statement   text        NULL,
  precaution_statement  text        NULL,
  risk_statement        text        NULL,
  safety_statement      text        NULL,
  revision_date         date        NULL,
  source_url            text        NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_safety_pkey PRIMARY KEY (id),
  CONSTRAINT fk_product_safety_products FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT product_safety_one_per_product UNIQUE (product_id)
);

CREATE INDEX idx_product_safety_product_id ON product_safety (product_id);
CREATE INDEX idx_product_safety_revision_date ON product_safety (revision_date);

-- -----------------------------------------------------------------------------
-- product_safety_ghs — GHS symbols/codes for a product (multiple per product)
-- -----------------------------------------------------------------------------
CREATE TABLE product_safety_ghs (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  product_safety_id uuid      NOT NULL,
  ghs_code        text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_safety_ghs_pkey PRIMARY KEY (id),
  CONSTRAINT fk_product_safety_ghs_product_safety FOREIGN KEY (product_safety_id)
    REFERENCES product_safety (id) ON DELETE CASCADE,
  CONSTRAINT product_safety_ghs_unique_code UNIQUE (product_safety_id, ghs_code)
);

CREATE INDEX idx_product_safety_ghs_safety_id ON product_safety_ghs (product_safety_id);

-- -----------------------------------------------------------------------------
-- Updated-at triggers
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_product_safety_updated_at
  BEFORE UPDATE ON product_safety
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_product_safety_ghs_updated_at
  BEFORE UPDATE ON product_safety_ghs
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS policies — public read mirrors product public access
-- -----------------------------------------------------------------------------
ALTER TABLE product_safety ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_safety_ghs ENABLE ROW LEVEL SECURITY;

-- Public read for active products
CREATE POLICY product_safety_public_read ON product_safety
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_safety.product_id
        AND p.status = 'active'
    )
  );

CREATE POLICY product_safety_ghs_public_read ON product_safety_ghs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM product_safety ps
      JOIN products p ON p.id = ps.product_id
      WHERE ps.id = product_safety_ghs.product_safety_id
        AND p.status = 'active'
    )
  );

COMMIT;