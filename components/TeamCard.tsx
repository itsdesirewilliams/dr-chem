import { Linkedin } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons";
import type { TeamMember } from "@/app/data/team";

/**
 * Editorial team profile — a dominant portrait area (in-project placeholder
 * until real portraits are supplied via `member.image`), name, position and
 * exactly two actions: LinkedIn and WhatsApp. No biography copy.
 */
export function TeamCard({ member }: { member: TeamMember }) {
  const initials = member.name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  return (
    <article className="group flex flex-col">
      {/* Portrait area — visually dominant, ready for a real image later */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-ink-200 bg-gradient-to-b from-jade-50 via-paper-100 to-ink-100">
        {member.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.image}
            alt={member.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <span
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center font-serif text-6xl font-semibold tracking-tight text-jade-800/25"
          >
            {initials}
          </span>
        )}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-1 bg-jade-600/0 transition-colors duration-300 group-hover:bg-jade-600/70"
        />
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold leading-snug tracking-tight text-ink-900">
            {member.name}
          </h3>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-jade-700">
            {member.role}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <a
            href={member.linkedinHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${member.name} on LinkedIn`}
            className="grid h-9 w-9 place-items-center rounded-md border border-ink-200 text-[#0A66C2] transition-colors hover:border-[#0A66C2]/50 hover:bg-[#0A66C2]/5"
          >
            <Linkedin className="h-4 w-4" aria-hidden="true" />
          </a>
          <a
            href={member.whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Message ${member.name} on WhatsApp`}
            className="grid h-9 w-9 place-items-center rounded-md border border-ink-200 text-[#1FA855] transition-colors hover:border-[#1FA855]/50 hover:bg-[#1FA855]/5"
          >
            <WhatsAppIcon className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </article>
  );
}

export default TeamCard;

