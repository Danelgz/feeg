import { getTokens } from "../../lib/tokens";

/** Estadística pequeña en grid, compartida por Resumen / Mensual / Ejercicios. */
export default function MiniStat({ label, value, isDark }) {
  const tk = getTokens(isDark);

  return (
    <div style={{ textAlign: 'center', minWidth: 0 }}>
      <div
        style={{
          fontSize: tk.fontSize.xs,
          color: tk.textFaint,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: tk.fontSize.md,
          fontWeight: tk.weight.bold,
          color: tk.text,
          // Alinea las columnas de números entre tarjetas contiguas.
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  );
}
