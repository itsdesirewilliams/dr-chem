import type { Metadata } from "next";
import { getCategoryTree } from "@/lib/categories";
import { CategoryCard } from "@/components/CategoryCard";
import { SectionHeading, EmptyState, btn } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Categories",
  description:
    "Browse DR Chemicals products by category — industrial, agricultural, mining and water-treatment chemicals.",
};

export default async function CategoriesPage() {
  const tree = await getCategoryTree();

  return (
    <div className="container-site py-10 lg:py-14">
      <SectionHeading
        eyebrow="Catalogue index"
        title="Browse by category"
        lead="Category pages group products by chemical family and application area."
      />

      {tree.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Categories are being organised"
            message="The product catalogue is live and searchable; categories will appear here as they are assigned."
            action={<Link href="/products" className={btn.primary}>Browse all products</Link>}
          />
        </div>
      ) : (
        <div className="mt-12 space-y-12">
          {tree.map((parent) => (
            <section key={parent.slug} aria-labelledby={`cat-${parent.slug}`}>
              <div className="flex items-baseline justify-between gap-4 border-b border-ink-900 pb-2">
                <h2 id={`cat-${parent.slug}`} className="text-[18px] font-semibold tracking-tight text-ink-900">
                  <Link
                    href={`/categories/${parent.slug}`}
                    className="transition-colors hover:text-jade-800"
                  >
                    {parent.name}
                  </Link>
                </h2>
                <span className="tnum shrink-0 text-[12.5px] text-ink-500">
                  {parent.productCount} product{parent.productCount === 1 ? "" : "s"}
                </span>
              </div>
              {parent.children.length > 0 ? (
                <div>
                  {parent.children.map((child) => (
                    <CategoryCard key={child.slug} category={child} />
                  ))}
                </div>
              ) : (
                <div>
                  <CategoryCard category={parent} />
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}