"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { registerPushWorker } from "@/lib/push/register";
import { getBrowserSupabase } from "@/lib/supabaseBrowser";

type PushState = "checking" | "off" | "on" | "blocked" | "unsupported";
const DEVICE_USER = "tenly:push-user";
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const decoded = window.atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

async function saveSubscription(userId: string, subscription: PushSubscription) {
  const session = await getBrowserSupabase()?.auth.getSession();
  const token = session?.data.session?.access_token;
  const response = await fetch("/api/push/subscribe", {
    method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ userId, subscription: subscription.toJSON() }),
  });
  if (!response.ok) throw new Error("Subscription could not be saved");
}

export function PushToggle() {
  const { user } = useAuth();
  const [state, setState] = useState<PushState>("checking");
  const [iosHint, setIosHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function check() {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      const standalone = window.matchMedia("(display-mode: standalone)").matches
        || (navigator as Navigator & { standalone?: boolean }).standalone;
      if (active) setIosHint(ios && !standalone);
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || !window.isSecureContext) {
        if (active) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (active) setState("blocked");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        // Only report "on" after this account's subscription is saved. Re-save
        // on reload so the no-database demo recovers after a server restart.
        if (subscription && user && publicKey && localStorage.getItem(DEVICE_USER) === user.id) {
          await saveSubscription(user.id, subscription);
          if (active) setState("on");
        } else if (active) setState("off");
      } catch {
        if (active) {
          setState("off");
          setError("We couldn't check your phone notifications. Try again.");
        }
      }
    }
    void check();
    window.addEventListener("focus", check);
    return () => { active = false; window.removeEventListener("focus", check); };
  }, [user]);

  async function toggle() {
    if (!user || busy) return;
    setBusy(true);
    setError("");
    try {
      if (state === "on") {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          const response = await fetch("/api/push/subscribe", {
            method: "DELETE", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          if (!response.ok) throw new Error("Subscription could not be removed");
          await subscription.unsubscribe();
        }
        localStorage.removeItem(DEVICE_USER);
        setState("off");
      } else {
        // Ask directly from the button click, before awaiting worker setup (iOS).
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "blocked" : "off");
          return;
        }
        const registration = await registerPushWorker();
        const subscription = await registration.pushManager.getSubscription()
          ?? await registration.pushManager.subscribe({
            userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey!),
          });
        await saveSubscription(user.id, subscription);
        localStorage.setItem(DEVICE_USER, user.id);
        setState("on");
      }
    } catch {
      setError("We couldn't change your phone notifications. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || !user || state === "checking" || state === "blocked"
    || state === "unsupported" || iosHint || !publicKey;

  return (
    <section aria-labelledby="phone-notifications" className="space-y-4">
      <h2 id="phone-notifications" className="text-2xl">Phone notifications</h2>
      <p className="text-lg text-muted">Get messages and repair updates even when Tenly is closed.</p>
      <div role="status" className="text-base text-muted">
        {state === "checking" && "Checking this device…"}
        {state === "on" && "Phone notifications are on for this account on this device."}
        {state === "off" && (publicKey ? "Phone notifications are off on this device." : "Phone notifications aren't ready yet. You can still read updates in Tenly.")}
        {state === "blocked" && "Notifications are blocked. Allow notifications for Tenly in your browser or phone settings, then return here."}
        {state === "unsupported" && "Phone notifications aren't supported in this browser. You can still read updates in Tenly."}
      </div>
      {iosHint && <p className="text-base text-muted">On iPhone: tap Share, then Add to Home Screen, and open Tenly from your Home Screen first.</p>}
      <Button
        variant={state === "on" ? "secondary" : "primary"}
        icon={<Bell aria-hidden />}
        disabled={disabled}
        aria-busy={busy}
        onClick={toggle}
        className="w-full sm:w-auto"
      >
        {state === "on" ? "Turn off phone notifications" : "Turn on phone notifications"}
      </Button>
      <p className="min-h-7 text-base text-danger-ink" role="alert">{error}</p>
    </section>
  );
}
