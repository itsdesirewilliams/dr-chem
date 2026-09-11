import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import { getCategoryTree } from "@/lib/categories";
import { listProducts } from "@/lib/products";
import type { ProductSummary } from "@/lib/types";
import { SectionHeading, btn, EmptyState } from "@/components/ui";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { SearchBox } from "@/components/SearchBox";
import { WhatsAppCTA } from "@/components/WhatsAppCTA";
import { TEAM } from "@/app/data/team";
import { TeamCard } from "@/components/TeamCard";
import { SITE_NAME, whatsappLink } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${SITE_NAME} — Chemical & Laboratory Products`,
  description:
    "Search the DR Chemicals catalogue of industrial, agricultural, mining and water-treatment chemicals — by name, CAS, formula, synonym or article number.",
};

const PRODUCT_LINES = [
  {
    title: "Industrial & specialty chemicals",
    blurb: "Sulphuric acid, nitric acid, caustic soda, activated carbon, hydrogen peroxide and more.",
    query: "acid",
  },
  {
    title: "Mining chemicals",
    blurb: "Chemicals for mineral processing and extraction applications.",
    query: "mining",
  },
  {
    title: "Water treatment chemicals",
    blurb: "Treatment and conditioning chemicals for industrial water systems.",
    query: "water",
  },
  {
    title: "Agricultural chemicals",
    blurb: "Chemical inputs supporting agricultural and agro-processing needs.",
    query: "agricultural",
  },
  {
    title: "Home & I&I cleaning",
    blurb: "Cleaning and hygiene chemicals for institutional and industrial use.",
    query: "clean",
  },
];

const CREDIBILITY = [
  "Global trade expertise in chemicals since 2018",
  "Manufacturing partnerships across North & West India",
  "Verified quality via independent inspections",
  "End-to-end support: sourcing to logistics to delivery",
];

export default async function HomePage() {
  const tree = await getCategoryTree();
  const [featured, latest] = await Promise.all([
    listProducts({ featuredOnly: true, limit: 8, offset: 0 }),
    listProducts({ limit: 1, offset: 0 }),
  ]);
  const spotlight =
    featured.items.length > 0
      ? featured.items
      : (await listProducts({ limit: 8, offset: 0 })).items;
  const categoryCount = tree.reduce((n, c) => n + 1 + c.children.length, 0);

  return (
    <>
      <Hero />
      <CatalogueIntro total={latest.total} categoryCount={categoryCount} />
      <CategoryIndex tree={tree} />
      <Spotlight products={spotlight} />
      <MarketsIndex />
      <WhySection />
      <ResourcesSection />
      <TeamSection />
      <CtaBand />
    </>
  );
}

function Hero() {
  const wa = whatsappLink("Hello DR Chemicals, I have an enquiry.");
  const quickNav = [
    { label: "Browse products", href: "/products", external: false },
    { label: "Categories", href: "/categories", external: false },
    { label: "Request a quote", href: "/contact", external: false },
    ...(wa
      ? [{ label: "Chat on WhatsApp", href: wa, external: true }]
      : [{ label: "Contact DR Chemicals", href: "/contact", external: false }]),
  ];
  return (
    <section className="relative overflow-hidden bg-ink-950 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(60rem 30rem at 85% -10%, rgba(30,115,96,.35), transparent 60%)",
        }}
      />
      <div className="container-site relative py-14 sm:py-20 lg:py-24">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-jade-400">
          DR CHEMICALS · Laboratory &amp; specialty chemicals
        </p>
        <h1 className="mt-4 max-w-3xl font-serif text-[34px] leading-[1.08] tracking-[-0.01em] sm:text-5xl lg:text-[56px]">
          Chemical supply, engineered around reliability.
        </h1>
        <p className="mt-5 max-w-readable text-[16px] leading-relaxed text-ink-300 sm:text-[17px]">
          A structured catalogue of industrial, laboratory and specialty
          chemicals — searchable by product name, CAS number, molecular
          formula, synonym or article number.
        </p>

        <div className="mt-8 max-w-2xl rounded-md border border-ink-700 bg-white p-2 shadow-card-lg">
          <SearchBox
            id="hero-search"
            large
            tone="hero"
            placeholder="e.g. Ethanol, 64-17-5, C₂H₆O, CD-00123"
          />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 pb-1.5 pt-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">
            <span>Product name</span>
            <span aria-hidden="true">·</span>
            <span>CAS no.</span>
            <span aria-hidden="true">·</span>
            <span>Article no.</span>
            <span aria-hidden="true">·</span>
            <span>Formula</span>
            <span aria-hidden="true">·</span>
            <span>Synonym</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {["Ethanol", "Acetone", "Sodium hydroxide", "Sulphuric acid"].map((q) => (
            <Link
              key={q}
              href={`/search?q=${encodeURIComponent(q)}`}
              className="border border-ink-700 px-3 py-1.5 text-[13px] font-medium text-ink-300 transition-colors hover:border-jade-500 hover:text-jade-300"
            >
              {q}
            </Link>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-x-8 border-t border-ink-800 sm:grid-cols-2 lg:grid-cols-4">
          {quickNav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              {...(item.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="group flex items-center justify-between gap-3 border-b border-ink-800 py-4 text-[14.5px] font-medium text-ink-200 transition-colors hover:text-white sm:border-b-0"
            >
              {item.label}
              <ArrowUpRight
                className="h-4 w-4 text-ink-500 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-jade-400"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
function CatalogueIntro({
  total,
  categoryCount,
}: {
  total: number;
  categoryCount: number;
}) {
  return (
    <section className="container-site py-14 sm:py-20">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 className="font-serif text-[26px] leading-[1.15] tracking-[-0.01em] text-ink-900 sm:text-[32px]">
            A working catalogue, not a brochure.
          </h2>
          <p className="mt-5 max-w-readable text-[15.5px] leading-relaxed text-ink-600">
            Every product page carries structured technical data —
            specifications, physical properties, pack sizes, CAS numbers and
            document references — so procurement teams can evaluate, compare
            and enquire without friction.
          </p>
          <p className="mt-4 max-w-readable text-[15.5px] leading-relaxed text-ink-600">
            The catalogue is live and continuously indexed; search is built on
            it, not bolted onto it.
          </p>
        </div>
        <dl className="lg:col-span-4 lg:col-start-9">
          <div className="flex items-baseline justify-between border-t border-ink-200 py-5">
            <dt className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-500">
              Products in catalogue
            </dt>
            <dd className="tnum font-serif text-3xl text-ink-900">
              {total.toLocaleString("en-IN")}
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-ink-200 py-5">
            <dt className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-500">
              Categories
            </dt>
            <dd className="tnum font-serif text-3xl text-ink-900">{categoryCount}</dd>
          </div>
          <div className="border-t border-ink-200 py-5">
            <dt className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-500">
              Enquiry line
            </dt>
            <dd className="mt-1 text-[15px] text-ink-700">
              Email &amp; WhatsApp — answered by the DR Chemicals team.
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

function CategoryIndex({
  tree,
}: {
  tree: Awaited<ReturnType<typeof getCategoryTree>>;
}) {
  const ranked = [...tree].sort((a, b) => b.productCount - a.productCount);
  const primary = ranked[0];
  const rest = ranked.slice(1, 6);
  return (
    <section className="border-t border-ink-200 bg-paper-50">
      <div className="container-site py-14 sm:py-20">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Catalogue index"
            title="Browse by category"
            lead="Product families and application areas across the DR Chemicals range."
          />
          <Link
            href="/categories"
            className="hidden shrink-0 items-center gap-1 text-[14px] font-medium text-jade-700 transition-colors hover:text-jade-800 sm:inline-flex"
          >
            All categories
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {!primary ? (
          <div className="mt-10">
            <EmptyState
              title="Categories are being organised"
              message="The catalogue is live and searchable; categories appear here as they are assigned."
              action={<Link href="/products" className={btn.primary}>Browse all products</Link>}
            />
          </div>
        ) : (
          <>
            <Link
              href={`/categories/${primary.slug}`}
              className="group mt-10 block border-y border-ink-200 py-8 sm:py-10"
            >
              <p className="tnum text-[12px] font-medium uppercase tracking-[0.14em] text-ink-500">
                {primary.productCount} product{primary.productCount === 1 ? "" : "s"}
              </p>
              <p className="mt-2 font-serif text-[28px] leading-tight tracking-[-0.01em] text-ink-900 transition-colors group-hover:text-jade-800 sm:text-[36px]">
                {primary.name}
              </p>
              {primary.description ? (
                <p className="mt-3 max-w-readable text-[15px] leading-relaxed text-ink-600">
                  {primary.description}
                </p>
              ) : null}
              <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-jade-700">
                Explore category
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </Link>
            <div className="mt-2">
              {rest.map((c) => (
                <CategoryCard key={c.slug} category={c} />
              ))}
            </div>
            <div className="mt-6 sm:hidden">
              <Link href="/categories" className={btn.secondary}>All categories</Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Spotlight({ products }: { products: ProductSummary[] }) {
  if (!products.length) return null;
  return (
    <section className="container-site py-14 sm:py-20">
      <div className="flex items-end justify-between gap-6">
        <SectionHeading
          eyebrow="From the catalogue"
          title="Product selection"
          lead="Published products from across the DR Chemicals range."
          serif={false}
        />
        <Link
          href="/products"
          className="hidden shrink-0 items-center gap-1 text-[14px] font-medium text-jade-700 transition-colors hover:text-jade-800 sm:inline-flex"
        >
          All products
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-x-10 md:grid-cols-2">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      <div className="mt-6 sm:hidden">
        <Link href="/products" className={btn.secondary}>All products</Link>
      </div>
    </section>
  );
}

function MarketsIndex() {
  return (
    <section className="border-t border-ink-200">
      <div className="container-site py-14 sm:py-20">
        <SectionHeading
          eyebrow="Markets served"
          title="Chemicals for every industry"
          lead="Product families grounded in DR Chemicals' official product portfolio — search or ask for exact specifications."
        />
        <ul className="mt-10 divide-y divide-ink-200 border-y border-ink-200">
          {PRODUCT_LINES.map((line) => (
            <li key={line.title}>
              <Link
                href={`/search?q=${encodeURIComponent(line.query)}`}
                className="group flex flex-col gap-1 py-5 transition-colors hover:bg-ink-50/60 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-3"
              >
                <span className="min-w-0">
                  <span className="block text-[16px] font-semibold tracking-tight text-ink-900 transition-colors group-hover:text-jade-800">
                    {line.title}
                  </span>
                  <span className="mt-0.5 block text-[13.5px] text-ink-500">
                    {line.blurb}
                  </span>
                </span>
                <span className="mt-2 inline-flex shrink-0 items-center gap-1 text-[13.5px] font-medium text-jade-700 sm:mt-0">
                  Explore
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col gap-3 border border-jade-200 bg-jade-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[15.5px] font-semibold text-jade-900">
              Can't find what you need?
            </p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-jade-800">
              Tell us the specification — our team sources and supplies across
              a much wider range.
            </p>
          </div>
          <WhatsAppCTA label="Ask on WhatsApp" className="shrink-0" />
        </div>
      </div>
    </section>
  );
}

function WhySection() {
  return (
    <section className="bg-ink-950 text-white">
      <div className="container-site grid grid-cols-1 gap-10 py-14 sm:py-20 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-jade-400">
            Why DR CHEMICALS
          </p>
          <h2 className="mt-3 font-serif text-[28px] leading-[1.15] tracking-[-0.01em] sm:text-[34px]">
            A dependable chemical partner.
          </h2>
          <p className="mt-5 max-w-readable text-[15px] leading-relaxed text-ink-300">
            Corporate discipline, quality control and supply-chain reliability
            — the reasons clients choose DR Chemicals.
          </p>
        </div>
        <ul className="divide-y divide-ink-800 border-y border-ink-800 lg:col-span-6 lg:col-start-7">
          {CREDIBILITY.map((item) => (
            <li key={item} className="flex items-start gap-4 py-5">
              <Check className="mt-1 h-[18px] w-[18px] shrink-0 text-jade-400" aria-hidden="true" />
              <span className="text-[15px] leading-relaxed text-ink-100">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ResourcesSection() {
  const rows = [
    { name: "SDS / MSDS", note: "Attached to product pages where available." },
    { name: "Certificate of Analysis", note: "Provided per product, on request." },
    { name: "Product specifications", note: "Structured on every product page." },
    { name: "Catalogue & price list", note: "Request via WhatsApp or email." },
  ];
  return (
    <section className="container-site grid grid-cols-1 gap-10 py-14 sm:py-20 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <SectionHeading
          eyebrow="Resources"
          title="Technical documentation"
          lead="Documentation travels with the catalogue — attached where available, supplied on request where not."
        />
      </div>
      <ul className="divide-y divide-ink-200 border-y border-ink-200 lg:col-span-7 lg:col-start-6">
        {rows.map((r) => (
          <li
            key={r.name}
            className="flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
          >
            <span className="text-[15.5px] font-semibold tracking-tight text-ink-900">
              {r.name}
            </span>
            <span className="text-[13.5px] text-ink-500">{r.note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TeamSection() {
  return (
    <section id="team" className="border-t border-ink-200 bg-paper-50">
      <div className="container-site py-14 sm:py-20">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading
            eyebrow="People"
            title="The team"
            lead="Reachable directly through the catalogue."
            serif={false}
          />
          <Link
            href="/about"
            className="hidden shrink-0 items-center gap-1 text-[14px] font-medium text-jade-700 transition-colors hover:text-jade-800 sm:inline-flex"
          >
            About DR Chemicals
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {TEAM.map((member) => (
            <TeamCard key={member.name} member={member} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="bg-ink-950 text-white">
      <div className="container-site flex flex-col gap-8 py-14 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="font-serif text-[28px] leading-[1.15] tracking-[-0.01em] sm:text-[34px]">
            Need a quote or a specification?
          </h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-ink-300">
            Our team responds quickly — by WhatsApp, email or a direct call.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <WhatsAppCTA label="Chat on WhatsApp" size="lg" />
          <a
            href="mailto:marketing@drchem.co.in"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md border border-ink-700 px-6 text-[15px] font-medium text-white transition-colors hover:border-jade-500 hover:text-jade-300"
          >
            Email us
          </a>
        </div>
      </div>
    </section>
  );
}