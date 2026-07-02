"use client";

import { useState, useEffect, useRef } from "react";
import { C } from "@/lib/colours";
import { LogoIcon, LogoFull } from "@/components/Logo";
import type { Programme, ProgrammeDay, SetLog } from "@/lib/types";

const CARDIO_KEYWORDS = ["run", "bike", "cycl", "swim", "row", "cardio", "treadmill", "elliptic", "walk", "jog", "sprint", "hiit", "skip", "jump rope", "stair", "rower"];
function isCardio(name: string) { return CARDIO_KEYWORDS.some(k => name.toLowerCase().includes(k)); }

function initSetLogs(sets: string, existing?: SetLog[]): SetLog[] {
  const count = parseInt(sets) || 3;
  if (existing && existing.length === count) return existing;
  return Array.from({ length: count }, (_, i) => existing?.[i] ?? { weight: "", reps_done: "", done: false });
}

// Get the active week's days — supports both multi-week and legacy single-week formats
function getWeekDays(prog: Programme): ProgrammeDay[] {
  if (prog.weeks) return prog.weeks[prog.currentWeek ?? 0]?.weeklyStructure ?? [];
  return prog.weeklyStructure ?? [];
}

// Get a mutable reference to the active week's day list in a deep-copied programme
function getMutableDays(prog: Programme): ProgrammeDay[] {
  if (prog.weeks) return prog.weeks[prog.currentWeek ?? 0].weeklyStructure;
  return prog.weeklyStructure!;
}

type FeedbackItem = { id: string; message: string; from_client: boolean; created_at: string };
type ClientData = { id: string; name: string; programme?: Programme; feedback?: FeedbackItem[] };

