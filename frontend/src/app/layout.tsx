import type { Metadata } from "next";
import { Suspense } from "react";
import { Outfit, Rubik } from "next/font/google";
import { MessageAlertsProvider } from "@/components/MessageAlerts";
import NavBar from "@/components/NavBar";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { prefsInitScript } from "@/lib/preferences";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

// Design: proposal C. Rubik for reading (rounded, clear at large sizes for our
// 40–60 audience), Outfit for headings.
const body = Rubik({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const heading = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Tenly · Tenant ↔ Landlord AI",
  description: "Tenants report issues, AI finds contractors, landlords approve.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Tenly", statusBarStyle: "default" },
  icons: { apple: "/icon-192.png" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: prefsInitScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-bg font-sans text-fg">
        <AuthProvider>
          <ServiceWorkerRegistration />
          <MessageAlertsProvider>
          {/* NavBar reads the URL (usePathname), so Next 16 wants it in Suspense. */}
          <Suspense fallback={<div className="h-[69px] border-b border-navy-line bg-navy" />}>
            <NavBar />
          </Suspense>
          <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8">{children}</main>
          </MessageAlertsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
