"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ErrorNote } from "@/components/ui/Field";
import type { InviteProperty } from "@/lib/types";

const subscribe = () => () => {};
const getOrigin = () => window.location.origin;
const serverOrigin = () => "";

// Hayden's invite code, copy and native sharing UI, shared by the list and detail.
export function PropertyInvite({ property: p }: { property: Pick<InviteProperty, "address" | "inviteCode"> }) {
  const origin = useSyncExternalStore(subscribe, getOrigin, serverOrigin);
  const link = `${origin}/join/${encodeURIComponent(p.inviteCode)}`;
  const canShare = !!origin && typeof navigator.share === "function";
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy(what: "link" | "code") {
    setError("");
    try {
      await navigator.clipboard.writeText(what === "link" ? link : p.inviteCode);
      setCopied(what);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Couldn't copy. Select the code or link above and copy it by hand.");
    }
  }

  async function share() {
    setError("");
    try {
      await navigator.share({
        title: "Join your home on Tenly",
        text: `Report repairs for ${p.address} on Tenly. Use code ${p.inviteCode} or open this link:`,
        url: link,
      });
    } catch (reason) {
      if (!(reason instanceof Error && reason.name === "AbortError")) setError("Couldn't share. Copy the invite link instead.");
    }
  }

  return <div className="space-y-2 rounded-lg bg-landlord-soft p-3.5">
    <div><p className="text-sm font-semibold text-muted">Invite code</p><p className="break-all font-mono text-xl font-bold tracking-wider">{p.inviteCode}</p></div>
    <p className="break-all text-sm text-muted">{link}</p>
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="md" icon={copied === "link" ? <Check aria-hidden /> : <Copy aria-hidden />} onClick={() => void copy("link")}>{copied === "link" ? "Link copied" : "Copy invite link"}</Button>
      <Button variant="secondary" size="md" onClick={() => void copy("code")}>{copied === "code" ? "Code copied" : "Copy code"}</Button>
      {canShare && <Button variant="secondary" size="md" icon={<Share2 aria-hidden />} onClick={() => void share()}>Share</Button>}
    </div>
    <span role="status" className="sr-only">{copied ? `${copied === "link" ? "Link" : "Code"} copied` : ""}</span>
    <ErrorNote>{error}</ErrorNote>
  </div>;
}
