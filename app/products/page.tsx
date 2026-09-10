import type { Metadata } from "next";
import Link from "next/link";
import { listProducts } from "@/lib/products";
import { listCategories } from "@/lib/categories";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeading, Breadcrumbs, btn, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "All Products",
  description:
    "Browse the full DR Chemicals catalogue of industrial and laboratory chemicals.",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const categorySlug = sp.category || null;
  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const pageSize = 24;
  const { items, total } = await listProducts({
    categorySlug,
    limit: pageSize,
    offset: (pageNum - 1) * pageSize,
  });
  const categories = await listCategories();
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="container-site py-10 lg:py-14">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Products" }]} />
      <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <SectionHeading
          eyebrow="Catalogue"
          title="All products"
          lead={`${total.toLocaleString("en-IN")} active product${total === 1 ? "" : "s"}${
            categorySlug ? " in this category" : " in the DR Chemicals catalogue"
          }.`}
        />
        <Link
          href="/search"
          className="hidden shrink-0 items-center gap-1 text-[14px] font-medium text-jade-700 transition-colors hover:text-jade-800 sm:inline-flex"
        >
          Search the catalogue
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* Category filter — quiet square chips, wraps on mobile */}
      {categories.length > 0 ? (
        <div className="mt-8 flex flex-wrap gap-2" aria-label="Filter by category">
          <Link
            href="/products"
            className={`border px-3 py-1.5 text-[13px] font-medium transition-colors ${
              categorySlug
                ? "border-ink-200 text-ink-600 hover:border-jade-600 hover:text-jade-700"
                : "border-jade-700 bg-jade-700 text-white"
            }`}
          >
            All
          </Link>
          {categories.slice(0, 12).map((c) => (
            <Link
              key={c.slug}
              href={`/products?category=${c.slug}`}
              className={`border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                categorySlug === c.slug
                  ? "border-jade-700 bg-jade-700 text-white"
                  : "border-ink-200 text-ink-600 hover:border-jade-600 hover:text-jade-700"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No products here yet"
            message="Nothing is published in this view yet. Try the full catalogue or search."
            action={<Link href="/search" className={btn.primary}>Search the catalogue</Link>}
          />
        </div>
      ) : (
        <div className="mt-10">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {pages > 1 ? (
        <nav
          aria-label="Pagination"
          className="mt-10 flex items-center justify-between border-t border-ink-200 pt-6"
        >
          {pageNum > 1 ? (
            <Link
              href={`/products?page=${pageNum - 1}${categorySlug ? `&category=${categorySlug}` : ""}`}
              className={btn.secondary}
            >
              ← Previous
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
          <span className="tnum text-[13px] text-ink-500">
            Page {pageNum} of {pages}
          </span>
          {pageNum < pages ? (
            <Link
              href={`/products?page=${pageNum + 1}${categorySlug ? `&category=${categorySlug}` : ""}`}
              className={btn.primary}
            >
              Next →
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
        </nav>
      ) : null}
    </div>
  );
}