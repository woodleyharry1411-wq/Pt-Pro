import { C } from "@/lib/colours";
import LogoutButton from "./LogoutButton";

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <header style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        padding: "0 16px",
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between", height: 64,
      }}>
        <a href="/trainer/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width={32} height={32} style={{ borderRadius: 8 }}>
            <rect width="64" height="64" rx="14" fill="#0F1120"/>
            <path d="M14 48V16H34C40 16 44 20 44 26C44 32 40 36 34 36H24V48H14Z" fill="url(#pGradT)"/>
            <path d="M36 36L48 48" stroke="#3B6EF8" strokeWidth="8" strokeLinecap="round"/>
            <defs><linearGradient id="pGradT" x1="14" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse"><stop stopColor="white"/><stop offset="1" stopColor="#3B6EF8"/></linearGradient></defs>
          </svg>
          <div>
            <span className="saira" style={{ fontWeight: 800, fontSize: 15, color: C.text, letterSpacing: 1, textTransform: "uppercase" }}>PT Pro</span>
            <span style={{ fontSize: 11, color: C.muted, marginLeft: 8, fontWeight: 600 }}>Trainer</span>
          </div>
        </a>
        <LogoutButton />
      </header>
      <main className="trainer-layout" style={{ maxWidth: 960 }}>
        {children}
      </main>
    </div>
  );
}
