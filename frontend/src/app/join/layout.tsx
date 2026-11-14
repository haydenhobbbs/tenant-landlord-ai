import { Suspense } from "react";

// The invite page reads the code from the URL and checks login in the browser,
// so it can't render instantly from a prefetch. Tell Next.js that's expected.
export const instant = false;

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p role="status" className="pt-4 text-lg text-muted">Checking your invite…</p>}>{children}</Suspense>;
}
