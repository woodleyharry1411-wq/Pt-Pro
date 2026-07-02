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
        <a href="/trainer/dashboard" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>⚡</div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 15, color: C.text, letterSpacing: -.3 }}>PT Pro</span>
            <span style={{ fontSize: 11, color: C.muted, marginLeft: 8, fontWeight: 500 }}>Trainer</span>
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
