import { useId } from "react";

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color: string;
  /** Color de la marca del último punto (por defecto el mismo). */
  endColor?: string;
  /** Superficie sobre la que se pinta: anillo de 2px alrededor del punto final. */
  surface: string;
}

/**
 * Mini-gráfica de tendencia para filas de lista (1RM de un ejercicio, volumen...). Línea de 2px,
 * relleno al ~10% y punto final ≥8px con anillo del color de la superficie, según las specs de marca.
 * Sin ejes ni etiquetas: acompaña a un número que ya está escrito al lado.
 */
export default function Sparkline({ values, width = 64, height = 24, color, endColor, surface }: SparklineProps) {
  const id = `spark-${useId().replace(/:/g, "")}`;
  if (values.length < 2) {
    return <svg width={width} height={height} aria-hidden />;
  }
  const pad = 5;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - pad * 2), pad + (1 - (v - min) / span) * (height - pad * 2)]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`;
  const [ex, ey] = pts[pts.length - 1];
  return (
    <svg width={width} height={height} aria-hidden style={{ display: "block", overflow: "visible", flexShrink: 0 }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={ex} cy={ey} r={4} fill={endColor || color} stroke={surface} strokeWidth={2} />
    </svg>
  );
}
