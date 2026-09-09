"use client";

import { btn } from "@/components/ui";
import Link from "next/link";

/** Global error page (Next.js App Router). */
export default function GlobalError() {
  return (
    <div className="container-site py-20 text-center">
      <h1 className="font-serif text-3xl font-semibold text-ink-900">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-readable text-[16px] leading-relaxed text-ink-600">
        We could not complete this request. Please try again — or contact us
        and we will sort it out promptly.
      </p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <Link href="/" className={btn.primary}>Back to homepage</Link>
        <Link href="/contact" className={btn.secondary}>Contact us</Link>
      </div>
    </div>
  );
}