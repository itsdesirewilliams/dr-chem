import { Suspense } from "react";
import type { Metadata } from "next";
import { searchProducts } from "@/lib/search";
import { ProductCard } from "@/components/ProductCard";
import { Breadcrumbs, CardGridSkeleton, EmptyState, btn } from "@/components/ui";
import { sourceLabel } from "@/components/WhatsAppCTA";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Search — DR Chemicals",
  description: "Search the DR Chemicals product catalogue.",
};

type SearchParams = Promise<{ q?: string }>;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  if (!query) {
    return (
      <div className="container-site py-10 lg:py-14">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Search" }]} />
        <div className="mt-6">
          <EmptyState
            title="Enter a search term"
            message="Search for products by name, CAS number, article number, formula or synonym."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container-site py-10 lg:py-14">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: `Search: "${query}"` },
        ]}
      />

      <Suspense fallback={<div className="mt-10"><CardGridSkeleton count={6} /></div>}>
        <SearchResults query={query} />
      </Suspense>
    </div>
  );
}

async function SearchResults({ query }: { query: string }) {
  const { items, total, usedFuzzyFallback, nextCursor } =
    await searchProducts(query);

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink-900 sm:text-[26px]">
          {total > 0
            ? `Found ${total.toLocaleString("en-IN")} product${total === 1 ? "" : "s"}`
            : "No results found"}
        </h1>
        {usedFuzzyFallback ? (
          <span className="border border-jade-200 bg-jade-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-jade-800">
            Fuzzy match
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No products matched your search."
            message={`Nothing in the catalogue matched “${query}”. Check the CAS or article number for typos, try the product name, or search a synonym — DR Chemicals can also source products that are not yet listed.`}
            action={
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/categories" className={btn.secondary}>
                  Browse categories
                </Link>
                <Link href="/contact" className={btn.primary}>
                  Contact DR Chemicals
                </Link>
              </div>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-8">
            {items.map((r) => (
              <ProductCard
                key={r.slug}
                product={{
                  id: r.slug,
                  slug: r.slug,
                  name: r.name,
                  articleNumber: r.articleNumber,
                  summary:
                    r.matchedTerm && r.matchedTerm.toLowerCase() !== r.name.toLowerCase()
                      ? `Matched: “${r.matchedTerm}” (${sourceLabel(r.sourceType)})`
                      : r.summary,
                  isFeatured: false,
                  primaryCas: r.primaryCas,
                  formula: r.formula,
                  molecularWeight: null,
                  primaryCategorySlug: null,
                  primaryCategoryName: null,
                  hsCode: null,
                  shelfLifeText: null,
                }}
              />
            ))}
          </div>

          {nextCursor ? (
            <p className="mt-8 border-t border-ink-200 pt-5 text-[13px] text-ink-500">
              Showing the top {items.length} results. Refine your search for
              more precise results.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}