import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import ClientProviders from "@/components/ClientProviders";
import SkipLink from "@/components/SkipLink";
import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-public-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sutra · Legal Intelligence Workspace",
  description: "AI-assisted case analysis for advocates and the judiciary",
  icons: {
    icon: "/logo-mark.png",
    apple: "/logo-mark.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${publicSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* Bug #1600 (WCAG 2.1 SC 2.4.1): first focusable element in the
            document, ahead of every header/nav, so the first Tab press can
            bypass the navigation and jump to <main id="main-content">. */}
        <SkipLink />
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
