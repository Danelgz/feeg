import { getTokens } from "../../lib/tokens";
import Icon from "./Icon";

export default function EmptyState({ isDark, icon = "search", title, description, action }) {
  const tk = getTokens(isDark);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "56px 24px",
        gap: "6px",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          backgroundColor: tk.accentSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
          color: tk.accent,
        }}
      >
        <Icon name={icon} size={28} />
      </div>
      {title && <p style={{ color: tk.text, fontSize: "1.05rem", fontWeight: 600, margin: 0 }}>{title}</p>}
      {description && (
        <p style={{ color: tk.textMuted, fontSize: "0.9rem", margin: "4px 0 0", maxWidth: "360px" }}>{description}</p>
      )}
      {action && <div style={{ marginTop: "20px" }}>{action}</div>}
    </div>
  );
}
