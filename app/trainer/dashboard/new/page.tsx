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
  goal: string; fitness_level: string; equipment: string; days_per_week: number;
  injuries: string; notes: string;
};

const bmi = (w: string, h: string) => (+w && +h) ? (+w / (+h / 100) ** 2).toFixed(1) : "—";

export default function NewClient() {
  const router = useRouter();
  const [form, setForm] = useState<Form>({
    name: "", age: "", weight: "", height: "", gender: "Male",
    goal: GOALS[0], fitness_level: FITNESS_LEVELS[0], equipment: EQUIPMENT[0],
    days_per_week: 4, injuries: "", notes: "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof Form, v: string | number) => setForm(f => ({ ...f, [k]: v }));

  async function generate() {
    if (!form.name || !form.age || !form.weight || !form.height) {
      alert("Please fill in name, age, weight and height."); return;
    }
    setLoading(true);

    const prompt = `
Client profile:
- Name: ${form.name}, Age: ${form.age}, Gender: ${form.gender}
- Weight: ${form.weight}kg, Height: ${form.height}cm (BMI: ${bmi(form.weight, form.height)})
- Goal: ${form.goal}, Fitness level: ${form.fitness_level}
- Equipment: ${form.equipment}, Days per week: ${form.days_per_week}
- Injuries/limitations: ${form.injuries || "None"}
- Trainer notes: ${form.notes || "None"}

Create a ${form.days_per_week}-day weekly training programme.
Return ONLY a JSON object, no markdown:
{
  "summary": "2-3 sentence overview",
  "weeklyStructure": [
    { "label": "DAY 1", "focus": "e.g. Upper Body Push",
      "exercises": [{ "name": "...", "sets": "3", "reps": "10-12", "rpe": "7", "notes": "..." }] }
  ]
}
Include 4-6 exercises per day. rpe is optional (1-10). notes is a short coaching cue.`;

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
        gender: form.gender, goal: form.goal, fitness_level: form.fitness_level,
        equipment: form.equipment, days_per_week: form.days_per_week,
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
          <Sel label="Goal"          value={form.goal}          onChange={v => set("goal", v)}          options={GOALS} span={2} />
          <Sel label="Fitness Level" value={form.fitness_level} onChange={v => set("fitness_level", v)} options={FITNESS_LEVELS} />
          <Sel label="Equipment"     value={form.equipment}     onChange={v => set("equipment", v)}     options={EQUIPMENT} />
          <Sel label="Days per Week" value={String(form.days_per_week)} onChange={v => set("days_per_week", +v)} options={["3","4","5","6"]} />
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

function Sel({ label, value, onChange, options, span }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; span?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, gridColumn: span ? `span ${span}` : undefined }}>
      <label style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 14px", color: C.text, fontSize: 15, outline: "none" }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
