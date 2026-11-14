import type { Metadata } from "next";
import { Suspense } from "react";
import { Atkinson_Hyperlegible, Lora } from "next/font/google";
import NavBar from "@/components/NavBar";
import { prefsInitScript } from "@/lib/preferences";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

// Atkinson Hyperlegible: designed by the Braille Institute for easy reading,
// which fits our audience (many landlords are 40–60).
const body = Atkinson_Hyperlegible({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// Lora for headings: a warm, bookish serif that reads as "trustworthy person",
// not "tech product".
const heading = Lora({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Tenly · Tenant ↔ Landlord AI",
  description: "Tenants report issues, AI finds contractors, landlords approve.",
  appleWebApp: { capable: true, title: "Tenly", statusBarStyle: "default" },
  icons: { icon: "/icons/tenly.svg", apple: "/icons/tenly-180.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: prefsInitScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-bg font-sans text-fg">
        <AuthProvider>
          {/* NavBar reads the URL (usePathname), so Next 16 wants it in Suspense. */}
          <Suspense fallback={<div className="h-[69px] border-b border-line bg-surface" />}>
            <NavBar />
          </Suspense>
          <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
