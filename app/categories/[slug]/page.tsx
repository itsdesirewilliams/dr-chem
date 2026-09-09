import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/categories";
import { listProducts } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { CategoryChip } from "@/components/CategoryCard";
import { SectionHeading, Breadcrumbs, btn, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const { items, total } = await listProducts({ categorySlug: slug, limit: 48, offset: 0 });

  return (
    <div className="container-site py-10">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Categories", href: "/categories" },
          { label: category.name },
        ]}
      />
      <SectionHeading
        eyebrow="Category"
        title={category.name}
        lead={`${total.toLocaleString("en-IN")} active product${
          total === 1 ? "" : "s"
        }${category.description ? ` — ${category.description}` : ""}`}
      />

      {category.children.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-2" aria-label="Subcategories">
          {category.children.map((child) => (
            <span key={child.slug}>
              <CategoryChip slug={child.slug} name={`${child.name} (${child.productCount})`} />
            </span>
          ))}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No products published in this category yet"
            message="Categories are being populated from the catalogue. Use search to find a specific product."
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
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: category.name,
    description: `Browse ${category.name} products in the DR-Chem catalogue.`,
  };
}