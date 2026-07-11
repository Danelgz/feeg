import { getTokens } from "../../lib/tokens";

export default function Spinner({ isDark, size = 32, label, fullPage = false }) {
  const tk = getTokens(isDark);

  const spinner = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: `3px solid ${tk.border}`,
          borderTopColor: tk.accent,
          animation: "ui-spin 0.8s linear infinite",
        }}
      />
      {label && <span style={{ color: tk.textMuted, fontSize: "0.9rem" }}>{label}</span>}
      <style jsx>{`
        @keyframes ui-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );

  if (!fullPage) return spinner;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        width: "100%",
      }}
    >
      {spinner}
    </div>
  );
}
