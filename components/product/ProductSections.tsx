import Link from "next/link";
import type {
  ProductDetail,
  PropertyRow,
  Packing,
  ProductSummary,
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
    <div className="container-site mt-4 mb-6">
      <div className="flex flex-col gap-3">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-tight text-ink-900">
          {product.name}
        </h1>
        <div className="flex flex-wrap items-center gap-2.5">
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
      <h2 className="font-serif text-xl font-semibold text-ink-900">
        Product Information
      </h2>
      <dl className="mt-3 divide-y divide-ink-100 rounded-xl border border-ink-100 bg-white">
        {visible.map((r) => (
          <div
            key={r.label}
            className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-0"
          >
            <dt className="w-full shrink-0 text-[12.5px] font-semibold uppercase tracking-[0.04em] text-ink-500 sm:w-44">
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
    <div key={label} className="rounded-xl border border-ink-100 bg-white">
      <h3 className="px-3.5 py-2.5 text-[13px] font-bold uppercase tracking-[0.06em] text-jade-700">
        {label}
      </h3>
      <dl className="divide-y divide-ink-100">
        {rows.map((r, i) => (
          <div
            key={r.label ?? String(i)}
            className="flex flex-col gap-1 px-3.5 py-3 sm:flex-row sm:items-baseline sm:gap-0"
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
/*  SafetySection — real data only (revision dates, SDS/COA availability).     */
/* ---------------------------------------------------------------------------*/
export function SafetySection({ product }: { product: ProductDetail }) {
  const sds = product.documents.filter((d) => d.documentType === "sds");
  const coa = product.documents.filter((d) => d.documentType === "coa");
  const latestRevision = formatDate(product.revisionDates?.[0] ?? null);
  if (!latestRevision && sds.length === 0 && coa.length === 0) return null;
  return (
    <section id="safety">
      <SectionHeading title="Safety & Documentation" serif={false} />
      <div className="mt-2 rounded-xl border border-ink-100 bg-white">
        <dl className="divide-y divide-ink-100">
          {latestRevision ? (
            <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-0">
              <dt className="w-full text-[13.5px] font-semibold text-ink-700 sm:w-56 sm:shrink-0">
                Data revision
              </dt>
              <dd className="min-w-0 flex-1 text-[14.5px] text-ink-800 break-words">
                {latestRevision}
              </dd>
            </div>
          ) : null}
          {sds.length > 0 ? (
            <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-0">
              <dt className="w-full text-[13.5px] font-semibold text-ink-700 sm:w-56 sm:shrink-0">
                Safety data sheet
              </dt>
              <dd className="min-w-0 flex-1 text-[14.5px] text-ink-800">
                Available - see{" "}
                <a href="#documents" className="text-jade-700 underline underline-offset-2">
                  Documents below
                </a>
              </dd>
            </div>
          ) : null}
          {coa.length > 0 ? (
            <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-0">
              <dt className="w-full text-[13.5px] font-semibold text-ink-700 sm:w-56 sm:shrink-0">
                Certificate of analysis
              </dt>
              <dd className="min-w-0 flex-1 text-[14.5px] text-ink-800">
                Available - see{" "}
                <a href="#documents" className="text-jade-700 underline underline-offset-2">
                  Documents below
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-1 px-4 pt-2.5 pb-2.5 text-[12.5px] leading-relaxed text-ink-500">
          Additional GHS hazard data is not yet published for this product.
        </p>
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
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {packings.map((p, i) => {
          const size = packingSize(p);
          return (
            <div
              key={p.code ?? String(i)}
              className="flex flex-col rounded-xl border border-ink-100 bg-white p-4"
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
      <div className="mt-2 flex flex-wrap gap-2">
        {synonyms.map((s) => (
          <Badge key={s} tone="plain">{s}</Badge>
        ))}
      </div>
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
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
      <div className="rounded-xl border border-ink-100 bg-paper-100 p-4">
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
            message={`Hi DR-Chem, I would like to enquire about ${product.name} (${product.articleNumber ?? product.slug}).`}
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
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 backdrop-blur lg:hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link
          href={mailtoLink(CONTACT_EMAIL, { subject })}
          className={btn.primary + " flex-1 justify-center text-[14px]"}
        >
          <MailIcon className="h-4 w-4" />
          Enquire
        </Link>
        <WhatsAppCTA
          message={`Hi DR-Chem, I would like to enquire about ${product.name} (${product.articleNumber ?? product.slug}).`}
          label="WhatsApp"
          className={btn.whatsapp + " flex-1 justify-center text-[14px]"}
        />
      </div>
    </div>
  );
}
            
                
