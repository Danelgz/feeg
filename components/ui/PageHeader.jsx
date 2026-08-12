import { getTokens } from "../../lib/tokens";

export default function PageHeader({ isDark, isMobile, title, subtitle, actions, compact = false }) {
  const tk = getTokens(isDark);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        // Compacto: cabecera + acciones en una sola fila incluso en móvil, para pantallas que ya
        // tienen su propia navegación secundaria debajo (p.ej. las pestañas del Coach IA) y no
        // pueden permitirse el bloque de cabecera a toda anchura de las demás páginas.
        alignItems: isMobile && !compact ? "flex-start" : "center",
        flexDirection: isMobile && !compact ? "column" : "row",
        gap: compact ? "10px" : "12px",
        marginBottom: compact ? (isMobile ? "12px" : "16px") : "24px",
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              display: "inline-block",
              width: "4px",
              height: isMobile ? (compact ? "18px" : "22px") : "28px",
              borderRadius: "2px",
              backgroundColor: tk.accent,
            }}
          />
          <h1
            style={{
              fontSize: compact ? (isMobile ? "1.3rem" : "1.7rem") : (isMobile ? "1.6rem" : "2.1rem"),
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
