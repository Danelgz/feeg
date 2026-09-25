import { motion, useReducedMotion } from "motion/react";
import { useId, type ReactNode } from "react";

interface ProgressRingProps {
  /** 0 → 1. Valores por encima de 1 se pintan como anillo completo. */
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  trackColor: string;
  children?: ReactNode;
  /** Degradado opcional del trazo: segundo color del final del arco. */
  colorEnd?: string;
}

/**
 * Anillo de progreso animado (el trazo se "llena" al montar). Pensado para objetivos cortos y
 * discretos — entrenos de la semana, series de un ejercicio — donde un anillo se lee de un vistazo
 * mejor que un número suelto. El contenido central va en `children`.
 */
export default function ProgressRing({ value, size = 88, stroke = 9, color, trackColor, colorEnd, children }: ProgressRingProps) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, value || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // Id estable por instancia para el degradado (varios anillos en la misma página no deben compartirlo).
  const gradientId = `feeg-ring-${useId().replace(/:/g, "")}`;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)", display: "block" }}>
        {colorEnd && (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={colorEnd} />
            </linearGradient>
          </defs>
        )}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colorEnd ? `url(#${gradientId})` : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduceMotion ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - clamped) }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}
