-- =============================================================================
-- DR-Chem migration 010 — Row Level Security policy architecture (§7.9)
--
-- Portable stance: RLS is core PostgreSQL. Policies are written without a
-- `TO <role>` clause (default PUBLIC) so they run unchanged on Supabase
-- (anon/authenticated) and on stock PostgreSQL. Identity resolution goes
-- through app.current_user_id() (001): auth.uid() on Supabase, or
-- `SET LOCAL app.current_user_id = '<uuid>'` set by the pool on plain PG.
--
-- Enforcement model (§7.9): RLS is the enforcement layer; RBAC tables are the
-- source of truth. Writes always require a permission grant (§7.6). Never
-- expose raw SELECT on public.users to anonymous — profiles only.
-- =============================================================================

BEGIN;

-- --- RBAC helpers used by the policies below --------------------------------
CREATE OR REPLACE FUNCTION app.has_role(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = app.current_user_id() AND r.code = p_code
  );
$$;

CREATE OR REPLACE FUNCTION app.has_permission(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions perm ON perm.id = rp.permission_id
    WHERE ur.user_id = app.current_user_id() AND perm.code = p_code
  );
$$;

-- --- enable RLS everywhere (§7.9: ON by default for every table) ------------
ALTER TABLE users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries                ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies                ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_definitions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_properties       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_packings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_synonyms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_cas_numbers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_molecular_data   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hs_codes                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_hs_codes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_shelf_life       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_source_urls      ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_revisions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images           ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories               ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_search_terms     ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_favourites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_requests           ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_request_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries                ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_registry          ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_metadata             ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_tags                ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_tags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_products       ENABLE ROW LEVEL SECURITY;

-- --- Public catalogue: read-only, published/active rows (§7.9 matrix) --------
CREATE POLICY products_public_read ON products
  FOR SELECT USING (status = 'active');

CREATE POLICY categories_public_read ON categories
  FOR SELECT USING (is_active);
CREATE POLICY product_categories_public_read ON product_categories
  FOR SELECT USING (true);
CREATE POLICY property_definitions_public_read ON property_definitions
  FOR SELECT USING (true);
CREATE POLICY product_properties_public_read ON product_properties
  FOR SELECT USING (true);
CREATE POLICY product_packings_public_read ON product_packings
  FOR SELECT USING (is_active);
CREATE POLICY product_synonyms_public_read ON product_synonyms
  FOR SELECT USING (true);
CREATE POLICY product_cas_numbers_public_read ON product_cas_numbers
  FOR SELECT USING (true);
CREATE POLICY product_molecular_data_public_read ON product_molecular_data
  FOR SELECT USING (true);
CREATE POLICY hs_codes_public_read ON hs_codes
  FOR SELECT USING (true);
CREATE POLICY product_hs_codes_public_read ON product_hs_codes
  FOR SELECT USING (true);
CREATE POLICY product_shelf_life_public_read ON product_shelf_life
  FOR SELECT USING (true);
CREATE POLICY product_source_urls_public_read ON product_source_urls
  FOR SELECT USING (true);
CREATE POLICY product_revisions_public_read ON product_revisions
  FOR SELECT USING (true);
CREATE POLICY product_images_public_read ON product_images
  FOR SELECT USING (true);
CREATE POLICY product_search_terms_public_read ON product_search_terms
  FOR SELECT USING (true);
CREATE POLICY seo_metadata_public_read ON seo_metadata
  FOR SELECT USING (true);
CREATE POLICY blog_categories_public_read ON blog_categories
  FOR SELECT USING (is_active);
CREATE POLICY blog_tags_public_read ON blog_tags
  FOR SELECT USING (true);
CREATE POLICY blog_posts_public_read ON blog_posts
  FOR SELECT USING (status = 'published');
CREATE POLICY blog_post_categories_public_read ON blog_post_categories
  FOR SELECT USING (true);
CREATE POLICY blog_post_tags_public_read ON blog_post_tags
  FOR SELECT USING (true);
CREATE POLICY blog_post_products_public_read ON blog_post_products
  FOR SELECT USING (true);

-- Documents: public SDS/TDS via is_active (§7.9); staff manage via permission.
CREATE POLICY documents_public_read ON documents
  FOR SELECT USING (is_active);
