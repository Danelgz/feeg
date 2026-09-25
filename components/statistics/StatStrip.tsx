import type { ReactNode } from "react";
import { getTokens } from "../../lib/tokens";

export interface StatStripItem {
  key: string;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** Barra de progreso opcional (0-1) bajo el valor, p.ej. entrenos de la semana frente al objetivo. */
  progress?: number;
  highlight?: boolean;
}

interface StatStripProps {
  items: StatStripItem[];
  isDark: boolean;
  columns?: number;
}

/**
 * Indicadores secundarios en UNA superficie dividida en celdas, en lugar de una tarjeta por dato.
 * Cuatro tarjetas con borde, sombra y padding propios ocupaban ~260px de alto para cuatro números;
 * aquí los mismos datos caben en ~130px y se leen como un bloque, no como cuatro cosas sueltas.
 */
export default function StatStrip({ items, isDark, columns = 2 }: StatStripProps) {
  const tk = getTokens(isDark);
  const line = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        borderRadius: 20,
        background: tk.surface,
        border: `1px solid ${tk.border}`,
        overflow: "hidden",
        marginBottom: 20,
      }}
    >
      {items.map((it, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        return (
          <div
            key={it.key}
            style={{
              padding: "12px 14px",
              borderLeft: col > 0 ? `1px solid ${line}` : "none",
              borderTop: row > 0 ? `1px solid ${line}` : "none",
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: "0.7rem", color: tk.textMuted, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</div>
            <div
              style={{
                fontSize: "1.15rem",
                fontWeight: 800,
                color: it.highlight ? tk.accent : tk.text,
                marginTop: 3,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                textTransform: "none",
              }}
            >
              {it.value}
            </div>
            {it.progress !== undefined && (
              <div style={{ height: 4, borderRadius: 99, background: line, marginTop: 7, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(1, Math.max(0, it.progress)) * 100}%`, height: "100%", background: tk.accent, borderRadius: 99 }} />
              </div>
            )}
            {it.sub && <div style={{ fontSize: "0.7rem", color: tk.textFaint, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.sub}</div>}
          </div>
        );
      })}
    </div>
  );
}
