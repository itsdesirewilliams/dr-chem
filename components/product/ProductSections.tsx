import Link from "next/link";
import type {
  ProductDetail,
  PropertyRow,
  Packing,
  ProductSummary,
  SafetyData,
  GhsRow,
} from "@/lib/types";
import { ProductCardCompact } from "@/components/ProductCard";
import { WhatsAppCTA } from "@/components/WhatsAppCTA";
import { Badge, SectionHeading, btn } from "@/components/ui";
import { MailIcon } from "@/components/icons";
import { formatNumber, formatDate, mailtoLink } from "@/lib/format";
import { CONTACT_EMAIL } from "@/lib/site";

/* ---------------------------------------------------------------------------*/
/*  ProductHeader                                                             */
/* ---------------------------------------------------------------------------*/
export function ProductHeader({ product }: { product: ProductDetail }) {
  return (
    <div className="container-site mt-6 mb-8">
      <div className="border-b border-ink-200 pb-6">
        {product.primaryCategoryName ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-jade-700">
            {product.primaryCategoryName}
          </p>
        ) : null}
        <h1 className="mt-2 font-serif text-[26px] leading-[1.12] tracking-[-0.01em] text-ink-900 sm:text-[32px] lg:text-[38px]">
          {product.name}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {product.articleNumber ? (
            <Badge tone="ink">Article {product.articleNumber}</Badge>
          ) : null}
          {product.status === "active" ? (
            <Badge tone="jade">Active</Badge>
          ) : (
            <Badge tone="plain">{product.status}</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

/** Pick a property value by label regex (e.g. Grade, Purity). */
function pickProperty(properties: PropertyRow[], re: RegExp): string | null {
  const found = properties.find((p) => p.label && re.test(p.label.trim()));
  return found?.valueText ?? null;
}

/* ---------------------------------------------------------------------------*/
/*  ProductInfoTable — the large technical facts table (mobile-first dl)       */
/* ---------------------------------------------------------------------------*/
export function ProductInfoTable({ product }: { product: ProductDetail }) {
  const grade = pickProperty(product.properties, /^grade$/i);
  const purity = pickProperty(product.properties, /purity/i);
  const rows: { label: string; value: string | null }[] = [
    { label: "Article No.", value: product.articleNumber },
    { label: "Grade", value: grade },
    { label: "Purity", value: purity },
    { label: "CAS No.", value: product.primaryCas },
    { label: "Molecular Formula", value: product.formula },
    {
      label: "Molecular Weight",
      value:
        product.molecularWeight != null
          ? formatNumber(product.molecularWeight)
          : null,
    },
    { label: "H.S. Code", value: product.hsCode },
    { label: "Shelf Life", value: product.shelfLifeText },
  ];
  const visible = rows.filter((r) => r.value);
  if (!visible.length) return null;
  return (
    <div>
      <SectionHeading title="Product Information" serif={false} />
      <dl className="mt-3 divide-y divide-ink-200 border-y border-ink-200">
        {visible.map((r) => (
          <div
            key={r.label}
            className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-0"
          >
            <dt className="w-full shrink-0 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ink-500 sm:w-48">
              {r.label}
            </dt>
            <dd className="min-w-0 flex-1 text-[15px] font-medium text-ink-900 break-words">
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ---------------------------------------------------------------------------*/
/*  DescriptionSection                                                        */
/* ---------------------------------------------------------------------------*/
export function DescriptionSection({ product }: { product: ProductDetail }) {
  if (!product.description && !product.summary) return null;
  const text = product.description ?? product.summary;
  if (!text) return null;
  return (
    <section>
      <SectionHeading title="Description" serif={false} />
      <p className="mt-2 text-[15px] leading-relaxed text-ink-700 whitespace-pre-line">{text}</p>
    </section>
  );
}

/* ---------------------------------------------------------------------------*/
/*  PropertiesSection — EVERY property, source wording kept                    */
/* ---------------------------------------------------------------------------*/
export function PropertiesSection({
  properties,
}: {
  properties: PropertyRow[];
}) {
  if (!properties.length) return null;
  const specs = properties.filter((p) => p.propertyType === "spec");
  const physical = properties.filter((p) => p.propertyType === "physical");

  const renderGroup = (label: string, rows: PropertyRow[]) => (
    <div key={label} className="border border-ink-200">
      <h3 className="border-b border-ink-200 px-3.5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-500">
        {label}
      </h3>
      <dl className="divide-y divide-ink-200">
        {rows.map((r, i) => (
          <div
            key={r.label ?? String(i)}
            className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:gap-0 sm:px-3.5"
          >
            <dt className="w-full text-[13.5px] font-semibold text-ink-700 sm:w-56 sm:shrink-0">
              {r.label}
            </dt>
            <dd className="min-w-0 flex-1 text-[14.5px] leading-relaxed text-ink-800 break-words">
              {r.valueText}
              {r.unit ? (
                <span className="ml-1.5 text-[12.5px] text-ink-500">{r.unit}</span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );

  return (
    <section className="space-y-6">
      <SectionHeading title="Specifications & Properties" serif={false} />
      {specs.length > 0 ? renderGroup("Specifications", specs) : null}
      {physical.length > 0 ? renderGroup("Physical Properties", physical) : null}
    </section>
  );
}

/* ---------------------------------------------------------------------------*/
/*  GHS pictogram assets — official UN GHS symbols served from /public.        */
/* ---------------------------------------------------------------------------*/
const GHS_ICONS: Record<string, string> = {
  GHS01: "/assets/ghs/ghs01.svg",
  GHS02: "/assets/ghs/ghs02.svg",
  GHS03: "/assets/ghs/ghs03.svg",
  GHS04: "/assets/ghs/ghs04.svg",
  GHS05: "/assets/ghs/ghs05.svg",
  GHS06: "/assets/ghs/ghs06.svg",
  GHS07: "/assets/ghs/ghs07.svg",
  GHS08: "/assets/ghs/ghs08.svg",
  GHS09: "/assets/ghs/ghs09.svg",
};

/* ---------------------------------------------------------------------------*/
/*  SafetySection — real LOBA safety data (GHS, hazard/precaution statements).  */
/* ---------------------------------------------------------------------------*/
export function SafetySection({ product }: { product: ProductDetail }) {
  const safety = product.safety;
  if (!safety) return null;

  const sds = product.documents.filter((d) => d.documentType === "sds");
  const coa = product.documents.filter((d) => d.documentType === "coa");
  const ghsCodes: GhsRow[] = product.ghs ?? [];
  const safetyRevisionDate = formatDate(safety.revisionDate);

  /* Collect only non-null safety fields — never fabricate. */
  const safetyFields: { label: string; value: string | null }[] = [
    { label: "Signal Word", value: safety.signalWord },
    { label: "UN Number", value: safety.unNumber },
    { label: "IMCO Class", value: safety.imcoClass },
    { label: "Packing Group", value: safety.packingGroup },
    { label: "Hazardous Statement", value: safety.hazardousStatement },
    { label: "Precaution Statement", value: safety.precautionStatement },
    { label: "Risk Statement", value: safety.riskStatement },
    { label: "Safety Statement", value: safety.safetyStatement },
  ];
  const visibleFields = safetyFields.filter((f) => f.value);

  if (
    visibleFields.length === 0 &&
    ghsCodes.length === 0 &&
    !safetyRevisionDate &&
    sds.length === 0 &&
    coa.length === 0
  ) {
        return null;
  }

  return (
    <section id="safety">
      <SectionHeading title="Safety & Documentation" serif={false} />
      <div className="mt-3 border border-ink-200">
        {/* GHS pictogram grid */}
        {ghsCodes.length > 0 ? (
          <div className="border-b border-ink-200 px-4 py-4 sm:px-5 sm:py-5">
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              Hazard Pictograms
            </h3>
            <div className="mt-3 flex flex-wrap gap-5">
              {ghsCodes.map((g) => {
                const code = g.ghsCode.toUpperCase();
                const iconSrc = GHS_ICONS[code] ?? null;
                return (
                  <div key={code} className="flex flex-col items-center">
                    <div className="h-14 w-14">
                      {iconSrc ? (
                        <img
                          src={iconSrc}
                          alt={code}
                          className="h-full w-full object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[12px] font-medium text-ink-500">
                          {code}
                        </span>
                      )}
                    </div>
                    <span className="mt-1 text-[12px] font-medium text-ink-500">
                      {code}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Safety detail fields (only non-null values) */}
        {visibleFields.length > 0 || safetyRevisionDate ? (
          <dl className="divide-y divide-ink-200">
            {safetyRevisionDate ? (
              <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-0">
                <dt className="w-full text-[13.5px] font-semibold text-ink-700 sm:w-56 sm:shrink-0">
                  Revision Date
                </dt>
                <dd className="min-w-0 flex-1 text-[14.5px] text-ink-800 break-words">
                  {safetyRevisionDate}
                </dd>
              </div>
            ) : null}
            {visibleFields.map((f) => (
              <div
                key={f.label}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-0"
              >
                <dt className="w-full text-[13.5px] font-semibold text-ink-700 sm:w-56 sm:shrink-0">
                  {f.label}
                </dt>
                <dd className="min-w-0 flex-1 text-[14.5px] leading-relaxed text-ink-800 break-words">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {/* SDS / COA document availability */}
        {sds.length > 0 ? (
          <div className="border-t border-ink-200 py-3 px-4 sm:px-5">
            <dt className="text-[13.5px] font-semibold text-ink-700">
              Safety data sheet
            </dt>
            <dd className="mt-1 text-[14.5px] text-ink-800">
              Available - see{" "}
              <a
                href="#documents"
                className="text-jade-700 underline underline-offset-2"
              >
                Documents below
              </a>
            </dd>
          </div>
        ) : null}
        {coa.length > 0 ? (
          <div className="border-t border-ink-200 py-3 px-4 sm:px-5">
            <dt className="text-[13.5px] font-semibold text-ink-700">
              Certificate of analysis
            </dt>
            <dd className="mt-1 text-[14.5px] text-ink-800">
              Available - see{" "}
              <a
                href="#documents"
                className="text-jade-700 underline underline-offset-2"
              >
                Documents below
              </a>
            </dd>
          </div>
        ) : null}
      </div>
    </section>
  );
}


/* ---------------------------------------------------------------------------*/
/*  PackingsSection — real pack sizes, no duplicated "ml" debris               */
/* ---------------------------------------------------------------------------*/
function packingSize(p: Packing): string | null {
  if (p.sizeValue != null && p.sizeUnit) {
    const unit = p.sizeUnit.trim();
    return `${formatNumber(p.sizeValue)} ${unit}`;
  }
  if (p.title) return p.title;
  if (p.code) return p.code;
  return null;
}

export function PackingsSection({ packings }: { packings: Packing[] }) {
  if (!packings.length) return null;
  return (
    <section>
      <SectionHeading title="Available Packings" serif={false} />
      <div className="mt-3 grid grid-cols-1 gap-px border border-ink-200 bg-ink-200 sm:grid-cols-2 lg:grid-cols-3">
        {packings.map((p, i) => {
          const size = packingSize(p);
          return (
            <div
              key={p.code ?? String(i)}
              className="flex flex-col bg-paper-50 p-4"
            >
              <p className="font-serif text-[16px] font-semibold text-ink-900">
                {size ?? p.code}
              </p>
              {p.title && p.title !== size ? (
                <p className="mt-1 text-[13px] text-ink-600">{p.title}</p>
              ) : null}
              {p.description ? (
                <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
                  {p.description}
                </p>
              ) : null}
              {p.code && p.code !== size && p.code !== p.title ? (
                <p className="mt-1 text-[12.5px] uppercase tracking-[0.04em] text-ink-400">
                  {p.code}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------*/
/*  SynonymsSection                                                           */
/* ---------------------------------------------------------------------------*/
export function SynonymsSection({ synonyms }: { synonyms: string[] }) {
  if (!synonyms.length) return null;
  return (
    <section>
      <SectionHeading title="Synonyms" serif={false} />
      <p className="mt-2 text-[15px] leading-relaxed text-ink-700">
        {synonyms.join(" · ")}
      </p>
    </section>
  );
}
/* ---------------------------------------------------------------------------*/
/*  RelatedSection                                                            */
/* ---------------------------------------------------------------------------*/
export function RelatedSection({ related }: { related: ProductSummary[] }) {
  if (!related.length) return null;
  return (
    <section>
      <SectionHeading title="Related Products" serif={false} />
      <div className="mt-2 border-t border-ink-100">
        {related.map((r) => (
          <ProductCardCompact key={r.id} product={r} />
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------*/
/*  EnquiryRail — sidebar enquiry/quote CTAs                                  */
/* ---------------------------------------------------------------------------*/
export function EnquiryRail({ product }: { product: ProductDetail }) {
  const subject = `Enquiry about ${product.articleNumber ?? product.slug} — ${product.name}`;
  return (
    <aside className="space-y-4">
      <div className="border border-ink-200 bg-paper-50 p-5">
        <h3 className="text-[16px] font-semibold text-ink-900">
          Get a Quote
        </h3>
        <p className="mt-1 text-[14px] text-ink-600">
          Interested in this product? Contact us for pricing and availability.
        </p>
        <div className="mt-4 space-y-3">
          <Link
            href={mailtoLink(CONTACT_EMAIL, { subject })}
            className={btn.primary + " w-full text-center"}
          >
            <MailIcon className="h-5 w-5" />
            Enquire by Email
          </Link>
          <WhatsAppCTA
            message={`Hi DR Chemicals, I would like to enquire about ${product.name} (${product.articleNumber ?? product.slug}).`}
            label="Enquire on WhatsApp"
            className={btn.whatsapp + " w-full text-center"}
          />
        </div>
      </div>
    </aside>
  );
}

/* ---------------------------------------------------------------------------*/
/*  MobileStickyBar — sticky bottom CTA for mobile                             */
/* ---------------------------------------------------------------------------*/
export function MobileStickyBar({ product }: { product: ProductDetail }) {
  const subject = `Enquiry about ${product.articleNumber ?? product.slug} — ${product.name}`;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-paper-50/95 backdrop-blur lg:hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link
          href={mailtoLink(CONTACT_EMAIL, { subject })}
          className={btn.primary + " flex-1 justify-center text-[14px]"}
        >
          <MailIcon className="h-4 w-4" />
          Enquire
        </Link>
        <WhatsAppCTA
          message={`Hi DR Chemicals, I would like to enquire about ${product.name} (${product.articleNumber ?? product.slug}).`}
          label="WhatsApp"
          className={btn.whatsapp + " flex-1 justify-center text-[14px]"}
        />
      </div>
    </div>
  );
}
            
                
