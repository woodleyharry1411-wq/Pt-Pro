export function LogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="56" height="56" rx="10" fill="#0A0C14"/>

      {/* Full white P letterform */}
      {/* Stem */}
      <rect x="8" y="7" width="13" height="42" fill="white"/>
      {/* Top arm */}
      <rect x="8" y="7" width="32" height="13" fill="white"/>
      {/* Bowl — right curved side */}
      <rect x="33" y="7" width="14" height="27" rx="7" fill="white"/>
      {/* Bowl — bottom crossbar */}
      <rect x="8" y="30" width="38" height="10" fill="white"/>

      {/* Blue diagonal slash — wide parallelogram from upper-right to lower-left */}
      <polygon points="31,7 48,7 24,49 7,49" fill="#3B6EF8"/>

      {/* Re-draw white stem on top so it stays clean */}
      <rect x="8" y="7" width="13" height="42" fill="white"/>
      {/* Re-draw a sliver of the top-left of the bowl so the top stays white above the slash */}
      <rect x="8" y="7" width="24" height="13" fill="white"/>
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
