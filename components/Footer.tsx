import Link from "next/link";
import { Linkedin, Mail, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons";
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
import type { CategoryNode } from "@/lib/types";

export function Footer({ categories = [] }: { categories?: CategoryNode[] }) {
  const wa = whatsappLink("Hello DR Chemicals, I have an enquiry.");
  return (
    <footer className="border-t border-ink-100 bg-ink-950 text-white">
      <div className="container-site py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Identity */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="grid h-8 w-8 place-items-center rounded-[4px] bg-jade-600 font-serif text-[15px] font-semibold text-white"
              >
                DR
              </span>
              <span className="text-[17px] font-semibold tracking-tight text-white">
                DR CHEMICALS
              </span>
            </div>
            <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-ink-300">
              Chemical &amp; laboratory products for industrial, agricultural,
              mining and water-treatment applications — organised as a
              searchable technical catalogue.
            </p>
            <div className="mt-5 flex items-center gap-2.5">
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="DR Chemicals on LinkedIn"
                className="grid h-10 w-10 place-items-center rounded-md border border-ink-700 text-ink-300 transition-colors hover:border-jade-500 hover:text-jade-300"
              >
                <Linkedin className="h-5 w-5" aria-hidden="true" />
              </a>
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Chat with DR Chemicals on WhatsApp"
                  className="grid h-10 w-10 place-items-center rounded-md border border-ink-700 text-ink-300 transition-colors hover:border-jade-500 hover:text-jade-300"
                >
                  <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
                </a>
              ) : null}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                aria-label={`Email ${CONTACT_EMAIL}`}
                className="grid h-10 w-10 place-items-center rounded-md border border-ink-700 text-ink-300 transition-colors hover:border-jade-500 hover:text-jade-300"
              >
                <Mail className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Catalogue */}
          <nav aria-label="Catalogue" className="lg:col-span-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
              Catalogue
            </h3>
            <ul className="mt-4 space-y-2.5 text-[14px]">
              <li><Link href="/products" className="text-ink-200 transition-colors hover:text-jade-300">All products</Link></li>
              <li><Link href="/categories" className="text-ink-200 transition-colors hover:text-jade-300">Categories</Link></li>
              <li><Link href="/search" className="text-ink-200 transition-colors hover:text-jade-300">Search</Link></li>
              {categories.slice(0, 4).map((c) => (
                <li key={c.slug}>
                  <Link href={`/categories/${c.slug}`} className="text-ink-200 transition-colors hover:text-jade-300">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company */}
          <nav aria-label="Company" className="lg:col-span-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
              Company
            </h3>
            <ul className="mt-4 space-y-2.5 text-[14px]">
              <li><Link href="/about" className="text-ink-200 transition-colors hover:text-jade-300">About</Link></li>
              <li><Link href="/contact" className="text-ink-200 transition-colors hover:text-jade-300">Contact</Link></li>
              <li><Link href="/about#team" className="text-ink-200 transition-colors hover:text-jade-300">Team</Link></li>
            </ul>
          </nav>

          {/* Contact */}
          <div className="lg:col-span-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
              Contact
            </h3>
            <address className="mt-4 text-[13.5px] not-italic leading-relaxed text-ink-300">
              {ADDRESS_LINES.map((line) => (
                <span key={line} className="block">{line}</span>
              ))}
            </address>
            <ul className="mt-4 space-y-2 text-[13.5px]">
              <li>
                <a href={PHONE_TEL} className="inline-flex items-center gap-2 text-ink-200 transition-colors hover:text-jade-300">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="tnum">{PHONE_DISPLAY}</span>
                </a>
              </li>
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 text-ink-200 transition-colors hover:text-jade-300">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li className="text-[12.5px] text-ink-400">{OFFICE_HOURS}</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-ink-800 pt-6 text-[12.5px] text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {COMPANY_LEGAL_NAME}. All rights reserved.</p>
          <p>Technical data is provided per product; documents as available.</p>
        </div>
      </div>
    </footer>
  );
}