"use client";

import { useEffect, useState } from "react";
import { timeZoneFor } from "@/lib/timezone";

export function PropertyLocalTime({ state, detail = false }: { state: string; detail?: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, []);
  const time = now?.toLocaleTimeString("en-US", { timeZone: timeZoneFor(state), hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  return <span>{time ? (detail ? `Local time: ${time}` : `It’s ${time} there`) : "Loading local time…"}</span>;
}
