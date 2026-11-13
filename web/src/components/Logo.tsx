// Sublee mark: two overlapping circles (your view and a second opinion). Where they meet, the lens,
// is the sealed space where your case is read; it's the only filled part.
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <clipPath id="sl-a"><circle cx="12" cy="16" r="9" /></clipPath>
      </defs>
      <rect x="0.5" y="0.5" width="31" height="31" rx="9.5" fill="#0F1716" stroke="#2B3D3A" />
      <circle cx="12" cy="16" r="9" stroke="#E9F2EF" strokeWidth="1.6" />
      <circle cx="20" cy="16" r="9" stroke="#E9F2EF" strokeWidth="1.6" />
      <circle cx="20" cy="16" r="9" fill="#6FE3C1" clipPath="url(#sl-a)" />
      <circle cx="16" cy="16" r="1.6" fill="#04211A" />
    </svg>
  );
}

export function Logo() {
  return (
    <>
      <LogoMark />
      <span>sublee</span>
    </>
  );
}
