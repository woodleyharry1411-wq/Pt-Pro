export function LogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="56" height="56" rx="10" fill="#0A0C14"/>
      {/* P stem */}
      <rect x="9" y="9" width="11" height="38" fill="white"/>
      {/* P bowl — top bar */}
      <rect x="9" y="9" width="30" height="10" fill="white"/>
      {/* P bowl — right curve */}
      <rect x="30" y="9" width="10" height="29" rx="5" fill="white"/>
      {/* P bowl — bottom bar */}
      <rect x="9" y="29" width="31" height="9" fill="white"/>
      {/* Blue diagonal slash */}
      <polygon points="30,9 47,9 19,47 2,47" fill="#3B6EF8"/>
      {/* Re-draw stem on top to stay white */}
      <rect x="9" y="9" width="11" height="38" fill="white"/>
    </svg>
  );
}

export function LogoFull({ height = 40 }: { height?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <LogoIcon size={height} />
      <div>
        <div style={{
          fontFamily: "Saira, sans-serif", fontWeight: 800, fontSize: height * 0.5,
          letterSpacing: 2, textTransform: "uppercase" as const, lineHeight: 1,
          color: "white",
        }}>
          PT <span style={{ color: "#3B6EF8" }}>PRO</span>
        </div>
        <div style={{
          fontFamily: "Saira, sans-serif", fontSize: height * 0.2, letterSpacing: 2,
          color: "#6B7199", fontWeight: 600, textTransform: "uppercase" as const, lineHeight: 1, marginTop: 2,
        }}>
          PLAN. TRAIN. PROGRESS.
        </div>
      </div>
    </div>
  );
}
