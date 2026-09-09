import Link from "next/link";
import type { ReactNode, ComponentPropsWithoutRef } from "react";
import { FlaskIcon } from "@/components/icons";

/* ---------------------------------------------------------------------------
   DR-Chem UI primitives — mobile-first, accessible, dependency-free.
   --------------------------------------------------------------------------- */

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold " +
  "min-h-[44px] px-5 text-base transition-colors focus-visible:outline " +
  "focus-visible:outline-2 focus-visible:outline-offset-2";

/** Shared button/CTA class map. Consumers may append layout overrides. */
export const btn = {
  primary: `${BTN_BASE} bg-jade-600 text-white hover:bg-jade-700 active:bg-jade-800`,
  secondary: `${BTN_BASE} border border-ink-300 bg-white text-ink-800 hover:border-jade-600 hover:text-jade-700`,
  ghost: `${BTN_BASE} text-jade-700 hover:bg-jade-50`,
  whatsapp: `${BTN_BASE} bg-[#25D366] text-[#0B3B24] hover:bg-[#1FC95D]`,
} as const;

/* ---------------------------------------------------------------------------
   Badge — small labelled chip (article no., grade, status, synonyms…).
   --------------------------------------------------------------------------- */
const BADGE_TONES: Record<"plain" | "ink" | "jade", string> = {
  plain: "border border-ink-100 bg-white text-ink-600",
  ink: "bg-ink-900 text-white border border-ink-900",
  jade: "border border-jade-200 bg-jade-50 text-jade-700",
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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-medium leading-none ${BADGE_TONES[tone]}${
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
          className={`mt-2 inline-block text-[13px] font-semibold uppercase tracking-[0.12em] text-jade-700${
            center ? " mx-auto" : ""
          }`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`mt-3 ${serif ? "font-serif " : ""}text-2xl sm:text-3xl font-semibold leading-tight text-ink-900${
          center ? " text-center" : ""
        }`}
      >
        {title}
      </h2>
      {leadText ? (
        <p
          className={`mt-3 max-w-readable text-[15.5px] leading-relaxed text-ink-600${
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
    <div className="flex flex-col items-center gap-4 py-14 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full bg-jade-50 text-jade-600"
        aria-hidden="true"
      >
        <FlaskIcon className="h-7 w-7" />
      </span>
      <h2 className="font-serif text-xl font-semibold leading-snug text-ink-900">{title}</h2>
      {message ? (
        <p className="max-w-readable text-[15px] leading-relaxed text-ink-600">{message}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   CardGridSkeleton — loading state for product-grid pages.
   --------------------------------------------------------------------------- */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-hidden="true"
    >
      {Array.from({ length: Math.max(1, count) }, (_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-xl border border-ink-100 bg-white"
        >
          <div className="aspect-[16/9] w-full bg-ink-100" />
          <div className="space-y-2.5 p-3.5">
            <div className="h-3.5 w-2/3 rounded bg-ink-100" />
            <div className="h-3.5 w-full rounded bg-ink-100" />
            <div className="h-3.5 w-1/2 rounded bg-ink-100" />
          </div>
        </div>
      ))}
    </div>
  );
}