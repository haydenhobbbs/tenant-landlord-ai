import type { Metadata, Viewport } from "next";
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

// iPhone: let the page reach the screen edges so env(safe-area-inset-*) works.
// The top bar and bottom tabs pad themselves clear of the notch, home bar and
// Safari's bottom toolbar (Nermin).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Tenly · Tenant ↔ Landlord AI",
  description: "Tenants report issues, AI finds contractors, landlords approve.",
  manifest: "/manifest.webmanifest",
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
          <ServiceWorkerRegistration />
          <MessageAlertsProvider>
          {/* NavBar reads the URL (usePathname), so Next 16 wants it in Suspense. */}
          <Suspense fallback={<div className="h-[69px] border-b border-navy-line bg-navy" />}>
            <NavBar />
          </Suspense>
          {/* On phones, leave room at the bottom for the tab bar (BottomTabBar sets html.has-tabbar). */}
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-10 max-md:[html.has-tabbar_&]:pb-[calc(8rem+env(safe-area-inset-bottom))]">
            {children}
          </main>
          </MessageAlertsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
