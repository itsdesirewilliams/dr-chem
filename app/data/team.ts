/**
 * DR-Chem team directory.
 *
 * Source: provided by the DR-Chem team (names + roles). Social/contact URLs
 * are PLACEHOLDERS by design — replace the href strings below when real
 * profiles/numbers are provided. The UI components render whatever is in this
 * file, so no component changes are ever needed.
 */

export interface TeamMember {
  name: string;
  role: string;
  /** Real LinkedIn profile URL — placeholder until provided. */
  linkedinHref: string;
  /** Real WhatsApp chat URL (wa.me/<digits>) — placeholder until provided. */
  whatsappHref: string;
  /** Short blurb — keep factual; omit rather than invent. */
  blurb: string;
}

export const TEAM: TeamMember[] = [
  {
    name: "Deewanshu Anand",
    role: "Director",
    linkedinHref: "https://www.linkedin.com/in/REPLACE_WITH_PROFILE",
    whatsappHref: "https://wa.me/000000000000",
    blurb: "Leads DR-Chem’s vision, partnerships and growth across markets.",
  },
  {
    name: "Jaskaran Singh",
    role: "Manager",
    linkedinHref: "https://www.linkedin.com/in/REPLACE_WITH_PROFILE",
    whatsappHref: "https://wa.me/000000000000",
    blurb: "Oversees operations, supply and day-to-day client coordination.",
  },
  {
    name: "Simran Kaur",
    role: "Marketing Executive",
    linkedinHref: "https://www.linkedin.com/in/REPLACE_WITH_PROFILE",
    whatsappHref: "https://wa.me/000000000000",
    blurb: "Drives outreach, enquiries and client communication for DR-Chem.",
  },
];

/** Lowercase alias for the same data — keeps page imports readable and stable. */
export const team = TEAM;