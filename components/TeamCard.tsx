import type { TeamMember } from "@/app/data/team";
import { LinkedInIcon, WhatsAppIcon } from "@/components/icons";

/**
 * Team member card. LinkedIn + WhatsApp icons are real brand marks; hrefs
 * point at the placeholder URLs in app/data/team.ts until real ones exist.
 */
export function TeamCard({ member }: { member: TeamMember }) {
  return (
    <div className="flex flex-col rounded-xl border border-ink-100 bg-white p-5 shadow-card">
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-jade-100 text-[22px] font-bold text-jade-800"
        aria-hidden="true"
      >
        {member.name
          .split(" ")
          .filter(Boolean)
          .map((part) => part[0])
          .slice(0, 2)
          .join("")}
      </div>

      <h3 className="mt-3 text-center text-[16.5px] font-semibold text-ink-900">
        {member.name}
      </h3>

      <p className="mt-0.5 text-center text-[13.5px] font-medium text-jade-700">
        {member.role}
      </p>

      <p className="mt-2.5 text-center text-[13px] leading-relaxed text-ink-500">
        {member.blurb}
      </p>

      <div className="mt-4 flex items-center justify-center gap-2.5">
        <a
          href={member.linkedinHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${member.name} on LinkedIn`}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-ink-200 text-[#0A66C2] hover:bg-[#EAF2FE]"
        >
          <LinkedInIcon className="h-5 w-5" />
        </a>

        <a
          href={member.whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Message ${member.name} on WhatsApp`}
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#25D366] text-white hover:bg-[#1FC95D]"
        >
          <WhatsAppIcon className="h-5 w-5" />
        </a>
      </div>
    </div>
  );
}

export default TeamCard;

