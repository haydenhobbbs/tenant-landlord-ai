import { Suspense } from "react";
import { LandlordShell } from "@/components/landlord/LandlordShell";
import { RequireRole } from "@/components/RequireRole";

// Pages here wait for login (checked in the browser), so they can't render
// instantly from a prefetch. Tell Next.js that's expected.
export const instant = false;

// Everything under /landlord: landlords only (RequireRole, Nermin), baby-blue
// accent (data-role), inside Teammate B's landlord workspace shell.
export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-role="landlord">
      <RequireRole role="landlord">
        <Suspense fallback={<p role="status">Loading landlord workspace…</p>}>
          <LandlordShell>{children}</LandlordShell>
        </Suspense>
      </RequireRole>
    </div>
  );
}
