import { getTokens } from "../../lib/tokens";

export interface ChipItem {
  key: string;
  label: string;
}

interface ChipNavProps {
  items: ChipItem[];
  activeKey: string;
  onChange: (key: string) => void;
  isDark: boolean;
  /** `sm` para filtros secundarios (periodo), `md` para la navegación principal de la pantalla. */
  size?: "sm" | "md";
  ariaLabel: string;
}

/**
 * Fila de chips desplazable horizontalmente para elegir entre vistas o filtros.
 *
 * Sustituye al patrón de "rejilla de tarjetas de navegación" que tenía estadísticas: siete tarjetas
 * con título y descripción que en móvil se apilaban en una columna, obligando a bajar tres
 * pantallas antes de ver un solo dato. Si un botón de navegación necesita un párrafo explicando
 * qué hace, el problema es el nombre del botón.
 */
export default function ChipNav({ items, activeKey, onChange, isDark, size = "md", ariaLabel }: ChipNavProps) {
  const tk = getTokens(isDark);
  const isSmall = size === "sm";

  return (
    <div className="chipnav" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.key)}
            className="feeg-surface feeg-press feeg-hover"
            style={{
              padding: isSmall ? "7px 14px" : "9px 16px",
              borderRadius: tk.radius.pill,
              fontSize: isSmall ? tk.fontSize.xs : tk.fontSize.sm,
              fontWeight: isActive ? tk.weight.bold : tk.weight.medium,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
              "--feeg-bg": isActive ? tk.accent : tk.surface,
              "--feeg-fg": isActive ? tk.onAccent : tk.textMuted,
              "--feeg-border": isActive ? tk.accent : tk.border,
              "--feeg-hover-fg": isActive ? tk.onAccent : tk.text,
              "--feeg-hover-border": tk.accent,
              "--feeg-press-scale": 0.94,
            } as React.CSSProperties}
          >
            {item.label}
          </button>
        );
      })}

      <style jsx>{`
        .chipnav {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          /* Sangrado lateral para que el primer y último chip no queden pegados al borde al
             desplazar, sin añadir margen que descuadre la rejilla de la página. */
          padding: 2px 2px 6px;
          margin: 0 -2px;
          scrollbar-width: none;
          -ms-overflow-style: none;
          scroll-snap-type: x proximity;
          -webkit-overflow-scrolling: touch;
        }
        .chipnav::-webkit-scrollbar {
          display: none;
        }
        .chipnav > :global(button) {
          scroll-snap-align: start;
        }
      `}</style>
    </div>
  );
}
