import { useRef, useState } from "react";
import { getTokens } from "../../lib/tokens";
import { filterSessionsByPeriod } from "../../lib/exerciseProfile";

const SPANISH_MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const POINT_SPACING = 46;
const PAD_X = 24;
const CHART_H = 150;
const PAD_TOP = 18;
const PAD_BOTTOM = 8;
// Como máximo esta cantidad de etiquetas de fecha a la vez: con muchos puntos comprimidos en un
// ancho fijo (ver la nota sobre "clavado" más abajo) el texto se pisa mucho antes que los puntos.
const MAX_LABELS = 10;

const PERIODS = [
  { key: "30d", label: "30 días", days: 30 },
  { key: "3m", label: "3 meses", days: 90 },
  { key: "1y", label: "1 año", days: 365 },
  { key: "all", label: "Siempre", days: null },
];

/**
 * Progreso del mejor set por sesión: puntos unidos por una línea (no barras) — un punto por
 * SESIÓN de este ejercicio, no por semana, porque con la frecuencia real de un ejercicio concreto
 * agrupar por semana dejaría casi todo vacío.
 *
 * El gráfico NO se desliza a los lados — a propósito, aunque eso signifique que con "Siempre" y
 * muchas sesiones los puntos queden más apretados. El ancho lógico (chartW, en unidades de
 * viewBox) se calcula igual que si hubiera scroll, pero el SVG se renderiza a `width="100%"` con
 * `preserveAspectRatio="none"`, así que el navegador ESCALA esas unidades para que quepan siempre
 * en el ancho real de la tarjeta — nunca hay contenido fuera del viewport que se pueda arrastrar.
 *
 * Tocar/pulsar en cualquier parte del gráfico selecciona el punto más cercano en X, y se puede
 * arrastrar (dedo o ratón) para recorrerlos en vivo sin soltar — ya no hay ningún gesto de scroll
 * con el que competir, así que el arrastre funciona igual en los dos.
 */
export default function ExerciseProgressChart({ isDark = true, sessions, unit }) {
  const tk = getTokens(isDark);
  const [period, setPeriod] = useState("3m");
  const [activePoint, setActivePoint] = useState(null);
  const svgRef = useRef(null);
  const scrubbingRef = useRef(false);

  const periodDays = PERIODS.find((p) => p.key === period)?.days ?? 90;
  const withBestSet = (sessions || []).filter((s) => s.bestSet);
  const filtered = filterSessionsByPeriod(withBestSet, periodDays)
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const weights = filtered.map((s) => s.bestSet.weight);
  const minW = filtered.length > 0 ? Math.min(...weights) : 0;
  const maxW = filtered.length > 0 ? Math.max(...weights) : 1;
  const rangeW = maxW - minW;
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;
  const midY = PAD_TOP + plotH / 2;

  const chartW = Math.max(200, PAD_X * 2 + POINT_SPACING * Math.max(0, filtered.length - 1));
  const getX = (i) => PAD_X + i * POINT_SPACING;
  // Peso más bajo abajo del todo, más alto arriba del todo. Cuando todas las sesiones pesan lo
  // mismo, rangeW es 0 — sin este caso aparte, (weight - minW) / rangeW da 0/0 = NaN y el punto no
  // se pinta; con él, la línea queda recta en el medio en vez de desaparecer o (el bug real) irse
  // entera abajo por el `|| 1` que tenía antes este cálculo.
  const getY = (weight) => (rangeW === 0 ? midY : PAD_TOP + plotH * (1 - (weight - minW) / rangeW));

  const labelStep = Math.max(1, Math.ceil(filtered.length / MAX_LABELS));

  const nearestIndexFor = (clientX) => {
    if (!svgRef.current || filtered.length === 0) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const scale = rect.width > 0 ? chartW / rect.width : 1;
    const xInSvg = (clientX - rect.left) * scale;
    let nearest = 0;
    let nearestDist = Infinity;
    filtered.forEach((_, i) => {
      const dist = Math.abs(getX(i) - xInSvg);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    return nearest;
  };

  const handlePointerDown = (e) => {
    const idx = nearestIndexFor(e.clientX);
    if (idx !== null) setActivePoint(idx);
    scrubbingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!scrubbingRef.current) return;
    const idx = nearestIndexFor(e.clientX);
    if (idx !== null) setActivePoint(idx);
  };

  const stopScrubbing = () => {
    scrubbingRef.current = false;
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              setPeriod(p.key);
              setActivePoint(null);
            }}
            className="feeg-press"
            style={{
              padding: "7px 14px",
              borderRadius: tk.radius.pill,
              border: "none",
              backgroundColor: period === p.key ? tk.accent : tk.surfaceAlt,
              color: period === p.key ? tk.onAccent : tk.textMuted,
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              "--feeg-press-scale": 0.95,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ height: "150px", display: "flex", alignItems: "center", justifyContent: "center", color: tk.textFaint, backgroundColor: tk.surfaceAlt, borderRadius: tk.radius.md }}>
          Sin sesiones en este periodo
        </div>
      ) : (
        // Sin overflow ni scroll: el ancho real lo decide el contenedor, no chartW — el SVG solo
        // usa chartW como sistema de coordenadas interno y lo estira/comprime para llenarlo.
        <div style={{ width: "100%", touchAction: "none" }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${chartW} ${CHART_H}`}
            preserveAspectRatio="none"
            width="100%"
            height={CHART_H}
            style={{ display: "block", cursor: "pointer" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopScrubbing}
            onPointerCancel={stopScrubbing}
          >
            {filtered.length > 1 && (
              <polyline
                fill="none"
                stroke={tk.accent}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={filtered.map((s, i) => `${getX(i)},${getY(s.bestSet.weight)}`).join(" ")}
              />
            )}

            {filtered.map((session, i) => (
              <g key={`${session.workoutId}-${i}`}>
                <circle
                  cx={getX(i)}
                  cy={getY(session.bestSet.weight)}
                  r={activePoint === i ? 7 : 5}
                  fill={activePoint === i ? tk.text : tk.accent}
                  stroke={tk.surfaceAlt}
                  strokeWidth="2"
                  style={{ transition: "r 0.15s ease" }}
                />
                {(i % labelStep === 0 || i === filtered.length - 1) && (
                  <text
                    x={getX(i)}
                    y={CHART_H - 2}
                    textAnchor="middle"
                    fontSize="8"
                    fontWeight="700"
                    fill={tk.textFaint}
                    style={{ textTransform: "uppercase" }}
                  >
                    {SPANISH_MONTHS_SHORT[session.date.getMonth()]} {session.date.getDate()}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      )}

      {activePoint !== null && filtered[activePoint] && (
        <div
          style={{
            marginTop: "10px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 14px",
            borderRadius: tk.radius.pill,
            backgroundColor: tk.surfaceAlt,
            border: `1px solid ${tk.accent}55`,
          }}
        >
          <span style={{ color: tk.accent, fontWeight: 800, fontSize: "0.88rem" }}>
            {filtered[activePoint].bestSet.weight}{unit} × {filtered[activePoint].bestSet.reps}
          </span>
          <span style={{ color: tk.textFaint, fontSize: "0.78rem" }}>{filtered[activePoint].date.toLocaleDateString()}</span>
        </div>
      )}
    </div>
  );
}
