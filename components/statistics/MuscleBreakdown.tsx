import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { getTokens } from "../../lib/tokens";
import { ALL_MUSCLE_GROUPS, computeSeriesByGroup, type CompletedWorkout } from "../../lib/exerciseStats";
import BarList from "./BarList";
import { EmptyState } from "../ui";

interface MuscleBreakdownProps {
  workouts: CompletedWorkout[];
  isDark: boolean;
  t: (key: string) => string;
  periodLabel: string;
}

// Grupos que no son músculos con volumen comparable (Cardio, Movilidad...) no cuentan como
// "pendientes": listarlos como huecos por entrenar sería ruido.
const NON_MUSCLE = new Set(["Cardio", "Movilidad", "Cuerpo Completo"]);
const PUSH = ["Pecho", "Hombros", "Tríceps"];
const PULL = ["Espalda", "Bíceps", "Antebrazo"];
const UPPER = [...PUSH, ...PULL, "Cuello"];
const LOWER = ["Cuádriceps", "Femoral", "Glúteos", "Gemelos", "Aductor", "Abductor"];

function sum(counts: Record<string, number>, groups: string[]) {
  return groups.reduce((a, g) => a + (counts[g] || 0), 0);
}

/**
 * Reparto del trabajo por grupo muscular en el periodo elegido.
 *
 * Sustituye a dos vistas que pintaban el MISMO dato dos veces ("Series por grupo" en barras y
 * "Distribución" en donut), cada una con 17 filas de las que 8 eran ceros. Aquí: una lista de los
 * grupos trabajados (series y % del total), los no trabajados como fichas compactas, y dos
 * balances que responden a la pregunta que de verdad importa — ¿estoy descompensado?
 */
export default function MuscleBreakdown({ workouts, isDark, t, periodLabel }: MuscleBreakdownProps) {
  const tk = getTokens(isDark);
  const reduceMotion = useReducedMotion();
  const counts = useMemo(() => computeSeriesByGroup(workouts), [workouts]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const worked = ALL_MUSCLE_GROUPS.filter((g) => counts[g] > 0).sort((a, b) => counts[b] - counts[a]);
  const pending = ALL_MUSCLE_GROUPS.filter((g) => !counts[g] && !NON_MUSCLE.has(g));
  const muscleGroups = ALL_MUSCLE_GROUPS.filter((g) => !NON_MUSCLE.has(g));

  if (total === 0) {
    return <EmptyState isDark={isDark} icon="barChart" title="Sin series en este periodo" description="Elige un periodo más largo o completa un entreno." />;
  }

  const balances = [
    { key: "pp", title: "Empuje · Tirón", a: { label: "Empuje", v: sum(counts, PUSH) }, b: { label: "Tirón", v: sum(counts, PULL) } },
    { key: "ul", title: "Tren superior · inferior", a: { label: "Superior", v: sum(counts, UPPER) }, b: { label: "Inferior", v: sum(counts, LOWER) } },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "4px 0 10px" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: tk.text }}>Reparto por grupo</h2>
        <span style={{ fontSize: "0.76rem", color: tk.textMuted, fontWeight: 600 }}>{periodLabel}</span>
      </div>

      {/* Resumen en una línea de cifras */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", borderRadius: 20, border: `1px solid ${tk.border}`, background: tk.surface, marginBottom: 12, overflow: "hidden" }}>
        {[
          { label: "Series", value: total.toLocaleString("es-ES") },
          { label: "Grupos", value: `${worked.filter((g) => !NON_MUSCLE.has(g)).length}/${muscleGroups.length}` },
          { label: "Más trabajado", value: t(worked[0]) || worked[0] },
        ].map((s, i) => (
          <div key={s.label} style={{ padding: "11px 12px", borderLeft: i ? `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}` : "none", minWidth: 0 }}>
            <div style={{ fontSize: "0.7rem", color: tk.textMuted, fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: tk.text, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Balances: barra de dos segmentos con hueco de 2px y etiqueta directa en cada extremo */}
      <div style={{ borderRadius: 20, border: `1px solid ${tk.border}`, background: tk.surface, padding: 14, marginBottom: 12, display: "grid", gap: 14 }}>
        {balances.map((bal, bi) => {
          const all = bal.a.v + bal.b.v;
          const pa = all ? bal.a.v / all : 0.5;
          const ratio = bal.b.v > 0 ? bal.a.v / bal.b.v : null;
          const verdict =
            all === 0 ? "Sin datos" : ratio === null || ratio > 1.5 ? `Mucho más ${bal.a.label.toLowerCase()}` : ratio < 0.67 ? `Mucho más ${bal.b.label.toLowerCase()}` : "Equilibrado";
          const balanced = verdict === "Equilibrado";
          return (
            <div key={bal.key}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: tk.text }}>{bal.title}</span>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: balanced ? tk.accent : tk.warning }}>{verdict}</span>
              </div>
              <div style={{ display: "flex", gap: 2, height: 10 }} aria-hidden>
                <motion.div
                  initial={reduceMotion ? false : { flexGrow: 0 }}
                  animate={{ flexGrow: pa }}
                  transition={{ duration: 0.6, delay: 0.1 + bi * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  style={{ flexBasis: 0, background: tk.split[0], borderRadius: "5px 2px 2px 5px", minWidth: all ? 4 : 0 }}
                />
                <motion.div
                  initial={reduceMotion ? false : { flexGrow: 0 }}
                  animate={{ flexGrow: 1 - pa }}
                  transition={{ duration: 0.6, delay: 0.1 + bi * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  style={{ flexBasis: 0, background: tk.split[1], borderRadius: "2px 5px 5px 2px", minWidth: all ? 4 : 0 }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: "0.72rem", color: tk.textMuted }}>
                <span>
                  <i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: tk.split[0], marginRight: 5 }} />
                  {bal.a.label} <b style={{ color: tk.text }}>{Math.round(pa * 100)}%</b> · {bal.a.v} series
                </span>
                <span>
                  {bal.b.v} series · <b style={{ color: tk.text }}>{Math.round((1 - pa) * 100)}%</b> {bal.b.label}
                  <i style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: tk.split[1], marginLeft: 5 }} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ borderRadius: 20, border: `1px solid ${tk.border}`, background: tk.surface, padding: 14 }}>
        <BarList
          isDark={isDark}
          scale="total"
          items={worked.map((g) => ({ key: g, label: t(g) || g, value: counts[g], detail: `${counts[g]} series` }))}
          formatValue={(v, tot) => `${Math.round((v / (tot || 1)) * 100)}%`}
        />
        {pending.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}` }}>
            <div style={{ fontSize: "0.72rem", color: tk.textMuted, fontWeight: 700, marginBottom: 8 }}>Sin trabajar en este periodo</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {pending.map((g) => (
                <span key={g} style={{ fontSize: "0.74rem", fontWeight: 600, color: tk.textMuted, padding: "4px 10px", borderRadius: 99, border: `1px dashed ${tk.borderStrong}` }}>
                  {t(g) || g}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
