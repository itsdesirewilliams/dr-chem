import { whatsappLink } from "@/lib/site";
import { MailIcon, WhatsAppIcon } from "@/components/icons";
import { CTA, btn } from "@/components/ui";

/**
 * WhatsApp conversion component.
 *
 * When NEXT_PUBLIC_WHATSAPP_NUMBER is configured this renders a real link to
 * `https://wa.me/<number>?text=<message>`. Until a number is provided it
 * renders the same slot as an email CTA so the button is never dead — and the
 * whole site never fabricates a phone number.
 */
export function WhatsAppCTA({
  message,
  label = "Chat on WhatsApp",
  size = "md",
  variant = "primary",
  className,
}: {
  message?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "whatsapp";
  className?: string;
}) {
  const href = whatsappLink(message);
  const sizing = size === "lg" ? "h-6 w-6" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const icon = href ? <WhatsAppIcon className={`${sizing} shrink-0`} /> : <MailIcon className={`${sizing} shrink-0`} />;
  const fallbackCls = variant === "secondary" ? btn.secondary : btn.primary;

  if (!href) {
    return (
      <CTA
        href="mailto:marketing@drchem.co.in"
        external
        className={className ?? fallbackCls}
        aria-label="Contact DR-Chem by email"
      >
        {icon}
        {label}
      </CTA>
    );
  }

  return (
    <CTA
      href={href}
      external
      className={className ?? btn.whatsapp}
      aria-label={`${label} (opens WhatsApp)`}
    >
      {icon}
      {label}
    </CTA>
  );
}

export default WhatsAppCTA;

/** Small WhatsApp-only icon button for compact rails. */
export function WhatsAppIconButton({ message, label }: { message?: string; label: string }) {
  const href = whatsappLink(message);
  if (!href) return null;
  return (
    <CTA
      href={href}
      external
      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-card hover:bg-[#1FC95D]"
      aria-label={label}
    >
      <WhatsAppIcon className="h-6 w-6" />
    </CTA>
  );
}

/** Property-type label map for suggestion arrows (kept trivial). */
export function sourceLabel(sourceType: string): string {
  const map: Record<string, string> = {
    name: "Name",
    article_number: "Article no.",
    cas: "CAS",
    synonym: "Synonym",
    formula: "Formula",
    category: "Category",
    spec: "Specification",
    hs_code: "HS code",
    other: "Other",
  };
  return map[sourceType] ?? sourceType;
}
