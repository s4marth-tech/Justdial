import type { Metadata } from "next";
import { Caprasimo, Figtree } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const headingFont = Caprasimo({
  variable: "--font-heading-brand",
  weight: "400",
  subsets: ["latin"],
});

const bodyFont = Figtree({
  variable: "--font-body-brand",
  weight: ["400", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "My Lads — Find local businesses near you",
  description: "Search for verified doctors, lawyers, and accountants near you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      {/* suppressHydrationWarning here too: some browser extensions
          (Grammarly, Bitdefender-style anti-tracker tools, etc.) inject
          attributes like data-gr-ext-installed or bis_skin_checked directly
          onto <body> before React hydrates — a real mismatch on visitors'
          machines that isn't caused by our own markup and can't be avoided
          from our side. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
