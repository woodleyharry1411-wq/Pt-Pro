"use client";

import { useState, useRef, useEffect } from "react";
import { C } from "@/lib/colours";
import { suggestExercises } from "@/lib/exercises";

export function ExerciseInput({ value, onChange, placeholder = "Exercise name…", autoFocus, style }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  style?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const suggestions = open ? suggestExercises(value) : [];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pick(name: string) {
    onChange(name);
    setOpen(false);
    setHighlighted(-1);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <input
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlighted(-1); }}
        onFocus={e => { setOpen(true); e.target.style.borderColor = C.accent; }}
        onBlur={e => (e.target.style.borderColor = C.border)}
        onKeyDown={e => {
          if (!suggestions.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, suggestions.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
          else if (e.key === "Enter" && highlighted >= 0) { e.preventDefault(); pick(suggestions[highlighted]); }
          else if (e.key === "Escape") setOpen(false);
        }}
        style={{
          background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
          padding: "9px 12px", color: C.text, fontSize: 14, outline: "none", width: "100%",
          ...style,
        }}
      />
      {suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 60,
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
          overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,.3)",
        }}>
          {suggestions.map((s, i) => (
            <div
              key={s}
              onMouseDown={e => { e.preventDefault(); pick(s); }}
              onMouseEnter={() => setHighlighted(i)}
              style={{
                padding: "9px 14px", fontSize: 13, cursor: "pointer", fontWeight: 600,
                background: highlighted === i ? `${C.accent}18` : "transparent",
                color: highlighted === i ? C.accent : C.text,
              }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
