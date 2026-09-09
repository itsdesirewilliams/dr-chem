import Link from "next/link";
import type { ProductSummary } from "@/lib/types";
import { FlaskIcon } from "@/components/icons";
import { Badge } from "@/components/ui";

/**
 * Mobile-first product card. Designed for a single thumb to scan: name,
 * article number, primary CAS, formula + a short summary line. Missing data
 * simply renders nothing — nothing is fabricated.
 */
export function ProductCard({ product }: { product: ProductSummary }) {
  const href = `/products/${product.slug}`;
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-xl border border-ink-100 bg-white shadow-card transition-shadow hover:shadow-card-lg focus-visible:outline focus-visible:outline-2"
    >
      <div className="flex flex-col p-3.5">
        {product.primaryCas ? (
          <span className="font-mono text-[12px] uppercase tracking-[0.04em] text-ink-500">
            {product.primaryCas}
          </span>
        ) : null}
        <h3 className="mt-1 line-clamp-2 text-[16px] font-semibold leading-snug text-ink-900">
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-ink-500">
          {product.summary ?? "View technical specifications and availability."}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {product.articleNumber ? (
            <Badge tone="plain">Art. {product.articleNumber}</Badge>
          ) : null}
          {product.formula ? <Badge tone="ink">{product.formula}</Badge> : null}
        </div>
        <span className="mt-3 inline-flex items-center text-[13.5px] font-medium text-jade-700 group-hover:text-jade-800">
          View product
          <svg viewBox="0 0 24 24" className="ml-1 h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 12 L18 12 M18 12 L18 12 M18 12 L21 7 M18 12 L21 17" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

/** Compact horizontal variant for "related products" rails. */
export function ProductCardCompact({ product }: { product: ProductSummary }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex items-center gap-3 rounded-xl border border-ink-100 bg-white p-3 shadow-card hover:shadow-card-lg focus-visible:outline focus-visible:outline-2"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-jade-50 text-jade-600" aria-hidden="true">
        <FlaskIcon className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-ink-900">
          {product.name}
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] text-ink-500">
          {product.primaryCas ?? product.articleNumber ?? product.formula ?? "View specifications"}
        </span>
      </span>
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-300 group-hover:text-jade-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M6 12 L18 12 M18 12 L21 7 M18 12 L21 17" />
      </svg>
    </Link>
  );
}