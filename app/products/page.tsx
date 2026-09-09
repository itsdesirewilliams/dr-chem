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
    "Browse the full DR-Chem catalogue of industrial and laboratory chemicals.",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const categorySlug = sp.category || null;
  const pageNum = Math.max(1, (parseInt(sp.page ?? "1", 10) || 1));
  const pageSize = 24;
  const { items, total } = await listProducts({
    categorySlug,
    limit: pageSize,
    offset: (pageNum - 1) * pageSize,
  });
  const categories = await listCategories();
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="container-site py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Products" }]} />
      <SectionHeading
        eyebrow="Catalogue"
        title="All products"
        lead={`${total.toLocaleString("en-IN")} active products ${
          categorySlug ? "in this category" : "in the DR-Chem catalogue"
        }. Search or filter to narrow results.`}
      />

      {/* Category filter chips (mobile-first, wraps) */}
      {categories.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2" aria-label="Filter by category">
          <Link
            href="/products"
            className={`rounded-full border px-3 py-1.5 text-[13.5px] font-medium ${categorySlug ? "border-ink-200 text-ink-600 hover:border-jade-300" : "border-jade-600 bg-jade-600 text-white"}`}
          >
            All
          </Link>
          {categories.slice(0, 12).map((c) => (
            <Link
              key={c.slug}
              href={`/products?category=${c.slug}`}
              className={`rounded-full border px-3 py-1.5 text-[13.5px] font-medium ${
                categorySlug === c.slug
                  ? "border-jade-600 bg-jade-600 text-white"
                  : "border-ink-200 text-ink-600 hover:border-jade-300 hover:text-jade-700"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No products here yet"
            message="Nothing is published in this view yet. Try the full catalogue or search."
            action={<Link href="/search" className={btn.primary}>Search the catalogue</Link>}
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {pages > 1 ? (
        <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3">
          {pageNum > 1 ? (
            <Link
              href={`/products?page=${pageNum - 1}${categorySlug ? `&category=${categorySlug}` : ""}`}
              className={btn.secondary}
            >
              ← Previous
            </Link>
          ) : null}
          <span className="text-[14px] text-ink-500">
            Page {pageNum} of {pages}
          </span>
          {pageNum < pages ? (
            <Link
              href={`/products?page=${pageNum + 1}${categorySlug ? `&category=${categorySlug}` : ""}`}
              className={btn.primary}
            >
              Next →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}