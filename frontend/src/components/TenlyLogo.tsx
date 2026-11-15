// Adapted from the supplied wrench-house-logo.svg. The shared role tokens
// color the same mark for tenant, landlord, and neutral pages.
// Baby blue is the main Tenly logo; tenants see it in their green (Nermin).
// Wrench thickened and enlarged so it reads at small sizes (Nermin).
// Same design in two colors: light tile, dark wrench, mid-tone second wrench.
const BLUE = { tile: "#9ad8f7", shadow: "#3f8fc0", wrench: "#0c3b5c", window: "#0c3b5c" };
const GREEN = { tile: "#5bd38f", shadow: "#249a5c", wrench: "#0d3b24", window: "#0d3b24" };

export function TenlyLogo({ role }: { role?: string }) {
  const c = role === "tenant" ? GREEN : BLUE;
  return (
    <svg
      className="size-10 shrink-0 transition-transform duration-500 ease-(--ease-out) group-hover/logo:-rotate-12"
      viewBox="-340 -340 680 680"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <mask id="tenly-logo-cut" maskUnits="userSpaceOnUse" x="-400" y="-400" width="1200" height="1200">
          <rect x="-400" y="-400" width="1200" height="1200" fill="white" />
          <g transform="rotate(-45 0 430)" fill="black">
            <polygon points="-68,600 -68,430 -84,430 0,368 84,430 68,430 68,600" />
            <rect x="38" y="374" width="16" height="42" />
          </g>
          <circle cx="0" cy="58" r="22" fill="black" />
        </mask>
        <g id="tenly-logo-wrench" mask="url(#tenly-logo-cut)">
          <rect x="-52" y="0" width="104" height="380" rx="52" />
          <path d="M -52 285 L 52 285 L 124 352 L -124 352 Z" />
          <circle cx="0" cy="430" r="150" />
        </g>
      </defs>
      <rect x="-330" y="-330" width="660" height="660" rx="140" fill={c.tile} />
      <g transform="translate(37,-31) scale(1.02) rotate(45) translate(0,-275)" fill={c.shadow}>
        <use href="#tenly-logo-wrench" />
      </g>
      <g transform="translate(28,-40) scale(1.02) rotate(45) translate(0,-275)">
        <g fill={c.wrench}><use href="#tenly-logo-wrench" /></g>
        <rect x="-24" y="458" width="48" height="48" rx="6" fill={c.window} transform="rotate(-45 0 430)" />
      </g>
    </svg>
  );
}
