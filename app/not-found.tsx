import Link from "next/link";
import { btn } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="container-site py-20 text-center">
      <p className="text-[15px] font-semibold uppercase tracking-[0.14em] text-jade-700">
        404
      </p>
      <h1 className="mt-3 font-serif text-3xl font-semibold text-ink-900">
        This page could not be found
      </h1>
      <p className="mt-3 max-w-readable text-[16px] leading-relaxed text-ink-600">
        The page may have moved, or the product may not be published yet.
        Try searching the catalogue — or contact us and we will help directly.
      </p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <Link href="/" className={btn.primary}>Back to homepage</Link>
        <Link href="/search" className={btn.secondary}>Search the catalogue</Link>
      </div>
    </div>
  );
}