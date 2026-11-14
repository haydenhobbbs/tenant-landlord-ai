"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { homeFor, useAuth, type Role } from "@/lib/auth";

// Wrap a section of the app so only the right role can see it.
// Signed out → /login. Wrong role → their own home screen.
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role !== role) router.replace(homeFor(user.role));
  }, [user, loading, role, router]);

  const blocked = loading || !user || user.role !== role;

  // Children stay rendered (just hidden) while we check, so Next.js can still
  // prerender and validate the page. Pages must cope with `user` being null.
  return (
    <>
      {blocked && (
        <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true">
          <div className="size-8 animate-spin rounded-full border-3 border-line border-t-accent" />
          <span className="sr-only">Loading</span>
        </div>
      )}
      <div hidden={blocked}>{children}</div>
    </>
  );
}
