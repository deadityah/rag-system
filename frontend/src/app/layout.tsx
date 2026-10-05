import type { Metadata } from "next";
import { Titillium_Web, Space_Grotesk, Playwrite_AR } from "next/font/google";
import "./globals.css";

// Main writing font (body, chat, buttons, inputs, labels)
const titilliumWeb = Titillium_Web({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

// Headings font
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

// Logo font (Playwrite Argentina)
const playwriteAR = Playwrite_AR({
  variable: "--font-logo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DocuMind — Chat with your documents",
  description: "RAG web app for chatting with PDFs with page-level citations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${titilliumWeb.variable} ${spaceGrotesk.variable} ${playwriteAR.variable} font-body antialiased`}
      >
        {/* Shared SVG displacement filters from reference/liquidglass.md */}
        <svg
          aria-hidden="true"
          className="pointer-events-none fixed -top-[9999px] -left-[9999px] h-0 w-0 opacity-0"
          focusable={false}
        >
          <title>Liquid Glass Effect Filter</title>
          <defs>
            <filter
              id="documind-glass-filter"
              colorInterpolationFilters="sRGB"
              height="200%"
              width="200%"
              x="-50%"
              y="-50%"
            >
              <feTurbulence
                baseFrequency="0.05 0.05"
                numOctaves="1"
                result="turbulence"
                seed="1"
                type="fractalNoise"
              />
              <feGaussianBlur
                in="turbulence"
                result="blurredNoise"
                stdDeviation="2"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="blurredNoise"
                result="displaced"
                scale="30"
                xChannelSelector="R"
                yChannelSelector="B"
              />
              <feGaussianBlur in="displaced" result="finalBlur" stdDeviation="4" />
              <feComposite in="finalBlur" in2="finalBlur" operator="over" />
            </filter>
            <filter
              id="documind-glass-button-filter"
              colorInterpolationFilters="sRGB"
              height="200%"
              width="200%"
              x="-50%"
              y="-50%"
            >
              <feTurbulence
                baseFrequency="0.05 0.05"
                numOctaves="1"
                result="turbulence"
                seed="1"
                type="fractalNoise"
              />
              <feGaussianBlur
                in="turbulence"
                result="blurredNoise"
                stdDeviation="2"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="blurredNoise"
                result="displaced"
                scale="70"
                xChannelSelector="R"
                yChannelSelector="B"
              />
              <feGaussianBlur in="displaced" result="finalBlur" stdDeviation="4" />
              <feComposite in="finalBlur" in2="finalBlur" operator="over" />
            </filter>
          </defs>
        </svg>

        {children}
      </body>
    </html>
  );
}
