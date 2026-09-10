import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ProductSummary } from "@/lib/types";
import { Badge } from "@/components/ui";

/**
 * Text-first catalogue card — no imagery, no icon decoration. Name dominates;
 * article no. / CAS / formula are secondary metadata. Missing data renders
 * nothing; nothing is fabricated.
 */
export function ProductCard({ product }: { product: ProductSummary }) {
  const href = `/products/${product.slug}`;
  return (
    <Link
      href={href}
      className="group flex flex-col border-b border-ink-200 bg-transparent py-4 transition-colors first:border-t hover:bg-ink-50/60 focus-visible:outline focus-visible:outline-2 sm:p-4 sm:hover:bg-paper-50"
    >
      {product.primaryCas ? (
        <span className="tnum text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-500">
          CAS {product.primaryCas}
        </span>
      ) : null}
      <h3 className="mt-1 text-[16px] font-semibold leading-snug tracking-tight text-ink-900 transition-colors group-hover:text-jade-800">
        {product.name}
      </h3>
      {product.summary ? (
        <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-ink-500">
          {product.summary}
        </p>
      ) : null}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {product.articleNumber ? (
          <Badge tone="plain">Art. {product.articleNumber}</Badge>
        ) : null}
        {product.formula ? <Badge tone="ink">{product.formula}</Badge> : null}
      </div>
      <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-jade-700">
        View product
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </Link>
  );
}

/** Compact row variant for "related products" rails. */
export function ProductCardCompact({ product }: { product: ProductSummary }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex items-center gap-3 border-b border-ink-100 py-3 transition-colors hover:bg-ink-50/60 focus-visible:outline focus-visible:outline-2"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-semibold tracking-tight text-ink-900 transition-colors group-hover:text-jade-800">
          {product.name}
        </span>
        <span className="tnum mt-0.5 block truncate text-[12px] text-ink-500">
          {product.primaryCas ?? product.articleNumber ?? product.formula ?? "View specifications"}
        </span>
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-ink-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-jade-600"
        aria-hidden="true"
      />
    </Link>
  );
}