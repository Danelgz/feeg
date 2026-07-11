import { getTokens } from "../../lib/tokens";

export default function PageHeader({ isDark, isMobile, title, subtitle, actions }) {
  const tk = getTokens(isDark);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        flexDirection: isMobile ? "column" : "row",
        gap: "12px",
        marginBottom: "24px",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              display: "inline-block",
              width: "4px",
              height: isMobile ? "22px" : "28px",
              borderRadius: "2px",
              backgroundColor: tk.accent,
            }}
          />
          <h1
            style={{
              fontSize: isMobile ? "1.6rem" : "2.1rem",
              margin: 0,
              color: tk.text,
              fontWeight: 800,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </h1>
        </div>
        {subtitle && (
          <p style={{ color: tk.textMuted, fontSize: isMobile ? "0.85rem" : "0.95rem", margin: "6px 0 0 14px" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}
