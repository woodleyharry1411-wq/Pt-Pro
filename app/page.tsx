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
      <Header onSwitch={() => { setClient(null); setSearched(false); setName(""); }} clientName={client.name} />
      <div className="page-padding" style={{ maxWidth: 680, margin: "0 auto", animation: "fadeIn .3s ease" }}>

        {/* Programme summary */}
        {client.programme?.summary && (
          <div style={{ background: `linear-gradient(135deg, ${C.accent}18, ${C.accent}08)`, border: `1px solid ${C.accent}30`, borderRadius: 16, padding: "14px 18px", marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, letterSpacing: 1.5, marginBottom: 6, fontFamily: "Saira, sans-serif" }}>YOUR PROGRAMME</div>
            <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{client.programme.summary}</p>
          </div>
        )}

        {/* Day selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {days.map((d, i) => (
            <button key={i} onClick={() => { setActiveDay(i); setExpandedEx(null); }} style={{
              background: activeDay === i ? C.accent : C.card,
              color: activeDay === i ? "#fff" : C.muted,
              border: `1px solid ${activeDay === i ? C.accent : C.border}`,
              borderRadius: 10, padding: "9px 18px", fontWeight: 700, fontSize: 13,
              fontFamily: "Saira, sans-serif", letterSpacing: 0.5, transition: "all .15s",
            }}>
              {d.label}
              {activeDay === i && total > 0 && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>{pct}%</span>}
            </button>
          ))}
        </div>

        {/* Progress */}
        {total > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 8, fontWeight: 600 }}>
              <span>Today&apos;s progress</span>
              <span style={{ color: C.accent, fontWeight: 700 }}>{completed}/{total} complete</span>
            </div>
            <div style={{ background: C.border, borderRadius: 8, height: 6 }}>
              <div style={{ background: `linear-gradient(90deg, ${C.accent}, #60A5FA)`, width: `${pct}%`, height: "100%", borderRadius: 8, transition: "width .4s ease" }} />
            </div>
          </div>
        )}

        {/* Day focus label */}
        {day && (
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12, fontFamily: "Saira, sans-serif" }}>
            {day.focus}
          </div>
        )}

        {/* Exercise list */}
        {day && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {exercises.map((ex, i) => {
              const setLogs  = initSetLogs(ex.sets, ex.setLogs);
              const doneSets = setLogs.filter(s => s.done).length;
              const allDone  = doneSets === setLogs.length;
              const isOpen   = expandedEx === i;

              return (
                <div key={i} style={{
                  background: C.card, border: `1px solid ${allDone ? `${C.accent}40` : C.border}`,
                  borderRadius: 14, overflow: "hidden", transition: "border-color .3s",
                }}>
                  {/* Exercise row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", cursor: "pointer" }}
                    onClick={() => setExpandedEx(isOpen ? null : i)}>
                    {/* Circle checkbox */}
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: allDone ? C.accent : "transparent",
                      border: `2px solid ${allDone ? C.accent : C.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all .25s",
                    }}>
                      {allDone && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7L5.5 10L11.5 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      {!allDone && doneSets > 0 && <span style={{ fontSize: 10, color: C.accent, fontWeight: 700 }}>{doneSets}/{setLogs.length}</span>}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 700, fontSize: 15, fontFamily: "Saira, sans-serif",
                        color: allDone ? C.muted : C.text,
                        textDecoration: allDone ? "line-through" : "none",
                      }}>{ex.name}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2, fontFamily: "JetBrains Mono, monospace" }}>
                        {ex.sets} × {ex.reps}{ex.rpe ? ` · RPE ${ex.rpe}` : ""}
                      </div>
                      {ex.notes && <div style={{ fontSize: 12, color: "#60A5FA", marginTop: 3 }}>{ex.notes}</div>}
                    </div>

                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s", color: C.muted }}>
                      <path d="M4 6L8 10L12 6" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>

                  {/* Expanded sets */}
                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 16px 16px" }}>
                      {/* Column headers */}
                      <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 80px 80px 36px", gap: 6, marginBottom: 8 }}>
                        {["SET", "TARGET", "REPS", "KG", "✓"].map(h => (
                          <span key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 0.8, fontFamily: "Saira, sans-serif" }}>{h}</span>
                        ))}
                      </div>
                      {setLogs.map((s, si) => (
                        <div key={si} style={{
                          display: "grid", gridTemplateColumns: "28px 1fr 80px 80px 36px",
                          gap: 6, alignItems: "center", marginBottom: 6,
                          background: s.done ? `${C.accent}12` : `${C.bg}80`,
                          borderRadius: 10, padding: "8px 10px",
                          border: `1px solid ${s.done ? `${C.accent}30` : "transparent"}`,
                          transition: "all .2s",
                        }}>
                          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: C.muted, fontWeight: 700 }}>{si + 1}</span>
                          <span style={{ fontSize: 12, color: C.muted, fontFamily: "JetBrains Mono, monospace" }}>{ex.reps}</span>
                          <input
                            type="number" value={s.reps_done ?? ""} placeholder="—"
                            onChange={e => updateRepsDone(i, si, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "5px 8px", color: C.text, fontSize: 13, outline: "none", width: "100%", fontFamily: "JetBrains Mono, monospace", textAlign: "center" }}
                            onFocus={e => (e.target.style.borderColor = C.accent)}
                            onBlur={e  => (e.target.style.borderColor = C.border)}
                          />
                          <input
                            type="number" value={s.weight} placeholder="0"
                            onChange={e => updateWeight(i, si, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "5px 8px", color: C.text, fontSize: 13, outline: "none", width: "100%", fontFamily: "JetBrains Mono, monospace", textAlign: "center" }}
                            onFocus={e => (e.target.style.borderColor = C.accent)}
                            onBlur={e  => (e.target.style.borderColor = C.border)}
                          />
                          <div style={{ display: "flex", justifyContent: "center" }}>
                            <div onClick={e => { e.stopPropagation(); toggleSet(i, si); }} style={{
                              width: 24, height: 24, borderRadius: "50%", cursor: "pointer",
                              background: s.done ? C.accent : "transparent",
                              border: `2px solid ${s.done ? C.accent : C.border}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all .2s",
                            }}>
                              {s.done && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Session complete */}
        {pct === 100 && (
          <div style={{ marginTop: 20, background: `linear-gradient(135deg, ${C.accent}18, ${C.accent}08)`, border: `1px solid ${C.accent}40`, borderRadius: 16, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: C.accent, fontFamily: "Saira, sans-serif", letterSpacing: 0.5 }}>Session Complete</div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>Great work today. Your trainer can see your progress.</div>
          </div>
        )}
      </div>
    </div>
  );

  // Search screen
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <SearchHeader />
      <div className="page-padding" style={{ maxWidth: 420, margin: "0 auto", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", animation: "fadeUp .4s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Logo size={64} style={{ margin: "0 auto 20px" }} />
          <h1 className="saira" style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 8 }}>Your Programme</h1>
          <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.6 }}>Enter your name to view your personalised training plan</p>
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
            background: C.accent, color: "#fff", border: "none", borderRadius: 12,
            padding: "14px", fontWeight: 700, fontSize: 16, fontFamily: "Saira, sans-serif", letterSpacing: 0.5,
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