export default function ClientPortal() {
  const [name, setName]             = useState("");
  const [client, setClient]         = useState<ClientData | null>(null);
  const [searched, setSearched]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [activeDay, setActiveDay]   = useState(0);
  const [expandedEx, setExpandedEx]     = useState<number | null>(null);
  const [clientTab, setClientTab]       = useState<"programme" | "feedback">("programme");
  const [clientMsg, setClientMsg]       = useState("");
  const [sendingMsg, setSendingMsg]     = useState(false);
  const [localFeedback, setLocalFeedback] = useState<FeedbackItem[]>([]);

  async function search() {
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/client?name=${encodeURIComponent(name.trim())}`);
    const { client } = await res.json();
    setClient(client ?? null);
    setLocalFeedback(client?.feedback ?? []);
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
    const days = getMutableDays(prog);
    const currentDay = days[activeDay];
    const wasComplete = currentDay.exercises.every(e => e.done);
    const ex = currentDay.exercises[exIdx];
    if (!ex.setLogs) ex.setLogs = initSetLogs(ex.sets, ex.setLogs);
    ex.setLogs[setIdx].done = !ex.setLogs[setIdx].done;
    ex.done = ex.setLogs.every(s => s.done);
    const nowComplete = currentDay.exercises.every(e => e.done);
    saveProgramme(prog);
    // Auto-log session when the day transitions to fully complete
    if (!wasComplete && nowComplete) {
      fetch("/api/client/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client!.id, dayLabel: currentDay.label }),
      });
    }
  }

  function updateWeight(exIdx: number, setIdx: number, weight: string) {
    const prog: Programme = JSON.parse(JSON.stringify(client!.programme));
    const days = getMutableDays(prog);
    const ex = days[activeDay].exercises[exIdx];
    if (!ex.setLogs) ex.setLogs = initSetLogs(ex.sets, ex.setLogs);
    ex.setLogs[setIdx].weight = weight;
    saveProgramme(prog);
  }

  function updateRepsDone(exIdx: number, setIdx: number, reps: string) {
    const prog: Programme = JSON.parse(JSON.stringify(client!.programme));
    const days = getMutableDays(prog);
    const ex = days[activeDay].exercises[exIdx];
    if (!ex.setLogs) ex.setLogs = initSetLogs(ex.sets, ex.setLogs);
    ex.setLogs[setIdx].reps_done = reps;
    saveProgramme(prog);
  }

  async function resetWeek() {
    if (!client?.programme) return;
    const prog: Programme = JSON.parse(JSON.stringify(client.programme));
    getMutableDays(prog).forEach(day =>
      day.exercises.forEach(ex => {
        ex.done = false;
        if (ex.setLogs) ex.setLogs.forEach(s => { s.done = false; s.reps_done = ""; });
        // keep s.weight so client can track progression
      })
    );
    await saveProgramme(prog);
    setActiveDay(0);
  }

  async function advanceWeek() {
    if (!client?.programme?.weeks) return;
    const prog: Programme = JSON.parse(JSON.stringify(client.programme));
    const nextIdx = (prog.currentWeek ?? 0) + 1;
    if (nextIdx >= prog.weeks!.length) return;
    // Clear done state on the next week so client starts fresh (weights carried forward)
    prog.weeks![nextIdx].weeklyStructure.forEach(day =>
      day.exercises.forEach(ex => {
        ex.done = false;
        if (ex.setLogs) ex.setLogs.forEach(s => { s.done = false; s.reps_done = ""; });
      })
    );
    prog.currentWeek = nextIdx;
    await saveProgramme(prog);
    setActiveDay(0);
    setExpandedEx(null);
  }

  async function sendClientFeedback() {
    if (!clientMsg.trim() || !client) return;
    setSendingMsg(true);
    await fetch("/api/client/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: client.id, message: clientMsg.trim() }),
    });
    setLocalFeedback(f => [{ id: Date.now().toString(), message: clientMsg.trim(), from_client: true, created_at: new Date().toISOString() }, ...f]);
    setClientMsg("");
    setSendingMsg(false);
  }

  const prog   = client?.programme;
  const days: ProgrammeDay[] = prog ? getWeekDays(prog) : [];
  const day    = days[activeDay];
  const exercises = day?.exercises ?? [];
  const completed = exercises.filter(e => e.done).length;
  const total     = exercises.length;
  const pct       = total ? Math.round((completed / total) * 100) : 0;

  // Multi-week metadata
  const isMultiWeek    = !!prog?.weeks;
  const currentWeekIdx = prog?.currentWeek ?? 0;
  const currentWeekInfo = isMultiWeek ? prog!.weeks![currentWeekIdx] : null;
  const isLastWeek     = isMultiWeek ? currentWeekIdx >= (prog!.weeks!.length - 1) : true;
  const nextWeekInfo   = isMultiWeek && !isLastWeek ? prog!.weeks![currentWeekIdx + 1] : null;
  const allDaysComplete = days.length > 0 && days.every(d => d.exercises.length > 0 && d.exercises.every(e => e.done));
  const [advancing, setAdvancing] = useState(false);
  const advancedRef = useRef(false);

  // Auto-advance to next week when all days complete (multi-week only)
  useEffect(() => {
    if (allDaysComplete && isMultiWeek && !isLastWeek && !advancedRef.current) {
      advancedRef.current = true;
      setAdvancing(true);
      advanceWeek().then(() => setAdvancing(false));
    }
    if (!allDaysComplete) {
      advancedRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDaysComplete]);

  if (client) return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <Header onSwitch={() => { setClient(null); setSearched(false); setName(""); }} clientName={client.name} />
      <div className="page-padding" style={{ maxWidth: 680, margin: "0 auto", animation: "fadeIn .3s ease" }}>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.card, borderRadius: 12, padding: 4, width: "fit-content" }}>
          {(["programme", "feedback"] as const).map(t => (
            <button key={t} onClick={() => setClientTab(t)} style={{
              background: clientTab === t ? C.accent : "transparent",
              color: clientTab === t ? "#fff" : C.muted,
              border: "none", borderRadius: 9, padding: "8px 18px",
              fontWeight: 700, fontSize: 13, cursor: "pointer", textTransform: "capitalize",
              fontFamily: "Saira, sans-serif", letterSpacing: 0.5,
            }}>{t === "feedback" ? `Feedback${client.feedback?.length ? ` (${client.feedback.length})` : ""}` : "Programme"}</button>
          ))}
        </div>

        {/* Feedback tab */}
        {clientTab === "feedback" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px" }}>
              <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 1, marginBottom: 10, fontFamily: "Saira, sans-serif" }}>MESSAGE YOUR TRAINER</div>
              <textarea
                value={clientMsg}
                onChange={e => setClientMsg(e.target.value)}
                placeholder="How did your session go? Any questions or concerns?"
                rows={3}
                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", resize: "none", fontFamily: "inherit", marginBottom: 10 }}
                onFocus={e => (e.target.style.borderColor = C.accent)}
                onBlur={e => (e.target.style.borderColor = C.border)}
              />
              <button onClick={sendClientFeedback} disabled={sendingMsg || !clientMsg.trim()} style={{
                background: C.accent, color: "#fff", border: "none", borderRadius: 10,
                padding: "10px 20px", fontWeight: 700, fontSize: 14, fontFamily: "Saira, sans-serif",
                opacity: !clientMsg.trim() ? 0.5 : 1,
              }}>
                {sendingMsg ? "Sending…" : "Send Message"}
              </button>
            </div>

            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, fontFamily: "Saira, sans-serif" }}>CONVERSATION</div>
            {!localFeedback.length ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 14 }}>No messages yet. Send your trainer a message above.</div>
            ) : localFeedback.map(fb => (
              <div key={fb.id} style={{
                background: fb.from_client ? `${C.accent}12` : C.card,
                border: `1px solid ${fb.from_client ? `${C.accent}30` : C.border}`,
                borderRadius: 14, padding: "14px 16px",
                marginLeft: fb.from_client ? 24 : 0,
                marginRight: fb.from_client ? 0 : 24,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: fb.from_client ? C.accent : C.muted, fontFamily: "Saira, sans-serif", letterSpacing: 0.5 }}>
                    {fb.from_client ? "YOU" : "YOUR TRAINER"}
                  </span>
                  <span style={{ fontSize: 11, color: C.muted }}>
                    {new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7, margin: 0 }}>{fb.message}</p>
              </div>
            ))}
          </div>
        )}

        {clientTab === "programme" && <>

        {/* Week badge for multi-week programmes */}
        {currentWeekInfo && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ background: `${C.accent}18`, border: `1px solid ${C.accent}35`, borderRadius: 10, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: C.accent, fontWeight: 700, letterSpacing: 1, fontFamily: "Saira, sans-serif" }}>WEEK {currentWeekInfo.weekNumber}</span>
              <span style={{ width: 1, height: 12, background: `${C.accent}40` }} />
              <span style={{ fontSize: 13, color: C.text, fontWeight: 700, fontFamily: "Saira, sans-serif" }}>{currentWeekInfo.label}</span>
            </div>
            {isMultiWeek && (
              <span style={{ fontSize: 12, color: C.muted }}>
                {currentWeekIdx + 1} of {prog!.weeks!.length} weeks
              </span>
            )}
          </div>
        )}

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
              const cardio   = isCardio(ex.name);

              return (
                <div key={i} style={{
                  background: C.card, border: `1px solid ${allDone ? `${C.accent}40` : C.border}`,
                  borderRadius: 14, overflow: "hidden", transition: "border-color .3s",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", cursor: "pointer" }}
                    onClick={() => setExpandedEx(isOpen ? null : i)}>
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

                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 16px 16px" }}>
                      {cardio && (
                        <div style={{ background: `${C.accent}10`, border: `1px solid ${C.accent}30`, borderRadius: 8, padding: "6px 12px", marginBottom: 10, fontSize: 12, color: C.accent, fontWeight: 600 }}>
                          Cardio — track your time and distance
                        </div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 80px 80px 36px", gap: 6, marginBottom: 8 }}>
                        {["SET", "TARGET", cardio ? "MIN" : "REPS", cardio ? "KM" : "KG", "✓"].map(h => (
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
                            type="number" value={s.reps_done ?? ""}
                            placeholder={cardio ? "min" : "reps"}
                            onChange={e => updateRepsDone(i, si, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, padding: "5px 8px", color: C.text, fontSize: 13, outline: "none", width: "100%", fontFamily: "JetBrains Mono, monospace", textAlign: "center" }}
                            onFocus={e => (e.target.style.borderColor = C.accent)}
                            onBlur={e  => (e.target.style.borderColor = C.border)}
                          />
                          <input
                            type="number" value={s.weight}
                            placeholder={cardio ? "km" : "kg"}
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

        {/* Session / Week complete */}
        {pct === 100 && (
          allDaysComplete ? (
            isMultiWeek && !isLastWeek ? (
              /* All days done — auto-advance to next week */
              <div style={{ marginTop: 20, background: `linear-gradient(135deg, ${C.accent}20, #7C3AED18)`, border: `1px solid ${C.accent}50`, borderRadius: 20, padding: 28, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
                <div style={{ fontWeight: 800, fontSize: 22, color: C.accent, fontFamily: "Saira, sans-serif", marginBottom: 8 }}>
                  Week {currentWeekInfo!.weekNumber} Complete!
                </div>
                <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                  You&apos;ve finished the <strong style={{ color: C.text }}>{currentWeekInfo!.label}</strong> phase.
                  Moving you on to <strong style={{ color: C.accent }}>Week {nextWeekInfo!.weekNumber}: {nextWeekInfo!.label}</strong>…
                </div>
                {advancing && (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, color: C.muted, fontSize: 14 }}>
                    <div style={{ width: 18, height: 18, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    Loading next week…
                  </div>
                )}
              </div>
            ) : (
              /* Final week complete or legacy single-week */
              <div style={{ marginTop: 20, background: `linear-gradient(135deg, ${C.accent}20, #7C3AED18)`, border: `1px solid ${C.accent}50`, borderRadius: 20, padding: 28, textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
                <div style={{ fontWeight: 800, fontSize: 22, color: C.accent, fontFamily: "Saira, sans-serif", marginBottom: 8 }}>
                  {isMultiWeek ? "Programme Complete!" : "Week Complete!"}
                </div>
                <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
                  {isMultiWeek
                    ? "You've completed all 4 weeks. Incredible dedication — message your trainer so they can build your next programme!"
                    : "You've finished every session this week. Your trainer will review your progress and update your programme."}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                  {[
                    { label: "Days Done", value: days.length },
                    { label: "Exercises", value: days.reduce((n, d) => n + d.exercises.length, 0) },
                    { label: "Sets", value: days.reduce((n, d) => n + d.exercises.reduce((m, e) => m + (parseInt(e.sets) || 0), 0), 0) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: `${C.accent}15`, borderRadius: 12, padding: "12px 8px" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "JetBrains Mono, monospace", color: C.accent }}>{value}</div>
                      <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 0.5, marginTop: 2 }}>{label.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setClientTab("feedback")}
                  style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontWeight: 700, fontSize: 14, fontFamily: "Saira, sans-serif", letterSpacing: 0.5 }}
                >
                  Message Your Trainer
                </button>
              </div>
            )
          ) : (
            /* Single session done, not all days yet */
            <div style={{ marginTop: 20, background: `linear-gradient(135deg, ${C.accent}18, ${C.accent}08)`, border: `1px solid ${C.accent}40`, borderRadius: 16, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 800, fontSize: 17, color: C.accent, fontFamily: "Saira, sans-serif" }}>Session Complete!</div>
              <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>
                Great work. {days.filter(d => d.exercises.length > 0 && d.exercises.every(e => e.done)).length}/{days.length} sessions done this week.
              </div>
            </div>
          )
        )}
        </>}
      </div>
    </div>
  );

  // Search screen
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
      <SearchHeader />
      <div className="page-padding" style={{ maxWidth: 420, margin: "0 auto", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", animation: "fadeUp .4s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
            <LogoFull height={64} />
          </div>
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

function Header({ clientName, onSwitch }: { clientName: string; onSwitch: () => void }) {
  return (
    <header style={{
      background: C.surface, borderBottom: `1px solid ${C.border}`,
      padding: "0 20px", position: "sticky", top: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "space-between", height: 60,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <LogoIcon size={32} />
        <span className="saira" style={{ fontWeight: 800, fontSize: 15, letterSpacing: 1, textTransform: "uppercase" }}>PT <span style={{ color: C.accent }}>PRO</span></span>
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
        <LogoIcon size={32} />
        <span className="saira" style={{ fontWeight: 800, fontSize: 15, letterSpacing: 1, textTransform: "uppercase" }}>PT <span style={{ color: C.accent }}>PRO</span></span>
      </div>
      <a href="/trainer/login" style={{ fontSize: 13, color: C.muted, textDecoration: "none", fontWeight: 600 }}>Trainer →</a>
    </header>
  );
}
