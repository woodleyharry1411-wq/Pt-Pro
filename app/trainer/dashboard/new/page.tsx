"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { C } from "@/lib/colours";
import { saveClient } from "@/lib/actions";

const GOALS          = ["Weight Loss", "Muscle Gain", "Improve Fitness", "Strength", "Flexibility & Mobility", "Athletic Performance"];
const FITNESS_LEVELS = ["Beginner", "Intermediate", "Advanced"];
const EQUIPMENT      = ["Full Gym", "Home Gym (Dumbbells/Bands)", "Bodyweight Only", "Outdoor/Park"];

type Form = {
  name: string; age: string; weight: string; height: string; gender: string;
  goals: string[]; fitness_level: string; equipment: string; days_per_week: number;
  session_duration: number; injuries: string; notes: string;
};

const bmi = (w: string, h: string) => (+w && +h) ? (+w / (+h / 100) ** 2).toFixed(1) : "—";

export default function NewClient() {
  const router = useRouter();
  const [form, setForm] = useState<Form>({
    name: "", age: "", weight: "", height: "", gender: "Male",
    goals: [GOALS[0]], fitness_level: FITNESS_LEVELS[0], equipment: EQUIPMENT[0],
    days_per_week: 4, session_duration: 60, injuries: "", notes: "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof Form, v: string | number | string[]) => setForm(f => ({ ...f, [k]: v }));

  function toggleGoal(g: string) {
    setForm(f => {
      const has = f.goals.includes(g);
      if (has && f.goals.length === 1) return f; // keep at least one goal
      return { ...f, goals: has ? f.goals.filter(x => x !== g) : [...f.goals, g] };
    });
  }

  async function generate() {
    if (!form.name || !form.age || !form.weight || !form.height) {
      alert("Please fill in name, age, weight and height."); return;
    }
    setLoading(true);

    const bmiVal = bmi(form.weight, form.height);
    const age = parseInt(form.age);
    const ageContext = age < 25 ? "young adult — can handle higher intensity and volume"
      : age < 40 ? "prime training age — good recovery capacity"
      : age < 55 ? "masters athlete — prioritise joint health, adequate warm-up, and recovery"
      : "senior athlete — emphasise mobility, stability, lighter loads with higher reps, longer rest";

    const bmiContext = parseFloat(bmiVal) < 18.5 ? "underweight — avoid excessive cardio, prioritise strength and hypertrophy"
      : parseFloat(bmiVal) < 25 ? "healthy weight"
      : parseFloat(bmiVal) < 30 ? "slightly overweight — include compound movements that burn more calories"
      : "higher BMI — avoid high-impact exercises on joints, prioritise low-impact cardio and strength";

    const prompt = `
You are designing a 4-week progressive training programme for this specific client. Generate ALL 4 WEEKS in one response. Each week uses the SAME core exercises but with progressive overload — increasing intensity, weight, or volume each week.

CLIENT PROFILE:
- Name: ${form.name}, Age: ${form.age} (${ageContext}), Gender: ${form.gender}
- Weight: ${form.weight}kg, Height: ${form.height}cm, BMI: ${bmiVal} (${bmiContext})
- Goals: ${form.goals.join(" + ")}${form.goals.length > 1 ? " (blend the programme to serve ALL of these goals — e.g. mix strength work and conditioning as appropriate)" : ""}
- Fitness Level: ${form.fitness_level}
- Available Equipment: ${form.equipment}
- Training Days Per Week: ${form.days_per_week}
- Session Duration: ${form.session_duration} minutes
- Injuries/Limitations: ${form.injuries || "None"}
- Trainer Notes: ${form.notes || "None"}

PROGRESSION SCHEME (apply to every exercise across the 4 weeks):
- Week 1 "Foundation": 3 sets, higher reps (12-15), RPE 6 — learn the movements, build base
- Week 2 "Build": 3 sets, moderate reps (10-12), RPE 7 — add slight weight/intensity
- Week 3 "Overload": 4 sets, lower reps (8-10), RPE 8 — heavier loads, progressive overload
- Week 4 "Peak": 4 sets, lowest reps (6-8), RPE 9 — maximum effort, strength peak

GUIDELINES:
- Use the SAME exercises in all 4 weeks for each day (so client can track improvement)
- Only change sets, reps, RPE, and coaching cues between weeks
- Match exercise difficulty to fitness level: ${form.fitness_level}
- Keep sessions within ${form.session_duration} minutes (45min=4 exercises, 60min=5-6, 90min=7-8)
- Only use equipment: ${form.equipment}
- Avoid movements that aggravate injuries: ${form.injuries || "None"}
- Include specific coaching cues in the "notes" field

Return ONLY a JSON object, no markdown:
{
  "summary": "3-4 sentence overview of the full 4-week programme, mentioning progressive overload and their goal",
  "currentWeek": 0,
  "weeks": [
    {
      "weekNumber": 1,
      "label": "Foundation",
      "weeklyStructure": [
        { "label": "DAY 1", "focus": "e.g. Upper Body Push",
          "exercises": [{ "name": "...", "sets": "3", "reps": "12-15", "rpe": "6", "notes": "coaching cue..." }] }
      ]
    },
    { "weekNumber": 2, "label": "Build", "weeklyStructure": [...] },
    { "weekNumber": 3, "label": "Overload", "weeklyStructure": [...] },
    { "weekNumber": 4, "label": "Peak", "weeklyStructure": [...] }
  ]
}`;

    try {
      const res  = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemPrompt: "You are an elite personal trainer. Return only valid JSON." }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "API error");
      const programme = JSON.parse(json.text.replace(/```json|```/g, "").trim());

      const client = await saveClient({
        name: form.name, age: +form.age, weight: +form.weight, height: +form.height,
        gender: form.gender, goal: form.goals.join(" + "), fitness_level: form.fitness_level,
        equipment: form.equipment, days_per_week: form.days_per_week,
        session_duration: form.session_duration,
        injuries: form.injuries, notes: form.notes, programme,
      });
      router.push(`/trainer/dashboard/${client.id}`);
    } catch (e) {
      console.error(e);
      alert("Failed to generate programme. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", animation: "fadeIn .3s ease" }}>
      <div style={{ marginBottom: 32 }}>
        <button onClick={() => router.push("/trainer/dashboard")}
          style={{ background: "none", border: "none", color: C.muted, fontSize: 14, cursor: "pointer", marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
          ← Back
        </button>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -.5, marginBottom: 6 }}>New Client</h1>
        <p style={{ color: C.muted, fontSize: 15 }}>Fill in their details and AI will generate a personalised programme.</p>
      </div>

      <Section title="Personal Details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Full Name"   value={form.name}   onChange={v => set("name", v)}   placeholder="John Smith" span={2} />
          <Field label="Age"         value={form.age}    onChange={v => set("age", v)}    placeholder="35" type="number" />
          <Sel   label="Gender"      value={form.gender} onChange={v => set("gender", v)} options={["Male", "Female", "Other"]} />
          <Field label="Weight (kg)" value={form.weight} onChange={v => set("weight", v)} placeholder="85" type="number" />
          <Field label="Height (cm)" value={form.height} onChange={v => set("height", v)} placeholder="178" type="number" />
        </div>
        {form.weight && form.height && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: `${C.accent}10`, border: `1px solid ${C.accent}25`, borderRadius: 10, fontSize: 14, color: C.accent, fontWeight: 600 }}>
            BMI: {bmi(form.weight, form.height)}
          </div>
        )}
      </Section>

      <Section title="Training Preferences">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, gridColumn: "span 2" }}>
            <label style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>Goals (select all that apply)</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {GOALS.map(g => {
                const on = form.goals.includes(g);
                return (
                  <button key={g} type="button" onClick={() => toggleGoal(g)} style={{
                    background: on ? `${C.accent}20` : C.bg,
                    color: on ? C.accent : C.muted,
                    border: `1px solid ${on ? C.accent : C.border}`,
                    borderRadius: 10, padding: "8px 14px", fontWeight: 600, fontSize: 13,
                    transition: "all .15s",
                  }}>
                    {on ? "✓ " : ""}{g}
                  </button>
                );
              })}
            </div>
          </div>
          <Sel label="Fitness Level" value={form.fitness_level} onChange={v => set("fitness_level", v)} options={FITNESS_LEVELS} />
          <Sel label="Equipment"     value={form.equipment}     onChange={v => set("equipment", v)}     options={EQUIPMENT} />
          <Sel label="Days per Week" value={String(form.days_per_week)} onChange={v => set("days_per_week", +v)} options={["3","4","5","6"]} />
          <Sel label="Session Duration" value={String(form.session_duration)} onChange={v => set("session_duration", +v)} options={["30","45","60","75","90","120"]} optionLabels={["30 min","45 min","60 min","75 min","90 min","2 hours"]} />
        </div>
      </Section>

      <Section title="Notes">
        <Field label="Injuries / Limitations" value={form.injuries} onChange={v => set("injuries", v)} placeholder="e.g. bad left knee, lower back pain…" />
        <div style={{ marginTop: 16 }}>
          <label style={{ fontSize: 13, color: C.muted, fontWeight: 600, display: "block", marginBottom: 8 }}>Trainer Notes</label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
            placeholder="Any extra context for the programme…"
            style={{
              width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
              padding: "12px 16px", color: C.text, fontSize: 15, minHeight: 90, outline: "none", resize: "vertical",
            }}
          />
        </div>
      </Section>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={generate} disabled={loading} style={{
          background: C.accent, color: "#000", border: "none", borderRadius: 12,
          padding: "13px 26px", fontWeight: 700, fontSize: 15, opacity: loading ? 0.6 : 1,
          letterSpacing: -.2,
        }}>
          {loading ? "Generating…" : "⚡ Generate Programme"}
        </button>
        <button onClick={() => router.push("/trainer/dashboard")} style={{
          background: "transparent", border: `1px solid ${C.border}`, borderRadius: 12,
          color: C.muted, padding: "13px 22px", fontWeight: 600, fontSize: 15,
        }}>
          Cancel
        </button>
      </div>

      {loading && (
        <div style={{ marginTop: 36, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: 14, color: C.muted }}>Building your client's programme…</span>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>{title}</div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", span }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; type?: string; span?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, gridColumn: span ? `span ${span}` : undefined }}>
      <label style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 15, outline: "none" }}
        onFocus={e => (e.target.style.borderColor = C.accent)}
        onBlur={e  => (e.target.style.borderColor = C.border)}
      />
    </div>
  );
}

function Sel({ label, value, onChange, options, optionLabels, span }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; optionLabels?: string[]; span?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, gridColumn: span ? `span ${span}` : undefined }}>
      <label style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 15, outline: "none" }}
      >
        {options.map((o, i) => <option key={o} value={o}>{optionLabels?.[i] ?? o}</option>)}
      </select>
    </div>
  );
}
