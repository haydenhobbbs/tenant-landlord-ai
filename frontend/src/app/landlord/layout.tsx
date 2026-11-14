import { RequireRole } from "@/components/RequireRole";

// Pages here wait for login (checked in the browser), so they can't render
// instantly from a prefetch. Tell Next.js that's expected.
export const instant = false;

// Everything under /landlord: landlords only, baby-blue accent.
// (Teammate B owns the pages in here. This file only handles login + colors.)
export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-role="landlord">
      <RequireRole role="landlord">{children}</RequireRole>
    </div>
  );
}
