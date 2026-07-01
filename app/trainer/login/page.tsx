"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { C } from "@/lib/colours";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { router.push("/trainer/dashboard"); router.refresh(); }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{
        padding: "0 32px", height: 64,
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: `1px solid ${C.border}`, background: C.surface,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        }}>⚡</div>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: -.3 }}>PT Pro</span>
      </header>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 400, animation: "fadeUp .4s ease" }}>

          <div style={{ marginBottom: 40 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -.5, marginBottom: 8 }}>Welcome back</h1>
            <p style={{ color: C.muted, fontSize: 15 }}>Sign in to your trainer account</p>
          </div>

          <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Field label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Field label="Password"      type="password" value={password} onChange={setPassword} placeholder="••••••••" />

            {error && (
              <div style={{
                background: `${C.danger}12`, border: `1px solid ${C.danger}30`,
                borderRadius: 10, padding: "12px 16px", fontSize: 14, color: C.danger,
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              background: C.accent, color: "#000", border: "none", borderRadius: 12,
              padding: "14px", fontWeight: 700, fontSize: 15, marginTop: 4,
              opacity: loading ? 0.7 : 1, letterSpacing: -.2,
            }}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: C.muted }}>
            <a href="/" style={{ color: C.muted, textDecoration: "underline" }}>← Client portal</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, placeholder }: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <label style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required
        style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: "12px 16px", color: C.text, fontSize: 15, outline: "none",
          transition: "border-color .15s",
        }}
        onFocus={e => (e.target.style.borderColor = C.accent)}
        onBlur={e  => (e.target.style.borderColor = C.border)}
      />
    </div>
  );
}
