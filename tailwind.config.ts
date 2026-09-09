import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand — jade / emerald. Corporate, precise, trustworthy.
        jade: {
          50: "#EFF8F3",
          100: "#DBF0E4",
          200: "#B7E0CD",
          300: "#8ECDB2",
          400: "#58AC8F",
          500: "#33907A",
          600: "#1E7360",
          700: "#175E4F",
          800: "#11493D",
          900: "#0B362C",
          950: "#06261F",
        },
        emerald: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
          950: "#023A2F",
        },
        // Dark neutrals for text, surface and section backgrounds.
        ink: {
          50: "#F6F7F9",
          100: "#ECEEF2",
          200: "#D9DDE4",
          300: "#B9C0CA",
          400: "#98A1AE",
          500: "#77808D",
          600: "#57616E",
          700: "#3B4552",
          800: "#27303D",
          900: "#1A222C",
          950: "#10161D",
        },
        // Warm off-white surface (paper) — "premium corporate" alternative to raw white.
        paper: {
          50: "#FDFCF9",
          100: "#FBFAF6",
          200: "#F5F2EA",
          300: "#EDE8DC",
        },
        // Restrained yellow accent — used VERY sparingly.
        brass: {
          300: "#E9C97E",
          400: "#DEB45C",
          500: "#CF9E3E",
          600: "#B7872B",
          700: "#9C6F22",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(16,24,30,.08), 0 6px 16px rgba(16,24,30,.06)",
        "card-lg": "0 2px 6px rgba(16,24,30,.10), 0 14px 28px rgba(16,24,30,.08)",
        focus: "0 0 0 3px rgba(30,115,96,.28)",
      },
      maxWidth: {
        readable: "68ch",
      },
    },
  },
  plugins: [],
};

export default config;