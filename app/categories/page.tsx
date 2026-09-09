import type { Metadata } from "next";
import { getCategoryTree } from "@/lib/categories";
import { CategoryCard } from "@/components/CategoryCard";
import { SectionHeading, EmptyState, btn } from "@/components/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Categories",
  description:
    "Browse DR-Chem products by category — industrial, agricultural, mining and water-treatment chemicals.",
};

export default async function CategoriesPage() {
  const tree = await getCategoryTree();

  return (
    <div className="container-site py-10">
      <SectionHeading
        eyebrow="Catalogue"
        title="Browse by category"
        lead="Category pages group products by chemical family and application area."
      />

      {tree.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Categories are being organised"
            message="The product catalogue is live and searchable; categories will appear here as they are assigned."
            action={<Link href="/products" className={btn.primary}>Browse all products</Link>}
          />
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {tree.map((parent) => (
            <section key={parent.slug} aria-labelledby={`cat-${parent.slug}`}>
              <div className="flex items-baseline gap-2">
                <h2 id={`cat-${parent.slug}`} className="text-xl font-semibold text-ink-900">
                  <Link href={`/categories/${parent.slug}`} className="hover:text-jade-700 hover:underline">
                    {parent.name}
                  </Link>
                </h2>
                <span className="text-[13px] text-ink-500">
                  {parent.productCount} product{parent.productCount === 1 ? "" : "s"}
                </span>
              </div>
              {parent.children.length > 0 ? (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {parent.children.map((child) => (
                    <CategoryCard key={child.slug} category={child} />
                  ))}
                </div>
              ) : (
                <div className="mt-4">
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