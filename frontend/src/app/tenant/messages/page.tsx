"use client";

import { ChatThread } from "@/components/ChatThread";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/auth";

export default function TenantMessagesPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="stagger mx-auto max-w-3xl">
      <PageHeader title="Messages" intro="Talk with your landlord about repairs, visits, or anything else." />
      <ChatThread tenantId={user.id} me={{ id: user.id, role: "tenant", name: user.name }} otherName="your landlord" />
    </div>
  );
}
