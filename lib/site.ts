/**
 * Central site/company configuration.
 *
 * Every piece of user-facing contact/link configuration lives here so real
 * values can be supplied later through environment variables without touching
 * any component. Values marked "source:" are grounded in official DR Chemicals
 * pages (drchem.co.in/about, drchem.co.in/contact-us).
 */

export const SITE_NAME = "DR Chemicals";

/** Source: drchem.co.in/contact-us — company legal name shown in the footer. */
export const COMPANY_LEGAL_NAME = "DR CHEMICALS LLP, India";

/** Source: drchem.co.in/contact-us — marketing mailbox. */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "marketing@drchem.co.in";

/** Source: company LinkedIn page (the only official social presence). */
export const LINKEDIN_URL =
  process.env.NEXT_PUBLIC_LINKEDIN_URL ||
  "https://www.linkedin.com/company/drchemicals";

/**
 * WhatsApp number (digits only, with country code, e.g. "919876543210").
 * Not officially published anywhere yet — empty until provided through
 * NEXT_PUBLIC_WHATSAPP_NUMBER. UI components fall back to email CTAs.
 */
const RAW_WHATSAPP = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(
  /[^0-9]/g,
  "",
);

export const WHATSAPP_NUMBER = RAW_WHATSAPP;

/** URL builder for a WhatsApp chat with a pre-filled message. */
export function whatsappLink(message?: string): string | null {
  if (!WHATSAPP_NUMBER) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${WHATSAPP_NUMBER}${text}`;
}

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** Source: drchem.co.in/contact-us — corporate office. */
export const ADDRESS_LINES = [
  "Plot No. 115, Ekta Market, Singla Cycle Road,",
  "Industrial Area C, Dhandari Kalan,",
  "Ludhiana, Punjab 141010, India",
];

/** Source: drchem.co.in/contact-us — helpline (display form). */
export const PHONE_DISPLAY = "+91 161 5062182";

/** Source: drchem.co.in/contact-us — helpline (tel: link form). */
export const PHONE_TEL = "tel:+911615062182";

/** Source: drchem.co.in/contact-us — corporate office hours. */
export const OFFICE_HOURS =
  "Mon–Fri 8:30 AM – 7:00 PM · Sat 8:30 AM – 5:00 PM · Sun closed";