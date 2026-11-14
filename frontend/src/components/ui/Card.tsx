import type { ComponentProps } from "react";

// A plain surface. Don't put a Card inside a Card: use <Divider /> or spacing.
//
//   <Card>...</Card>
//   <Card tone="contractor">Rapid Rooter Plumbing · $180</Card>   // contractor info
//   <Card as="li">...</Card>

type Tone = "plain" | "soft" | "contractor";

const tones: Record<Tone, string> = {
  plain: "bg-surface border border-line shadow-card",
  soft: "bg-accent-soft border border-transparent",
  contractor: "bg-contractor-soft border border-contractor/25",
};

export function Card({
  tone = "plain",
  className = "",
  as: Tag = "div",
  ...rest
}: { tone?: Tone; as?: "div" | "section" | "article" | "li" } & ComponentProps<"div">) {
  return <Tag className={`rounded-2xl p-6 ${tones[tone]} ${className}`} {...(rest as object)} />;
}

export function Divider({ className = "" }: { className?: string }) {
  return <hr className={`border-line ${className}`} />;
}
