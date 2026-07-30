import { getTokens } from "../../lib/tokens";

export interface HeroFooterItem {
  label: string;
  value: string | number;
}

interface HeroMetricCardProps {
  /** Etiqueta pequeña de arriba, p.ej. "Volumen · últimos 30 días". */
  label: string;
  value: string;
  unit?: string;
  /** Variación porcentual frente al periodo anterior equivalente. `null` si no se puede calcular. */
  deltaPct?: number | null;
  deltaLabel?: string;
  footer?: HeroFooterItem[];
  isDark: boolean;
  isMobile?: boolean;
}

/**
 * Métrica protagonista de una pantalla de estadísticas.
 *
 * Reemplaza a la fila de ocho tarjetas iguales que había en estadísticas: ocho números del mismo
 * tamaño no son una jerarquía, son una hoja de cálculo, y no le dicen al usuario qué mirar primero.
 * Aquí hay un número grande, su variación respecto al periodo anterior (el dato que de verdad
 * responde "¿voy mejor o peor?") y el resto en letra pequeña debajo.
 *
 * Nota de producto sobre el signo: subir se pinta con el accent, pero bajar NO se pinta en rojo.
 * Una semana de descarga es entrenar bien, y teñir eso de rojo castiga al usuario por hacer las
 * cosas bien. Bajar se muestra en gris, informativo y sin juicio.
 */
export default function HeroMetricCard({
  label,
  value,
  unit,
  deltaPct = null,
  deltaLabel,
  footer = [],
  isDark,
  isMobile = false,
}: HeroMetricCardProps) {
  const tk = getTokens(isDark);
  const hasDelta = deltaPct !== null && Number.isFinite(deltaPct);
  const isUp = hasDelta && (deltaPct as number) > 0;
  const isFlat = hasDelta && Math.round(deltaPct as number) === 0;

  return (
    <div
      className="feeg-surface"
      style={{
        borderRadius: tk.radius.lg,
        padding: isMobile ? tk.space.xl : tk.space.huge,
        marginBottom: tk.space.lg,
        "--feeg-bg": tk.surface,
        "--feeg-border": tk.border,
        "--feeg-shadow": tk.shadow.card,
      } as React.CSSProperties}
    >
      <div
        style={{
          fontSize: tk.fontSize.xs,
          color: tk.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: tk.weight.medium,
        }}
      >
        {label}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: tk.space.md, flexWrap: "wrap", marginTop: tk.space.sm }}>
        <span
          style={{
            fontSize: isMobile ? "2.4rem" : "3rem",
            fontWeight: tk.weight.heavy,
            color: tk.text,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            // Evita que el número "baile" de ancho al cambiar de periodo.
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: tk.fontSize.lg, fontWeight: tk.weight.medium, color: tk.textMuted }}>{unit}</span>
        )}

        {hasDelta && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: tk.space.xs,
              padding: "4px 10px",
              borderRadius: tk.radius.pill,
              fontSize: tk.fontSize.xs,
              fontWeight: tk.weight.bold,
              backgroundColor: isUp ? tk.accentSoft : "transparent",
              color: isUp ? tk.accent : tk.textMuted,
              border: `1px solid ${isUp ? tk.accent : tk.border}`,
            }}
          >
            {isFlat ? "=" : isUp ? "↑" : "↓"} {Math.abs(Math.round(deltaPct as number))}%
            {deltaLabel && (
              <span style={{ fontWeight: tk.weight.body, opacity: 0.8 }}>{deltaLabel}</span>
            )}
          </span>
        )}
      </div>

      {footer.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: isMobile ? tk.space.lg : tk.space.huge,
            marginTop: tk.space.xl,
            paddingTop: tk.space.lg,
            borderTop: `1px solid ${tk.border}`,
          }}
        >
          {footer.map((item) => (
            <div key={item.label}>
              <div style={{ fontSize: tk.fontSize.xs, color: tk.textFaint, marginBottom: "2px" }}>{item.label}</div>
              <div style={{ fontSize: tk.fontSize.lg, fontWeight: tk.weight.bold, color: tk.text }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
