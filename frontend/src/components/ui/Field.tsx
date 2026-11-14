import type { ComponentProps, ReactNode } from "react";

// Form fields with a visible label above (never placeholder-only labels).
//
//   <Field label="Your email" hint="We'll never share it.">
//     <Input type="email" ... />
//   </Field>

export const inputClass =
  "w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-lg text-fg placeholder:text-muted/80 transition-colors focus:border-accent-edge focus:outline-none focus:ring-3 focus:ring-accent-edge/30 disabled:opacity-60";

export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <span className="block text-base font-semibold">{label}</span>
      {children}
      {hint && !error && <span className="block text-sm text-muted">{hint}</span>}
      {error && <span className="block text-sm font-medium text-danger-ink">{error}</span>}
    </label>
  );
}

export function Input({ className = "", ...rest }: ComponentProps<"input">) {
  return <input className={`${inputClass} ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: ComponentProps<"textarea">) {
  return <textarea className={`${inputClass} min-h-36 resize-y leading-relaxed ${className}`} {...rest} />;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-base font-medium text-danger-ink">
      {children}
    </p>
  );
}
