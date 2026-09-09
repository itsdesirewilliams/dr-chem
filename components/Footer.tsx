import Link from "next/link";
import {
  ADDRESS_LINES,
  COMPANY_LEGAL_NAME,
  CONTACT_EMAIL,
  LINKEDIN_URL,
  OFFICE_HOURS,
  PHONE_DISPLAY,
  PHONE_TEL,
  whatsappLink,
} from "@/lib/site";
import { LinkedInIcon, WhatsAppIcon, MailIcon, PhoneIcon } from "@/components/icons";
import type { CategoryNode } from "@/lib/types";

export function Footer({ categories = [] }: { categories?: CategoryNode[] }) {
  const wa = whatsappLink("Hello DR-Chem, I have an enquiry.");
  return (
    <footer className="border-t border-ink-100 bg-ink-950 text-white">
      <div className="container-site py-12">
        <div className="grid grid-cols-1 gap-9 sm:grid-cols-2 lg:grid-cols-4">
          {/* Company */}
          <div>
            <p className="font-serif text-xl font-semibold">DR-Chem</p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-200">
              Chemical & laboratory products for industrial, agricultural,
              mining and water-treatment applications — supplied with
              precision, quality and trust.
            </p>
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#25D366] px-4 text-[14px] font-semibold text-[#0B3B24]"
              >
                <WhatsAppIcon className="h-5 w-5" />
                Chat on WhatsApp
              </a>
            ) : null}
          </div>

          {/* Browse */}
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-300">
              Browse
            </h3>
            <ul className="mt-3 space-y-2.5 text-[14px] text-ink-100 hover:text-jade-300">
              <li><Link href="/products" className="hover:text-jade-300">All products</Link></li>
              <li><Link href="/categories" className="hover:text-jade-300">Categories</Link></li>
              <li><Link href="/search" className="hover:text-jade-300">Search catalogue</Link></li>
              {categories.slice(0, 4).map((c) => (
                <li key={c.slug}>
                  <Link href={`/categories/${c.slug}`} className="hover:text-jade-300">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-300">
              Company
            </h3>
            <ul className="mt-3 space-y-2.5 text-[14px] text-ink-100">
              <li><Link href="/about" className="hover:text-jade-300">About DR-Chem</Link></li>
              <li><Link href="/contact" className="hover:text-jade-300">Contact</Link></li>
              <li>
                <a
                  href={LINKEDIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-jade-300"
                >
                  <LinkedInIcon className="h-4 w-4" /> LinkedIn
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-300">
              Contact
            </h3>
            <address className="mt-3 text-[13.5px] leading-relaxed text-ink-200">
              {ADDRESS_LINES.map((line) => (
                <span key={line} className="block">{line}</span>
              ))}
            </address>
            <ul className="mt-3 space-y-2 text-[13.5px]">
              <li>
                <a href={PHONE_TEL} className="inline-flex items-center gap-2 text-ink-100 hover:text-jade-300">
                  <PhoneIcon className="h-3.5 w-3.5" /> {PHONE_DISPLAY}
                </a>
              </li>
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 text-ink-100 hover:text-jade-300">
                  <MailIcon className="h-3.5 w-3.5" /> {CONTACT_EMAIL}
                </a>
              </li>
              <li className="text-ink-300">{OFFICE_HOURS}</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-ink-800 pt-6 text-[12.5px] text-ink-300">
          © {new Date().getFullYear()} {COMPANY_LEGAL_NAME}. All rights reserved.
          <span className="mx-2 text-ink-500">·</span>
          Product data from the DR-Chem catalogue; technical documents as
          available on product pages.
        </div>
      </div>
    </footer>
  );
}