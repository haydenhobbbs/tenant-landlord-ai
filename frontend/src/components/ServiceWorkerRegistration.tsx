"use client";

import { useEffect } from "react";
import { registerPushWorker } from "@/lib/push/register";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) void registerPushWorker().catch(() => {});
  }, []);
  return null;
}
