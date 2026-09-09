-- =============================================================================
-- DR-Chem migration 004 — catalogue fact tables
-- property_definitions, product_properties, product_packings,
-- product_synonyms, product_cas_numbers, product_molecular_data,
-- hs_codes, product_hs_codes, product_shelf_life, product_source_urls,
-- product_revisions, documents, product_images  (§4.2–§4.13)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- property_definitions (§4.3) — shared property vocabulary
-- -----------------------------------------------------------------------------
CREATE TABLE property_definitions (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  code          text        NOT NULL,
  property_type text        NOT NULL
                CHECK (property_type IN ('spec','physical')),
  label         text        NOT NULL,
  unit_default  text        NULL,
  is_numeric    boolean     NOT NULL DEFAULT false,
  sort_order    smallint    NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_definitions_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX property_definitions_code_key ON property_definitions (code);
CREATE TRIGGER trg_property_definitions_updated_at
  BEFORE UPDATE ON property_definitions
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- -----------------------------------------------------------------------------
-- product_properties (§4.2) — consolidated spec + physical facts
-- -----------------------------------------------------------------------------
CREATE TABLE product_properties (
  id                     uuid          NOT NULL DEFAULT gen_random_uuid(),
  product_id             uuid          NOT NULL,
  property_definition_id uuid          NOT NULL,
  value_text             text          NULL,
  value_min              numeric(16,6) NULL,
  value_max              numeric(16,6) NULL,
  unit                   text          NULL,
  sort_order             smallint      NOT NULL DEFAULT 0,
  CONSTRAINT product_properties_pkey PRIMARY KEY (id),
  CONSTRAINT fk_product_properties_products FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE,
  -- RESTRICT: a definition in use must never be silently dropped (§4.2).
  CONSTRAINT fk_product_properties_property_definitions
    FOREIGN KEY (property_definition_id)
    REFERENCES property_definitions (id) ON DELETE RESTRICT,
  -- Every property must carry some value (§4.2).
  CONSTRAINT product_properties_has_value_check
    CHECK (value_text IS NOT NULL OR value_min IS NOT NULL)
);

CREATE UNIQUE INDEX product_properties_product_definition_key
  ON product_properties (product_id, property_definition_id);
CREATE INDEX idx_product_properties_definition_id
  ON product_properties (property_definition_id);
CREATE INDEX idx_product_properties_value_text_trgm
  ON product_properties USING gin (value_text gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- product_packings (§4.4)
-- -----------------------------------------------------------------------------
CREATE TABLE product_packings (
  id          uuid          NOT NULL DEFAULT gen_random_uuid(),
  product_id  uuid          NOT NULL,
  code        text          NOT NULL,
  title       text          NULL,
  description text          NULL,
  size_value  numeric(12,4) NULL,
  size_unit   text          NULL,
  price       numeric(12,4) NULL,
  currency    char(3)       NULL,
  is_active   boolean       NOT NULL DEFAULT true,
  CONSTRAINT product_packings_pkey PRIMARY KEY (id),
  CONSTRAINT fk_product_packings_products FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX product_packings_product_code_key
  ON product_packings (product_id, code);

-- -----------------------------------------------------------------------------
-- product_synonyms (§4.7)
-- -----------------------------------------------------------------------------
CREATE TABLE product_synonyms (
  id         uuid     NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid     NOT NULL,
  synonym    text     NOT NULL,
  language   char(2)  NOT NULL DEFAULT 'en',
  is_common  boolean  NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  CONSTRAINT product_synonyms_pkey PRIMARY KEY (id),
  CONSTRAINT fk_product_synonyms_products FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX product_synonyms_product_synonym_key
  ON product_synonyms (product_id, lower(synonym));
CREATE INDEX idx_product_synonyms_synonym ON product_synonyms (synonym);
CREATE INDEX idx_product_synonyms_synonym_trgm
  ON product_synonyms USING gin (synonym gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- product_cas_numbers (§4.8)
-- -----------------------------------------------------------------------------
CREATE TABLE product_cas_numbers (
  id         uuid    NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid    NOT NULL,
  cas_number text    NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  note       text    NULL,
  CONSTRAINT product_cas_numbers_pkey PRIMARY KEY (id),
  CONSTRAINT fk_product_cas_numbers_products FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE,
  -- Format validation, not checksum (§4.8: no authoritative public checksum).
  CONSTRAINT product_cas_numbers_format_check
    CHECK (cas_number ~ '^[0-9]{2,7}-[0-9]{2}-[0-9]$')
);

CREATE UNIQUE INDEX product_cas_numbers_product_cas_key
  ON product_cas_numbers (product_id, cas_number);
CREATE UNIQUE INDEX product_cas_numbers_one_primary_per_product_key
  ON product_cas_numbers (product_id) WHERE is_primary;
CREATE INDEX idx_product_cas_numbers_cas_number
  ON product_cas_numbers (cas_number);

-- -----------------------------------------------------------------------------
-- product_molecular_data (§4.9)
-- -----------------------------------------------------------------------------
CREATE TABLE product_molecular_data (
  id               uuid          NOT NULL DEFAULT gen_random_uuid(),
  product_id       uuid          NOT NULL,
  formula          text          NOT NULL,
  molecular_weight numeric(16,6) NULL,
  is_primary       boolean       NOT NULL DEFAULT true,
  CONSTRAINT product_molecular_data_pkey PRIMARY KEY (id),
  CONSTRAINT fk_product_molecular_data_products FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX product_molecular_data_product_formula_key
  ON product_molecular_data (product_id, formula);
CREATE INDEX idx_product_molecular_data_formula_trgm
  ON product_molecular_data USING gin (formula gin_trgm_ops);

-- -----------------------------------------------------------------------------
-- hs_codes / product_hs_codes (§4.10) — junction retained by design
-- -----------------------------------------------------------------------------
CREATE TABLE hs_codes (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  code        text NOT NULL,
  description text NULL,
  CONSTRAINT hs_codes_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX hs_codes_code_key ON hs_codes (code);

CREATE TABLE product_hs_codes (
  id          uuid    NOT NULL DEFAULT gen_random_uuid(),
  product_id  uuid    NOT NULL,
  hs_code_id  uuid    NOT NULL,
  is_primary  boolean NOT NULL DEFAULT false,
  sort_order  smallint NOT NULL DEFAULT 0,
  CONSTRAINT product_hs_codes_pkey PRIMARY KEY (id),
  CONSTRAINT fk_product_hs_codes_products FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_product_hs_codes_hs_codes FOREIGN KEY (hs_code_id)
    REFERENCES hs_codes (id)
);

CREATE UNIQUE INDEX product_hs_codes_product_hs_key
  ON product_hs_codes (product_id, hs_code_id);
CREATE UNIQUE INDEX product_hs_codes_one_primary_per_product_key
  ON product_hs_codes (product_id) WHERE is_primary;
CREATE INDEX idx_product_hs_codes_hs_code_id ON product_hs_codes (hs_code_id);

-- -----------------------------------------------------------------------------
-- product_shelf_life (§4.11) — one row per product
-- -----------------------------------------------------------------------------
CREATE TABLE product_shelf_life (
  id                uuid          NOT NULL DEFAULT gen_random_uuid(),
  product_id        uuid          NOT NULL,
  period_value      numeric(5,1)  NULL,
  period_unit       text          NULL
                    CHECK (period_unit IN ('hours','days','months','years')),
  storage_conditions text         NULL,
  notes             text          NULL,
  CONSTRAINT product_shelf_life_pkey PRIMARY KEY (id),
  CONSTRAINT fk_product_shelf_life_products FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX product_shelf_life_product_key
  ON product_shelf_life (product_id);

-- -----------------------------------------------------------------------------
-- product_source_urls (§4.12)
-- -----------------------------------------------------------------------------
CREATE TABLE product_source_urls (
  id          uuid    NOT NULL DEFAULT gen_random_uuid(),
  product_id  uuid    NOT NULL,
  url         text    NOT NULL,
  source_type text    NOT NULL DEFAULT 'other'
              CHECK (source_type IN ('catalogue','datasheet','supplier','other')),
  is_primary  boolean NOT NULL DEFAULT false,
  note        text    NULL,
  CONSTRAINT product_source_urls_pkey PRIMARY KEY (id),
  CONSTRAINT fk_product_source_urls_products FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX product_source_urls_product_url_key
  ON product_source_urls (product_id, url);
CREATE INDEX idx_product_source_urls_url ON product_source_urls (url);

-- -----------------------------------------------------------------------------
-- product_revisions (§4.13) — revision history / revision dates
-- -----------------------------------------------------------------------------
CREATE TABLE product_revisions (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid(),
  product_id         uuid        NOT NULL,
  revision_date      date        NOT NULL,
  summary            text        NULL,
  changed_by_user_id uuid        NULL,
  CONSTRAINT product_revisions_pkey PRIMARY KEY (id),
  CONSTRAINT fk_product_revisions_products FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_product_revisions_users FOREIGN KEY (changed_by_user_id)
    REFERENCES users (id)
);

CREATE UNIQUE INDEX product_revisions_product_date_key
  ON product_revisions (product_id, revision_date);
CREATE INDEX idx_product_revisions_product_date_desc
  ON product_revisions (product_id, revision_date DESC);

-- -----------------------------------------------------------------------------
-- documents (§4.5) — metadata only; bytes live in object storage (§10)
-- -----------------------------------------------------------------------------
CREATE TABLE documents (
  id                uuid      NOT NULL DEFAULT gen_random_uuid(),
  product_id        uuid      NULL,
  document_type     text      NOT NULL
                    CHECK (document_type IN ('sds','tds','coa','catalogue','regulatory','other')),
  title             text      NOT NULL,
  description       text      NULL,
  storage_key       text      NOT NULL,
  original_filename text      NULL,
  mime_type         text      NULL,
  file_size_bytes   bigint    NULL,
  version           smallint  NOT NULL DEFAULT 1,
  is_active         boolean   NOT NULL DEFAULT true,
  published_at      timestamptz NULL,
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT fk_documents_products FOREIGN KEY (product_id)
    REFERENCES products (id)
);

CREATE INDEX idx_documents_product_id ON documents (product_id);
CREATE INDEX idx_documents_document_type ON documents (document_type);

-- -----------------------------------------------------------------------------
-- product_images (§4.6)
-- -----------------------------------------------------------------------------
CREATE TABLE product_images (
  id          uuid    NOT NULL DEFAULT gen_random_uuid(),
  product_id  uuid    NOT NULL,
  storage_key text    NOT NULL,
  url         text    NULL,
  alt_text    text    NULL,
  caption     text    NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  is_primary  boolean NOT NULL DEFAULT false,
  CONSTRAINT product_images_pkey PRIMARY KEY (id),
  CONSTRAINT fk_product_images_products FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX product_images_product_storage_key
  ON product_images (product_id, storage_key);
CREATE INDEX idx_product_images_product_sort
  ON product_images (product_id, sort_order);
-- At most one primary (thumbnail) image per product (§4.6).
CREATE UNIQUE INDEX product_images_one_primary_per_product_key
  ON product_images (product_id) WHERE is_primary;

-- -----------------------------------------------------------------------------
-- §2 Convention: every table carries created_at/updated_at. The §4 column
-- tables are abridged; these child/junction tables get the standard pair here.
-- (audit_logs §7.8 and saved_favourites §7.7 are exempt: append-only /
-- immutable pairs with created_at only, per their explicit specs.)
-- -----------------------------------------------------------------------------
ALTER TABLE product_properties
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE product_packings
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE product_synonyms
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE product_cas_numbers
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE product_molecular_data
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE hs_codes
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE product_hs_codes
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE product_shelf_life
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE product_source_urls
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE product_revisions
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE documents
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE product_images
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER trg_product_properties_updated_at
  BEFORE UPDATE ON product_properties FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_product_packings_updated_at
  BEFORE UPDATE ON product_packings FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_product_synonyms_updated_at
  BEFORE UPDATE ON product_synonyms FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_product_cas_numbers_updated_at
  BEFORE UPDATE ON product_cas_numbers FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_product_molecular_data_updated_at
  BEFORE UPDATE ON product_molecular_data FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_hs_codes_updated_at
  BEFORE UPDATE ON hs_codes FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_product_hs_codes_updated_at
  BEFORE UPDATE ON product_hs_codes FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_product_shelf_life_updated_at
  BEFORE UPDATE ON product_shelf_life FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_product_source_urls_updated_at
  BEFORE UPDATE ON product_source_urls FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_product_revisions_updated_at
  BEFORE UPDATE ON product_revisions FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();
CREATE TRIGGER trg_product_images_updated_at
  BEFORE UPDATE ON product_images FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

COMMIT;
