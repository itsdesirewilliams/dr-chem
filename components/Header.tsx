"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CloseIcon,
  MenuIcon,
  SearchIcon,
  WhatsAppIcon,
  LinkedInIcon,
} from "@/components/icons";
import { whatsappLink, LINKEDIN_URL, CONTACT_EMAIL } from "@/lib/site";

const NAV = [
  { href: "/products", label: "Products" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/**
 * Compact premium header — mobile-first.
 *  - mobile: logo + search trigger + hamburger; slide-over menu.
 *  - desktop: horizontal nav + inline search + WhatsApp pill.
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

  const wa = whatsappLink("Hello DR-Chem, I have an enquiry.");

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur">
      <div className="container-site">
        <div className="flex h-16 items-center justify-between gap-3">
          <BrandLink />

          <nav
            aria-label="Primary"
            className="hidden items-center gap-1 text-[15px] font-medium md:flex"
          >
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 transition-colors ${
                  pathname === item.href || pathname.startsWith(item.href + "/")
                    ? "bg-jade-50 text-jade-800"
                    : "text-ink-700 hover:bg-jade-50 hover:text-jade-800"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("drchem:search-open"))}
              aria-label="Open search"
              className="hidden h-11 w-11 items-center justify-center rounded-lg text-ink-500 hover:bg-jade-50 hover:text-jade-700 md:flex"
            >
              <SearchIcon className="h-5 w-5" />
            </button>

            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-[13.5px] font-semibold text-[#0B3B24] hover:bg-[#1FC95D] lg:flex"
              >
                <WhatsAppIcon className="h-4 w-4" />
                WhatsApp
              </a>
            ) : null}

            <div className="flex items-center gap-1.5 md:hidden">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("drchem:search-open"))}
                aria-label="Open search"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-ink-100 text-ink-600"
              >
                <SearchIcon className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                aria-expanded={menuOpen}
                className="flex h-11 w-11 items-center justify-center rounded-lg bg-jade-600 text-white"
              >
                <MenuIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {menuOpen ? <MenuSheet onClose={() => setMenuOpen(false)} /> : null}
    </header>
  );
}

function BrandLink() {
  return (
    <Link
      href="/"
      aria-label="DR-Chem home"
      className="flex items-center gap-2 focus-visible:outline focus-visible:outline-2"
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-jade-600 text-white"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M12 3 L12 9 L10 9 L10 12 C8.6 13.4 8 15 9 16 L11 16 L12 14 L14 12 Q15 10.4 16 8.8 L12 3 Z M12 12 L5 12" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-bold tracking-tight text-ink-900">DR-Chem</span>
        <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-jade-700">
          Chemical Solutions
        </span>
      </span>
    </Link>
  );
}
function MenuSheet({ onClose }: { onClose: () => void }) {
  const wa = whatsappLink("Hello DR-Chem, I have an enquiry.");
  return (
    <div role="dialog" aria-modal="true" aria-label="Site menu" className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-ink-950/40"
      />
      <div className="absolute inset-y-0 right-0 flex w-[86%] max-w-md flex-col bg-white shadow-card-lg">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <p className="font-serif text-xl font-semibold text-ink-900">Menu</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-600 hover:bg-jade-50"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Primary mobile" className="flex flex-col px-5 pt-2">
          {[{ href: "/", label: "Home" }, ...NAV].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex min-h-[52px] items-center justify-between border-b border-ink-100 px-2 text-[17px] font-medium text-ink-800"
            >
              {item.label}
              <span aria-hidden="true" className="text-ink-300">›</span>
            </Link>
          ))}
        </nav>

        <div className="mt-6 flex flex-col gap-3 px-5">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[#25D366] text-[15px] font-semibold text-[#0B3B24]"
            >
              <WhatsAppIcon className="h-5 w-5" /> Chat on WhatsApp
            </a>
          ) : null}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-ink-200 text-[15px] font-semibold text-ink-800"
          >
            Email us
          </a>
          <a
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-ink-200 text-[15px] font-semibold text-ink-800"
          >
            <LinkedInIcon className="h-5 w-5" /> Follow on LinkedIn
          </a>
        </div>

        <p className="mt-5 px-5 text-[12.5px] leading-relaxed text-ink-400">
          DR-Chem · Chemical & laboratory products. Industrial, agricultural,
          mining and water-treatment chemicals.
        </p>
      </div>
    </div>
  );
}