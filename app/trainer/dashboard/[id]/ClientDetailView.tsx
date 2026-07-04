"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/lib/colours";
import { updateProgramme, logSession, updateClient, saveFeedback, deleteFeedback } from "@/lib/actions";
import type { Client, ClientSession, ClientFeedback, Exercise, SetLog, Programme, ProgrammeDay, WeekSnapshot } from "@/lib/types";
import { ExerciseInput } from "@/components/ExerciseInput";

const bmi = (w: number, h: number) => (w / (h / 100) ** 2).toFixed(1);

const GOALS          = ["Weight Loss", "Muscle Gain", "Improve Fitness", "Strength", "Flexibility & Mobility", "Athletic Performance"];
const FITNESS_LEVELS = ["Beginner", "Intermediate", "Advanced"];
const EQUIPMENT      = ["Full Gym", "Home Gym (Dumbbells/Bands)", "Bodyweight Only", "Outdoor/Park"];
const GENDERS        = ["Male", "Female", "Other"];

const CARDIO_KW = ["run", "bike", "cycl", "swim", "row", "cardio", "treadmill", "elliptic", "walk", "jog", "sprint", "hiit", "skip", "jump rope", "stair", "rower"];
const isCardio = (name: string) => CARDIO_KW.some(k => name.toLowerCase().includes(k));

function initSetLogs(ex: Exercise): SetLog[] {
  const count = parseInt(ex.sets) || 3;
  if (ex.setLogs && ex.setLogs.length === count) return ex.setLogs;
  return Array.from({ length: count }, (_, i) => ex.setLogs?.[i] ?? { weight: "", reps_done: "", done: false });
}

