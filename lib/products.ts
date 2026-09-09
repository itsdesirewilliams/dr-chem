import { rows, one } from "@/lib/db";
import type {
  ProductDetail,
  ProductSummary,
  CategoryLink,
  Packing,
  PropertyRow,
  CasRow,
  DocumentRow,
  ImageRow,
  SourceUrlRow,
} from "@/lib/types";

/**
 * Product catalogue queries.
 *
 * The imported catalogue does not use an `is_active` column. Product rows
 * already present in the database are therefore treated as catalogue rows.
 * Keep publication/visibility rules out of this data-access layer until the
 * actual product status values are explicitly established.
 */

const PRODUCT_COLUMNS = `
  p.id, p.slug, p.name, p.article_number, p.summary, p.is_featured,
  p.description, p.legacy_ref, p.status
`;

export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  const product = await one<Record<string, unknown>>(
    `SELECT ${PRODUCT_COLUMNS}
       FROM products p
      WHERE p.slug = $1`,
    [slug],
  );
  if (!product) return null;
  return assembleDetail(product);
}

export async function getProductByArticleNumber(
  articleNumber: string,
): Promise<ProductDetail | null> {
  const product = await one<Record<string, unknown>>(
    `SELECT ${PRODUCT_COLUMNS}
       FROM products p
      WHERE p.article_number = $1`,
    [articleNumber],
  );
  if (!product) return null;
  return assembleDetail(product);
}

async function assembleDetail(
  p: Record<string, unknown>,
): Promise<ProductDetail> {
  const id = String(p.id);
  const [cas, packings, properties, documents, images, sourceUrls, cats, revisions] =
    await Promise.all([
      rows<CasRow>(
        `SELECT
             cas_number AS "casNumber",
             is_primary AS "isPrimary",
             note
           FROM product_cas_numbers WHERE product_id = $1
          ORDER BY is_primary DESC, cas_number`,
        [id],
      ),
      rows<Packing>(
        `SELECT
             code, title, description,
             size_value AS "sizeValue",
             size_unit AS "sizeUnit",
             price, currency
           FROM product_packings
          WHERE product_id = $1 AND is_active
          ORDER BY size_value NULLS LAST, code`,
        [id],
      ),
      rows<PropertyRow>(
        `SELECT
             pd.property_type AS "propertyType",
             pd.label,
             pp.value_text AS "valueText",
             pp.unit,
             pp.sort_order AS "sortOrder"
           FROM product_properties pp
           JOIN property_definitions pd ON pd.id = pp.property_definition_id
          WHERE pp.product_id = $1
          ORDER BY pd.property_type, pp.sort_order, pd.label`,
        [id],
      ),
      rows<DocumentRow>(
        `SELECT
             document_type AS "documentType",
             title, description,
             storage_key AS "storageKey",
             original_filename AS "originalFilename",
             mime_type AS "mimeType"
           FROM documents
          WHERE product_id = $1 AND is_active
          ORDER BY document_type, title`,
        [id],
      ),
      rows<ImageRow>(
        `SELECT
             storage_key AS "storageKey",
             url,
             alt_text AS "altText",
             caption,
             is_primary AS "isPrimary",
             sort_order AS "sortOrder"
           FROM product_images WHERE product_id = $1
          ORDER BY is_primary DESC, sort_order, id`,
        [id],
      ),
      rows<SourceUrlRow>(
        `SELECT
             url,
             source_type AS "sourceType",
             is_primary AS "isPrimary",
             note
           FROM product_source_urls WHERE product_id = $1
          ORDER BY is_primary DESC, url`,
        [id],
      ),
      rows<CategoryLink>(
        `SELECT c.slug, c.name, pc.is_primary
           FROM product_categories pc
           JOIN categories c ON c.id = pc.category_id AND c.is_active
          WHERE pc.product_id = $1
          ORDER BY pc.is_primary DESC, c.name`,
        [id],
      ),
      rows<{ revisionDate: string }>(
        `SELECT revision_date AS "revisionDate"
           FROM product_revisions WHERE product_id = $1
          ORDER BY revision_date DESC`,
        [id],
      ),
    ]);

  const synonyms = (
    await rows<{ synonym: string }>(
      `SELECT synonym FROM product_synonyms WHERE product_id = $1
        ORDER BY is_common DESC, sort_order, synonym`,
      [id],
    )
  ).map((r) => r.synonym);

  const molecular = await one<Record<string, unknown>>(
    `SELECT formula, molecular_weight
       FROM product_molecular_data
      WHERE product_id = $1 AND is_primary`,
    [id],
  );

  const hs = await one<Record<string, unknown>>(
    `SELECT h.code
       FROM product_hs_codes ph
       JOIN hs_codes h ON h.id = ph.hs_code_id
      WHERE ph.product_id = $1 AND ph.is_primary`,
    [id],
  );

  const shelf = await one<Record<string, unknown>>(
    `SELECT period_value, period_unit, notes
       FROM product_shelf_life WHERE product_id = $1`,
    [id],
  );

  const primaryCas =
    cas.find((c) => c.isPrimary)?.casNumber ?? cas[0]?.casNumber ?? null;

  return {
    id,
    slug: String(p.slug ?? p.article_number ?? p.id),
    name: String(p.name),
    articleNumber: p.article_number ? String(p.article_number) : null,
    summary: p.summary ? String(p.summary) : null,
    description: p.description ? String(p.description) : null,
    legacyRef: p.legacy_ref ? String(p.legacy_ref) : null,
    status: p.status ? String(p.status) : "active",
    isFeatured: Boolean(p.is_featured),
    primaryCas,
    formula: molecular?.formula ? String(molecular.formula) : null,
    molecularWeight:
      molecular?.molecular_weight !== null &&
      molecular?.molecular_weight !== undefined
        ? Number(molecular.molecular_weight)
        : null,
    hsCode: hs?.code ? String(hs.code) : null,
    shelfLifeText: shelf?.notes ? String(shelf.notes) : null,
    primaryCategorySlug: cats.find((c) => c.isPrimary)?.slug ?? null,
    primaryCategoryName: cats.find((c) => c.isPrimary)?.name ?? null,
    cas,
    packings,
    properties,
    documents,
    images,
    sourceUrls,
    categories: cats,
    revisionDates: revisions.map((r) => r.revisionDate),
    synonyms,
  };
}
/**
 * Public product listing. Imported product rows are catalogue rows; optional
 * category/featured predicates are added when requested.
 */
