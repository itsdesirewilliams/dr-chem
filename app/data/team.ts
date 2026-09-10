/**
 * DR Chemicals team directory.
 *
 * Source: provided by the DR Chemicals team (names + roles). Social/contact URLs
 * are PLACEHOLDERS by design — replace the href strings below when real
 * profiles/numbers are provided, and set `image` to a local portrait path
 * (e.g. "/team/deewanshu.jpg" in /public) when real portraits exist. The UI
 * renders whatever is in this file; no component changes are needed.
 */

export interface TeamMember {
  name: string;
  role: string;
  /** Real LinkedIn profile URL — placeholder until provided. */
  linkedinHref: string;
  /** Real WhatsApp chat URL (wa.me/<digits>) — placeholder until provided. */
  whatsappHref: string;
  /** Local portrait path under /public — null renders the neutral placeholder. */
  image: string | null;
}

export const TEAM: TeamMember[] = [
  {
    name: "Deewanshu Anand",
    role: "The Director",
    linkedinHref: "https://www.linkedin.com/in/REPLACE_WITH_PROFILE",
    whatsappHref: "https://wa.me/000000000000",
    image: null,
  },
  {
    name: "Jaskaran Singh",
    role: "The Manager",
    linkedinHref: "https://www.linkedin.com/in/REPLACE_WITH_PROFILE",
    whatsappHref: "https://wa.me/000000000000",
    image: null,
  },
  {
    name: "Simran Kaur",
    role: "Marketing Executive",
    linkedinHref: "https://www.linkedin.com/in/REPLACE_WITH_PROFILE",
    whatsappHref: "https://wa.me/000000000000",
    image: null,
  },
];

/** Lowercase alias for the same data — keeps page imports readable and stable. */
export const team = TEAM;