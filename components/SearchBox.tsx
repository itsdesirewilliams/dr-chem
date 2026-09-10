"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { SearchIcon } from "@/components/icons";
import type { SuggestedTerm } from "@/lib/types";

/**
 * Prominent chemical search — mobile-first.
 * Debounced type-ahead against /api/search (FTS + trigram + prefix over
 * product_search_terms), with keyboard support and one-hand-friendly sizing.
 */
export function SearchBox({
  id = "site-search",
  autoFocus = false,
  placeholder = "Search by product, CAS, formula, article no.…",
  large = false,
  onNavigated,
}: {
  id?: string;
  autoFocus?: boolean;
  placeholder?: string;
  large?: boolean;
  onNavigated?: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedTerm[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open && autoFocus) onFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onFocus() {
    /* focus enters the input; suggestions driven by query */
  }

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = (await res.json()) as { suggestions: SuggestedTerm[] };
          setSuggestions(data.suggestions ?? []);
          setOpen(true);
          setActive(-1);
        }
      } finally {
        setLoading(false);
      }
    }, 140);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  function submit(term?: string) {
    const q = (term ?? query).trim();
    if (!q) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
    onNavigated?.();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(active + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(active <= 0 ? -1 : active - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && suggestions[active]) {
        submit(suggestions[active].term);
      } else {
        submit();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center"
      >
        <label htmlFor={id} className="sr-only">
          Search the DR Chemicals catalogue
        </label>
        <span
          className={`pointer-events-none absolute left-4 text-ink-400 ${large ? "top-1/2 -translate-y-1/2 h-5 w-5" : "top-1/2 -translate-y-1/2 h-4 w-4"}`}
          aria-hidden="true"
        >
          <SearchIcon className="h-full w-full" />
        </span>
        <input
          id={id}
          type="search"
          autoComplete="off"
          autoCorrect="off"
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={placeholder}
          aria-label="Search the DR Chemicals catalogue"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          role="combobox"
          className={`w-full rounded-xl border border-ink-200 bg-white py-3.5 pl-11 pr-4 text-[16px] text-ink-900 placeholder:text-ink-400 shadow-sm focus:border-jade-500 focus:ring-2 focus:ring-jade-400/30 ${large ? "h-13 text-lg" : "h-11"}`}
        />
        {loading ? (
          <span className="absolute right-4 h-4 w-4 animate-spin rounded-full border-2 border-jade-500 border-t-transparent" aria-hidden="true" />
        ) : null}
      </form>

      {open && suggestions.length > 0 ? (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1.5 w-full rounded-xl border border-ink-100 bg-white shadow-card-lg"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.productSlug}|${s.term}`}
              role="option"
              aria-selected={i === active}
              className={`flex cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left text-[15px] ${i === active ? "bg-jade-50 text-jade-900" : "text-ink-800"} ${i > 0 ? "border-t border-ink-100" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                submit(s.term);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span
                className="h-4 w-4 shrink-0 text-ink-400"
                aria-hidden="true"
              >
                <SearchIcon className="h-full w-full" />
              </span>
              <span className="min-w-0 flex-1 truncate">{s.term}</span>
              <span className="shrink-0 text-[12px] text-ink-400">
                {s.articleNumber ?? s.sourceType}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}