export async function listProducts(options: {
  categorySlug?: string | null;
  limit?: number;
  offset?: number;
  featuredOnly?: boolean;
}): Promise<{ items: ProductSummary[]; total: number }> {
  const { categorySlug, limit = 24, offset = 0, featuredOnly = false } = options;
  const where: string[] = [];
  const params: unknown[] = [];

  if (categorySlug) {
    params.push(categorySlug);
    where.push(
      `EXISTS (
         SELECT 1 FROM product_categories pc
         JOIN categories c ON c.id = pc.category_id
        WHERE pc.product_id = p.id AND c.slug = $${params.length}
       )`,
    );
  }
  if (featuredOnly) where.push("p.is_featured");

  const whereSql = where.length > 0 ? where.join(" AND ") : "TRUE";
  const limitParam = params.length + 1;
  const offsetParam = params.length + 2;
  params.push(limit, offset);

  const rowsOut = await rows<Record<string, unknown>>(
    `SELECT p.id, p.slug, p.name, p.article_number, p.summary, p.is_featured,
            (SELECT cas_number FROM product_cas_numbers
              WHERE product_id = p.id AND is_primary) AS primary_cas,
            (SELECT formula FROM product_molecular_data
              WHERE product_id = p.id AND is_primary) AS formula,
            (SELECT molecular_weight FROM product_molecular_data
              WHERE product_id = p.id AND is_primary) AS molecular_weight,
            (SELECT h.code FROM product_hs_codes ph
               JOIN hs_codes h ON h.id = ph.hs_code_id
              WHERE ph.product_id = p.id AND ph.is_primary) AS hs_code,
            (SELECT pl.notes FROM product_shelf_life pl
              WHERE pl.product_id = p.id) AS shelf_life_text
       FROM products p
      WHERE ${whereSql}
      ORDER BY p.created_at DESC, p.id
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
    params,
  );

  const total = await one<{ n: number }>(
    `SELECT COUNT(*) AS n FROM products p WHERE ${whereSql}`,
    params.slice(0, params.length - 2),
  );

  return { items: rowsOut.map(toSummary), total: Number(total?.n ?? 0) };
}

/**
 * Related products: same category set as the given product, excluding self.
 */
export async function getRelatedProducts(
  productId: string,
  limit = 6,
): Promise<ProductSummary[]> {
  const related = await rows<Record<string, unknown>>(
    `SELECT p.id, p.slug, p.name, p.article_number, p.summary, p.is_featured,
            (SELECT cas_number FROM product_cas_numbers
              WHERE product_id = p.id AND is_primary) AS primary_cas,
            (SELECT formula FROM product_molecular_data
              WHERE product_id = p.id AND is_primary) AS formula,
            (SELECT molecular_weight FROM product_molecular_data
              WHERE product_id = p.id AND is_primary) AS molecular_weight,
            (SELECT h.code FROM product_hs_codes ph
               JOIN hs_codes h ON h.id = ph.hs_code_id
              WHERE ph.product_id = p.id AND ph.is_primary) AS hs_code,
            (SELECT pl.notes FROM product_shelf_life pl
              WHERE pl.product_id = p.id) AS shelf_life_text
       FROM products p
      WHERE p.id <> $1
        AND EXISTS (
          SELECT 1 FROM product_categories pc
           WHERE pc.product_id = p.id
             AND pc.category_id IN (
               SELECT category_id FROM product_categories WHERE product_id = $1
             )
        )
      ORDER BY p.is_featured DESC, p.created_at DESC
      LIMIT $2`,
    [productId, limit],
  );
  return related.map(toSummary);
}

/** Featured products for the homepage. */
export async function getFeaturedProducts(
  limit = 8,
): Promise<ProductSummary[]> {
  return (await listProducts({ featuredOnly: true, limit, offset: 0 })).items;
}

function toSummary(r: Record<string, unknown>): ProductSummary {
  return {
    id: String(r.id),
    slug: String(r.slug ?? r.id),
    name: String(r.name),
    articleNumber: r.article_number ? String(r.article_number) : null,
    summary: r.summary ? String(r.summary) : null,
    isFeatured: Boolean(r.is_featured),
    primaryCas: r.primary_cas ? String(r.primary_cas) : null,
    formula: r.formula ? String(r.formula) : null,
    molecularWeight:
      r.molecular_weight !== null && r.molecular_weight !== undefined
        ? Number(r.molecular_weight)
        : null,
    primaryCategorySlug: null,
    primaryCategoryName: null,
    hsCode: r.hs_code ? String(r.hs_code) : null,
    shelfLifeText: r.shelf_life_text ? String(r.shelf_life_text) : null,
  };
}

