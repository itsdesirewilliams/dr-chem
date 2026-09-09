import Link from "next/link";
import type { CategoryNode } from "@/lib/types";
import { ChevronIcon } from "@/components/icons";

/** Category tile — mobile-first tap card, count badge, linked label. */
export function CategoryCard({ category }: { category: CategoryNode }) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group flex flex-col rounded-xl border border-ink-100 bg-white p-4 shadow-card hover:border-jade-300 hover:shadow-card-lg focus-visible:outline focus-visible:outline-2"
    >
      <span className="flex items-center justify-between">
        <span className="truncate text-[15.5px] font-semibold text-ink-900">
          {category.name}
        </span>
        <ChevronIcon className="h-4 w-4 shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5" direction="right" />
      </span>
      <span className="mt-1.5 text-[13px] text-ink-500">
        {category.productCount} product{category.productCount === 1 ? "" : "s"}
      </span>
      {category.children.length > 0 ? (
        <span className="mt-2.5 line-clamp-2 text-[12.5px] text-ink-400">
          {category.children.slice(0, 4).map((c) => c.name).join(" · ")}
        </span>
      ) : null}
    </Link>
  );
}

/** Clickable breadcrumb-style wrapper for a child category chip. */
export function CategoryChip({ slug, name }: { slug: string; name: string }) {
  return (
    <Link
      href={`/categories/${slug}`}
      className="inline-flex items-center rounded-full border border-jade-200 bg-jade-50 px-3 py-1.5 text-[13.5px] font-medium text-jade-800 hover:bg-jade-100 focus-visible:outline focus-visible:outline-2"
    >
      {name}
    </Link>
  );
}