export default function ClientDetailView({ client: initial, sessions, feedback: initialFeedback, snapshots = [] }: {
  client: Client;
  sessions: ClientSession[];
  feedback: ClientFeedback[];
  snapshots?: WeekSnapshot[];
}) {
  const router = useRouter();
  const [client, setClient]           = useState(initial);
  const [activeDay, setActiveDay]     = useState(0);
  const [tab, setTab]                 = useState<"programme" | "sessions" | "profile" | "feedback" | "progress">("programme");
  const [feedback, setFeedback]       = useState(initialFeedback);
  const [newFeedback, setNewFeedback] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft]     = useState<Partial<Client>>({});
  const [swappingIdx, setSwappingIdx] = useState<number | null>(null);
  const [editingIdx, setEditingIdx]   = useState<number | null>(null);
  const [addingEx, setAddingEx]       = useState(false);
  const [newEx, setNewEx]             = useState({ name: "", sets: "3", reps: "10-12", rpe: "", notes: "" });
  const [sessionNote, setSessionNote] = useState("");
  const [addingNote, setAddingNote]   = useState(false);
  const [expandedEx, setExpandedEx]   = useState<number | null>(null);

  // Multi-week support: trainer can browse any week; defaults to client's current week
  const isMultiWeek = !!client.programme?.weeks;
  const [viewingWeek, setViewingWeek] = useState(client.programme?.currentWeek ?? 0);
  const currentWeekIdx = client.programme?.currentWeek ?? 0;

  function getWeekDays(weekIdx: number) {
    if (client.programme?.weeks) return client.programme.weeks[weekIdx]?.weeklyStructure ?? [];
    return client.programme?.weeklyStructure ?? [];
  }

  function getMutableDays(prog: Programme, weekIdx: number) {
    if (prog.weeks) return prog.weeks[weekIdx].weeklyStructure;
    return prog.weeklyStructure!;
  }

  const days = getWeekDays(viewingWeek);
  const day  = days[activeDay];

  async function saveAndSync(prog: Programme) {
    setClient(c => ({ ...c, programme: prog }));
    await updateProgramme(client.id, prog);
  }

  function toggleSet(exIdx: number, setIdx: number) {
    const prog: Programme = JSON.parse(JSON.stringify(client.programme));
    const ex = getMutableDays(prog, viewingWeek)[activeDay].exercises[exIdx];
    if (!ex.setLogs) ex.setLogs = initSetLogs(ex);
    ex.setLogs[setIdx].done = !ex.setLogs[setIdx].done;
    ex.done = ex.setLogs.every(s => s.done);
    saveAndSync(prog);
  }

  function updateWeight(exIdx: number, setIdx: number, weight: string) {
    const prog: Programme = JSON.parse(JSON.stringify(client.programme));
    const ex = getMutableDays(prog, viewingWeek)[activeDay].exercises[exIdx];
    if (!ex.setLogs) ex.setLogs = initSetLogs(ex);
    ex.setLogs[setIdx].weight = weight;
    saveAndSync(prog);
  }

  function updateRepsDone(exIdx: number, setIdx: number, reps: string) {
    const prog: Programme = JSON.parse(JSON.stringify(client.programme));
    const ex = getMutableDays(prog, viewingWeek)[activeDay].exercises[exIdx];
    if (!ex.setLogs) ex.setLogs = initSetLogs(ex);
    ex.setLogs[setIdx].reps_done = reps;
    saveAndSync(prog);
  }

  async function swapExercise(exIdx: number, replacement: Exercise) {
    const prog: Programme = JSON.parse(JSON.stringify(client.programme));
    getMutableDays(prog, viewingWeek)[activeDay].exercises[exIdx] = { ...replacement, done: false };
    setSwappingIdx(null);
    saveAndSync(prog);
  }

  function updateExercise(exIdx: number, fields: Partial<Exercise>) {
    const prog: Programme = JSON.parse(JSON.stringify(client.programme));
    const dayExercises = getMutableDays(prog, viewingWeek)[activeDay].exercises;
    dayExercises[exIdx] = { ...dayExercises[exIdx], ...fields };
    saveAndSync(prog);
  }

  function deleteExercise(exIdx: number) {
    const prog: Programme = JSON.parse(JSON.stringify(client.programme));
    getMutableDays(prog, viewingWeek)[activeDay].exercises.splice(exIdx, 1);
    setEditingIdx(null);
    setExpandedEx(null);
    saveAndSync(prog);
  }

  function addExercise() {
    if (!newEx.name.trim()) return;
    const prog: Programme = JSON.parse(JSON.stringify(client.programme));
    getMutableDays(prog, viewingWeek)[activeDay].exercises.push({ ...newEx, done: false });
    setNewEx({ name: "", sets: "3", reps: "10-12", rpe: "", notes: "" });
    setAddingEx(false);
    saveAndSync(prog);
  }

  async function submitFeedback() {
    if (!newFeedback.trim()) return;
    setSavingFeedback(true);
    await saveFeedback(client.id, newFeedback.trim());
    setFeedback(f => [{ id: Date.now().toString(), client_id: client.id, trainer_id: "", message: newFeedback.trim(), from_client: false, created_at: new Date().toISOString() }, ...f]);
    setNewFeedback("");
    setSavingFeedback(false);
  }

  async function removeFeedback(id: string) {
    await deleteFeedback(id, client.id);
    setFeedback(f => f.filter(fb => fb.id !== id));
  }

  async function saveProfile() {
    await updateClient(client.id, profileDraft);
    setClient(c => ({ ...c, ...profileDraft }));
    setEditingProfile(false);
    setProfileDraft({});
  }

  function startEditProfile() {
    setProfileDraft({
      age: client.age, weight: client.weight, height: client.height,
      gender: client.gender, goal: client.goal, fitness_level: client.fitness_level,
      equipment: client.equipment, days_per_week: client.days_per_week,
      session_duration: client.session_duration, injuries: client.injuries, notes: client.notes,
      pin: client.pin,
    });
    setEditingProfile(true);
  }

  async function resetWeek() {
    const prog: Programme = JSON.parse(JSON.stringify(client.programme));
    // Preserve current data before wiping
    await fetch("/api/client/snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: client.id,
        weekLabel: prog.weeks ? `Week ${prog.weeks[viewingWeek].weekNumber}: ${prog.weeks[viewingWeek].label}` : "Week",
        days: getMutableDays(prog, viewingWeek),
      }),
    });
    getMutableDays(prog, viewingWeek).forEach(day =>
      day.exercises.forEach(ex => {
        ex.done = false;
        if (ex.setLogs) ex.setLogs.forEach(s => { s.done = false; s.reps_done = ""; });
      })
    );
    await saveAndSync(prog);
  }

  const [generatingBlock, setGeneratingBlock] = useState(false);

  async function generateNextBlock() {
    if (!confirm("Generate a new 4-week block based on this client's logged performance? The current programme will be replaced (completed weeks stay saved in history).")) return;
    setGeneratingBlock(true);
    try {
      // Best logged weight per exercise across history + current programme
      const allDayLists: ProgrammeDay[][] = [
        ...snapshots.map(s => s.days),
        ...(client.programme?.weeks?.map(w => w.weeklyStructure) ?? []),
        client.programme?.weeklyStructure ?? [],
      ];
      const bests = new Map<string, number>();
      allDayLists.forEach(dl => dl?.forEach(d => d.exercises.forEach(ex => {
        ex.setLogs?.forEach(s => {
          const w = parseFloat(s.weight);
          if (!isNaN(w) && w > (bests.get(ex.name) ?? 0)) bests.set(ex.name, w);
        });
      })));
      const perf = Array.from(bests.entries()).map(([n, w]) => `- ${n}: best logged ${w}kg`).join("\n")
        || "No weights logged yet — estimate sensible starting loads for their level.";

      const prompt = `
You are designing the NEXT 4-week progressive training block for a client who has just completed their previous programme. Progress them from their ACTUAL logged performance below — do not start them over as a beginner.

CLIENT PROFILE:
- Name: ${client.name}, Age: ${client.age}, Gender: ${client.gender}
- Weight: ${client.weight}kg, Height: ${client.height}cm
- Goal: ${client.goal}, Fitness Level: ${client.fitness_level}
- Equipment: ${client.equipment}, Days/Week: ${client.days_per_week}, Session: ${client.session_duration ?? 60} min
- Injuries: ${client.injuries || "None"}

LOGGED PERFORMANCE (their current strength — build on this):
${perf}

REQUIREMENTS:
- Reference their logged weights in coaching notes (e.g. "start at 42.5kg, you hit 40kg last block")
- Keep most exercises they know, add 1-2 new variations per day for freshness
- Same 4-week progression: W1 "Foundation" 3x12-15 RPE6, W2 "Build" 3x10-12 RPE7, W3 "Overload" 4x8-10 RPE8, W4 "Peak" 4x6-8 RPE9
- Same exercises across all 4 weeks of this block

Return ONLY a JSON object, no markdown:
{
  "summary": "3-4 sentences referencing their progress and what this block targets",
  "currentWeek": 0,
  "weeks": [
    { "weekNumber": 1, "label": "Foundation", "weeklyStructure": [ { "label": "DAY 1", "focus": "...", "exercises": [{ "name": "...", "sets": "3", "reps": "12-15", "rpe": "6", "notes": "..." }] } ] },
    { "weekNumber": 2, "label": "Build", "weeklyStructure": [...] },
    { "weekNumber": 3, "label": "Overload", "weeklyStructure": [...] },
    { "weekNumber": 4, "label": "Peak", "weeklyStructure": [...] }
  ]
}`;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemPrompt: "You are an elite personal trainer. Return only valid JSON." }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "API error");
      const programme: Programme = JSON.parse(json.text.replace(/```json|```/g, "").trim());

      await updateProgramme(client.id, programme);
      setClient(c => ({ ...c, programme }));
      setViewingWeek(0);
      setActiveDay(0);
    } catch (e) {
      console.error(e);
      alert("Failed to generate the next block. Please try again.");
    }
    setGeneratingBlock(false);
  }

  async function setClientWeek(weekIdx: number) {
    const prog: Programme = JSON.parse(JSON.stringify(client.programme));
    prog.currentWeek = weekIdx;
    await saveAndSync(prog);
    setViewingWeek(weekIdx);
  }

  async function saveSession() {
    await logSession(client.id, day?.label ?? "", sessionNote);
    setSessionNote("");
    setAddingNote(false);
    router.refresh();
  }

  const exercises  = day?.exercises ?? [];
  const completed  = exercises.filter(e => e.done).length;
  const total      = exercises.length;
  const pct        = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <button onClick={() => router.push("/trainer/dashboard")}
        style={{ background: "none", border: "none", color: C.muted, fontSize: 14, cursor: "pointer", marginBottom: 24, display: "flex", alignItems: "center", gap: 6 }}
      >
        ← Back to clients
      </button>

      {/* Header card */}
      <div style={{
        background: `linear-gradient(135deg, ${C.card} 0%, ${C.accent}14 100%)`,
        border: `1px solid ${C.border}`, borderRadius: 20, padding: 24, marginBottom: 24,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 800, color: "#000",
          }}>
            {client.name[0].toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{client.name}</h2>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Tag label={client.goal} color={C.accent} />
              <Tag label={client.fitness_level} color={C.blue} />
              <Tag label={`${client.days_per_week}×/week`} color={C.warn} />
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>BMI</div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "JetBrains Mono", color: C.accent }}>{bmi(client.weight, client.height)}</div>
          <div style={{ fontSize: 12, color: C.muted }}>{client.weight}kg · {client.height}cm</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: C.card, borderRadius: 14, padding: 4, flexWrap: "wrap" }}>
        {(["programme", "sessions", "progress", "profile", "feedback"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? C.accent : "transparent",
            color: tab === t ? "#000" : C.muted,
            border: "none", borderRadius: 10, padding: "9px 20px",
            fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "all .15s", textTransform: "capitalize",
          }}>{t}</button>
        ))}
      </div>

      {/* ── PROGRAMME ── */}
      {tab === "programme" && (
        <>
          {client.programme?.summary && (
            <div style={{
              background: `linear-gradient(135deg, ${C.accent}12, ${C.blue}08)`,
              border: `1px solid ${C.accent}33`, borderRadius: 16, padding: 18, marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>PROGRAMME OVERVIEW</div>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{client.programme.summary}</p>
            </div>
          )}

          {/* Multi-week tabs */}
          {isMultiWeek && client.programme?.weeks && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>PROGRAMME WEEKS</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {client.programme.weeks.map((w, i) => {
                  const isClientHere = i === currentWeekIdx;
                  const isViewing = i === viewingWeek;
                  return (
                    <button key={i} onClick={() => { setViewingWeek(i); setActiveDay(0); setExpandedEx(null); }} style={{
                      background: isViewing ? C.accent : C.card,
                      color: isViewing ? "#000" : isClientHere ? C.accent : C.muted,
                      border: `1px solid ${isViewing ? C.accent : isClientHere ? `${C.accent}50` : C.border}`,
                      borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 12,
                      cursor: "pointer", transition: "all .15s", display: "flex", alignItems: "center", gap: 6,
                    }}>
                      <span>W{w.weekNumber} {w.label}</span>
                      {isClientHere && !isViewing && <span style={{ fontSize: 9, background: `${C.accent}20`, borderRadius: 4, padding: "1px 5px", color: C.accent }}>CURRENT</span>}
                      {isClientHere && isViewing && <span style={{ fontSize: 9, background: "#00000020", borderRadius: 4, padding: "1px 5px" }}>CURRENT</span>}
                    </button>
                  );
                })}
              </div>
              {viewingWeek !== currentWeekIdx && (
                <button onClick={() => setClientWeek(viewingWeek)} style={{
                  marginTop: 8, background: "transparent", border: `1px solid ${C.accent}50`,
                  borderRadius: 8, color: C.accent, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  Set Week {viewingWeek + 1} as client&apos;s current week
                </button>
              )}
            </div>
          )}

          {/* Programme actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <button onClick={generateNextBlock} disabled={generatingBlock} style={{
              background: `${C.accent}15`, border: `1px solid ${C.accent}45`, borderRadius: 10,
              color: C.accent, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
              opacity: generatingBlock ? 0.6 : 1,
            }}>
              {generatingBlock ? "Generating…" : "⚡ Generate Next Block (AI)"}
            </button>
            <button onClick={resetWeek} style={{
              background: "transparent", border: `1px solid ${C.border}`, borderRadius: 10,
              color: C.muted, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>
              ↺ Reset Week Progress
            </button>
          </div>

          {/* Day pills */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {days.map((d, i) => (
              <button key={i} onClick={() => { setActiveDay(i); setExpandedEx(null); }} style={{
                background: activeDay === i ? C.accent : C.card,
                color: activeDay === i ? "#000" : C.muted,
                border: `1px solid ${activeDay === i ? C.accent : C.border}`,
                borderRadius: 10, padding: "8px 16px", fontWeight: 700, fontSize: 13, transition: "all .15s",
              }}>
                {d.label}
                {activeDay === i && total > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>{pct}%</span>
                )}
              </button>
            ))}
          </div>

          {/* Progress bar */}
          {total > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Session Progress</span>
                <span>{completed}/{total} exercises complete</span>
              </div>
              <div style={{ background: C.border, borderRadius: 8, height: 8, overflow: "hidden" }}>
                <div style={{
                  background: `linear-gradient(90deg, ${C.accent}, ${C.blue})`,
                  width: `${pct}%`, height: "100%", borderRadius: 8, transition: "width .4s ease",
                }} />
              </div>
            </div>
          )}

          {/* Exercises */}
          {day && (
            <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${C.border}` }}>
              <div style={{ background: C.card, padding: "12px 18px", display: "flex", gap: 10, alignItems: "center", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 11, color: C.accent, fontWeight: 700 }}>{day.label}</span>
                <span style={{ color: C.muted, fontSize: 14 }}>{day.focus}</span>
              </div>
              <div style={{ background: C.bg }}>
                {exercises.map((ex, i) => (
                  <ExerciseCard
                    key={i} ex={ex} idx={i}
                    expanded={expandedEx === i}
                    editing={editingIdx === i}
                    onToggle={() => { setExpandedEx(expandedEx === i ? null : i); setEditingIdx(null); }}
                    onToggleSet={(si) => toggleSet(i, si)}
                    onWeightChange={(si, w) => updateWeight(i, si, w)}
                    onRepsDoneChange={(si, r) => updateRepsDone(i, si, r)}
                    onSwap={() => setSwappingIdx(i)}
                    onEdit={() => { setEditingIdx(editingIdx === i ? null : i); setExpandedEx(null); }}
                    onUpdate={(fields) => updateExercise(i, fields)}
                    onDelete={() => deleteExercise(i)}
                  />
                ))}

                {/* Add Exercise */}
                {addingEx ? (
                  <div style={{ padding: "16px 18px", borderTop: `1px solid ${C.border}`, background: C.card }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 12, letterSpacing: 1 }}>ADD EXERCISE</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <ExerciseInput
                        autoFocus
                        value={newEx.name}
                        onChange={v => setNewEx(n => ({ ...n, name: v }))}
                      />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                        {[
                          { label: "Sets", key: "sets", placeholder: "3" },
                          { label: "Reps", key: "reps", placeholder: "10-12" },
                          { label: "RPE", key: "rpe", placeholder: "7" },
                          { label: "Notes", key: "notes", placeholder: "Cue…" },
                        ].map(({ label, key, placeholder }) => (
                          <div key={key}>
                            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4 }}>{label}</div>
                            <input
                              value={(newEx as Record<string, string>)[key]}
                              onChange={e => setNewEx(n => ({ ...n, [key]: e.target.value }))}
                              placeholder={placeholder}
                              onKeyDown={e => e.key === "Enter" && addExercise()}
                              style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 13, outline: "none", width: "100%" }}
                              onFocus={e => (e.target.style.borderColor = C.accent)}
                              onBlur={e => (e.target.style.borderColor = C.border)}
                            />
                          </div>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <button onClick={addExercise} style={{ background: C.accent, color: "#000", border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13 }}>Add</button>
                        <button onClick={() => { setAddingEx(false); setNewEx({ name: "", sets: "3", reps: "10-12", rpe: "", notes: "" }); }} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, padding: "8px 18px", fontSize: 13 }}>Cancel</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "12px 18px", borderTop: `1px solid ${C.border}` }}>
                    <button onClick={() => setAddingEx(true)} style={{ background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 8, color: C.muted, padding: "8px 16px", fontSize: 13, fontWeight: 600, width: "100%" }}>
                      + Add Exercise
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Session complete */}
          {pct === 100 && (
            <div style={{ marginTop: 20, background: `linear-gradient(135deg, ${C.accent}15, ${C.accent}05)`, border: `1px solid ${C.accent}44`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontWeight: 800, color: C.accent, fontSize: 16, marginBottom: 12 }}>🏆 Session Complete!</div>
              {addingNote ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <textarea value={sessionNote} onChange={e => setSessionNote(e.target.value)}
                    placeholder="Session notes, PBs, client feedback…"
                    style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 13, minHeight: 70, outline: "none", resize: "vertical" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn onClick={saveSession}>Save Session</Btn>
                    <Btn variant="ghost" onClick={() => setAddingNote(false)}>Cancel</Btn>
                  </div>
                </div>
              ) : (
                <Btn onClick={() => setAddingNote(true)}>Log Session Notes</Btn>
              )}
            </div>
          )}
        </>
      )}

      {/* ── SESSIONS ── */}
      {tab === "sessions" && (
        <div>
          {sessions.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 14, textAlign: "center", padding: "60px 0" }}>
              No sessions logged yet. Sessions are recorded automatically when a client completes all exercises in a day.
            </div>
          ) : (() => {
            // Group by calendar week (Mon–Sun), most recent first
            const weekMap = new Map<string, typeof sessions>();
            sessions.forEach(s => {
              const d = new Date(s.created_at);
              // Use Monday as week start
              const day = d.getDay();
              const diff = (day === 0 ? -6 : 1 - day);
              const mon = new Date(d);
              mon.setDate(d.getDate() + diff);
              const key = mon.toISOString().slice(0, 10);
              if (!weekMap.has(key)) weekMap.set(key, []);
              weekMap.get(key)!.push(s);
            });

            const progWeeks = client.programme?.weeks;
            // Sort calendar weeks oldest→newest to assign programme week labels in order
            const sortedKeys = Array.from(weekMap.keys()).sort((a, b) => a.localeCompare(b));

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {[...sortedKeys].reverse().map((weekKey, reversedIdx) => {
                  const weekSessions = weekMap.get(weekKey)!.sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  );
                  const progWeekIdx = sortedKeys.length - 1 - reversedIdx;
                  const progWeek = progWeeks?.[progWeekIdx];
                  const weekLabel = progWeek
                    ? `Week ${progWeek.weekNumber}: ${progWeek.label}`
                    : `Week ${progWeekIdx + 1}`;
                  const monDate = new Date(weekKey);
                  const dateStr = monDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

                  return (
                    <div key={weekKey}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                        <div style={{ background: `${C.accent}18`, border: `1px solid ${C.accent}35`, borderRadius: 8, padding: "5px 14px" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, fontFamily: "Saira, sans-serif" }}>{weekLabel}</span>
                        </div>
                        <span style={{ fontSize: 12, color: C.muted }}>
                          w/c {dateStr} · {weekSessions.length}/{client.days_per_week} sessions
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 12, borderLeft: `2px solid ${C.accent}30` }}>
                        {weekSessions.map(s => (
                          <div key={s.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: s.note ? 6 : 0 }}>
                              <span style={{ fontWeight: 700, fontSize: 14 }}>{s.day_label}</span>
                              <span style={{ fontSize: 12, color: C.muted }}>
                                {new Date(s.created_at).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                              </span>
                            </div>
                            {s.note && <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: 0 }}>{s.note}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── PROFILE ── */}
      {tab === "profile" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            {editingProfile ? (
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={saveProfile}>Save Changes</Btn>
                <Btn variant="ghost" onClick={() => { setEditingProfile(false); setProfileDraft({}); }}>Cancel</Btn>
              </div>
            ) : (
              <Btn onClick={startEditProfile}>✏️ Edit Profile</Btn>
            )}
          </div>

          {editingProfile ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Numeric / text fields */}
              {([
                { label: "Age", key: "age", type: "number" },
                { label: "Weight (kg)", key: "weight", type: "number" },
                { label: "Height (cm)", key: "height", type: "number" },
                { label: "Login PIN (4-6 digits)", key: "pin", type: "text" },
              ] as { label: string; key: keyof typeof profileDraft; type: string }[]).map(({ label, key, type }) => (
                <div key={key} style={{ background: C.card, border: `1px solid ${C.accent}40`, borderRadius: 14, padding: "14px 18px" }}>
                  <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginBottom: 6, letterSpacing: .5 }}>{label.toUpperCase()}</div>
                  <input
                    type={type}
                    value={String(profileDraft[key] ?? "")}
                    onChange={e => setProfileDraft(d => ({ ...d, [key]: type === "number" ? +e.target.value : e.target.value }))}
                    style={{ background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 15, fontWeight: 700, width: "100%", fontFamily: "inherit" }}
                  />
                </div>
              ))}

              {/* Dropdown fields */}
              {([
                { label: "Gender", key: "gender", options: GENDERS },
                { label: "Fitness Level", key: "fitness_level", options: FITNESS_LEVELS },
                { label: "Equipment", key: "equipment", options: EQUIPMENT },
                { label: "Days/Week", key: "days_per_week", options: ["3", "4", "5", "6"] },
                { label: "Session Duration (min)", key: "session_duration", options: ["30", "45", "60", "75", "90", "120"] },
              ] as { label: string; key: keyof typeof profileDraft; options: string[] }[]).map(({ label, key, options }) => {
                const current = String(profileDraft[key] ?? "");
                const isNumeric = key === "days_per_week" || key === "session_duration";
                return (
                  <div key={key} style={{ background: C.card, border: `1px solid ${C.accent}40`, borderRadius: 14, padding: "14px 18px" }}>
                    <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginBottom: 6, letterSpacing: .5 }}>{label.toUpperCase()}</div>
                    <select
                      value={current}
                      onChange={e => setProfileDraft(d => ({ ...d, [key]: isNumeric ? +e.target.value : e.target.value }))}
                      style={{ background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 15, fontWeight: 700, width: "100%", fontFamily: "inherit", cursor: "pointer" }}
                    >
                      {/* keep unusual legacy value selectable */}
                      {current && !options.includes(current) && <option value={current}>{current}</option>}
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                );
              })}

              {/* Goals: multi-select chips */}
              <div style={{ gridColumn: "1/-1", background: C.card, border: `1px solid ${C.accent}40`, borderRadius: 14, padding: "14px 18px" }}>
                <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, marginBottom: 10, letterSpacing: .5 }}>GOALS (SELECT ALL THAT APPLY)</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(() => {
                    const selected = String(profileDraft.goal ?? "").split(" + ").filter(Boolean);
                    const toggle = (g: string) => {
                      const has = selected.includes(g);
                      if (has && selected.length === 1) return; // keep at least one
                      const next = has ? selected.filter(x => x !== g) : [...selected, g];
                      setProfileDraft(d => ({ ...d, goal: next.join(" + ") }));
                    };
                    // include any legacy custom goal as its own chip
                    const all = [...GOALS, ...selected.filter(g => !GOALS.includes(g))];
                    return all.map(g => {
                      const on = selected.includes(g);
                      return (
                        <button key={g} type="button" onClick={() => toggle(g)} style={{
                          background: on ? `${C.accent}20` : C.bg,
                          color: on ? C.accent : C.muted,
                          border: `1px solid ${on ? C.accent : C.border}`,
                          borderRadius: 10, padding: "7px 13px", fontWeight: 600, fontSize: 13,
                          transition: "all .15s",
                        }}>
                          {on ? "✓ " : ""}{g}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
              <div style={{ gridColumn: "1/-1", background: C.card, border: `1px solid ${C.warn}44`, borderRadius: 14, padding: "14px 18px" }}>
                <div style={{ fontSize: 11, color: C.warn, fontWeight: 700, marginBottom: 6 }}>INJURIES / LIMITATIONS</div>
                <textarea
                  value={String(profileDraft.injuries ?? "")}
                  onChange={e => setProfileDraft(d => ({ ...d, injuries: e.target.value }))}
                  rows={2}
                  style={{ background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 14, width: "100%", resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
              <div style={{ gridColumn: "1/-1", background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 18px" }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 6 }}>TRAINER NOTES</div>
                <textarea
                  value={String(profileDraft.notes ?? "")}
                  onChange={e => setProfileDraft(d => ({ ...d, notes: e.target.value }))}
                  rows={2}
                  style={{ background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 14, width: "100%", resize: "vertical", fontFamily: "inherit" }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {([
                ["Age", `${client.age} years`], ["Weight", `${client.weight} kg`],
                ["Height", `${client.height} cm`], ["Gender", client.gender],
                ["Equipment", client.equipment], ["Goal", client.goal],
                ["Fitness Level", client.fitness_level], ["Days/Week", `${client.days_per_week} days`],
                ["Session Duration", `${client.session_duration ?? 60} min`],
                ["Login PIN", client.pin ? `🔒 ${client.pin}` : "⚠ Not set — anyone with their name can log in"],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 18px" }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4, letterSpacing: .5 }}>{k.toUpperCase()}</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{v}</div>
                </div>
              ))}
              {client.injuries && (
                <div style={{ gridColumn: "1/-1", background: C.card, border: `1px solid ${C.warn}44`, borderRadius: 14, padding: "14px 18px" }}>
                  <div style={{ fontSize: 11, color: C.warn, fontWeight: 700, marginBottom: 4 }}>INJURIES / LIMITATIONS</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6 }}>{client.injuries}</div>
                </div>
              )}
              {client.notes && (
                <div style={{ gridColumn: "1/-1", background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 18px" }}>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 4 }}>TRAINER NOTES</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: C.muted }}>{client.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PROGRESS ── */}
      {tab === "progress" && (
        <div>
          {/* Strength over time */}
          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>
            STRENGTH PROGRESSION
          </div>
          <StrengthChart snapshots={snapshots} currentDays={days} />

          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, margin: "28px 0 16px" }}>
            SESSIONS OVER TIME ({sessions.length} total)
          </div>
          {sessions.length < 2 ? (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "60px 20px", textAlign: "center", color: C.muted, fontSize: 14 }}>
              Log at least 2 sessions to see a progress chart.
            </div>
          ) : (
            <ProgressChart sessions={sessions} />
          )}

          {/* Sessions per week summary */}
          {sessions.length > 0 && (
            <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "Total Sessions", value: sessions.length },
                { label: "This Month", value: sessions.filter(s => new Date(s.created_at) > new Date(Date.now() - 30 * 864e5)).length },
                { label: "This Week", value: sessions.filter(s => new Date(s.created_at) > new Date(Date.now() - 7 * 864e5)).length },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "JetBrains Mono", color: C.accent }}>{value}</div>
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginTop: 4, letterSpacing: 0.5 }}>{label.toUpperCase()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FEEDBACK ── */}
      {tab === "feedback" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>SEND MESSAGE TO CLIENT</div>
            <textarea
              value={newFeedback}
              onChange={e => setNewFeedback(e.target.value)}
              placeholder="Write feedback, progress notes, encouragement or corrections for your client…"
              rows={3}
              style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit", marginBottom: 10 }}
              onFocus={e => (e.target.style.borderColor = C.accent)}
              onBlur={e => (e.target.style.borderColor = C.border)}
            />
            <Btn onClick={submitFeedback}>{savingFeedback ? "Sending…" : "Send Message"}</Btn>
          </div>

          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>
            CONVERSATION ({feedback.length})
          </div>
          {feedback.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 14, textAlign: "center", padding: "40px 0" }}>No messages yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {feedback.map(fb => (
                <div key={fb.id} style={{
                  background: fb.from_client ? `${C.warn}10` : C.card,
                  border: `1px solid ${fb.from_client ? `${C.warn}33` : C.border}`,
                  borderRadius: 14, padding: "14px 18px",
                  marginLeft: fb.from_client ? 0 : 24,
                  marginRight: fb.from_client ? 24 : 0,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: fb.from_client ? C.warn : C.accent, letterSpacing: 0.5 }}>
                      {fb.from_client ? `${client.name.toUpperCase()} (CLIENT)` : "YOU (TRAINER)"}
                    </span>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: C.muted }}>{new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                      {!fb.from_client && (
                        <button onClick={() => removeFeedback(fb.id)} style={{ background: "transparent", border: "none", color: C.danger, fontSize: 12, cursor: "pointer", opacity: 0.6 }}>✕</button>
                      )}
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7, margin: 0 }}>{fb.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {swappingIdx !== null && day && (
        <SwapModal
          exercise={day.exercises[swappingIdx]}
          currentExercises={day.exercises.map(e => e.name)}
          client={client}
          onSwap={newEx => swapExercise(swappingIdx, newEx)}
          onClose={() => setSwappingIdx(null)}
        />
      )}
    </div>
  );
}

// ── Exercise card with per-set weight tracking ─────────────────────────────

function ExerciseCard({ ex, idx, expanded, editing, onToggle, onToggleSet, onWeightChange, onRepsDoneChange, onSwap, onEdit, onUpdate, onDelete }: {
  ex: Exercise; idx: number; expanded: boolean; editing: boolean;
  onToggle: () => void;
  onToggleSet: (setIdx: number) => void;
  onWeightChange: (setIdx: number, weight: string) => void;
  onRepsDoneChange: (setIdx: number, reps: string) => void;
  onSwap: () => void;
  onEdit: () => void;
  onUpdate: (fields: Partial<Exercise>) => void;
  onDelete: () => void;
}) {
  const setLogs = initSetLogs(ex);
  const doneSets = setLogs.filter(s => s.done).length;
  const allDone  = doneSets === setLogs.length;
  const cardio   = isCardio(ex.name);

  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, background: editing ? `${C.accent}05` : allDone ? `${C.accent}08` : "transparent", transition: "background .3s" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer" }} onClick={onToggle}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: allDone ? C.accent : "transparent",
          border: `2px solid ${allDone ? C.accent : C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, color: allDone ? "#000" : C.muted, fontWeight: 700, transition: "all .2s",
        }}>
          {allDone ? "✓" : `${doneSets}/${setLogs.length}`}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: allDone ? C.muted : C.text, textDecoration: allDone ? "line-through" : "none" }}>{ex.name}</div>
          <div style={{ fontSize: 12, color: C.muted, fontFamily: "JetBrains Mono", marginTop: 2 }}>
            {ex.sets} sets × {ex.reps}{ex.rpe ? ` · RPE ${ex.rpe}` : ""}
          </div>
          {ex.notes && <div style={{ fontSize: 12, color: C.blue, marginTop: 3 }}>{ex.notes}</div>}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button onClick={e => { e.stopPropagation(); onEdit(); }} style={{
            background: editing ? C.accent : "transparent", border: `1px solid ${editing ? C.accent : C.border}`,
            borderRadius: 8, color: editing ? "#000" : C.muted, padding: "5px 10px", fontSize: 12, fontWeight: 600,
          }}>✏️ Edit</button>
          <button onClick={e => { e.stopPropagation(); onSwap(); }} style={{
            background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.muted, padding: "5px 10px", fontSize: 12, fontWeight: 600,
          }}>↔ Swap</button>
          <span style={{ color: C.muted, fontSize: 16, userSelect: "none" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Edit mode */}
      {editing && (
        <div style={{ padding: "0 18px 16px 58px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
            {([
              { label: "Exercise Name", key: "name", span: true },
              { label: "Sets", key: "sets" },
              { label: "Reps", key: "reps" },
              { label: "RPE", key: "rpe" },
              { label: "Coaching Notes", key: "notes", span: true },
            ] as { label: string; key: keyof Exercise; span?: boolean }[]).map(({ label, key, span }) => (
              <div key={key} style={{ gridColumn: span ? "1 / -1" : undefined }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4 }}>{label}</div>
                {key === "name" ? (
                  <ExerciseInput
                    value={String(ex.name ?? "")}
                    onChange={v => onUpdate({ name: v })}
                    placeholder={label}
                    style={{ padding: "8px 10px", fontSize: 13 }}
                  />
                ) : (
                  <input
                    value={String(ex[key] ?? "")}
                    onChange={e => onUpdate({ [key]: e.target.value })}
                    placeholder={label}
                    style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 13, outline: "none", width: "100%" }}
                    onFocus={e => (e.target.style.borderColor = C.accent)}
                    onBlur={e => (e.target.style.borderColor = C.border)}
                  />
                )}
              </div>
            ))}
          </div>
          <button onClick={onDelete} style={{ background: "transparent", border: `1px solid ${C.danger}44`, borderRadius: 8, color: C.danger, padding: "6px 14px", fontSize: 12, fontWeight: 600 }}>
            🗑 Remove Exercise
          </button>
        </div>
      )}

      {/* Expanded set rows */}
      {expanded && !editing && (
        <div style={{ padding: "0 18px 16px 58px", display: "flex", flexDirection: "column", gap: 6 }}>
          {cardio && (
            <div style={{ background: `${C.accent}10`, border: `1px solid ${C.accent}30`, borderRadius: 8, padding: "5px 10px", marginBottom: 8, fontSize: 12, color: C.accent, fontWeight: 600 }}>
              Cardio — time (min) and distance (km)
            </div>
          )}
          <div className="set-grid-head">
            {["#", "TARGET", cardio ? "MIN" : "REPS", cardio ? "KM" : "KG", "✓"].map(h => (
              <span key={h} style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: .5 }}>{h}</span>
            ))}
          </div>
          {setLogs.map((s, si) => (
            <div key={si} className="set-grid" style={{
              background: s.done ? `${C.accent}10` : C.card,
              borderRadius: 10, padding: "8px 10px",
              border: `1px solid ${s.done ? `${C.accent}33` : "transparent"}`,
              transition: "all .2s",
            }}>
              <span style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: C.muted, fontWeight: 700 }}>{si + 1}</span>
              <span style={{ fontSize: 12, color: C.muted, fontFamily: "JetBrains Mono" }}>{ex.reps}{ex.rpe ? ` @${ex.rpe}` : ""}</span>
              <input
                type="number" value={s.reps_done ?? ""} placeholder={cardio ? "min" : "reps"}
                onChange={e => onRepsDoneChange(si, e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 6px", color: C.text, fontSize: 13, outline: "none", width: "100%", fontFamily: "JetBrains Mono" }}
                onFocus={e => (e.target.style.borderColor = C.accent)}
                onBlur={e  => (e.target.style.borderColor = C.border)}
              />
              <input
                type="number" value={s.weight} placeholder={cardio ? "km" : "kg"}
                onChange={e => onWeightChange(si, e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 6px", color: C.text, fontSize: 13, outline: "none", width: "100%", fontFamily: "JetBrains Mono" }}
                onFocus={e => (e.target.style.borderColor = C.accent)}
                onBlur={e  => (e.target.style.borderColor = C.border)}
              />
              <div style={{ display: "flex", justifyContent: "center" }}>
                <input type="checkbox" checked={s.done}
                  onChange={e => { e.stopPropagation(); onToggleSet(si); }}
                  style={{ width: 17, height: 17, accentColor: C.accent, cursor: "pointer" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Swap modal ─────────────────────────────────────────────────────────────

function SwapModal({ exercise, currentExercises, client, onSwap, onClose }: {
  exercise: Exercise;
  currentExercises: string[];
  client: Client;
  onSwap: (ex: Exercise) => void;
  onClose: () => void;
}) {
  const [loading, setLoading]         = useState(true);
  const [suggestions, setSuggestions] = useState<Exercise[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const otherExercises = currentExercises.filter(n => n !== exercise.name);
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `Suggest 4 alternative exercises to replace "${exercise.name}" for this client:
- Age: ${client.age}, Weight: ${client.weight}kg, Gender: ${client.gender}
- Goal: ${client.goal}, Fitness Level: ${client.fitness_level}
- Equipment: ${client.equipment}
- Injuries: ${client.injuries || "None"}

The replacement must:
1. Train the same muscle group as "${exercise.name}"
2. NOT be any of these exercises already in today's session: ${otherExercises.join(", ")}
3. Match their fitness level (${client.fitness_level}) and available equipment (${client.equipment})
4. Keep the same sets/reps structure: ${exercise.sets} sets × ${exercise.reps}

Return ONLY a JSON array, no markdown. Each item: { "name": string, "sets": string, "reps": string, "rpe": string, "notes": string }`,
            systemPrompt: "You are an expert personal trainer. Return only valid JSON.",
          }),
        });
        const { text } = await res.json();
        setSuggestions(JSON.parse(text.replace(/```json|```/g, "").trim()));
      } catch {
        setSuggestions([{ name: "Bodyweight Squat", sets: "3", reps: "15", notes: "Great alternative" }]);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000b", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 24, width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Swap Exercise</div>
            <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>Replacing: {exercise.name}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, padding: "5px 10px", fontSize: 13 }}>✕</button>
        </div>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>AI SUGGESTIONS</div>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 32 }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {suggestions.map((s, i) => (
              <div key={i} onClick={() => onSwap(s)} style={{
                background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12,
                padding: "12px 16px", cursor: "pointer", transition: "all .15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = `${C.accent}08`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bg; }}
              >
                <div style={{ fontWeight: 700 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: C.muted, fontFamily: "JetBrains Mono", marginTop: 2 }}>{s.sets} sets × {s.reps}</div>
                {s.notes && <div style={{ fontSize: 12, color: C.blue, marginTop: 3 }}>{s.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Strength progression chart ─────────────────────────────────────────────

function maxWeight(days: ProgrammeDay[], exName: string): number | null {
  let max: number | null = null;
  days.forEach(d => d.exercises.forEach(ex => {
    if (ex.name === exName && ex.setLogs) {
      ex.setLogs.forEach(s => {
        const w = parseFloat(s.weight);
        if (!isNaN(w) && w > 0 && (max === null || w > max)) max = w;
      });
    }
  }));
  return max;
}

function StrengthChart({ snapshots, currentDays }: { snapshots: WeekSnapshot[]; currentDays: ProgrammeDay[] }) {
  // All exercise names that have at least one logged weight anywhere
  const names = new Set<string>();
  [...snapshots.map(s => s.days), currentDays].forEach(days =>
    days?.forEach(d => d.exercises.forEach(ex => {
      if (ex.setLogs?.some(s => parseFloat(s.weight) > 0)) names.add(ex.name);
    }))
  );
  const exercises = Array.from(names).sort();
  const [selected, setSelected] = useState<string>("");
  const exName = selected || exercises[0] || "";

  if (!exercises.length) {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "40px 20px", textAlign: "center", color: C.muted, fontSize: 14 }}>
        No weights logged yet. Once the client records weights, their strength progression will appear here week by week.
      </div>
    );
  }

  // Build data points: one per snapshot (completed weeks) + current live week
  const points: { label: string; date: string; value: number }[] = [];
  snapshots.forEach((s, i) => {
    const v = maxWeight(s.days, exName);
    if (v !== null) points.push({
      label: s.week_label || `Week ${i + 1}`,
      date: new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      value: v,
    });
  });
  const cur = maxWeight(currentDays, exName);
  if (cur !== null) points.push({ label: "Current", date: "now", value: cur });

  const first = points[0]?.value;
  const last = points[points.length - 1]?.value;
  const gain = first && last ? last - first : 0;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 16px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <select value={exName} onChange={e => setSelected(e.target.value)}
          style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "7px 12px", color: C.text, fontSize: 13, fontWeight: 600, outline: "none" }}>
          {exercises.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        {points.length >= 2 && (
          <span style={{ fontSize: 13, fontWeight: 700, color: gain >= 0 ? "#34D399" : C.danger, fontFamily: "JetBrains Mono" }}>
            {gain >= 0 ? "▲" : "▼"} {Math.abs(gain)}kg {gain >= 0 ? "gained" : ""} ({first}kg → {last}kg)
          </span>
        )}
      </div>

      {points.length < 2 ? (
        <div style={{ padding: "30px 10px", textAlign: "center", color: C.muted, fontSize: 13 }}>
          {points.length === 1
            ? `Current best: ${points[0].value}kg. Complete more weeks to see the trend.`
            : "No weight data for this exercise yet."}
        </div>
      ) : (() => {
        const W = 560, H = 180, padL = 40, padR = 16, padT = 20, padB = 36;
        const chartW = W - padL - padR, chartH = H - padT - padB;
        const maxV = Math.max(...points.map(p => p.value));
        const minV = Math.min(...points.map(p => p.value));
        const range = maxV - minV || 1;
        const pts = points.map((p, i) => ({
          x: padL + (i / (points.length - 1)) * chartW,
          y: padT + (1 - (p.value - minV) / range) * chartH * 0.85 + chartH * 0.05,
          ...p,
        }));
        const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
        const area = `${pts[0].x},${padT + chartH} ${polyline} ${pts[pts.length - 1].x},${padT + chartH}`;
        return (
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
            {[0, 1, 2, 3].map(i => {
              const y = padT + (i / 3) * chartH;
              return <line key={i} x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />;
            })}
            <defs>
              <linearGradient id="strengthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34D399" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={area} fill="url(#strengthGrad)" />
            <polyline points={polyline} fill="none" stroke="#34D399" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={4} fill="#34D399" stroke="var(--surface)" strokeWidth={2} />
                <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={10} fill="var(--text)" fontWeight="700">{p.value}kg</text>
                <text x={p.x} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--muted)">{p.label.replace(/Week (\d+).*/, "W$1")}</text>
              </g>
            ))}
          </svg>
        );
      })()}
    </div>
  );
}

// ── Progress chart ─────────────────────────────────────────────────────────

function ProgressChart({ sessions }: { sessions: ClientSession[] }) {
  const sorted = [...sessions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Bucket by week
  const weekMap = new Map<string, number>();
  sorted.forEach(s => {
    const d = new Date(s.created_at);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
  });
  const weeks = Array.from(weekMap.entries()).sort(([a], [b]) => a.localeCompare(b));
  if (weeks.length === 0) return null;

  const maxVal = Math.max(...weeks.map(([, v]) => v));
  const W = 560, H = 180, padL = 28, padR = 16, padT = 20, padB = 36;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const pts = weeks.map(([, v], i) => ({
    x: padL + (i / Math.max(weeks.length - 1, 1)) * chartW,
    y: padT + (1 - v / maxVal) * chartH,
    v,
    label: weeks[i][0].slice(5),
  }));

  const polyline = pts.map(p => `${p.x},${p.y}`).join(" ");
  const area = `${pts[0].x},${padT + chartH} ${polyline} ${pts[pts.length - 1].x},${padT + chartH}`;

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 16px 12px" }}>
      <div style={{ fontSize: 12, color: C.muted, fontWeight: 700, letterSpacing: 0.5, marginBottom: 12 }}>SESSIONS PER WEEK</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        {/* Grid lines */}
        {[0, 1, 2, 3].map(i => {
          const y = padT + (i / 3) * chartH;
          return <line key={i} x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />;
        })}
        {/* Area fill */}
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B6EF8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3B6EF8" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#chartGrad)" />
        {/* Line */}
        <polyline points={polyline} fill="none" stroke="#3B6EF8" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots + labels */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill="#3B6EF8" stroke="var(--surface)" strokeWidth={2} />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={10} fill="var(--text)" fontWeight="700">{p.v}</text>
            {(i === 0 || i === pts.length - 1 || pts.length <= 8) && (
              <text x={p.x} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--muted)">{p.label}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function Tag({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      background: `${color}20`, color, border: `1px solid ${color}40`,
      borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: .5,
    }}>{label}</span>
  );
}

function Btn({ children, onClick, variant = "primary" }: {
  children: React.ReactNode; onClick: () => void; variant?: "primary" | "ghost";
}) {
  return (
    <button onClick={onClick} style={{
      background: variant === "primary" ? C.accent : "transparent",
      color: variant === "primary" ? "#000" : C.muted,
      border: variant === "primary" ? "none" : `1px solid ${C.border}`,
      borderRadius: 10, padding: "9px 18px", fontWeight: 700, fontSize: 13,
    }}>
      {children}
    </button>
  );
}
