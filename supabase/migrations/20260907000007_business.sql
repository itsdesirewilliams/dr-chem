-- =============================================================================
-- DR-Chem migration 007 — user features & business
-- saved_favourites, quote_requests, quote_request_items, leads, contacts,
-- enquiries  (§7.7, §8.1–§8.5)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- saved_favourites (§7.7)
-- -----------------------------------------------------------------------------
CREATE TABLE saved_favourites (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL,
  product_id uuid        NOT NULL,
  note       text        NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_favourites_pkey PRIMARY KEY (id),
  CONSTRAINT fk_saved_favourites_users FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_favourites_products FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX saved_favourites_user_product_key
  ON saved_favourites (user_id, product_id);
CREATE INDEX idx_saved_favourites_user_id ON saved_favourites (user_id);
CREATE INDEX idx_saved_favourites_product_id ON saved_favourites (product_id);

-- -----------------------------------------------------------------------------
-- quote_requests (§8.1)
-- -----------------------------------------------------------------------------
CREATE TABLE quote_requests (
  id                       uuid        NOT NULL DEFAULT gen_random_uuid(),
  reference                text        NOT NULL,
  user_id                  uuid        NULL,
  company_id               uuid        NULL,
  status                   text        NOT NULL DEFAULT 'draft'
                           CHECK (status IN
                             ('draft','submitted','received','quoted',
                              'negotiation','accepted','declined','cancelled')),
  currency                 char(3)     NOT NULL DEFAULT 'EUR',
  requested_delivery_date  date        NULL,
  shipping_country_iso2    char(2)     NULL,
  notes                    text        NULL,
  submitted_at             timestamptz NULL,
  created_by               uuid        NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_requests_pkey PRIMARY KEY (id),
  CONSTRAINT fk_quote_requests_users FOREIGN KEY (user_id)
    REFERENCES users (id),
  CONSTRAINT fk_quote_requests_companies FOREIGN KEY (company_id)
    REFERENCES companies (id),
  CONSTRAINT fk_quote_requests_countries FOREIGN KEY (shipping_country_iso2)
    REFERENCES countries (iso2),
  CONSTRAINT fk_quote_requests_users_created_by FOREIGN KEY (created_by)
    REFERENCES users (id)
);

CREATE UNIQUE INDEX quote_requests_reference_key
  ON quote_requests (reference);
CREATE INDEX idx_quote_requests_status ON quote_requests (status);
CREATE INDEX idx_quote_requests_company_id ON quote_requests (company_id);
CREATE INDEX idx_quote_requests_submitted_at ON quote_requests (submitted_at);
CREATE TRIGGER trg_quote_requests_updated_at
  BEFORE UPDATE ON quote_requests
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- -----------------------------------------------------------------------------
-- quote_request_items (§8.2)
-- -----------------------------------------------------------------------------
CREATE TABLE quote_request_items (
  id                   uuid          NOT NULL DEFAULT gen_random_uuid(),
  quote_request_id     uuid          NOT NULL,
  product_id           uuid          NULL,
  packing_id           uuid          NULL,
  custom_description   text          NULL,
  quantity             numeric(14,4) NOT NULL,
  quantity_unit        text          NOT NULL DEFAULT 'kg',
  requested_unit_price numeric(12,4) NULL,
  notes                text          NULL,
  CONSTRAINT quote_request_items_pkey PRIMARY KEY (id),
  CONSTRAINT fk_quote_request_items_quote_requests FOREIGN KEY (quote_request_id)
    REFERENCES quote_requests (id) ON DELETE CASCADE,
  -- Nullable for bespoke "not in catalogue" requests (§8.2).
  CONSTRAINT fk_quote_request_items_products FOREIGN KEY (product_id)
    REFERENCES products (id),
  CONSTRAINT fk_quote_request_items_packings FOREIGN KEY (packing_id)
    REFERENCES product_packings (id)
);

CREATE INDEX idx_quote_request_items_quote_request_id
  ON quote_request_items (quote_request_id);
CREATE INDEX idx_quote_request_items_product_id
  ON quote_request_items (product_id);

-- -----------------------------------------------------------------------------
-- contacts (§8.4)
-- -----------------------------------------------------------------------------
CREATE TABLE contacts (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  company_id        uuid        NULL,
  first_name        text        NOT NULL,
  last_name         text        NOT NULL,
  email             text        NOT NULL,
  phone             text        NULL,
  position          text        NULL,
  is_decision_maker boolean     NOT NULL DEFAULT false,
  is_active         boolean     NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contacts_pkey PRIMARY KEY (id),
  CONSTRAINT fk_contacts_companies FOREIGN KEY (company_id)
    REFERENCES companies (id)
);

-- One email per company (§8.4); global dedupe via functional index.
CREATE UNIQUE INDEX contacts_company_email_key
  ON contacts (company_id, lower(email)) WHERE company_id IS NOT NULL;
CREATE INDEX idx_contacts_email_lower ON contacts (lower(email));
CREATE INDEX idx_contacts_company_id ON contacts (company_id);
CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- -----------------------------------------------------------------------------
-- leads (§8.3)
-- -----------------------------------------------------------------------------
CREATE TABLE leads (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  status            text        NOT NULL DEFAULT 'new'
                    CHECK (status IN
                      ('new','contacted','qualified','proposal','won','lost',
                       'disqualified')),
  source            text        NOT NULL DEFAULT 'enquiry'
                    CHECK (source IN
                      ('enquiry','quote_request','blog','referral','manual','other')),
  contact_id        uuid        NULL,
  company_id        uuid        NULL,
  contact_name      text        NULL,
  contact_email     text        NULL,
  contact_phone     text        NULL,
  interest_note     text        NULL,
  assigned_user_id  uuid        NULL,
  next_follow_up_at timestamptz NULL,
  is_archived       boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leads_pkey PRIMARY KEY (id),
  CONSTRAINT fk_leads_contacts FOREIGN KEY (contact_id)
    REFERENCES contacts (id),
  CONSTRAINT fk_leads_companies FOREIGN KEY (company_id)
    REFERENCES companies (id),
  CONSTRAINT fk_leads_users_assigned FOREIGN KEY (assigned_user_id)
    REFERENCES users (id)
);

CREATE INDEX idx_leads_status_assigned ON leads (status, assigned_user_id);
CREATE INDEX idx_leads_contact_email ON leads (contact_email);
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- -----------------------------------------------------------------------------
-- enquiries (§8.5)
-- -----------------------------------------------------------------------------
CREATE TABLE enquiries (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  contact_id       uuid        NULL,
  lead_id          uuid        NULL,
  user_id          uuid        NULL,
  product_id       uuid        NULL,
  subject          text        NULL,
  message          text        NOT NULL,
  channel          text        NOT NULL DEFAULT 'web'
                   CHECK (channel IN ('web','email','phone','chat')),
  status           text        NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new','open','answered','closed')),
  priority         text        NOT NULL DEFAULT 'normal'
                   CHECK (priority IN ('low','normal','high','urgent')),
  assigned_user_id uuid        NULL,
  resolved_at      timestamptz NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT enquiries_pkey PRIMARY KEY (id),
  CONSTRAINT fk_enquiries_contacts FOREIGN KEY (contact_id)
    REFERENCES contacts (id),
  CONSTRAINT fk_enquiries_leads FOREIGN KEY (lead_id)
    REFERENCES leads (id),
  CONSTRAINT fk_enquiries_users FOREIGN KEY (user_id)
    REFERENCES users (id),
  CONSTRAINT fk_enquiries_products FOREIGN KEY (product_id)
    REFERENCES products (id),
  CONSTRAINT fk_enquiries_users_assigned FOREIGN KEY (assigned_user_id)
    REFERENCES users (id)
);

CREATE INDEX idx_enquiries_status_assigned
  ON enquiries (status, assigned_user_id);
CREATE INDEX idx_enquiries_product_id ON enquiries (product_id);
CREATE INDEX idx_enquiries_contact_id ON enquiries (contact_id);
CREATE TRIGGER trg_enquiries_updated_at
  BEFORE UPDATE ON enquiries
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

COMMIT;
