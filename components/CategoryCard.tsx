import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CategoryNode } from "@/lib/types";

/**
 * Catalogue-index category row — typographic, no per-category icon. The name
 * dominates; count and subcategories read as quiet metadata.
 */
export function CategoryCard({ category }: { category: CategoryNode }) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group flex items-baseline justify-between gap-4 border-b border-ink-200 py-4 transition-colors first:border-t hover:bg-ink-50/60 focus-visible:outline focus-visible:outline-2 sm:px-3"
    >
      <span className="min-w-0">
        <span className="block truncate text-[16px] font-semibold tracking-tight text-ink-900 transition-colors group-hover:text-jade-800">
          {category.name}
        </span>
        {category.children.length > 0 ? (
          <span className="mt-1 block truncate text-[12.5px] text-ink-400">
            {category.children.slice(0, 5).map((c) => c.name).join(" · ")}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-baseline gap-3">
        <span className="tnum text-[12.5px] text-ink-500">
          {category.productCount} product{category.productCount === 1 ? "" : "s"}
        </span>
        <ArrowUpRight
          className="h-4 w-4 translate-y-0.5 text-ink-300 transition-all duration-200 group-hover:-translate-y-0 group-hover:translate-x-0.5 group-hover:text-jade-600"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

/** Clickable chip-style wrapper for a child category. */
export function CategoryChip({ slug, name }: { slug: string; name: string }) {
  return (
    <Link
      href={`/categories/${slug}`}
      className="inline-flex items-center border border-ink-200 bg-paper-50 px-3 py-1.5 text-[13px] font-medium text-ink-700 transition-colors hover:border-jade-600 hover:text-jade-700 focus-visible:outline focus-visible:outline-2"
    >
      {name}
    </Link>
  );
}