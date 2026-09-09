import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME, CONTACT_EMAIL, LINKEDIN_URL } from '@/lib/site';
import { MailIcon, LinkedInIcon, CheckIcon } from '@/components/icons';
import { CTA, SectionHeading, Container, Section } from '@/components/ui';
import WhatsAppCTA from '@/components/WhatsAppCTA';
import EnquiryForm from './EnquiryForm';

export const metadata: Metadata = {
  title: `Contact — ${SITE_NAME}`,
  description:
    'Contact DR-Chem: email, WhatsApp and a direct enquiry form for product questions, bulk pricing and documentation requests.',
};

export default function ContactPage() {
  return (
    <>
      <Section className="border-b border-neutral-200 bg-white">
        <Container>
          <SectionHeading
            eyebrow="Contact"
            title="Get in touch"
            description="Product questions, bulk pricing, documentation requests or anything else — choose whichever channel suits you."
          />
          {/* Channel cards — stacked on mobile, row on desktop */}
          <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2">
<a
              href={`mailto:${CONTACT_EMAIL}`}
              className="group flex min-h-24 items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-jade-300 hover:shadow-sm"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-jade-50">
                <MailIcon className="h-6 w-6 text-jade-700" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Email
                </span>
                <span className="block truncate text-base font-semibold text-neutral-900 group-hover:text-jade-700">
                  {CONTACT_EMAIL}
                </span>
              </span>
            </a>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center gap-4">
                <WhatsAppCTA
                  label="Chat on WhatsApp"
                  className="w-full sm:w-auto"
                />
              </div>
              <p className="mt-3 text-sm text-neutral-600">
                Fastest route for quick product availability and pricing
                questions.
              </p>
            </div>
          </div>

          {/* LinkedIn */}
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0A66C2]/10">
              <LinkedInIcon className="h-5 w-5 text-[#0A66C2]" aria-hidden="true" />
            </span>
            <p className="text-sm text-neutral-700">
              Follow DR-Chem on{' '}
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-neutral-900 underline underline-offset-4 hover:text-jade-700"
              >
                LinkedIn
              </a>{' '}
              for company updates.
            </p>
          </div>
        </Container>
      </Section>

      {/* Enquiry form */}
      <Section className="bg-neutral-50" id="enquiry">
        <Container>
          <SectionHeading
            eyebrow="Enquiry"
            title="Send us an enquiry"
            description="Tell us what you need and the DR-Chem team will get back to you."
          />
          <div className="mt-6 sm:mt-8">
            <EnquiryForm />
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm text-neutral-500">
            <CheckIcon className="h-4 w-4" aria-hidden="true" />
            Include the article number or CAS number if you are enquiring about a
            specific product.
          </p>
        </Container>
      </Section>
    </>
  );
}
