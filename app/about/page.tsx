import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, CONTACT_EMAIL } from '@/lib/site';
import { ShieldIcon, DocumentIcon, ArrowRightIcon, FlaskIcon } from '@/components/icons';
import { CTA, SectionHeading, Container, Section } from '@/components/ui';
import WhatsAppCTA from '@/components/WhatsAppCTA';
import TeamCard from '@/components/TeamCard';
import { team } from '@/app/data/team';

export const metadata: Metadata = {
  title: `About — ${SITE_NAME}`,
  description:
    'Who DR-Chem is: a supplier of laboratory chemicals, reagents and fine chemicals with a structured, searchable catalogue of 2,900+ products.',
};

const capabilities = [
  {
    icon: ShieldIcon,
    title: 'Curated, structured catalogue',
    body: 'More than 2,900 chemical products, each with specifications, pack sizes and reference data organised so buyers can evaluate quickly.',
  },
  {
    icon: DocumentIcon,
    title: 'Documentation access',
    body: 'SDS/TDS and certificate documentation are surfaced per product, with enquiry channels one tap away when a document is not yet listed.',
  },
  {
    icon: FlaskIcon,
    title: 'Responsive supply',
    body: 'Direct lines to our team by email and WhatsApp keep procurement moving — from first enquiry to delivered order.',
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero — mobile-first */}
      <Section className="border-b border-neutral-200 bg-white">
        <Container>
          <SectionHeading
            eyebrow="About DR-Chem"
            title="A modern chemicals supplier, built around the catalogue"
            description="DR-Chem supplies laboratory chemicals, reagents and fine chemicals to research laboratories, educational institutions and industrial customers."
          />
          <div className="mt-6 space-y-4 text-base leading-relaxed text-neutral-700 sm:mt-8 sm:text-lg">
            <p>
              Our catalogue brings together more than 2,900 products — each with
              structured specifications, pack sizes and reference data — so that
              buyers and procurement teams can find, evaluate and enquire without
              friction.
            </p>
            <p>
              We pair that catalogue with direct, personal service: clear product
              data, straightforward enquiry channels, and a team that answers.
            </p>
          </div>
        </Container>
      </Section>

      {/* Capabilities */}
      <Section className="bg-neutral-50">
        <Container>
          <SectionHeading eyebrow="What we do" title="Built for procurement" />
          <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-neutral-200 bg-white p-5"
              >
                <Icon className="h-6 w-6 text-jade-600" aria-hidden="true" />
                <h3 className="mt-3 text-base font-semibold text-neutral-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Team */}
      <Section className="bg-white">
        <Container>
          <SectionHeading
            eyebrow="Team"
            title="The people behind DR-Chem"
            description="A small, hands-on team — reachable directly through the catalogue."
          />
          <ul className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-3">
            {team.map((member) => (
              <li key={member.name}>
                <TeamCard member={member} />
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* CTA band */}
      <Section className="bg-jade-700 text-white">
        <Container>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold sm:text-3xl">
                Talk to DR-Chem
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-jade-100">
                Product questions, bulk pricing or documentation — our team is
                one message away.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <WhatsAppCTA variant="secondary" label="Chat on WhatsApp" />
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-jade-300 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-jade-600"
              >
                Contact page
                <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <p className="mt-6 text-sm text-jade-200">
            Prefer email? Write to{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold underline underline-offset-4"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </Container>
      </Section>
    </>
  );
}
