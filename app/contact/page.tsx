import type { Metadata } from "next";
import { Linkedin, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import {
  SITE_NAME,
  CONTACT_EMAIL,
  LINKEDIN_URL,
  ADDRESS_LINES,
  PHONE_DISPLAY,
  PHONE_TEL,
  whatsappLink,
} from "@/lib/site";
import { Container, Section } from "@/components/ui";
import EnquiryForm from "./EnquiryForm";

export const metadata: Metadata = {
  title: `Contact — ${SITE_NAME}`,
  description:
    "Contact DR Chemicals: email, WhatsApp and a direct enquiry form for product questions, bulk pricing and documentation requests.",
};

export default function ContactPage() {
  const wa = whatsappLink("Hello DR Chemicals, I have an enquiry.");
  const channels = [
    {
      label: "Email",
      value: CONTACT_EMAIL,
      href: `mailto:${CONTACT_EMAIL}`,
      external: false,
      icon: Mail,
    },
    ...(wa
      ? [
          {
            label: "WhatsApp",
            value: "Chat with our team",
            href: wa,
            external: true,
            icon: MessageCircle,
          },
        ]
      : []),
    {
      label: "Phone",
      value: PHONE_DISPLAY,
      href: PHONE_TEL,
      external: false,
      icon: Phone,
    },
  ];

  return (
    <>
      <Section className="border-b border-ink-200">
        <Container>
          <div className="py-14 sm:py-20">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-jade-700">
              Contact
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-[30px] leading-[1.12] tracking-[-0.01em] text-ink-900 sm:text-[40px]">
              Talk to the DR CHEMICALS team.
            </h1>
            <p className="mt-5 max-w-readable text-[15.5px] leading-relaxed text-ink-600">
              Product questions, bulk pricing, documentation requests or
              anything else — choose whichever channel suits you.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-px border border-ink-200 bg-ink-200 sm:grid-cols-2 lg:grid-cols-3">
              {channels.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  {...(c.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="group flex flex-col gap-3 bg-paper-50 p-5 transition-colors hover:bg-white"
                >
                  <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
                    <c.icon className="h-4 w-4 text-jade-700" aria-hidden="true" />
                    {c.label}
                  </span>
                  <span className="break-words text-[15px] font-medium text-ink-900 transition-colors group-hover:text-jade-800">
                    {c.value}
                  </span>
                </a>
              ))}
              <div className="flex flex-col gap-3 bg-paper-50 p-5">
                <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-500">
                  <MapPin className="h-4 w-4 text-jade-700" aria-hidden="true" />
                  Office
                </span>
                <address className="text-[13.5px] not-italic leading-relaxed text-ink-700">
                  {ADDRESS_LINES.map((line) => (
                    <span key={line} className="block">{line}</span>
                  ))}
                </address>
              </div>
            </div>

            <p className="mt-6 flex items-center gap-2 text-[13.5px] text-ink-500">
              <Linkedin className="h-4 w-4 text-[#0A66C2]" aria-hidden="true" />
              Follow DR Chemicals on{" "}
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-ink-900 underline underline-offset-4 transition-colors hover:text-jade-700"
              >
                LinkedIn
              </a>{" "}
              — our only official social presence.
            </p>
          </div>
        </Container>
      </Section>

      <Section className="bg-paper-50" id="enquiry">
        <Container>
          <div className="grid grid-cols-1 gap-10 py-14 sm:py-20 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="font-serif text-[24px] leading-[1.2] tracking-[-0.01em] text-ink-900 sm:text-[28px]">
                Send an enquiry.
              </h2>
              <p className="mt-4 max-w-readable text-[14.5px] leading-relaxed text-ink-600">
                Tell us what you need and the DR Chemicals team will get back to
                you.
              </p>
              <p className="mt-4 text-[13px] leading-relaxed text-ink-500">
                Include the article number or CAS number if you are enquiring
                about a specific product.
              </p>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <EnquiryForm />
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
