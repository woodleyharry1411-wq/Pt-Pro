"use client";

import { useState, useEffect } from "react";
import { C } from "@/lib/colours";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme((document.documentElement.getAttribute("data-theme") as "dark" | "light") ?? "dark");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("pt-pro-theme", next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
        width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center",
        color: C.muted, fontSize: 15, flexShrink: 0,
      }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
