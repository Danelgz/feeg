import { getTokens } from "../../lib/tokens";

export default function Badge({ isDark, variant = "accent", children, style }) {
  const tk = getTokens(isDark);

  const variants = {
    accent: { backgroundColor: tk.accentSoft, color: tk.accent, border: `1px solid transparent` },
    danger: { backgroundColor: tk.dangerSoft, color: tk.danger, border: `1px solid transparent` },
    neutral: { backgroundColor: tk.surfaceHover, color: tk.textMuted, border: `1px solid ${tk.border}` },
    outline: { backgroundColor: "transparent", color: tk.text, border: `1px solid ${tk.border}` },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 10px",
        borderRadius: tk.radius.pill,
        fontSize: "0.75rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
        ...(variants[variant] || variants.accent),
        ...style,
      }}
    >
      {children}
    </span>
  );
}