CREATE POLICY documents_staff_write ON documents
  FOR INSERT WITH CHECK (app.has_permission('catalogue.documents.manage'));
CREATE POLICY documents_staff_update ON documents
  FOR UPDATE USING (app.has_permission('catalogue.documents.manage'))
  WITH CHECK (app.has_permission('catalogue.documents.manage'));

-- --- User-owned rows (§7.9): profiles, favourites, quotes, enquiries --------
CREATE POLICY users_self_read ON users
  FOR SELECT USING (id = app.current_user_id());
CREATE POLICY users_self_update ON users
  FOR UPDATE USING (id = app.current_user_id())
  WITH CHECK (id = app.current_user_id());
CREATE POLICY users_admin_manage ON users
  FOR UPDATE USING (app.has_permission('users.manage'))
  WITH CHECK (app.has_permission('users.manage'));

CREATE POLICY profiles_owner_all ON profiles
  FOR ALL USING (id = app.current_user_id())
  WITH CHECK (id = app.current_user_id());

CREATE POLICY saved_favourites_owner_all ON saved_favourites
  FOR ALL USING (user_id = app.current_user_id())
  WITH CHECK (user_id = app.current_user_id());

CREATE POLICY quote_requests_owner_read ON quote_requests
  FOR SELECT USING (
    user_id = app.current_user_id()
    OR created_by = app.current_user_id()
    OR app.has_permission('quotes.manage')
  );
CREATE POLICY quote_requests_owner_insert ON quote_requests
  FOR INSERT WITH CHECK (user_id = app.current_user_id());
CREATE POLICY quote_requests_staff_manage ON quote_requests
  FOR UPDATE USING (app.has_permission('quotes.manage'))
  WITH CHECK (app.has_permission('quotes.manage'));

CREATE POLICY quote_request_items_owner_read ON quote_request_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quote_requests q
      WHERE q.id = quote_request_id
        AND (q.user_id = app.current_user_id()
             OR q.created_by = app.current_user_id())
    )
    OR app.has_permission('quotes.manage')
  );
CREATE POLICY quote_request_items_owner_insert ON quote_request_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quote_requests q
      WHERE q.id = quote_request_id AND q.user_id = app.current_user_id()
    )
  );
CREATE POLICY quote_request_items_staff_manage ON quote_request_items
  FOR ALL USING (app.has_permission('quotes.manage'))
  WITH CHECK (app.has_permission('quotes.manage'));

CREATE POLICY enquiries_owner_read ON enquiries
  FOR SELECT USING (
    user_id = app.current_user_id()
    OR app.has_permission('enquiries.manage')
  );
CREATE POLICY enquiries_owner_insert ON enquiries
  FOR INSERT WITH CHECK (user_id = app.current_user_id());
CREATE POLICY enquiries_staff_manage ON enquiries
  FOR UPDATE USING (app.has_permission('enquiries.manage'))
  WITH CHECK (app.has_permission('enquiries.manage'));

-- --- Company-scoped rows (§7.9): membership-gated ---------------------------
CREATE POLICY companies_member_read ON companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM company_members m
      WHERE m.company_id = companies.id
        AND m.user_id = app.current_user_id()
    )
    OR app.has_permission('companies.manage')
  );
CREATE POLICY companies_member_insert ON companies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members m
      WHERE m.company_id = companies.id
        AND m.user_id = app.current_user_id()
        AND m.role IN ('owner','admin')
    )
  );
CREATE POLICY companies_member_update ON companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM company_members m
      WHERE m.company_id = companies.id
        AND m.user_id = app.current_user_id()
        AND m.role IN ('owner','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members m
      WHERE m.company_id = companies.id
        AND m.user_id = app.current_user_id()
        AND m.role IN ('owner','admin')
    )
  );

CREATE POLICY company_members_self_read ON company_members
  FOR SELECT USING (
    user_id = app.current_user_id()
    OR app.has_permission('companies.manage')
  );
CREATE POLICY company_members_owner_manage ON company_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM company_members m
      WHERE m.company_id = company_members.company_id
        AND m.user_id = app.current_user_id()
        AND m.role IN ('owner','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members m
      WHERE m.company_id = company_members.company_id
        AND m.user_id = app.current_user_id()
        AND m.role IN ('owner','admin')
    )
  );

