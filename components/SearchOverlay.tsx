"use client";

import { useEffect, useState } from "react";
import { SearchBox } from "@/components/SearchBox";
import { CloseIcon } from "@/components/icons";

/**
 * Full-screen search overlay — mobile-first, launched from the compact
 * header (and the homepage hero on small screens). Focus lands in the input;
 * suggested terms navigate straight to the search page.
 */
export function SearchOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("drchem:search-open", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("drchem:search-open", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Search DR Chemicals catalogue" className="fixed inset-0 z-[60] bg-paper-100">
      <div className="container-site">
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-4">
          <p className="text-[15px] font-semibold text-ink-800">Search catalogue</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close search"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-600 hover:bg-jade-50"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="container-site mt-6">
        <p className="mb-4 text-[13px] text-ink-500">
          Search by product name, CAS number, molecular formula, synonym or
          article number.
        </p>
        <SearchBox
          id="overlay-search"
          autoFocus
          placeholder="e.g. Ethanol, 64-17-5, C₂H₆O, CD-00123"
          large
          onNavigated={() => setOpen(false)}
        />
        <div className="mt-8 space-y-1 rounded-xl border border-ink-100 bg-paper-100 p-4">
          <p className="text-[13px] font-semibold text-ink-600">Popular lookups</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["Ethanol", "Sodium hydroxide", "Sulphuric acid", "Acetone", "Glycerol"].map((q) => (
              <a
                key={q}
                href={`/search?q=${encodeURIComponent(q)}`}
                className="rounded-full border border-jade-200 bg-jade-50 px-3 py-1.5 text-[13.5px] font-medium text-jade-800 hover:bg-jade-100"
              >
                {q}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}