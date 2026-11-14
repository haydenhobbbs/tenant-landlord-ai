// Adapted from the supplied wrench-house-logo.svg. The shared role tokens
// color the same mark for tenant, landlord, and neutral pages.
export function TenlyLogo() {
  return (
    <svg
      className="size-9 shrink-0 transition-transform duration-500 ease-(--ease-out) group-hover/logo:-rotate-12"
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
          <circle cx="0" cy="62" r="13" fill="black" />
        </mask>
        <g id="tenly-logo-wrench" mask="url(#tenly-logo-cut)">
          <rect x="-27" y="20" width="54" height="360" rx="27" />
          <path d="M -27 300 L 27 300 L 85 355 L -85 355 Z" />
          <circle cx="0" cy="430" r="125" />
        </g>
      </defs>
      <rect x="-330" y="-330" width="660" height="660" rx="140" fill="var(--accent)" />
      <g transform="translate(14,14) scale(0.82) rotate(45) translate(0,-287)" fill="var(--accent-ink)">
        <use href="#tenly-logo-wrench" />
      </g>
      <g transform="scale(0.82) rotate(45) translate(0,-287)">
        <g fill="var(--on-accent)"><use href="#tenly-logo-wrench" /></g>
        <rect x="-18" y="454" width="36" height="36" rx="4" fill="var(--accent-ink)" transform="rotate(-45 0 430)" />
      </g>
    </svg>
  );
}
