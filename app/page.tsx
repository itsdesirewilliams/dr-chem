import type { Metadata } from "next";
import Link from "next/link";
import { getCategoryTree } from "@/lib/categories";
import { listProducts } from "@/lib/products";
import type { ProductSummary } from "@/lib/types";
import { SectionHeading, btn, EmptyState } from "@/components/ui";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { SearchBox } from "@/components/SearchBox";
import { WhatsAppCTA } from "@/components/WhatsAppCTA";
import { CheckIcon, DocumentIcon, FlaskIcon, StarIcon } from "@/components/icons";
import { TEAM } from "@/app/data/team";
import { TeamCard } from "@/components/TeamCard";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `${SITE_NAME} — Chemical & Laboratory Products`,
  description:
    "Search DR-Chem's catalogue of industrial, agricultural, mining and water-treatment chemicals — by name, CAS, formula, synonym or article number.",
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
  const featured = await listProducts({ featuredOnly: true, limit: 8, offset: 0 });

  return (
    <div className="flex flex-col gap-16 sm:gap-20">
      <Hero />
      <CategoriesSection tree={tree} />
      <FeaturedSection featured={featured.items} />
      <MarketsSection />
      <CredibilitySection />
      <ResourcesSection />
      <TeamTeaserSection />
      <CtaBand />
    </div>
  );
}

function Hero() {
  return (
    <section className="bg-[#EAF2EC]">
      <div className="container-site px-0">
        <div className="px-4 py-10 sm:px-6 lg:px-8">
          <p className="inline-flex items-center gap-2 text-[13px] font-medium text-jade-700">
            <StarIcon className="h-4 w-4 text-brass-500" />
            Trusted chemical solutions · Exporting worldwide
          </p>
          <h1 className="mt-3 font-serif text-[30px] leading-tight font-semibold text-ink-900 sm:text-4xl">
            Precision chemicals, delivered with trust.
          </h1>
          <p className="mt-3 max-w-readable text-[16px] leading-relaxed text-ink-600">
            Search the DR-Chem catalogue of industrial, laboratory and
            specialty chemicals — by name, CAS number, molecular formula,
            synonym or article number.
          </p>

          <div className="mt-6">
            <SearchBox id="hero-search" large placeholder="e.g. Ethanol, 64-17-5, C₂H₆O, CD-00123" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Ethanol", "Acetone", "Sodium hydroxide", "Sulphuric acid"].map((q) => (
              <Link
                key={q}
                href={`/search?q=${encodeURIComponent(q)}`}
                className="rounded-full border border-jade-200 bg-white px-3 py-1.5 text-[13.5px] font-medium text-jade-800 hover:bg-jade-100"
              >
                {q}
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/products" className={btn.primary}>
              Browse the catalogue
            </Link>
            <WhatsAppCTA label="Talk to DR-Chem" size="lg" />
          </div>
        </div>
      </div>
    </section>
  );
}
function CategoriesSection({ tree }: { tree: Awaited<ReturnType<typeof getCategoryTree>> }) {
  if (!tree.length) {
    return (
      <section className="container-site">
        <SectionHeading
          eyebrow="Catalogue"
          title="Browse by category"
          lead="Categories are being organised for this catalogue."
        />
        <div className="mt-8">
          <EmptyState
            title="Categories are on their way"
            message="The product catalogue is live — categories are being assigned and will appear here shortly. Until then, use search or the full catalogue."
            action={<Link href="/products" className={btn.primary}>Browse all products</Link>}
          />
        </div>
      </section>
    );
  }
  const top = tree.slice(0, 8);
  return (
    <section className="container-site">
      <div className="flex items-center justify-between">
        <SectionHeading
          eyebrow="Catalogue"
          title="Browse by category"
          lead="Find products by application area or chemical family."
        />
        <Link href="/categories" className="hidden shrink-0 text-[14px] font-semibold text-jade-700 sm:inline-flex sm:items-center sm:gap-1">
          All categories →
        </Link>
      </div>
      <div className="mt-8 flex snap-x gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {top.map((c) => (
          <CategoryCard key={c.slug} category={c} />
        ))}
      </div>
      <div className="mt-4 flex justify-center sm:hidden">
        <Link href="/categories" className={btn.secondary}>All categories</Link>
      </div>
    </section>
  );
}