CREATE POLICY contacts_company_read ON contacts
  FOR SELECT USING (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM company_members m
      WHERE m.company_id = contacts.company_id
        AND m.user_id = app.current_user_id()
    )
    OR app.has_permission('leads.manage')
  );
CREATE POLICY contacts_company_write ON contacts
  FOR ALL USING (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM company_members m
      WHERE m.company_id = contacts.company_id
        AND m.user_id = app.current_user_id()
        AND m.role IN ('owner','admin')
    )
  )
  WITH CHECK (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM company_members m
      WHERE m.company_id = contacts.company_id
        AND m.user_id = app.current_user_id()
        AND m.role IN ('owner','admin')
    )
  );

-- Leads: company members read; staff write (§7.9 matrix).
CREATE POLICY leads_company_read ON leads
  FOR SELECT USING (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM company_members m
      WHERE m.company_id = leads.company_id
        AND m.user_id = app.current_user_id()
    )
    OR assigned_user_id = app.current_user_id()
  );
CREATE POLICY leads_staff_write ON leads
  FOR ALL USING (app.has_permission('leads.manage'))
  WITH CHECK (app.has_permission('leads.manage'));

-- --- Admin / staff: audit logs, RBAC tables (§7.9 matrix) -------------------
CREATE POLICY audit_logs_staff_read ON audit_logs
  FOR SELECT USING (app.has_permission('admin.audit.read'));
CREATE POLICY audit_logs_staff_insert ON audit_logs
  FOR INSERT WITH CHECK (app.has_permission('admin.audit.write'));

CREATE POLICY roles_authenticated_read ON roles
  FOR SELECT USING (app.current_user_id() IS NOT NULL);
CREATE POLICY permissions_authenticated_read ON permissions
  FOR SELECT USING (app.current_user_id() IS NOT NULL);
CREATE POLICY role_permissions_authenticated_read ON role_permissions
  FOR SELECT USING (app.current_user_id() IS NOT NULL);
CREATE POLICY user_roles_self_read ON user_roles
  FOR SELECT USING (
    user_id = app.current_user_id()
    OR app.has_permission('admin.rbac.manage')
  );

CREATE POLICY roles_admin_manage ON roles
  FOR ALL USING (app.has_permission('admin.rbac.manage'))
  WITH CHECK (app.has_permission('admin.rbac.manage'));
CREATE POLICY permissions_admin_manage ON permissions
  FOR ALL USING (app.has_permission('admin.rbac.manage'))
  WITH CHECK (app.has_permission('admin.rbac.manage'));
CREATE POLICY role_permissions_admin_manage ON role_permissions
  FOR ALL USING (app.has_permission('admin.rbac.manage'))
  WITH CHECK (app.has_permission('admin.rbac.manage'));
CREATE POLICY user_roles_admin_manage ON user_roles
  FOR ALL USING (app.has_permission('admin.rbac.manage'))
  WITH CHECK (app.has_permission('admin.rbac.manage'));

-- Blog / SEO editorial writes: permission-gated; reads are public above.
CREATE POLICY blog_posts_staff_write ON blog_posts
  FOR ALL USING (app.has_permission('blog.manage'))
  WITH CHECK (app.has_permission('blog.manage'));
CREATE POLICY blog_categories_staff_write ON blog_categories
  FOR ALL USING (app.has_permission('blog.manage'))
  WITH CHECK (app.has_permission('blog.manage'));
CREATE POLICY blog_tags_staff_write ON blog_tags
  FOR ALL USING (app.has_permission('blog.manage'))
  WITH CHECK (app.has_permission('blog.manage'));
CREATE POLICY blog_post_categories_staff_write ON blog_post_categories
  FOR ALL USING (app.has_permission('blog.manage'))
  WITH CHECK (app.has_permission('blog.manage'));
CREATE POLICY blog_post_tags_staff_write ON blog_post_tags
  FOR ALL USING (app.has_permission('blog.manage'))
  WITH CHECK (app.has_permission('blog.manage'));
CREATE POLICY blog_post_products_staff_write ON blog_post_products
  FOR ALL USING (app.has_permission('blog.manage'))
  WITH CHECK (app.has_permission('blog.manage'));

