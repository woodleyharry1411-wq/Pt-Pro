"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/lib/colours";
import { updateProgramme, logSession, updateClient, saveFeedback, deleteFeedback } from "@/lib/actions";
import type { Client, ClientSession, ClientFeedback, Exercise, SetLog, Programme } from "@/lib/types";

const bmi = (w: number, h: number) => (w / (h / 100) ** 2).toFixed(1);

function initSetLogs(ex: Exercise): SetLog[] {
  const count = parseInt(ex.sets) || 3;
  if (ex.setLogs && ex.setLogs.length === count) return ex.setLogs;
  return Array.from({ length: count }, (_, i) => ex.setLogs?.[i] ?? { weight: "", reps_done: "", done: false });
}

export default function ClientDetailView({ client: initial, sessions, feedback: initialFeedback }: {
  client: Client;
  sessions: ClientSession[];
  feedback: ClientFeedback[];
}) {
  const router = useRouter();
  const [client, setClient]           = useState(initial);
  const [activeDay, setActiveDay]     = useState(0);
  const [tab, setTab]                 = useState<"programme" | "sessions" | "profile" | "feedback">("programme");
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

  const days = client.programme?.weeklyStructure ?? [];
  const day  = days[activeDay];

  async function saveAndSync(prog: Programme) {
    setClient(c => ({ ...c, programme: prog }));
    await updateProgramme(client.id, prog);
  }

  function toggleSet(exIdx: number, setIdx: number) {
    const prog: Programme = JSON.parse(JSON.stringify(client.programme));
    const ex = prog.weeklyStructure[activeDay].exercises[exIdx];
    if (!ex.setLogs) ex.setLogs = initSetLogs(ex);
    ex.setLogs[setIdx].done = !ex.setLogs[setIdx].done;
    ex.done = ex.setLogs.every(s => s.done);
    saveAndSync(prog);
  }

  function updateWeight(exIdx: number, setIdx: number, weight: string) {
    const prog: Programme = JSON.parse(JSON.stringify(client.programme));
    const ex = prog.weeklyStructure[activeDay].exercises[exIdx];
    if (!ex.setLogs) ex.setLogs = initSetLogs(ex);
    ex.setLogs[setIdx].weight = weight;
    saveAndSync(prog);
  }

  function updateRepsDone(exIdx: number, setIdx: number, reps: string) {
    const prog: Programme = JSON.parse(JSON.stringify(client.programme));
    const ex = prog.weeklyStructure[activeDay].exercises[exIdx];
    if (!ex.setLogs) ex.setLogs = initSetLogs(ex);
    ex.setLogs[setIdx].reps_done = reps;
    saveAndSync(prog);
  }

  async function swapExercise(exIdx: number, replacement: Exercise) {
    const prog: Programme = JSON.parse(JSON.stringify(client.programme));
    prog.weeklyStructure[activeDay].exercises[exIdx] = { ...replacement, done: false };
    setSwappingIdx(null);
    saveAndSync(prog);
  }

  function updateExercise(exIdx: number, fields: Partial<Exercise>) {
    const prog: Programme = JSON.parse(JSON.stringify(client.programme));
    prog.weeklyStructure[activeDay].exercises[exIdx] = { ...prog.weeklyStructure[activeDay].exercises[exIdx], ...fields };
    saveAndSync(prog);
  }

  function deleteExercise(exIdx: number) {
    const prog: Programme = JSON.parse(JSON.stringify(client.programme));
    prog.weeklyStructure[activeDay].exercises.splice(exIdx, 1);
    setEditingIdx(null);
    setExpandedEx(null);
    saveAndSync(prog);
  }

  function addExercise() {
    if (!newEx.name.trim()) return;
    const prog: Programme = JSON.parse(JSON.stringify(client.programme));
    prog.weeklyStructure[activeDay].exercises.push({ ...newEx, done: false });
    setNewEx({ name: "", sets: "3", reps: "10-12", rpe: "", notes: "" });
    setAddingEx(false);
    saveAndSync(prog);
  }

  async function submitFeedback() {
    if (!newFeedback.trim()) return;
    setSavingFeedback(true);
    await saveFeedback(client.id, newFeedback.trim());
    setFeedback(f => [{ id: Date.now().toString(), client_id: client.id, trainer_id: "", message: newFeedback.trim(), created_at: new Date().toISOString() }, ...f]);
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
    });
    setEditingProfile(true);
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
        background: `linear-gradient(135deg, ${C.card} 0%, #252a38 100%)`,
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
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: C.card, borderRadius: 14, padding: 4, width: "fit-content" }}>
        {(["programme", "sessions", "profile", "feedback"] as const).map(t => (
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
                      <input
                        autoFocus
                        value={newEx.name} onChange={e => setNewEx(n => ({ ...n, name: e.target.value }))}
                        placeholder="Exercise name…"
                        style={{ background: C.bg, border: `1px solid ${C.accent}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 14, outline: "none", width: "100%" }}
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
          <div style={{ fontSize: 14, color: C.muted, marginBottom: 16 }}>
            {sessions.length === 0 ? "No sessions logged yet." : `${sessions.length} session${sessions.length !== 1 ? "s" : ""} logged.`}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sessions.map(s => (
              <div key={s.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 18px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: s.note ? 8 : 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{s.day_label}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>{new Date(s.created_at).toLocaleDateString()}</span>
                </div>
                {s.note && <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{s.note}</p>}
              </div>
            ))}
          </div>
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
              {([
                { label: "Age", key: "age", type: "number" },
                { label: "Weight (kg)", key: "weight", type: "number" },
                { label: "Height (cm)", key: "height", type: "number" },
                { label: "Gender", key: "gender", type: "text" },
                { label: "Goal", key: "goal", type: "text" },
                { label: "Fitness Level", key: "fitness_level", type: "text" },
                { label: "Equipment", key: "equipment", type: "text" },
                { label: "Days/Week", key: "days_per_week", type: "number" },
                { label: "Session Duration (min)", key: "session_duration", type: "number" },
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

      {/* ── FEEDBACK ── */}
      {tab === "feedback" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>SEND FEEDBACK TO CLIENT</div>
            <textarea
              value={newFeedback}
              onChange={e => setNewFeedback(e.target.value)}
              placeholder="Write feedback, progress notes, encouragement or corrections for your client…"
              rows={3}
              style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit", marginBottom: 10 }}
              onFocus={e => (e.target.style.borderColor = C.accent)}
              onBlur={e => (e.target.style.borderColor = C.border)}
            />
            <Btn onClick={submitFeedback}>{savingFeedback ? "Sending…" : "Send Feedback"}</Btn>
          </div>

          <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>
            FEEDBACK HISTORY ({feedback.length})
          </div>
          {feedback.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 14, textAlign: "center", padding: "40px 0" }}>No feedback sent yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {feedback.map(fb => (
                <div key={fb.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: C.muted }}>{new Date(fb.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <button onClick={() => removeFeedback(fb.id)} style={{ background: "transparent", border: "none", color: C.danger, fontSize: 12, cursor: "pointer", opacity: 0.6 }}>✕ Delete</button>
                  </div>
                  <p style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>{fb.message}</p>
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
                <input
                  value={String(ex[key] ?? "")}
                  onChange={e => onUpdate({ [key]: e.target.value })}
                  placeholder={label}
                  style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", color: C.text, fontSize: 13, outline: "none", width: "100%" }}
                  onFocus={e => (e.target.style.borderColor = C.accent)}
                  onBlur={e => (e.target.style.borderColor = C.border)}
                />
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
          <div className="set-grid-head">
            {["#", "TARGET", "REPS DONE", "KG", "✓"].map(h => (
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
                type="number" value={s.reps_done ?? ""} placeholder="—"
                onChange={e => onRepsDoneChange(si, e.target.value)}
                onClick={e => e.stopPropagation()}
                style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "5px 6px", color: C.text, fontSize: 13, outline: "none", width: "100%", fontFamily: "JetBrains Mono" }}
                onFocus={e => (e.target.style.borderColor = C.accent)}
                onBlur={e  => (e.target.style.borderColor = C.border)}
              />
              <input
                type="number" value={s.weight} placeholder="kg"
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
