import type { SVGProps } from "react";

/**
 * Inline SVG icon set. No icon-font or image dependencies — every mark is a
 * real, recognizable vector path (including the LinkedIn and WhatsApp brands)
 * so the site stays fast, dependency-free and consistent.
 */

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function base(props: IconProps): IconProps {
  return {
    viewBox: "0 0 24 24",
    width: 24,
    height: 24,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  };
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {/* Magnifying glass: lens + handle */}
      <circle cx="11" cy="10" r="7" />
      <path d="M14.8 16.2 L6 22.5" />
      <line x1="6" y1="22.5" x2="4.5" y2="22.8" />
      <path d="M13.8 14.8 L11.6 17" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export function ChevronIcon(props: IconProps & { direction?: "up" | "down" | "left" | "right" }) {
  const { direction = "right", ...rest } = props;
  const d =
    direction === "right"
      ? "M9 5 L15 11 M15 11 L15 17 M15 11 L17 9"
      : direction === "left"
        ? "M15 5 L9 11 M9 11 L9 17 M9 11 L7 9"
        : direction === "up"
          ? "M5 15 L11 9 M11 15 L17 15"
          : "M5 9 L11 15 M11 9 L17 9";
  return (
    <svg {...base(rest)}>
      <path d={d} strokeLinecap="square" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <line x1="4" y1="12" x2="15" y2="12" />
      <line x1="15" y1="12" x2="20" y2="7" />
      <line x1="15" y1="12" x2="20" y2="17" />
    </svg>
  );
}

export function FlaskIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 L12 9 L10.2 9 Q10 9 L10 12 C9 14 8 15 9 16 L11 16 L12 14 L14 12 Q15 10 16 8.6 L12 3 Z" />
      <line x1="9" y1="13" x2="14" y2="13" />
    </svg>
  );
}

export function VolumeFlaskIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 L12 8 L12 8 L12 13 M12 8 L16 12 L13 16 L8 15 L7.4 11" />
      <line x1="8" y1="13.5" x2="15" y2="13.5" />
    </svg>
  );
}

/** LinkedIn brand mark ("in" monogram in rounded square). */
export function LinkedInIcon(props: IconProps) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      aria-hidden="true"
      className={className}
      {...rest}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" fill="currentColor" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#ffffff"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        in
      </text>
    </svg>
  );
}

/** WhatsApp brand mark (handset in speech bubble) — clean, deterministic, scales well. */
export function WhatsAppIcon(props: IconProps) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {/* Speech bubble (rounded body + pointer tail, bottom-left) */}
      <rect
        x="6"
        y="4.5"
        width="13.5"
        height="12.5"
        rx="5"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M8.4 16.8 L9.6 17 L5.8 12.4 L8.8 16.4 Z"
        fill="currentColor"
        stroke="none"
      />
      {/* Handset — filled white curl, reads as receiver at small sizes */}
      <path
        d="M9.8 8.4 C8.2 10 8.8 11.8 10 13.6 C11.4 15.2 13.2 15.4 14.6 13.8 C16 12.2 15.8 9.8 14.2 8.6 Q12.6 7.6 11 7.8 Q10 7.9 9.8 8.4 Z"
        fill="#ffffff"
        stroke="none"
      />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M6.5 4 L12 9.5 L17.5 4" />
      <path d="M6.5 20 L12 14.5 L17.5 20" />
    </svg>
  );
}

export function PhoneIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 3 Q7 10 10 14 Q12 18 17 18 Q20 13 20 8 Q18 3 18 2 L21 2 Q21 5 18 6 L17 8 14 8 12 10 L10 10 Z" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3 L6 21 L18 21 L18 3 M6 21 L12 16 L18 21 M10 3 L14 3 M8.5 12 L15.5 12" />
    </svg>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 3 L20 3 L20 21 L4 21 M5.5 6 L18.5 6 M5.5 9.5 L18.5 9.5 M5.5 13 L18.5 13 M5.5 16.5 L18.5 16.5" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 4 L9 12 L14 7 L19 12" strokeLinejoin="round" />
    </svg>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4 L20 20 M4 8 L16 8 M4 12 L12 12 M4 16 L8 16" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 L14.5 6.5 L18 5.5 L21 8 L20 12 L21 16 L18 20 L14 20 L10 20 L7.5 16 L8 12 L4.5 16 L3 12 L4.5 8 L6 5.5 L9 6 L12 8.5 L13.5 7 L16 9 L15 6.5 Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
