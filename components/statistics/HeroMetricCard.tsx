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
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 22,
        padding: isMobile ? "16px 16px 14px" : tk.space.huge,
        marginBottom: 12,
        background: isDark
          ? "linear-gradient(150deg, rgba(29,209,161,0.13) 0%, #121412 45%, #0c0c0c 100%)"
          : "linear-gradient(150deg, rgba(29,209,161,0.14) 0%, #ffffff 50%)",
        border: `1px solid ${isDark ? "rgba(29,209,161,0.18)" : "rgba(29,209,161,0.25)"}`,
      }}
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
            fontSize: isMobile ? "2.9rem" : "3.4rem",
            fontWeight: tk.weight.heavy,
            color: tk.text,
            lineHeight: 1,
            letterSpacing: "-0.035em",
            // Cifras proporcionales: en un número grande y solo, las tabulares dejan huecos (un
            // "121" con cada dígito del ancho de un "0" se ve suelto).
            fontVariantNumeric: "proportional-nums",
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
            display: "grid",
            gridTemplateColumns: `repeat(${footer.length}, minmax(0, 1fr))`,
            gap: tk.space.md,
            marginTop: tk.space.lg,
            paddingTop: tk.space.md,
            borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
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
