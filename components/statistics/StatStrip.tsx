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
  /** Margen inferior; 0 cuando el contenedor ya separa con `gap`. */
  marginBottom?: number;
  /** Sin línea inferior cuando lo siguiente es una sección que ya dibuja la suya. */
  bottomRule?: boolean;
}

/**
 * Indicadores secundarios como una rejilla de celdas separadas sólo por líneas de 1px.
 *
 * Sin caja alrededor: el borde exterior redondeado no delimitaba nada que las líneas internas no
 * delimiten ya, y quitarlo devuelve el ancho completo a las cifras. Las celdas llevan su propio
 * padding horizontal salvo la primera columna, que se alinea con el margen de la página.
 */
export default function StatStrip({ items, isDark, columns = 2, marginBottom = 20, bottomRule = true }: StatStripProps) {
  const tk = getTokens(isDark);
  const rows = Math.ceil(items.length / columns);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        borderTop: `1px solid ${tk.hairline}`,
        borderBottom: bottomRule ? `1px solid ${tk.hairline}` : "none",
        marginBottom,
      }}
    >
      {items.map((it, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        return (
          <div
            key={it.key}
            style={{
              padding: `12px ${col === columns - 1 ? 0 : 12}px 12px ${col === 0 ? 0 : 14}px`,
              borderLeft: col > 0 ? `1px solid ${tk.hairline}` : "none",
              borderTop: row > 0 && row < rows ? `1px solid ${tk.hairline}` : "none",
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: "0.7rem", color: tk.textMuted, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</div>
            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: 800,
                color: it.highlight ? tk.accent : tk.text,
                marginTop: 3,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                letterSpacing: "-0.01em",
              }}
            >
              {it.value}
            </div>
            {it.progress !== undefined && (
              <div style={{ height: 4, borderRadius: 99, background: tk.hairline, marginTop: 7, overflow: "hidden" }}>
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
