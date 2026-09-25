import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { getTokens } from "../../lib/tokens";
import { bucketWorkouts, metricValue, type Bucket, type Granularity, type Metric, type SeriesWorkout } from "../../lib/statsSeries";
import { tapFeedback } from "../../lib/haptics";

interface ProgressChartProps {
  workouts: SeriesWorkout[];
  isDark: boolean;
}

const METRICS: { key: Metric; label: string }[] = [
  { key: "volume", label: "Volumen" },
  { key: "series", label: "Series" },
  { key: "sessions", label: "Entrenos" },
  { key: "minutes", label: "Tiempo" },
];

const COUNT: Record<Granularity, number> = { week: 12, month: 12 };
const PLOT_H = 148;
const AXIS_H = 22;
const TOP_PAD = 10;

export function formatMetric(metric: Metric, value: number): { value: string; unit: string } {
  if (metric === "volume") {
    if (value >= 10000) return { value: (value / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 }), unit: "t" };
    return { value: Math.round(value).toLocaleString("es-ES"), unit: "kg" };
  }
  if (metric === "minutes") {
    if (value >= 120) {
      const h = Math.floor(value / 60);
      return { value: `${h}h ${Math.round(value % 60)}`, unit: "min" };
    }
    return { value: String(Math.round(value)), unit: "min" };
  }
  return { value: Math.round(value).toLocaleString("es-ES"), unit: metric === "series" ? "series" : value === 1 ? "entreno" : "entrenos" };
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * pow;
}

function compactTick(metric: Metric, v: number): string {
  if (metric === "volume") return v >= 1000 ? `${(v / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })}t` : `${v}`;
  return v.toLocaleString("es-ES");
}

function bucketLabel(b: Bucket, g: Granularity, long = false): string {
  if (g === "month") {
    const s = b.start.toLocaleDateString("es-ES", { month: long ? "long" : "short", year: long ? "numeric" : undefined }).replace(".", "");
    return long ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }
  const s = b.start.toLocaleDateString("es-ES", { day: "numeric", month: "short" }).replace(".", "");
  return long ? `Semana del ${s}` : s;
}

/** Columna con esquinas de 4px arriba y base recta (spec: data-end redondeado, square at baseline). */
function barPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

/**
 * Progreso por semanas o meses: la gráfica que sustituye a los informes "Semanal" y "Mensual" (ocho
 * y tres tarjetas idénticas con cuatro números cada una, que obligaban a comparar leyendo).
 *
 * Una sola serie, así que sin leyenda: el título y la métrica elegida dicen qué se pinta. El cubo
 * seleccionado va en el acento y el resto en el mismo tono atenuado; su valor se lee arriba en
 * grande (con la variación frente al cubo anterior), así que no hace falta un número en cada barra.
 * Tocar una barra la selecciona — el objetivo táctil es la columna entera, no la barra.
 */
