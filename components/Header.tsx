"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  Linkedin,
  Mail,
  Menu,
  MessageCircle,
  Search,
  X,
} from "lucide-react";
import { whatsappLink, LINKEDIN_URL, CONTACT_EMAIL } from "@/lib/site";

const NAV = [
  { href: "/products", label: "Products" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/**
 * Corporate header — architectural and compact.
 *  - mobile: lockup + search + menu; slide-over panel.
 *  - desktop: quiet underline navigation, catalogue search, ink Enquire CTA.
 */
export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const openSearch = () =>
    window.dispatchEvent(new CustomEvent("drchem:search-open"));

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-paper-100/90 backdrop-blur">
      <div className="container-site">
        <div className="flex h-14 items-center justify-between gap-4 md:h-16">
          <BrandLockup />

          <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
            {NAV.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative py-5 text-[14.5px] font-medium transition-colors ${
                    active ? "text-jade-800" : "text-ink-600 hover:text-ink-900"
                  }`}
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-0 bottom-0 h-0.5 transition-colors ${
                      active ? "bg-jade-600" : "bg-transparent"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openSearch}
              aria-label="Search the catalogue"
              className="hidden h-10 w-10 place-items-center rounded-md border border-ink-300 text-ink-600 transition-colors hover:border-jade-600 hover:text-jade-700 lg:grid"
            >
              <Search className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>

            <Link
              href="/contact"
              className="hidden h-10 items-center rounded-md bg-ink-900 px-4 text-[14px] font-medium text-white transition-colors hover:bg-ink-800 md:inline-flex"
            >
              Enquire
            </Link>

            <div className="flex items-center lg:hidden">
              <button
                type="button"
                onClick={openSearch}
                aria-label="Search the catalogue"
                className="grid h-11 w-11 place-items-center text-ink-600 transition-colors hover:text-jade-700"
              >
                <Search className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                aria-expanded={menuOpen}
                className="grid h-11 w-11 place-items-center text-ink-900"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {menuOpen ? <MenuSheet onClose={() => setMenuOpen(false)} /> : null}
    </header>
  );
}

function BrandLockup() {
  return (
    <Link
      href="/"
      aria-label="DR Chemicals home"
      className="flex items-center gap-2.5 focus-visible:outline focus-visible:outline-2"
    >
      <span
        aria-hidden="true"
        className="grid h-9 w-9 place-items-center rounded-[5px] bg-jade-700 font-serif text-[15px] font-semibold text-white"
      >
        DR
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[16.5px] font-semibold tracking-tight text-ink-900">
          DR Chemicals
        </span>
        <span className="mt-1 text-[10px] font-medium uppercase leading-none tracking-[0.16em] text-ink-500">
          Laboratory Chemicals
        </span>
      </span>
    </Link>
  );
}
function MenuSheet({ onClose }: { onClose: () => void }) {
  const wa = whatsappLink("Hello DR Chemicals, I have an enquiry.");
  return (
    <div role="dialog" aria-modal="true" aria-label="Site menu" className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-ink-950/50"
      />
      <div className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col bg-paper-50 shadow-card-lg">
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
          <span className="text-[15px] font-semibold tracking-tight text-ink-900">
            Menu
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-11 w-11 place-items-center text-ink-500 transition-colors hover:text-ink-900"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Primary mobile" className="flex flex-col px-5">
          {[{ href: "/", label: "Home" }, ...NAV].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex min-h-[54px] items-center justify-between border-b border-ink-100 text-[16px] font-medium text-ink-800 transition-colors hover:text-jade-700"
            >
              {item.label}
              <ChevronRight className="h-4 w-4 text-ink-300" aria-hidden="true" />
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-2.5 px-5 pt-6">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md bg-[#25D366] text-[15px] font-medium text-[#08331D]"
            >
              <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
              Chat on WhatsApp
            </a>
          ) : null}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md border border-ink-300 text-[15px] font-medium text-ink-800 transition-colors hover:border-jade-600 hover:text-jade-700"
          >
            <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
            Email us
          </a>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-md border border-ink-300 text-[15px] font-medium text-ink-800 transition-colors hover:border-jade-600 hover:text-jade-700"
          >
            <Linkedin className="h-[18px] w-[18px]" aria-hidden="true" />
            Follow on LinkedIn
          </a>
        </div>

        <p className="mt-auto px-5 pb-6 pt-6 text-[12px] leading-relaxed text-ink-400">
          DR CHEMICALS — industrial, agricultural, mining and water-treatment
          chemicals, organised as a searchable technical catalogue.
        </p>
      </div>
    </div>
  );
}