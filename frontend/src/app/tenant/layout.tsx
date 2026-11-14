import { RequireRole } from "@/components/RequireRole";

// Pages here wait for login (checked in the browser), so they can't render
// instantly from a prefetch. Tell Next.js that's expected.
export const instant = false;

// Everything under /tenant: tenants only, forest-green accent.
export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-role="tenant">
      <RequireRole role="tenant">{children}</RequireRole>
    </div>
  );
}
