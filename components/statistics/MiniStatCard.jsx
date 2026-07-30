import { getTokens } from "../../lib/tokens";

export default function MiniStatCard({ label, value, isDark }) {
  const tk = getTokens(isDark);
  return (
    <div
      className="feeg-surface"
      style={{
        borderRadius: tk.radius.md,
        padding: tk.space.lg,
        "--feeg-bg": tk.surface,
        "--feeg-border": tk.border,
      }}
    >
      <div
        style={{
          fontSize: tk.fontSize.xs,
          color: tk.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: "2px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: tk.fontSize.lg, fontWeight: tk.weight.bold, color: tk.text }}>{value}</div>
    </div>
  );
}
