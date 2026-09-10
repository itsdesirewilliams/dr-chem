import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SITE_NAME, CONTACT_EMAIL } from "@/lib/site";
import { SectionHeading, Container, Section } from "@/components/ui";
import WhatsAppCTA from "@/components/WhatsAppCTA";
import TeamCard from "@/components/TeamCard";
import { team } from "@/app/data/team";

export const metadata: Metadata = {
  title: `About — ${SITE_NAME}`,
  description:
    "Who DR Chemicals is: a supplier of laboratory chemicals, reagents and fine chemicals with a structured, searchable catalogue of 2,900+ products.",
};

const capabilities = [
  {
    name: "Curated, structured catalogue",
    note: "More than 2,900 products, each with specifications, pack sizes and reference data organised for fast evaluation.",
  },
  {
    name: "Documentation access",
    note: "SDS/TDS and certificate documentation surfaced per product, with enquiry channels one tap away.",
  },
  {
    name: "Responsive supply",
    note: "Direct lines to our team by email and WhatsApp — from first enquiry to delivered order.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Section className="border-b border-ink-200">
        <Container>
          <div className="grid grid-cols-1 gap-10 py-14 sm:py-20 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-jade-700">
                About DR Chemicals
              </p>
              <h1 className="mt-3 font-serif text-[30px] leading-[1.12] tracking-[-0.01em] text-ink-900 sm:text-[40px]">
                A modern chemicals supplier, built around the catalogue.
              </h1>
            </div>
            <div className="lg:col-span-4 lg:pt-2">
              <p className="text-[15.5px] leading-relaxed text-ink-600">
                DR Chemicals supplies laboratory chemicals, reagents and fine
                chemicals to research laboratories, educational institutions
                and industrial customers.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <Section className="bg-paper-50">
        <Container>
          <div className="grid grid-cols-1 gap-10 py-14 sm:py-20 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 className="font-serif text-[24px] leading-[1.2] tracking-[-0.01em] text-ink-900 sm:text-[28px]">
                Structured data, personal service.
              </h2>
              <p className="mt-5 max-w-readable text-[15px] leading-relaxed text-ink-600">
                Our catalogue brings together more than 2,900 products — each
                with structured specifications, pack sizes and reference data
                — so buyers and procurement teams can find, evaluate and
                enquire without friction.
              </p>
              <p className="mt-4 max-w-readable text-[15px] leading-relaxed text-ink-600">
                We pair that catalogue with direct, personal service: clear
                product data, straightforward enquiry channels, and a team
                that answers.
              </p>
            </div>
            <ul className="divide-y divide-ink-200 border-y border-ink-200 lg:col-span-6 lg:col-start-7">
              {capabilities.map((c) => (
                <li key={c.name} className="py-5">
                  <p className="text-[15.5px] font-semibold tracking-tight text-ink-900">
                    {c.name}
                  </p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink-500">
                    {c.note}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      <Section id="team">
        <Container>
          <div className="py-14 sm:py-20">
            <SectionHeading
              eyebrow="People"
              title="The team"
              lead="A small, hands-on team — reachable directly through the catalogue."
              serif={false}
            />
            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {team.map((member) => (
                <TeamCard key={member.name} member={member} />
              ))}
            </div>
          </div>
        </Container>
      </Section>

      <Section className="bg-ink-950 text-white">
        <Container>
          <div className="flex flex-col gap-8 py-14 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <h2 className="font-serif text-[26px] leading-[1.15] tracking-[-0.01em] sm:text-[32px]">
                Talk to DR CHEMICALS.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-300">
                Product questions, bulk pricing or documentation — our team is
                one message away.
              </p>
              <p className="mt-4 text-[13.5px] text-ink-400">
                Prefer email? Write to{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-medium text-jade-300 underline underline-offset-4"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <WhatsAppCTA label="Chat on WhatsApp" />
              <Link
                href="/contact"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-ink-700 px-5 text-[14.5px] font-medium text-white transition-colors hover:border-jade-500 hover:text-jade-300"
              >
                Contact page
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
