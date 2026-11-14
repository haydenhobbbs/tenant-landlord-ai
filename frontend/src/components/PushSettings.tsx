"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { currentPushSubscription, pushAccessToken, unsubscribeCurrentDevice, vapidKeyBytes } from "@/lib/pushClient";

type State = "loading" | "off" | "on" | "unsupported" | "demo" | "unconfigured" | "install";

export function PushSettings() {
  const [state, setState] = useState<State>("loading");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState("unsupported");
        return;
      }
      const token = await pushAccessToken();
      if (!token) {
        setState("demo");
        return;
      }
      const isIphone = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches
        || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (isIphone && !isStandalone) {
        setState("install");
        return;
      }
      try {
        const response = await fetch("/api/push/config", { cache: "no-store" });
        const config = await response.json();
        if (!active) return;
        if (!config.publicKey) {
          setState("unconfigured");
          return;
        }
        setPublicKey(config.publicKey);
        await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        if (active) setState((await currentPushSubscription()) ? "on" : "off");
      } catch {
        if (active) setError("Could not check notification settings. Please try again.");
      }
    }
    void check();
    return () => { active = false; };
  }, []);

  async function enable() {
    if (!publicKey) return;
    setBusy(true);
    setError("");
    let subscription: PushSubscription | null = null;
    let created = false;
    try {
      const token = await pushAccessToken();
      if (!token) throw new Error("Sign in to turn on notifications.");
      if (Notification.permission === "denied") throw new Error("Notifications are blocked in your phone settings.");
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKeyBytes(publicKey),
        });
        created = true;
      }
      const response = await fetch("/api/push/subscriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save this device.");
      setState("on");
    } catch (failure) {
      if (created) await subscription?.unsubscribe();
      setError(failure instanceof Error ? failure.message : "Could not turn on notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError("");
    try {
      await unsubscribeCurrentDevice();
      setState("off");
    } catch {
      setError("Could not turn off notifications. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const hint: Record<State, string> = {
    loading: "Checking this device…",
    off: "Get repair updates on this device, even when Tenly is closed.",
    on: "Notifications are on for this device.",
    unsupported: "This browser does not support push notifications.",
    demo: "Sign in with a real account to get phone notifications. Demo accounts stay in this browser.",
    unconfigured: "Phone notifications are not configured for this deployment yet.",
    install: "On iPhone, add Tenly to your Home Screen, open it there, then return to Settings.",
  };

  return (
    <section aria-labelledby="phone-notifications" className="space-y-4">
      <h2 id="phone-notifications" className="text-2xl">Phone notifications</h2>
      <div className="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <p className="text-base text-muted">{hint[state]}</p>
        {(state === "on" || state === "off") && (
          <Button
            size="md"
            variant={state === "on" ? "secondary" : "primary"}
            icon={<Bell aria-hidden />}
            disabled={busy}
            onClick={state === "on" ? disable : enable}
          >
            {state === "on" ? "Turn off on this device" : "Turn on notifications"}
          </Button>
        )}
        {error && <p role="alert" className="text-base text-danger-ink">{error}</p>}
      </div>
    </section>
  );
}
