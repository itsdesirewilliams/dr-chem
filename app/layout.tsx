import type { Metadata, Viewport } from "next";
import { Anek_Devanagari, Source_Serif_4 } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchOverlay } from "@/components/SearchOverlay";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

/* Core type system — Anek Devanagari for UI/body, Source Serif 4 used
   sparingly for editorial display headings. Exposed as CSS variables that the
   Tailwind font-sans / font-serif utilities consume. */
const anek = Anek_Devanagari({
  subsets: ["latin", "devanagari"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Chemical & Laboratory Products`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "DR Chemicals supplies high-quality industrial, agricultural, mining and water-treatment chemicals. Search the catalogue by name, CAS, formula or article number.",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1E7360",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anek.variable} ${sourceSerif.variable}`}>
      <body className="flex min-h-dvh flex-col bg-paper-100 font-sans text-ink-900 antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[70] focus:bg-jade-600 focus:text-white focus:rounded-lg focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <Header />
        <SearchOverlay />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}