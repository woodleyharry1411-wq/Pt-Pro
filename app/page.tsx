"use client";

import { useState } from "react";
import { C } from "@/lib/colours";
import type { Programme, ProgrammeDay, SetLog } from "@/lib/types";

function initSetLogs(sets: string, existing?: SetLog[]): SetLog[] {
  const count = parseInt(sets) || 3;
  if (existing && existing.length === count) return existing;
  return Array.from({ length: count }, (_, i) => existing?.[i] ?? { weight: "", reps_done: "", done: false });
}

type ClientData = { id: string; name: string; programme?: Programme };

export default function ClientPortal() {
  const [name, setName]             = useState("");
  const [client, setClient]         = useState<ClientData | null>(null);
  const [searched, setSearched]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [activeDay, setActiveDay]   = useState(0);
  const [expandedEx, setExpandedEx] = useState<number | null>(null);

  async function search() {
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/client?name=${encodeURIComponent(name.trim())}`);
    const { client } = await res.json();
    setClient(client ?? null);
    setSearched(true);
    setActiveDay(0);
    setExpandedEx(null);
    setLoading(false);
  }

  async function saveProgramme(prog: Programme) {
    if (!client) return;
    setClient(c => c ? { ...c, programme: prog } : c);
    await fetch("/api/client/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, programme: prog }),
    });
  }

  function toggleSet(exIdx: number, setIdx: number) {
    const prog: Programme = JSON.parse(JSON.stringify(client!.programme));
    const ex = prog.weeklyStructure[activeDay].exercises[exIdx];
    if (!ex.setLogs) ex.setLogs = initSetLogs(ex.sets, ex.setLogs);
    ex.setLogs[setIdx].done = !ex.setLogs[setIdx].done;
    ex.done = ex.setLogs.every(s => s.done);
    saveProgramme(prog);
  }

  function updateWeight(exIdx: number, setIdx: number, weight: string) {
    const prog: Programme = JSON.parse(JSON.stringify(client!.programme));
    const ex = prog.weeklyStructure[activeDay].exercises[exIdx];
    if (!ex.setLogs) ex.setLogs = initSetLogs(ex.sets, ex.setLogs);
    ex.setLogs[setIdx].weight = weight;
    saveProgramme(prog);
  }

  function updateRepsDone(exIdx: number, setIdx: number, reps: string) {
    const prog: Programme = JSON.parse(JSON.stringify(client!.programme));
    const ex = prog.weeklyStructure[activeDay].exercises[exIdx];
    if (!ex.setLogs) ex.setLogs = initSetLogs(ex.sets, ex.setLogs);
    ex.setLogs[setIdx].reps_done = reps;
    saveProgramme(prog);
  }

  const days: ProgrammeDay[]  = client?.programme?.weeklyStructure ?? [];
  const day                   = days[activeDay];
  const exercises             = day?.exercises ?? [];
  const completed             = exercises.filter(e => e.done).length;
  const total                 = exercises.length;
  const pct                   = total ? Math.round((completed / total) * 100) : 0;

  if (client) return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <Header />
      <div className="page-padding" style={{ maxWidth: 700, margin: "0 auto", animation: "fadeIn .3s ease" }}>

        {/* Welcome bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, padding: "14px 20px", background: C.card, borderRadius: 14, border: `1px solid ${C.border}` }}>
          <div>
            <div style={{ fontSize: 13, color: C.muted }}>Welcome back</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 1 }}>{client.name}</div>
          </div>
          <button onClick={() => { setClient(null); setSearched(false); setName(""); }}
            style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: "pointer", fontSize: 13, padding: "6px 14px", fontWeight: 500 }}>
            Switch
          </button>
        </div>

        {/* Summary */}
        {client.programme?.summary && (
          <div style={{ background: `linear-gradient(135deg, ${C.accent}12, ${C.blue}08)`, border: `1px solid ${C.accent}25`, borderRadius: 16, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>YOUR PROGRAMME</div>
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7 }}>{client.programme.summary}</p>
          </div>
        )}

        {/* Day selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {days.map((d, i) => (
            <button key={i} onClick={() => { setActiveDay(i); setExpandedEx(null); }} style={{
              background: activeDay === i ? C.accent : C.card,
              color: activeDay === i ? "#000" : C.muted,
              border: `1px solid ${activeDay === i ? C.accent : C.border}`,
              borderRadius: 10, padding: "9px 18px", fontWeight: 700, fontSize: 14, transition: "all .15s",
            }}>
              {d.label}
              {activeDay === i && total > 0 && <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.7 }}>{pct}%</span>}
            </button>
          ))}
        </div>

        {/* Progress */}
        {total > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted, marginBottom: 8, fontWeight: 500 }}>
              <span>Today&apos;s progress</span><span>{completed}/{total} complete</span>
            </div>
            <div style={{ background: C.border, borderRadius: 8, height: 8 }}>
              <div style={{ background: `linear-gradient(90deg, ${C.accent}, ${C.blue})`, width: `${pct}%`, height: "100%", borderRadius: 8, transition: "width .4s ease" }} />
            </div>
          </div>
        )}

        {/* Exercise list */}
        {day && (
          <div style={{ borderRadius: 18, overflow: "hidden", border: `1px solid ${C.border}` }}>
            <div style={{ background: C.card, padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 1 }}>{day.label}</span>
              <span style={{ color: C.muted, fontSize: 15 }}>{day.focus}</span>
            </div>
            {exercises.map((ex, i) => {
              const setLogs  = initSetLogs(ex.sets, ex.setLogs);
              const doneSets = setLogs.filter(s => s.done).length;
              const allDone  = doneSets === setLogs.length;
              const isOpen   = expandedEx === i;

              return (
                <div key={i} style={{ borderBottom: i < exercises.length - 1 ? `1px solid ${C.border}` : "none", background: allDone ? `${C.accent}08` : C.bg, transition: "background .3s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", cursor: "pointer" }} onClick={() => setExpandedEx(isOpen ? null : i)}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: allDone ? C.accent : "transparent",
                      border: `2px solid ${allDone ? C.accent : C.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, color: allDone ? "#000" : C.muted, fontWeight: 700, transition: "all .25s",
                    }}>
                      {allDone ? "✓" : `${doneSets}/${setLogs.length}`}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: allDone ? C.muted : C.text, textDecoration: allDone ? "line-through" : "none" }}>{ex.name}</div>
                      <div style={{ fontSize: 13, color: C.muted, fontFamily: "JetBrains Mono", marginTop: 3 }}>
                        {ex.sets} sets × {ex.reps}{ex.rpe ? ` · RPE ${ex.rpe}` : ""}
                      </div>
                      {ex.notes && <div style={{ fontSize: 13, color: C.blue, marginTop: 4 }}>{ex.notes}</div>}
                    </div>
                    <span style={{ color: C.muted, fontSize: 13 }}>{isOpen ? "▲" : "▼"}</span>
                  </div>

                  {isOpen && (
                    <div style={{ padding: "0 20px 18px 66px" }}>
                      <div className="set-grid-head" style={{ paddingLeft: 4 }}>
                        {["#", "TARGET", "REPS DONE", "KG", "✓"].map(h => (
                          <span key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: .5 }}>{h}</span>
                        ))}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {setLogs.map((s, si) => (
                          <div key={si} className="set-grid" style={{
                            background: s.done ? `${C.accent}10` : C.card,
                            border: `1px solid ${s.done ? `${C.accent}30` : "transparent"}`,
                            borderRadius: 10, padding: "8px 10px", transition: "all .2s",
                          }}>
                            <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: C.muted, fontWeight: 700 }}>{si + 1}</span>
                            <span style={{ fontSize: 12, color: C.muted, fontFamily: "JetBrains Mono" }}>{ex.reps}</span>
                            <input
                              type="number" value={s.reps_done ?? ""} placeholder="—"
                              onChange={e => updateRepsDone(i, si, e.target.value)}
                              onClick={e => e.stopPropagation()}
                              style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 6px", color: C.text, fontSize: 13, outline: "none", width: "100%", fontFamily: "JetBrains Mono" }}
                              onFocus={e => (e.target.style.borderColor = C.accent)}
                              onBlur={e  => (e.target.style.borderColor = C.border)}
                            />
                            <input
                              type="number" value={s.weight} placeholder="0"
                              onChange={e => updateWeight(i, si, e.target.value)}
                              onClick={e => e.stopPropagation()}
                              style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 6px", color: C.text, fontSize: 13, outline: "none", width: "100%", fontFamily: "JetBrains Mono" }}
                              onFocus={e => (e.target.style.borderColor = C.accent)}
                              onBlur={e  => (e.target.style.borderColor = C.border)}
                            />
                            <div style={{ display: "flex", justifyContent: "center" }}>
                              <input type="checkbox" checked={s.done}
                                onChange={e => { e.stopPropagation(); toggleSet(i, si); }}
                                style={{ width: 17, height: 17, accentColor: C.accent, cursor: "pointer" }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pct === 100 && (
          <div style={{ marginTop: 24, background: `linear-gradient(135deg, ${C.accent}15, ${C.accent}05)`, border: `1px solid ${C.accent}30`, borderRadius: 18, padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🏆</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: C.accent, letterSpacing: -.3 }}>Session Complete</div>
            <div style={{ color: C.muted, fontSize: 15, marginTop: 6 }}>Great work today. Your trainer can see your progress.</div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <Header />
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "60px 20px 0", animation: "fadeUp .4s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 20px" }}>⚡</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -.5, marginBottom: 8 }}>Your Programme</h1>
          <p style={{ color: C.muted, fontSize: 16, lineHeight: 1.6 }}>Enter your name to view your personalised training plan</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="Your full name…"
            style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", color: C.text, fontSize: 16, outline: "none", width: "100%" }}
            onFocus={e => (e.target.style.borderColor = C.accent)}
            onBlur={e  => (e.target.style.borderColor = C.border)}
          />
          <button onClick={search} disabled={loading} style={{
            background: C.accent, color: "#000", border: "none", borderRadius: 12,
            padding: "14px", fontWeight: 700, fontSize: 16, letterSpacing: -.2,
          }}>
            {loading ? "Searching…" : "View My Programme"}
          </button>
        </div>
        {searched && !client && (
          <p style={{ color: C.danger, fontSize: 14, textAlign: "center", marginTop: 16 }}>
            No programme found. Check your name with your trainer.
          </p>
        )}
      </div>
    </div>
  );
}

function Header() {
  return (
    <header style={{
      background: C.surface, borderBottom: `1px solid ${C.border}`,
      padding: "0 32px", position: "sticky", top: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "space-between", height: 64,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: -.3 }}>PT Pro</span>
      </div>
      <a href="/trainer/login" style={{ fontSize: 14, color: C.muted, textDecoration: "none", fontWeight: 500 }}>Trainer →</a>
    </header>
  );
}
