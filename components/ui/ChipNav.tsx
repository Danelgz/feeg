import { useEffect, useId, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
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
  /** Envuelve los chips para que la sección nunca dependa de un gesto horizontal. */
  wrap?: boolean;
  /** Reparte el ancho a partes iguales entre los chips (pocas vistas que deben caber sin scroll). */
  fill?: boolean;
  /**
   * `chip` (por defecto): píldoras sueltas. `underline`: pestañas de texto con una raya de acento
   * que se desliza — sin bordes ni fondos, para la navegación principal de una pantalla.
   * `segmented`: una sola pista con la opción activa resaltada, para filtros cortos (periodo).
   */
  variant?: "chip" | "underline" | "segmented";
  ariaLabel: string;
}

/**
 * Fila de chips desplazable horizontalmente para elegir entre vistas o filtros.
 *
 * Sustituye al patrón de "rejilla de tarjetas de navegación" que tenía estadísticas: siete tarjetas
 * con título y descripción que en móvil se apilaban en una columna, obligando a bajar tres
 * pantallas antes de ver un solo dato. Si un botón de navegación necesita un párrafo explicando
 * qué hace, el problema es el nombre del botón.
 *
 * Dos cosas que la fila necesita por ser a la vez desplazable y un `tablist`:
 *
 * - **El chip activo se trae a la vista.** Con ocho vistas la fila no cabe en pantalla, así que al
 *   cambiar de una a otra —o al volver a la pantalla con una vista ya elegida— el chip
 *   seleccionado puede quedar fuera del área visible y parecer que no hay nada activo.
 * - **Navegación con flechas y tabulador único.** Al declarar `role="tablist"` se está prometiendo
 *   el comportamiento estándar de pestañas: el tabulador entra y sale del grupo de una vez, y
 *   dentro se circula con las flechas. Sin ello, tabular por esta pantalla obligaba a pasar por los
 *   doce chips uno a uno antes de llegar al contenido.
 */
export default function ChipNav({ items, activeKey, onChange, isDark, size = "md", wrap = false, fill = false, variant = "chip", ariaLabel }: ChipNavProps) {
  const tk = getTokens(isDark);
  const isSmall = size === "sm";
  const listRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const indicatorId = `chipnav-${useId()}`;

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    // Comprobación explícita en vez de `active?.scrollIntoView(...)`: jsdom no implementa este
    // método, así que la llamada optimista rompía toda la suite de la pantalla. Y es un adorno —
    // que no exista no debe tumbar el render.
    if (typeof active?.scrollIntoView !== "function") return;
    // `nearest` en los dos ejes: centrarlo movería también el scroll vertical de la página, que es
    // justo lo que no se quiere al tocar un chip.
    active.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [activeKey]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.key === activeKey);
    if (index === -1) return;

    let next = -1;
    if (event.key === "ArrowRight") next = (index + 1) % items.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;

    event.preventDefault();
    onChange(items[next].key);
    // El foco sigue a la selección, que es lo que espera el patrón de pestañas automáticas: sin
    // esto la siguiente flecha se calcularía desde un chip que ya no está enfocado.
    const buttons = listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]');
    buttons?.[next]?.focus();
  };

  if (variant !== "chip") {
    const underline = variant === "underline";
    return (
      <div
        role="tablist"
        aria-label={ariaLabel}
        ref={listRef}
        onKeyDown={handleKeyDown}
        className="chipnav-alt"
        style={{
          display: "flex",
          overflowX: fill ? "visible" : "auto",
          scrollbarWidth: "none",
          ...(underline
            ? { gap: fill ? 0 : 18, borderBottom: `1px solid ${tk.hairline}` }
            : { gap: 2, padding: 3, borderRadius: 12, background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", width: fill ? undefined : "fit-content", maxWidth: "100%" }),
        }}
      >
        {items.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <button
              key={item.key}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(item.key)}
              className="feeg-press"
              style={{
                position: "relative",
                flex: fill ? "1 1 0" : "0 0 auto",
                minWidth: 0,
                border: "none",
                background: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                color: isActive ? tk.text : tk.textMuted,
                fontWeight: isActive ? 800 : 600,
                fontSize: underline ? (isSmall ? "0.8rem" : "0.86rem") : "0.76rem",
                padding: underline ? "10px 2px 11px" : "6px 12px",
                transition: "color .2s ease",
                "--feeg-press-scale": 0.96,
              } as React.CSSProperties}
            >
              {isActive && (
                <motion.span
                  layoutId={indicatorId}
                  aria-hidden
                  transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 40 }}
                  style={
                    underline
                      ? { position: "absolute", left: fill ? "18%" : 0, right: fill ? "18%" : 0, bottom: -1, height: 2.5, borderRadius: 2, background: tk.accent }
                      : { position: "absolute", inset: 0, borderRadius: 9, background: isDark ? "rgba(255,255,255,0.13)" : "#fff", boxShadow: isDark ? "none" : "0 1px 3px rgba(0,0,0,0.1)" }
                  }
                />
              )}
              <span style={{ position: "relative" }}>{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`chipnav${wrap ? " chipnav-wrap" : ""}${fill ? " chipnav-fill" : ""}`} role="tablist" aria-label={ariaLabel} ref={listRef} onKeyDown={handleKeyDown}>
      {items.map((item) => {
        const isActive = item.key === activeKey;
        return (
          <button
            key={item.key}
            role="tab"
            aria-selected={isActive}
            // Tabulador único (roving tabindex): sólo el chip activo entra en el orden de
            // tabulación; a los demás se llega con las flechas.
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(item.key)}
            className="feeg-surface feeg-press feeg-hover"
            style={{
              padding: fill ? "8px 2px" : isSmall ? "7px 14px" : "9px 16px",
              ...(fill ? { flex: "1 1 0", minWidth: 0, textAlign: "center" } : {}),
              borderRadius: tk.radius.pill,
              fontSize: fill ? "0.78rem" : isSmall ? tk.fontSize.xs : tk.fontSize.sm,
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
        /* Desvanecido en el borde derecho: la señal de "hay más a la derecha" que en una fila
           desplazable sin barra de scroll no existe. Sin él la fila parece terminar en el último
           chip visible y las vistas de más allá quedan escondidas. */
        .chipnav:not(.chipnav-wrap) {
          -webkit-mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 28px), transparent 100%);
          mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 28px), transparent 100%);
          padding-right: 28px;
        }
        .chipnav.chipnav-fill {
          -webkit-mask-image: none;
          mask-image: none;
          padding-right: 2px;
          gap: 6px;
          overflow: visible;
        }
        .chipnav-wrap {
          flex-wrap: wrap;
          overflow-x: visible;
          scroll-snap-type: none;
        }
        .chipnav::-webkit-scrollbar {
          display: none;
        }
        .chipnav > :global(button) {
          scroll-snap-align: start;
        }
        /* Quien haya pedido menos movimiento no quiere que la fila se deslice sola bajo el dedo. */
        @media (prefers-reduced-motion: reduce) {
          .chipnav {
            scroll-behavior: auto;
          }
        }
      `}</style>
    </div>
  );
}
