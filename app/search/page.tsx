import { Suspense } from "react";
import type { Metadata } from "next";
import { searchProducts } from "@/lib/search";
import { ProductCard } from "@/components/ProductCard";
import { Breadcrumbs, CardGridSkeleton, EmptyState, btn } from "@/components/ui";
import { sourceLabel } from "@/components/WhatsAppCTA";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Search — DR-Chem",
  description: "Search DR-Chem's product catalogue.",
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
      <div className="container-site py-10">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Search" }]} />
        <EmptyState
          title="Enter a search term"
          message="Search for products by name, CAS number, article number, formula or synonym."
        />
      </div>
    );
  }

  return (
    <div className="container-site py-10">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: `Search: "${query}"` },
        ]}
      />

      <Suspense fallback={<CardGridSkeleton count={6} />}>
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
      <div className="flex items-baseline gap-3 mb-6">
        <h1 className="font-serif text-xl sm:text-2xl font-bold text-ink-900">
          {total > 0
            ? `Found ${total} product${total === 1 ? "" : "s"}`
            : "No results found"}
        </h1>
        {usedFuzzyFallback ? (
          <span className="text-[13px] text-ink-500 italic">
            (using fuzzy search)
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No products match your query."
          message="Try a different search term, CAS number, or browse by category."
          action={
            <Link href="/categories" className={btn.secondary}>
              Browse Categories
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((r) => (
              <ProductCard
                key={r.slug}
                product={{
                  id: r.slug,
                  slug: r.slug,
                  name: r.name,
                  articleNumber: r.articleNumber,
                  summary: r.summary,
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
            <div className="mt-8 text-center text-[14px] text-ink-500">
              Showing top {items.length} results. Refine your search for more precise results.
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}