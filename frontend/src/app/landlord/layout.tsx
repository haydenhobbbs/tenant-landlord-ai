import { Suspense } from "react";
import { LandlordShell } from "@/components/landlord/LandlordShell";

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p role="status">Loading landlord workspace…</p>}><LandlordShell>{children}</LandlordShell></Suspense>;
}
