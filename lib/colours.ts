// Themed neutrals are CSS variables (defined per-theme in globals.css);
// brand colours are fixed hex so alpha suffixes like `${C.accent}18` keep working.
export const C = {
  bg:       "var(--bg)",
  surface:  "var(--surface)",
  card:     "var(--card)",
  border:   "var(--border)",
  accent:   "#3B6EF8",   // electric blue
  accentDim:"#2D5BD6",
  text:     "var(--text)",
  muted:    "var(--muted)",
  danger:   "#F06080",
  warn:     "#F5A623",
  blue:     "#3B6EF8",
} as const;
