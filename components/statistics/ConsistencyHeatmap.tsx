import { useEffect, useMemo, useRef, useState } from "react";
import { getTokens } from "../../lib/tokens";
import { activityGrid, heatLevels, type HeatDay, type SeriesWorkout } from "../../lib/statsSeries";
import { tapFeedback } from "../../lib/haptics";

interface ConsistencyHeatmapProps {
  workouts: SeriesWorkout[];
  isDark: boolean;
  /** Frase de cabecera ya calculada (racha, objetivo...). */
  caption?: string;
}

const WEEKS = 18;
const GAP = 3;
const LABEL_W = 14;
const DAY_LABELS = ["L", "", "X", "", "V", "", "D"];
// Opacidad del acento por nivel: una sola tinta (rampa secuencial de un tono), del más tenue al
// pleno. Sobre fondo oscuro "más" tiene que ser "más brillante", no "más oscuro".
const LEVEL_ALPHA = [0, 0.28, 0.5, 0.74, 1];

function fmtDay(d: Date): string {
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

/**
 * Constancia de las últimas 18 semanas, un cuadrado por día (lunes arriba). La intensidad es el
 * volumen de ese día respecto a tus propios días entrenados (cuartiles), no un umbral fijo, así que
 * funciona igual para quien mueve 3 t que para quien mueve 30 t.
 *
 * Las celdas se reparten el ancho disponible en vez de tener un tamaño fijo: a 360px de pantalla
 * caben las 18 columnas sin scroll lateral. Tocar un día lo lee debajo.
 */
export default function ConsistencyHeatmap({ workouts, isDark, caption }: ConsistencyHeatmapProps) {
  const tk = getTokens(isDark);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [picked, setPicked] = useState<HeatDay | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(220, el.clientWidth));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const grid = useMemo(() => activityGrid(workouts, WEEKS), [workouts]);
  const level = useMemo(() => heatLevels(grid), [grid]);
  const trainedDays = grid.flat().filter((d) => d.sessions > 0).length;

  // Día de la semana que más se repite: el "tu día fuerte" que antes era una tarjeta suelta.
  const strongDay = useMemo(() => {
    const counts = Array(7).fill(0);
    grid.forEach((col) => col.forEach((d, r) => d.sessions > 0 && (counts[r] += 1)));
    const best = counts.indexOf(Math.max(...counts));
    if (counts[best] === 0) return null;
    return new Date(2026, 0, 5 + best).toLocaleDateString("es-ES", { weekday: "long" });
  }, [grid]);

  // Tope de 18px: en escritorio las celdas crecían hasta ser bloques de 50px.
  const cell = Math.min(18, Math.max(8, Math.floor((width - LABEL_W - GAP * (WEEKS - 1)) / WEEKS)));
  const gridW = LABEL_W + WEEKS * cell + (WEEKS - 1) * GAP;
  const monthRowH = 14;
  const empty = isDark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.05)";

  return (
    <section aria-label="Constancia" style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: tk.text }}>Constancia</h2>
        <span style={{ fontSize: "0.76rem", color: tk.textMuted, fontWeight: 600 }}>{WEEKS} semanas</span>
      </div>

      <div style={{ borderRadius: 20, padding: 14, background: tk.surface, border: `1px solid ${tk.border}` }}>
        <div style={{ display: "flex", gap: 18, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: "1.45rem", fontWeight: 800, color: tk.text, lineHeight: 1 }}>{trainedDays}</div>
            <div style={{ fontSize: "0.72rem", color: tk.textMuted, marginTop: 3 }}>días entrenados</div>
          </div>
          {strongDay && (
            <div>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color: tk.text, lineHeight: 1, textTransform: "capitalize" }}>{strongDay}</div>
              <div style={{ fontSize: "0.72rem", color: tk.textMuted, marginTop: 3 }}>tu día fuerte</div>
            </div>
          )}
          {caption && (
            <div style={{ marginLeft: "auto", textAlign: "right", fontSize: "0.72rem", color: tk.textMuted, alignSelf: "flex-end", maxWidth: 110 }}>{caption}</div>
          )}
        </div>

        <div ref={wrapRef} style={{ width: "100%" }}>
          <svg width={gridW} height={monthRowH + 7 * cell + 6 * GAP} role="img" aria-label={`${trainedDays} días entrenados en las últimas ${WEEKS} semanas`} style={{ display: "block" }}>
            {grid.map((col, c) => {
              const first = col[0].date;
              // Etiqueta de mes en la primera columna que contiene un día 1..7 de ese mes (y nunca en la
              // primera columna parcial), para que dos meses no queden pegados ("mayjun").
              const newMonth = c > 0 && first.getDate() <= 7;
              const x = LABEL_W + c * (cell + GAP);
              return (
                <g key={col[0].key}>
                  {newMonth && c < WEEKS - 1 && (
                    <text x={x} y={10} fontSize={9.5} fill={tk.textFaint} fontWeight={600}>
                      {first.toLocaleDateString("es-ES", { month: "short" }).replace(".", "")}
                    </text>
                  )}
                  {col.map((d, r) => {
                    const lv = level(d);
                    const isPicked = picked?.key === d.key;
                    return (
                      <rect
                        key={d.key}
                        x={x}
                        y={monthRowH + r * (cell + GAP)}
                        width={cell}
                        height={cell}
                        rx={Math.min(3, cell / 4)}
                        fill={lv === 0 ? empty : tk.accent}
                        fillOpacity={lv === 0 ? 1 : LEVEL_ALPHA[lv]}
                        opacity={d.future ? 0.35 : 1}
                        stroke={isPicked ? tk.text : "none"}
                        strokeWidth={isPicked ? 1.5 : 0}
                        style={{ cursor: d.future ? "default" : "pointer" }}
                        onClick={() => {
                          if (d.future) return;
                          tapFeedback();
                          setPicked(isPicked ? null : d);
                        }}
                      >
                        <title>{`${fmtDay(d.date)}: ${d.sessions ? `${Math.round(d.volume).toLocaleString("es-ES")} kg` : "descanso"}`}</title>
                      </rect>
                    );
                  })}
                </g>
              );
            })}
            {DAY_LABELS.map((l, r) =>
              l ? (
                <text key={r} x={0} y={monthRowH + r * (cell + GAP) + cell * 0.75} fontSize={9.5} fill={tk.textFaint} fontWeight={600}>
                  {l}
                </text>
              ) : null
            )}
          </svg>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, minHeight: 18, gap: 8 }}>
          <span style={{ fontSize: "0.74rem", color: picked ? tk.text : tk.textFaint, fontWeight: picked ? 700 : 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {picked
              ? `${fmtDay(picked.date)} · ${picked.sessions ? `${Math.round(picked.volume).toLocaleString("es-ES")} kg` : "descanso"}`
              : "Toca un día para ver su volumen"}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: "0.68rem", color: tk.textFaint, flexShrink: 0 }}>
            Menos
            {[0, 1, 2, 3, 4].map((lv) => (
              <span
                key={lv}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: lv === 0 ? empty : tk.accent,
                  opacity: lv === 0 ? 1 : LEVEL_ALPHA[lv],
                }}
              />
            ))}
            Más
          </span>
        </div>
      </div>
    </section>
  );
}
