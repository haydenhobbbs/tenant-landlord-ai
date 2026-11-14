"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { homeFor, useAuth } from "@/lib/auth";

// On the public home page: if you're already signed in, go straight to your
// own main screen (tenant or landlord) instead of the intro page.
export function SignedInRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user) router.replace(homeFor(user.role));
  }, [user, loading, router]);
  return null;
}
