import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Shared buttons. Every screen should have ONE "primary" button: the main thing
// to do. Everything else is "secondary" or "quiet".
//
//   <Button>Send</Button>
//   <Button variant="secondary" size="md">Cancel</Button>
//   <ButtonLink href="/tenant/report">Report a problem</ButtonLink>
//
// Colors follow the nearest data-role="tenant|landlord|contractor" wrapper.

type Variant = "primary" | "secondary" | "quiet" | "danger";
type Size = "md" | "lg";

const base =
  "group/btn inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-xl font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-(--ease-out) active:scale-[0.98] active:duration-75 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-300 [&_svg]:ease-(--ease-out)";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent border border-accent-edge shadow-card hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-raised active:translate-y-0 hover:[&_svg]:scale-110",
  secondary: "bg-surface text-fg border border-line-strong hover:bg-sunken",
  quiet: "text-accent-ink hover:bg-accent-soft",
  danger: "bg-surface text-danger-ink border border-danger/50 hover:bg-danger-soft",
};

const sizes: Record<Size, string> = {
  md: "min-h-12 px-5 text-base",
  lg: "min-h-15 px-7 text-lg",
};

export function buttonClass(variant: Variant = "primary", size: Size = "lg", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

interface Common {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children: ReactNode;
}

export function Button({
  variant,
  size,
  icon,
  children,
  className = "",
  type = "button",
  ...rest
}: Common & ComponentProps<"button">) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  icon,
  children,
  className = "",
  ...rest
}: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
