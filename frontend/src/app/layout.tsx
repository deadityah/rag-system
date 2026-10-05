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
        {children}
      </body>
    </html>
  );
}