export default function ProgressChart({ workouts, isDark }: ProgressChartProps) {
  const tk = getTokens(isDark);
  const reduceMotion = useReducedMotion();
  const [granularity, setGranularity] = useState<Granularity>("week");
  const [metric, setMetric] = useState<Metric>("volume");
  const [selected, setSelected] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(340);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(240, el.clientWidth));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const buckets = useMemo(() => bucketWorkouts(workouts, granularity, COUNT[granularity]), [workouts, granularity]);
  const values = buckets.map((b) => metricValue(b, metric));
  const max = niceMax(Math.max(...values, 0));
  const active = values.filter((v) => v > 0);
  const avg = active.length ? active.reduce((a, b) => a + b, 0) / active.length : 0;
  const selIndex = selected ?? buckets.length - 1;
  const sel = buckets[selIndex];
  const selValue = values[selIndex] ?? 0;
  const prevValue = selIndex > 0 ? values[selIndex - 1] : null;
  const delta = prevValue && prevValue > 0 ? ((selValue - prevValue) / prevValue) * 100 : null;
  const shown = formatMetric(metric, selValue);

  const yLabelW = 30;
  const plotW = width - yLabelW;
  const slot = plotW / buckets.length;
  const barW = Math.min(24, slot * 0.62);
  const y = (v: number) => TOP_PAD + PLOT_H - (v / max) * PLOT_H;
  const ticks = [0, max / 2, max];
  const labelEvery = granularity === "week" ? 3 : 2;

  const chipStyle = (on: boolean): React.CSSProperties => ({
    padding: "6px 11px",
    borderRadius: 99,
    border: "none",
    fontSize: "0.76rem",
    fontWeight: on ? 800 : 600,
    background: on ? (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)") : "transparent",
    color: on ? tk.text : tk.textMuted,
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  return (
    <section aria-label="Progreso" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: tk.text }}>Progreso</h2>
        <div role="group" aria-label="Agrupar por" style={{ display: "flex", padding: 3, borderRadius: 99, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}>
          {(["week", "month"] as Granularity[]).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={granularity === g}
              onClick={() => {
                setGranularity(g);
                setSelected(null);
              }}
              style={chipStyle(granularity === g)}
            >
              {g === "week" ? "Semanas" : "Meses"}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          borderRadius: 20,
          padding: "14px 14px 10px",
          background: tk.surface,
          border: `1px solid ${tk.border}`,
        }}
      >
        <div role="group" aria-label="Métrica" style={{ display: "flex", gap: 2, marginBottom: 12, marginLeft: -4, overflowX: "auto", scrollbarWidth: "none" }}>
          {METRICS.map((m) => (
            <button key={m.key} type="button" aria-pressed={metric === m.key} onClick={() => setMetric(m.key)} style={chipStyle(metric === m.key)}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Lectura del cubo seleccionado */}
        <div style={{ minHeight: 58 }}>
          <div style={{ fontSize: "0.74rem", color: tk.textMuted, fontWeight: 600 }}>
            {sel?.current ? (granularity === "week" ? "Esta semana" : "Este mes") : sel ? bucketLabel(sel, granularity, true) : ""}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
            <span style={{ fontSize: "2rem", fontWeight: 800, color: tk.text, letterSpacing: "-0.03em", lineHeight: 1.05 }}>{shown.value}</span>
            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: tk.textMuted }}>{shown.unit}</span>
            {delta !== null && (
              <span
                style={{
                  marginLeft: 4,
                  fontSize: "0.76rem",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 99,
                  color: delta >= 0 ? tk.accent : tk.textMuted,
                  background: delta >= 0 ? tk.accentSoft : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                }}
              >
                {delta >= 0 ? "↑" : "↓"} {Math.abs(Math.round(delta))}% <span style={{ fontWeight: 600, opacity: 0.8 }}>vs anterior</span>
              </span>
            )}
          </div>
        </div>

        <div ref={wrapRef} style={{ width: "100%", marginTop: 6 }}>
          <svg width={width} height={TOP_PAD + PLOT_H + AXIS_H} role="img" aria-label={`Gráfica de ${METRICS.find((m) => m.key === metric)?.label.toLowerCase()} por ${granularity === "week" ? "semana" : "mes"}`} style={{ display: "block", overflow: "visible" }}>
            {/* Rejilla: hairlines sólidas, recesivas */}
            {ticks.map((tv, i) => (
              <g key={i}>
                <line x1={yLabelW} x2={width} y1={y(tv)} y2={y(tv)} stroke={isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"} strokeWidth={1} />
                <text x={yLabelW - 6} y={y(tv) + 3.5} textAnchor="end" fontSize={10} fill={tk.textFaint} style={{ fontVariantNumeric: "tabular-nums" }}>
                  {compactTick(metric, tv)}
                </text>
              </g>
            ))}

            {buckets.map((b, i) => {
              const v = values[i];
              const h = (v / max) * PLOT_H;
              const cx = yLabelW + slot * i + slot / 2;
              const isSel = i === selIndex;
              return (
                <g key={b.key}>
                  <motion.path
                    d={barPath(cx - barW / 2, y(v), barW, h)}
                    fill={tk.accent}
                    initial={reduceMotion ? false : { opacity: 0, scaleY: 0 }}
                    animate={{ opacity: isSel ? 1 : 0.32, scaleY: 1 }}
                    transition={{ duration: 0.5, delay: reduceMotion ? 0 : i * 0.025, ease: [0.16, 1, 0.3, 1] }}
                    style={{ transformOrigin: `${cx}px ${TOP_PAD + PLOT_H}px`, transformBox: "view-box" }}
                  />
                  {(i % labelEvery === (buckets.length - 1) % labelEvery || isSel) && (
                    <text
                      x={cx}
                      y={TOP_PAD + PLOT_H + 15}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={isSel ? 800 : 500}
                      fill={isSel ? tk.text : tk.textFaint}
                    >
                      {b.current ? (granularity === "week" ? "Hoy" : bucketLabel(b, granularity)) : bucketLabel(b, granularity)}
                    </text>
                  )}
                  {/* Objetivo táctil: la columna entera */}
                  <rect
                    x={yLabelW + slot * i}
                    y={0}
                    width={slot}
                    height={TOP_PAD + PLOT_H + AXIS_H}
                    fill="transparent"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      tapFeedback();
                      setSelected(i);
                    }}
                    onMouseEnter={() => setSelected(i)}
                  >
                    <title>{`${bucketLabel(b, granularity, true)}: ${formatMetric(metric, v).value} ${formatMetric(metric, v).unit}`}</title>
                  </rect>
                </g>
              );
            })}

            {avg > 0 && (
              <g pointerEvents="none">
                <line x1={yLabelW} x2={width} y1={y(avg)} y2={y(avg)} stroke={tk.textMuted} strokeWidth={1} opacity={0.6} />
                <text x={width} y={y(avg) - 4} textAnchor="end" fontSize={9.5} fontWeight={700} fill={tk.textMuted}>
                  media {compactTick(metric, Math.round(avg))}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Tabla equivalente para lectores de pantalla */}
        <table style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
          <tbody>
            {buckets.map((b, i) => (
              <tr key={b.key}>
                <th>{bucketLabel(b, granularity, true)}</th>
                <td>
                  {formatMetric(metric, values[i]).value} {formatMetric(metric, values[i]).unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
