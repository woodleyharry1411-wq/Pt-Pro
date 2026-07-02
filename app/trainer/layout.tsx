import { C } from "@/lib/colours";
import { LogoIcon } from "@/components/Logo";
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
          <LogoIcon size={32} />
          <div>
            <span className="saira" style={{ fontWeight: 800, fontSize: 15, color: C.text, letterSpacing: 1, textTransform: "uppercase" }}>PT <span style={{ color: C.accent }}>PRO</span></span>
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
