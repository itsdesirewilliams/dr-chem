import Link from "next/link";
import type { ReactNode, ComponentPropsWithoutRef } from "react";

/* ---------------------------------------------------------------------------
   DR Chemicals UI primitives — mobile-first, accessible, dependency-free.
   --------------------------------------------------------------------------- */

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium " +
  "min-h-[44px] px-5 text-[15px] transition-colors duration-200 " +
  "focus-visible:outline focus-visible:outline-2 " +
  "focus-visible:outline-offset-2";

/** Shared button/CTA class map. Consumers may append layout overrides. */
export const btn = {
  primary: `${BTN_BASE} bg-jade-700 text-white hover:bg-jade-800 active:bg-jade-900`,
  secondary: `${BTN_BASE} border border-ink-300 bg-transparent text-ink-800 hover:border-jade-600 hover:text-jade-700`,
  ghost: `${BTN_BASE} text-ink-600 hover:text-jade-700`,
  whatsapp: `${BTN_BASE} bg-[#25D366] text-[#08331D] hover:bg-[#1FC95D]`,
  ink: `${BTN_BASE} bg-ink-900 text-white hover:bg-ink-800`,
} as const;

/* ---------------------------------------------------------------------------
   Badge — small labelled chip (article no., grade, status, synonyms…).
   --------------------------------------------------------------------------- */
const BADGE_TONES: Record<"plain" | "ink" | "jade", string> = {
  plain: "border border-ink-200 bg-white text-ink-600",
  ink: "border border-ink-900 bg-ink-900 text-white",
  jade: "border border-jade-200 bg-jade-50 text-jade-800",
};

export function Badge({
  tone = "plain",
  className,
  children,
}: {
  tone?: "plain" | "ink" | "jade";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[3px] px-2 py-1 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] ${BADGE_TONES[tone]}${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   Section / Container — page building blocks.
   Accept any standard HTML section/div attributes (id, aria-*, data-*, …).
   --------------------------------------------------------------------------- */
export function Section({
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<"section">) {
  return (
    <section className={className} {...rest}>
      {children}
    </section>
  );
}

export function Container({
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<"div">) {
  const cls = ["container-site", className].filter(Boolean).join(" ");
  return <div className={cls} {...rest}>{children}</div>;
}

/* ---------------------------------------------------------------------------
   SectionHeading — eyebrow + display title + optional lead.
   --------------------------------------------------------------------------- */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  description,
  align = "left",
  serif = true,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  description?: string;
  align?: "left" | "center";
  serif?: boolean;
}) {
  const center = align === "center";
  const leadText = lead ?? description;
  return (
    <>
      {eyebrow ? (
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.18em] text-jade-700${
            center ? " text-center" : ""
          }`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`${
          serif
            ? "font-serif text-[27px] leading-[1.12] tracking-[-0.01em] sm:text-[32px] lg:text-[36px]"
            : "text-[20px] font-semibold tracking-tight sm:text-[22px]"
        } mt-3 text-ink-900${center ? " text-center" : ""}`}
      >
        {title}
      </h2>
      {leadText ? (
        <p
          className={`mt-4 max-w-readable text-[15.5px] leading-relaxed text-ink-600${
            center ? " text-center" : ""
          }`}
        >
          {leadText}
        </p>
      ) : null}
    </>
  );
}

/* ---------------------------------------------------------------------------
   CTA — Link wrapper (internal) or <a> (external). Used for buttons/CTAs.
   --------------------------------------------------------------------------- */
export function CTA({
  href,
  external = false,
  className,
  children,
  ...rest
}: { href: string; external?: boolean } & ComponentPropsWithoutRef<"a">) {
  const cls = className ?? btn.primary;
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

/* ---------------------------------------------------------------------------
   Breadcrumbs — simple mobile-friendly trail.
   --------------------------------------------------------------------------- */
export function Breadcrumbs({
  items,
  className,
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={`text-[13px] ${className ?? ""}`.trim()}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1.5">
            {i > 0 ? (
              <span className="text-ink-300" aria-hidden="true">
                /
              </span>
            ) : null}
            {item.href ? (
              <Link
                href={item.href}
                className="truncate text-ink-600 transition-colors hover:text-jade-700 hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span className="truncate font-medium text-ink-800" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ---------------------------------------------------------------------------
   EmptyState — mobile-first empty/error state with optional action.
   --------------------------------------------------------------------------- */
export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border-y border-ink-200 py-14">
      <h2 className="text-[19px] font-semibold tracking-tight text-ink-900">{title}</h2>
      {message ? (
        <p className="mt-2 max-w-readable text-[14.5px] leading-relaxed text-ink-500">
          {message}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   CardGridSkeleton — loading state for product-grid pages.
   --------------------------------------------------------------------------- */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="divide-y divide-ink-100 border-y border-ink-100" aria-hidden="true">
      {Array.from({ length: Math.max(1, count) }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-6 py-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-ink-100" />
            <div className="h-3 w-1/3 animate-pulse rounded bg-ink-100" />
          </div>
          <div className="h-3 w-16 shrink-0 animate-pulse rounded bg-ink-100" />
        </div>
      ))}
    </div>
  );
}