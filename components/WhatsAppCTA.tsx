import { WhatsAppIcon } from "@/components/icons";
import { whatsappLink } from "@/lib/site";
import { CTA, btn } from "@/components/ui";

/**
 * WhatsApp conversion component.
 *
 * When NEXT_PUBLIC_WHATSAPP_NUMBER is configured this renders a real link to
 * `https://wa.me/<number>?text=<message>` with the WhatsApp brand mark. When no
 * number is configured the component renders nothing: a WhatsApp-labelled
 * button that actually opens an email client (mail icon + mailto) misleads the
 * visitor, and every call site already sits next to a real email action. The
 * button reappears automatically once the number is provided.
 */
export function WhatsAppCTA({
  message,
  label = "Chat on WhatsApp",
  size = "md",
  className,
}: {
  message?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "whatsapp";
  className?: string;
}) {
  const href = whatsappLink(message);
  if (!href) return null;
  const sizing = size === "lg" ? "h-5 w-5" : size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  return (
    <CTA
      href={href}
      external
      className={className ?? btn.whatsapp}
      aria-label={`${label} (opens WhatsApp)`}
    >
      <WhatsAppIcon className={`${sizing} shrink-0`} aria-hidden="true" />
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
      className="grid h-10 w-10 place-items-center rounded-md bg-[#25D366] text-[#08331D] transition-colors hover:bg-[#1FC95D]"
      aria-label={label}
    >
      <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
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