CREATE POLICY seo_metadata_staff_write ON seo_metadata
  FOR ALL USING (app.has_permission('seo.manage'))
  WITH CHECK (app.has_permission('seo.manage'));

-- Catalogue writes (admin/staff via permission; the importer connects as a
-- role holding these grants, or as table owner): reads are public above.
CREATE POLICY products_staff_write ON products
  FOR ALL USING (app.has_permission('catalogue.products.manage'))
  WITH CHECK (app.has_permission('catalogue.products.manage'));
CREATE POLICY categories_staff_write ON categories
  FOR ALL USING (app.has_permission('catalogue.categories.manage'))
  WITH CHECK (app.has_permission('catalogue.categories.manage'));
CREATE POLICY product_categories_staff_write ON product_categories
  FOR ALL USING (app.has_permission('catalogue.categories.manage'))
  WITH CHECK (app.has_permission('catalogue.categories.manage'));

CREATE POLICY property_definitions_staff_write ON property_definitions
  FOR ALL USING (app.has_permission('catalogue.products.manage'))
  WITH CHECK (app.has_permission('catalogue.products.manage'));
CREATE POLICY product_properties_staff_write ON product_properties
  FOR ALL USING (app.has_permission('catalogue.products.manage'))
  WITH CHECK (app.has_permission('catalogue.products.manage'));
CREATE POLICY product_packings_staff_write ON product_packings
  FOR ALL USING (app.has_permission('catalogue.products.manage'))
  WITH CHECK (app.has_permission('catalogue.products.manage'));
CREATE POLICY product_synonyms_staff_write ON product_synonyms
  FOR ALL USING (app.has_permission('catalogue.products.manage'))
  WITH CHECK (app.has_permission('catalogue.products.manage'));
CREATE POLICY product_cas_numbers_staff_write ON product_cas_numbers
  FOR ALL USING (app.has_permission('catalogue.products.manage'))
  WITH CHECK (app.has_permission('catalogue.products.manage'));
CREATE POLICY product_molecular_data_staff_write ON product_molecular_data
  FOR ALL USING (app.has_permission('catalogue.products.manage'))
  WITH CHECK (app.has_permission('catalogue.products.manage'));
CREATE POLICY hs_codes_staff_write ON hs_codes
  FOR ALL USING (app.has_permission('catalogue.products.manage'))
  WITH CHECK (app.has_permission('catalogue.products.manage'));
CREATE POLICY product_hs_codes_staff_write ON product_hs_codes
  FOR ALL USING (app.has_permission('catalogue.products.manage'))
  WITH CHECK (app.has_permission('catalogue.products.manage'));
CREATE POLICY product_shelf_life_staff_write ON product_shelf_life
  FOR ALL USING (app.has_permission('catalogue.products.manage'))
  WITH CHECK (app.has_permission('catalogue.products.manage'));
CREATE POLICY product_source_urls_staff_write ON product_source_urls
  FOR ALL USING (app.has_permission('catalogue.products.manage'))
  WITH CHECK (app.has_permission('catalogue.products.manage'));
CREATE POLICY product_revisions_staff_write ON product_revisions
  FOR ALL USING (app.has_permission('catalogue.products.manage'))
  WITH CHECK (app.has_permission('catalogue.products.manage'));
CREATE POLICY product_images_staff_write ON product_images
  FOR ALL USING (app.has_permission('catalogue.products.manage'))
  WITH CHECK (app.has_permission('catalogue.products.manage'));
CREATE POLICY product_search_terms_staff_write ON product_search_terms
  FOR ALL USING (app.has_permission('catalogue.products.manage'))
  WITH CHECK (app.has_permission('catalogue.products.manage'));

-- countries / entity_registry: reference data; readable, admin-writable.
CREATE POLICY countries_public_read ON countries
  FOR SELECT USING (true);
CREATE POLICY countries_admin_write ON countries
  FOR ALL USING (app.has_permission('admin.reference.manage'))
  WITH CHECK (app.has_permission('admin.reference.manage'));
CREATE POLICY entity_registry_admin_write ON entity_registry
  FOR ALL USING (app.has_permission('admin.reference.manage'))
  WITH CHECK (app.has_permission('admin.reference.manage'));

COMMIT;