function FeaturedSection({ featured }: { featured: ProductSummary[] }) {
  if (!featured.length) {
    return (
      <section className="container-site">
        <SectionHeading
          eyebrow="Selected"
          title="Featured products"
          lead="Hand-picked products from across the catalogue."
        />
        <div className="mt-8">
          <EmptyState
            title="Featured selection coming soon"
            message="Products are being published. Every active product can be found through search or the full catalogue."
            action={<Link href="/products" className={btn.secondary}>View all products</Link>}
          />
        </div>
      </section>
    );
  }
  return (
    <section className="container-site">
      <div className="flex items-center justify-between">
        <SectionHeading
          eyebrow="Selected"
          title="Featured products"
          lead="Hand-picked products from across the catalogue."
        />
        <Link href="/products" className="hidden shrink-0 text-[14px] font-semibold text-jade-700 sm:inline-flex sm:items-center sm:gap-1">
          All products →
        </Link>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {featured.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      <div className="mt-5 flex justify-center sm:hidden">
        <Link href="/products" className={btn.secondary}>All products</Link>
      </div>
    </section>
  );
}
function MarketsSection() {
  return (
    <section className="container-site">
      <SectionHeading
        eyebrow="Markets we serve"
        title="Chemicals for every industry"
        lead="Product families grounded in DR-Chem's official product portfolio — search or ask for exact specifications."
      />
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PRODUCT_LINES.map((line) => (
          <Link
            key={line.title}
            href={`/search?q=${encodeURIComponent(line.query)}`}
            className="group flex flex-col rounded-xl border border-ink-100 bg-white p-5 shadow-card hover:border-jade-300 hover:shadow-card-lg"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-jade-50 text-jade-600" aria-hidden="true">
              <FlaskIcon className="h-5.5 w-5.5" />
            </span>
            <h3 className="mt-3 text-[16px] font-semibold text-ink-900">{line.title}</h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">{line.blurb}</p>
            <span className="mt-3 inline-flex items-center text-[13.5px] font-medium text-jade-700 group-hover:text-jade-800">
              Explore products →
            </span>
          </Link>
        ))}
        <div className="flex flex-col rounded-xl border border-jade-200 bg-jade-50 p-5">
          <h3 className="text-[16px] font-semibold text-jade-900">Can't find what you need?</h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-jade-800">
            Tell us the specification — our team sources and supplies across a much wider range.
          </p>
          <WhatsAppCTA label="Ask on WhatsApp" />
        </div>
      </div>
    </section>
  );
}

function CredibilitySection() {
  return (
    <section className="bg-ink-950 text-white">
      <div className="container-site py-14">
        <SectionHeading
          align="center"
          eyebrow="Why DR-Chem"
          title="A dependable chemical partner"
          lead="Corporate discipline, quality control and supply-chain reliability — the reasons clients choose DR-Chem."
        />
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CREDIBILITY.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-xl bg-ink-900 p-4">
              <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-jade-400" />
              <span className="text-[15px] leading-relaxed text-ink-100">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
function ResourcesSection() {
  return (
    <section className="container-site">
      <SectionHeading
        eyebrow="Resources"
        title="Documents & technical resources"
        lead="Safety data sheets, certificates of analysis and further documentation are attached directly to product pages."
      />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { title: "SDS / MSDS", blurb: "Safety data sheets appear on product pages where available." },
          { title: "Certificates of analysis", blurb: "CoA links are attached to qualifying products." },
          { title: "Catalogues & guidance", blurb: "Request a full catalogue or price list via WhatsApp or email." },
        ].map((r) => (
          <div key={r.title} className="flex flex-col rounded-xl border border-ink-100 bg-white p-5 shadow-card">
            <DocumentIcon className="h-6 w-6 text-jade-600" />
            <h3 className="mt-2.5 text-[15.5px] font-semibold text-ink-900">{r.title}</h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">{r.blurb}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TeamTeaserSection() {
  return (
    <section className="bg-[#F0F4EE]">
      <div className="container-site py-14">
        <div className="flex flex-col items-center gap-8 text-center">
          <SectionHeading
            align="center"
            eyebrow="The team"
            title="People behind DR-Chem"
            lead="A focused team building trusted chemical partnerships."
          />
          <div className="grid w-full max-w-3xl grid-cols-1 gap-5 sm:grid-cols-3">
            {TEAM.map((member) => (
              <TeamCard key={member.name} member={member} />
            ))}
          </div>
          <Link href="/about" className={btn.secondary}>More about DR-Chem</Link>
        </div>
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="bg-jade-700">
      <div className="container-site py-14 text-center text-white">
        <h2 className="font-serif text-2xl font-semibold sm:text-3xl">
          Need a quote or a specification?
        </h2>
        <p className="mt-2 max-w-readable text-[16px] text-jade-50">
          Our team responds quickly — by WhatsApp, email or a direct call.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <WhatsAppCTA label="Chat on WhatsApp" size="lg" />
          <a
            href="mailto:marketing@drchem.co.in"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-white px-6 text-[16px] font-semibold text-jade-800"
          >
            email us
          </a>
        </div>
      </div>
    </section>
  );
}