function Logo({ size = 32, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ width: size, height: size, ...style }}>
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
        <rect width="64" height="64" rx="14" fill="#0F1120"/>
        <path d="M14 48V16H34C40 16 44 20 44 26C44 32 40 36 34 36H24V48H14Z" fill="white"/>
        <path d="M14 48V16H34C40 16 44 20 44 26C44 32 40 36 34 36H24V48H14Z" fill="url(#pGrad)" fillOpacity="0.9"/>
        <path d="M36 36L48 48" stroke="#3B6EF8" strokeWidth="8" strokeLinecap="round"/>
        <defs>
          <linearGradient id="pGrad" x1="14" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="white"/>
            <stop offset="1" stopColor="#3B6EF8"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function Header({ clientName, onSwitch }: { clientName: string; onSwitch: () => void }) {
  return (
    <header style={{
      background: C.surface, borderBottom: `1px solid ${C.border}`,
      padding: "0 20px", position: "sticky", top: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "space-between", height: 60,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Logo size={32} />
        <span className="saira" style={{ fontWeight: 800, fontSize: 15, letterSpacing: 1, textTransform: "uppercase" }}>PT Pro</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: 1 }}>WELCOME BACK</div>
          <div style={{ fontWeight: 700, fontSize: 13, fontFamily: "Saira, sans-serif" }}>{clientName}</div>
        </div>
        <button onClick={onSwitch} style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
          color: C.muted, fontSize: 13, fontWeight: 600, padding: "6px 14px",
        }}>Switch</button>
      </div>
    </header>
  );
}

function SearchHeader() {
  return (
    <header style={{
      background: C.surface, borderBottom: `1px solid ${C.border}`,
      padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Logo size={32} />
        <span className="saira" style={{ fontWeight: 800, fontSize: 15, letterSpacing: 1, textTransform: "uppercase" }}>PT Pro</span>
      </div>
      <a href="/trainer/login" style={{ fontSize: 13, color: C.muted, textDecoration: "none", fontWeight: 600 }}>Trainer →</a>
    </header>
  );
}
