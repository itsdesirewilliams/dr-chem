/** Small presentation helpers shared across components. */

/** "123.45" → "123.45" trimmed; avoids trailing zeros for whole numbers. */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

/** Join a list with commas, using "and" before the last item. */
export function naturalJoin(items: string[], max = 4): string {
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  const shown = items.slice(0, max);
  const tail = items.length > max ? ` and ${items.length - max} more` : "";
  const last = shown.pop() as string;
  return `${shown.join(", ")} and ${last}${tail}`;
}

/**
 * "2026-07-05" / "05 Jul 2026" / JS Date → "05 Jul 2026".
 * Accepts Postgres date values (which node-postgres yields as Date objects).
 * Returns null when the input is missing or unparseable so callers never
 * render a raw Date object into JSX.
 */
export function formatDate(
  value: Date | string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  let d: Date;
  if (value instanceof Date) {
    d = value;
  } else {
    const text = String(value);
    d = new Date(`${text}T00:00:00Z`);
  }
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Truncate a string to n chars at a word boundary. */
export function truncate(text: string, n = 120): string {
  if (text.length <= n) return text;
  const cut = text.slice(0, n);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > 0 ? space : n).trimEnd()}…`;
}

/** Build a mailto href with optional subject/body. */
export function mailtoLink(
  email: string,
  opts: { subject?: string; body?: string } = {},
): string {
  const params = new URLSearchParams();
  if (opts.subject) params.set("subject", opts.subject);
  if (opts.body) params.set("body", opts.body);
  const qs = params.toString();
  return `mailto:${email}${qs ? `?${qs}` : ""}`;
}