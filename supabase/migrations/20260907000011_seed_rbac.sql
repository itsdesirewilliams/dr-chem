-- =============================================================================
-- DR-Chem migration 011 — seed data: roles & permissions (§7.6)
-- Idempotent (ON CONFLICT DO UPDATE). countries data is loaded separately by
-- the reference-data/import step, not here.
-- =============================================================================

BEGIN;

INSERT INTO roles (code, name, description, is_system) VALUES
  ('admin',    'Administrator', 'Full platform control, including RBAC and reference data.', true),
  ('staff',    'Staff',         'Operational back-office: catalogue, quotes, leads, blog.', true),
  ('customer', 'Customer',      'Registered customer account; owns own data only.', true)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description;

INSERT INTO permissions (code, name, module, description) VALUES
  ('catalogue.products.manage',     'Manage products',        'catalogue', 'Create/update/publish products and their facts.'),
  ('catalogue.categories.manage',   'Manage categories',      'catalogue', 'Manage category tree and product/category links.'),
  ('catalogue.documents.manage',    'Manage documents',       'catalogue', 'Upload/publish SDS, TDS, CoA and other documents.'),
  ('quotes.manage',                 'Manage quote requests',  'sales',     'Work the RFQ pipeline and quote items.'),
  ('leads.manage',                  'Manage leads',           'sales',     'Manage leads, contacts and assignment.'),
  ('enquiries.manage',              'Manage enquiries',       'sales',     'Answer and close customer enquiries.'),
  ('companies.manage',              'Manage companies',       'sales',     'Administer all customer companies and members.'),
  ('users.manage',                  'Manage users',           'admin',     'Administer user accounts and status.'),
  ('admin.rbac.manage',             'Manage roles/permissions', 'admin',   'Grant roles and edit permissions.'),
  ('admin.audit.read',              'Read audit logs',        'admin',     'View the audit trail.'),
  ('admin.audit.write',             'Write audit logs',       'admin',     'Append audit entries from trusted paths.'),
  ('admin.reference.manage',        'Manage reference data',  'admin',     'Edit countries, entity_registry and other lookups.'),
  ('blog.manage',                   'Manage blog',            'content',   'Author and publish posts, categories, tags.'),
  ('seo.manage',                    'Manage SEO metadata',    'content',   'Edit SEO metadata for any SEO-bearing entity.')
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      module = EXCLUDED.module,
      description = EXCLUDED.description;

-- admin: every permission
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.code = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- staff: operational permissions, no RBAC/reference/user administration
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r JOIN permissions p
  ON p.code IN (
    'catalogue.products.manage', 'catalogue.categories.manage',
    'catalogue.documents.manage', 'quotes.manage', 'leads.manage',
    'enquiries.manage', 'blog.manage', 'seo.manage'
  )
WHERE r.code = 'staff'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- customer: no permissions (data access is ownership-based via RLS)
-- (no rows intentionally)

COMMIT;
