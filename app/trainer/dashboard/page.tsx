import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { C } from "@/lib/colours";
import DeleteButton from "./DeleteButton";
import type { Client } from "@/lib/types";

const bmi = (w: number, h: number) => (w / (h / 100) ** 2).toFixed(1);

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/trainer/login");

  const [{ data: clients }, { data: unread }, { data: recentSessions }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, age, weight, height, goal, fitness_level, days_per_week, created_at")
      .eq("archived", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_feedback")
      .select("client_id")
      .eq("from_client", true)
      .eq("read", false),
    supabase
      .from("client_sessions")
      .select("client_id, created_at")
      .order("created_at", { ascending: false }),
  ]);

  // Unread message count per client
  const unreadCount = new Map<string, number>();
  (unread ?? []).forEach(f => unreadCount.set(f.client_id, (unreadCount.get(f.client_id) ?? 0) + 1));

  // Days since last session per client
  const lastSession = new Map<string, string>();
  (recentSessions ?? []).forEach(s => {
    if (!lastSession.has(s.client_id)) lastSession.set(s.client_id, s.created_at);
  });
  const daysSince = (id: string, createdAt: string) => {
    const last = lastSession.get(id) ?? createdAt;
    return Math.floor((Date.now() - new Date(last).getTime()) / 864e5);
  };

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 36 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -.5, marginBottom: 4 }}>Clients</h1>
          <p style={{ color: C.muted, fontSize: 14 }}>
            {clients?.length ?? 0} active client{clients?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/trainer/dashboard/new" style={{
          background: C.accent, color: "#000", borderRadius: 12, padding: "11px 22px",
          fontWeight: 700, fontSize: 14, textDecoration: "none", letterSpacing: -.2,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}>
          + New Client
        </Link>
      </div>

      {!clients?.length ? (
        <div style={{
          textAlign: "center", padding: "80px 24px",
          background: C.card, borderRadius: 20, border: `1px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>🏋️</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No clients yet</h3>
          <p style={{ color: C.muted, fontSize: 15, marginBottom: 28, maxWidth: 300, margin: "0 auto 28px" }}>
            Add your first client and AI will build them a personalised programme instantly.
          </p>
          <Link href="/trainer/dashboard/new" style={{
            background: C.accent, color: "#000", borderRadius: 12, padding: "12px 24px",
            fontWeight: 700, fontSize: 14, textDecoration: "none",
          }}>
            + Add First Client
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 16 }}>
          {(clients as Client[]).map(c => (
            <div key={c.id} style={{ position: "relative" }}>
              <Link href={`/trainer/dashboard/${c.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <div style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 18,
                  padding: 22,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 14,
                      background: `linear-gradient(135deg, ${C.accent}30, ${C.blue}20)`,
                      border: `1px solid ${C.accent}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, fontWeight: 800, color: C.accent,
                    }}>
                      {c.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: -.3 }}>{c.name}</div>
                      <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
                        {c.age} yrs · {c.weight}kg · BMI {bmi(c.weight, c.height)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                    <Tag label={c.goal} color={C.accent} />
                    <Tag label={c.fitness_level} color={C.blue} />
                  </div>

                  {(unreadCount.get(c.id) || daysSince(c.id, c.created_at) >= 7) && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                      {!!unreadCount.get(c.id) && (
                        <span style={{ background: `${C.warn}18`, color: C.warn, border: `1px solid ${C.warn}40`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
                          💬 {unreadCount.get(c.id)} new message{unreadCount.get(c.id)! > 1 ? "s" : ""}
                        </span>
                      )}
                      {daysSince(c.id, c.created_at) >= 7 && (
                        <span style={{ background: `${C.danger}15`, color: C.danger, border: `1px solid ${C.danger}35`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
                          😴 No session in {daysSince(c.id, c.created_at)}d
                        </span>
                      )}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: C.muted }}>
                      {c.days_per_week}×/week
                    </span>
                    <span style={{ fontSize: 12, color: C.muted }}>
                      View programme →
                    </span>
                  </div>
                </div>
              </Link>
              <DeleteButton clientId={c.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      background: `${color}15`, color, border: `1px solid ${color}30`,
      borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600,
    }}>
      {label}
    </span>
  );
}
