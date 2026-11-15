"use client";

// 👤 TENANT: the conversation with your landlord. A chat-app style header
// (who you're talking to), quick replies to save typing, and repair requests
// shown as cards that link back to your repairs.

import { useEffect, useState } from "react";
import { ChatThread, PHONE_CHAT_PANEL } from "@/components/ChatThread";
import { useAuth } from "@/lib/auth";
import { authFetch } from "@/lib/authFetch";
import type { Lease } from "@/lib/types";

const QUICK_REPLIES = ["Thank you!", "When will they come?", "I'll be home", "That time works for me", "Can we pick another time?"];

export default function TenantMessagesPage() {
  const { user } = useAuth();
  const [landlord, setLandlord] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const qs = new URLSearchParams({ tenantId: user.id, name: user.name, unit: user.unit ?? "" });
    authFetch(`/api/lease?${qs}`)
      .then((r) => (r.ok ? (r.json() as Promise<Lease>) : null))
      .then((l) => setLandlord(l?.landlordName ?? null))
      .catch(() => {});
  }, [user]);

  if (!user) return null;

  const name = landlord || "Your landlord";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`mx-auto flex max-w-3xl flex-col md:space-y-5 ${PHONE_CHAT_PANEL}`}>
      {/* Who you're talking to */}
      <header className="flex shrink-0 items-center gap-3 sm:gap-4">
        <span
          data-role="landlord"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-accent font-[family-name:var(--font-heading)] text-base sm:size-14 sm:text-xl font-semibold text-on-accent"
          aria-hidden
        >
          {initials}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[1.4rem] leading-tight font-semibold sm:text-[1.9rem]">{name}</h1>
          <p className="truncate text-[0.85rem] text-muted sm:text-lg">Your landlord · repairs, visits, or anything else</p>
        </div>
      </header>
      <ChatThread
        tenantId={user.id}
        me={{ id: user.id, role: "tenant", name: user.name }}
        otherName={landlord ? landlord.split(" ")[0] : "your landlord"}
        quickReplies={QUICK_REPLIES}
        requestsHref="/tenant#repairs"
      />
    </div>
  );
}
