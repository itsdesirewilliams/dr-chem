-- =============================================================================
-- DR-Chem migration 002 — identity, RBAC, organisations
-- users, profiles, roles, permissions, role_permissions, user_roles,
-- companies, company_members, countries  (§7.1–§7.6)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- users (§7.1)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id                uuid        NOT NULL DEFAULT gen_random_uuid(),
  email             text        NOT NULL,
  password_hash     text        NULL,
  display_name      text        NULL,
  status            text        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','suspended')),
  email_verified_at timestamptz NULL,
  last_login_at     timestamptz NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Case-insensitive email uniqueness via functional unique index (§2).
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- -----------------------------------------------------------------------------
-- profiles (§7.2) — 1:1 with users, enforced by PK = FK
-- -----------------------------------------------------------------------------
CREATE TABLE profiles (
  id                 uuid        NOT NULL,
  avatar_storage_key text        NULL,
  phone              text        NULL,
  job_title          text        NULL,
  bio                text        NULL,
  timezone           text        NULL DEFAULT 'UTC',
  language           char(2)     NOT NULL DEFAULT 'en',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT fk_profiles_users FOREIGN KEY (id)
    REFERENCES users (id) ON DELETE CASCADE
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- -----------------------------------------------------------------------------
-- roles / permissions / junctions (§7.6)
-- -----------------------------------------------------------------------------
CREATE TABLE roles (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  code        text        NOT NULL,
  name        text        NOT NULL,
  description text        NULL,
  is_system   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX roles_code_key ON roles (code);
CREATE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TABLE permissions (
  id          uuid        NOT NULL DEFAULT gen_random_uuid(),
  code        text        NOT NULL,
  name        text        NOT NULL,
  module      text        NOT NULL,
  description text        NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT permissions_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX permissions_code_key ON permissions (code);
CREATE TRIGGER trg_permissions_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

CREATE TABLE role_permissions (
  role_id       uuid NOT NULL,
  permission_id uuid NOT NULL,
  CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_roles
    FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permissions
    FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
);

CREATE INDEX idx_role_permissions_permission_id
  ON role_permissions (permission_id);

CREATE TABLE user_roles (
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_users
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_roles
    FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

CREATE INDEX idx_user_roles_role_id ON user_roles (role_id);

-- -----------------------------------------------------------------------------
-- countries (§7.4) — tiny lookup, referenced by companies/quote_requests
-- -----------------------------------------------------------------------------
CREATE TABLE countries (
  iso2       char(2) NOT NULL,
  name       text    NOT NULL,
  phone_code smallint NULL,
  CONSTRAINT countries_pkey PRIMARY KEY (iso2)
);

-- -----------------------------------------------------------------------------
-- companies (§7.3)
-- -----------------------------------------------------------------------------
CREATE TABLE companies (
  id            uuid        NOT NULL DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  vat_number    text        NULL,
  website_url   text        NULL,
  phone         text        NULL,
  address_line1 text        NULL,
  address_line2 text        NULL,
  address_line3 text        NULL,
  city          text        NULL,
  region        text        NULL,
  postal_code   text        NULL,
  country_iso2  char(2)     NULL,
  is_verified   boolean     NOT NULL DEFAULT false,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT companies_pkey PRIMARY KEY (id),
  CONSTRAINT fk_companies_countries FOREIGN KEY (country_iso2)
    REFERENCES countries (iso2)
);

CREATE UNIQUE INDEX companies_vat_number_key
  ON companies (vat_number) WHERE vat_number IS NOT NULL;
CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

-- -----------------------------------------------------------------------------
-- company_members (§7.5)
-- -----------------------------------------------------------------------------
CREATE TABLE company_members (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid(),
  company_id         uuid        NOT NULL,
  user_id            uuid        NOT NULL,
  role               text        NOT NULL DEFAULT 'member'
                     CHECK (role IN ('owner','admin','member','billing')),
  is_primary_company boolean     NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_members_pkey PRIMARY KEY (id),
  CONSTRAINT fk_company_members_companies FOREIGN KEY (company_id)
    REFERENCES companies (id) ON DELETE CASCADE,
  CONSTRAINT fk_company_members_users FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX company_members_company_user_key
  ON company_members (company_id, user_id);
-- At most one primary company per user (§7.5).
CREATE UNIQUE INDEX company_members_one_primary_per_user_key
  ON company_members (user_id) WHERE is_primary_company;

COMMIT;
