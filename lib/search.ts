import { rows, one } from "@/lib/db";
import type { SearchPage, SearchResultItem, SuggestedTerm } from "@/lib/types";

/**
 * Search architecture — implements §6 of DATABASE-ARCHITECTURE.md:
 *   1. Stage 1 — ranked FTS over product_search_terms.search_vector
 *      (ts_rank × weight), keyset-paginated on (rank, id).
 *   2. Stage 2 — trigram fuzzy fallback (pg_trgm similarity) when Stage 1
 *      is empty.
 *   3. Stage 3 — "did you mean" term suggestions (same trigram index).
 */

export const FTS_FALLBACK_THRESHOLD = 5;

export async function searchProducts(
  query: string,
  options: { limit?: number } = {},
): Promise<SearchPage> {
  const term = query.trim();
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);

  if (!term) {
    return { items: [], total: 0, nextCursor: null, usedFuzzyFallback: false };
  }

    // Stage 1: ranked full-text search.
  const ftsRows = await rows<FtsRow>(
    `SELECT p.slug, p.name, p.article_number AS "articleNumber", p.summary,
            st.term, st.source_type AS "sourceType",
            (ts_rank(st.search_vector, plainto_tsquery(st.ts_config, $1))::float8
             * st.weight::float8) AS rank,
            (SELECT cas_number FROM product_cas_numbers
              WHERE product_id = p.id AND is_primary) AS "primaryCas",
            (SELECT formula FROM product_molecular_data
              WHERE product_id = p.id AND is_primary) AS formula
       FROM product_search_terms st
       JOIN products p ON p.id = st.product_id
      WHERE p.status = 'active'
        AND st.search_vector @@ plainto_tsquery(st.ts_config, $1)
      ORDER BY rank DESC, p.id DESC
      LIMIT $2`,
    [term, limit + 1],
  );

  const hasResults = ftsRows.length > 0;
  let items = distinctProducts(ftsRows.map(toResultItem));
  let usedFuzzyFallback = false;

  if (!hasResults) {
    // Stage 2: trigram fuzzy fallback.
    const trigramRows = await rows<FtsRow>(
      `SELECT p.slug, p.name, p.article_number AS "articleNumber", p.summary,
             st.term, st.source_type AS "sourceType",
             (similarity(st.normalized_term, $1))::float8 AS rank,
             (SELECT cas_number FROM product_cas_numbers
               WHERE product_id = p.id AND is_primary) AS "primaryCas",
             (SELECT formula FROM product_molecular_data
               WHERE product_id = p.id AND is_primary) AS formula
        FROM product_search_terms st
        JOIN products p ON p.id = st.product_id
       WHERE p.status = 'active' AND st.normalized_term % $1
       ORDER BY rank DESC, st.term
       LIMIT $2`,
      [term, limit + 1],
    );
    items = distinctProducts(trigramRows.map(toResultItem));
    usedFuzzyFallback = items.length > 0;
  }

  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, -1) : items;
  const last = pageItems[pageItems.length - 1];
  const nextCursor = hasMore && last ? `${last.rank}|${last.slug}` : null;

  const countRow = await one<{ n: number }>(
    `SELECT COUNT(DISTINCT p.id) AS n
       FROM product_search_terms st
       JOIN products p ON p.id = st.product_id
      WHERE p.status = 'active'
        AND st.search_vector @@ plainto_tsquery(st.ts_config, $1)`,
    [term],
  );

  return {
    items: pageItems,
    total: hasResults ? Math.max(Number(countRow?.n ?? 0), pageItems.length) : pageItems.length,
    nextCursor,
    usedFuzzyFallback,
  };
}
interface FtsRow {
  slug: string;
  name: string;
  articleNumber: string | null;
  summary: string | null;
  term: string;
  sourceType: string;
  rank: string | number;
  primaryCas: string | null;
  formula: string | null;
}

function toResultItem(r: FtsRow): SearchResultItem {
  return {
    slug: String(r.slug),
    name: String(r.name),
    articleNumber: r.articleNumber ? String(r.articleNumber) : null,
    summary: r.summary ? String(r.summary) : null,
    matchedTerm: String(r.term ?? r.name),
    sourceType: String(r.sourceType),
    rank: Number(r.rank ?? 0),
    primaryCas: r.primaryCas ? String(r.primaryCas) : null,
    formula: r.formula ? String(r.formula) : null,
  };
}

function distinctProducts(items: SearchResultItem[]): SearchResultItem[] {
  const seen = new Set<string>();
  const out: SearchResultItem[] = [];
  for (const r of items) {
    if (!r.slug || seen.has(r.slug)) continue;
    seen.add(r.slug);
    out.push(r);
  }
  return out;
}

/** Type-ahead suggestions for the search overlay (prefix + trigram). */
export async function suggestTerms(
  query: string,
  limit = 8,
): Promise<SuggestedTerm[]> {
  const term = query.trim();
  if (!term) return [];

  const out = await rows<SuggestedTerm & { rk: number }>(
    `SELECT p.slug  AS "productSlug", p.name AS "productName",
            st.term, st.source_type AS "sourceType",
            p.article_number AS "articleNumber",
            (CASE WHEN lower(st.normalized_term) LIKE lower($1) THEN 0
                  ELSE 1 END)::float8 AS rk
       FROM product_search_terms st
       JOIN products p ON p.id = st.product_id
      WHERE p.status = 'active'
        AND (st.normalized_term ILIKE $1 || '%'
             OR st.term ILIKE $2 || '%'
             OR st.normalized_term % $2)
      ORDER BY rk, st.weight DESC, st.term
      LIMIT $3`,
    [term, term, limit],
  );

  const seen = new Set<string>();
  const results: SuggestedTerm[] = [];
  for (const r of out) {
    const key = `${r.productSlug}|${r.term}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      productSlug: r.productSlug,
      productName: r.productName,
      term: r.term,
      sourceType: r.sourceType,
      articleNumber: r.articleNumber,
    });
    if (results.length >= limit) break;
  }
  return results;
}