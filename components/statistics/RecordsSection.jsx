import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { getTokens } from "../../lib/tokens";
import { computePRTimeline } from "../../lib/exerciseStats";
import { translateExerciseName } from "../../lib/exerciseTranslation";
import { Icon, EmptyState, Sparkline } from "../ui";
import { exerciseTrend } from "../../lib/statsSeries";
import ExerciseThumb from "../workout/ExerciseThumb";
import StatSection from "./StatSection";

const SHORT_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const TIMELINE_PAGE_SIZE = 10;

const TIER_META = {
  first: { icon: "plus", label: "Nuevo ejercicio" },
  minor: { icon: "trendUp", label: "Récord" },
  major: { icon: "trendUp", label: "Gran récord" },
  historic: { icon: "award", label: "Récord histórico" },
};

function tierColor(tk, tier) {
  if (tier === "historic") return tk.warning;
  if (tier === "first") return tk.textMuted;
  return tk.accent;
}

function tierSoft(tk, tier) {
  if (tier === "historic") return tk.warningSoft;
  if (tier === "first") return tk.surfaceHover;
  return tk.accentSoft;
}

function formatWeight(n) {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
}

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}${sameYear ? "" : ` ${d.getFullYear()}`}`;
}

/**
 * Distintivo del tipo de récord.
 *
 * Lleva SIEMPRE su etiqueta escrita, no sólo el color: un récord histórico se distingue de uno
 * normal por el ámbar frente al mint, y quien no perciba esa diferencia se quedaría sin el dato.
 */
function TierBadge({ tk, tier }) {
  const meta = TIER_META[tier] || TIER_META.minor;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: tk.space.xs,
        padding: `2px ${tk.space.sm}`,
        borderRadius: tk.radius.pill,
        backgroundColor: tierSoft(tk, tier),
        color: tierColor(tk, tier),
        fontSize: tk.fontSize.xs,
        fontWeight: tk.weight.bold,
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}
    >
      <Icon name={meta.icon} size={11} />
      {meta.label}
    </div>
  );
}

/**
 * "Récords": la única sección de Estadísticas que usa el motor de PRs/1RM de lib/exerciseStats.ts
 * (computePRTimeline) — antes ese motor sólo alimentaba el toast del entreno en vivo, y todo su
 * cálculo (tiers minor/major/historic, 1RM estimado) se perdía al terminar la sesión. Dos vistas: el
 * récord VIGENTE de cada ejercicio y el historial de cuándo se batió cada uno, reconstruido
 * retroactivamente porque los entrenos guardados no llevan esa marca.
 */
export default function RecordsSection({ isDark, isMobile, workouts, t, language }) {
  const tk = getTokens(isDark);
  const prefersReducedMotion = useReducedMotion();
  const [timelineExpanded, setTimelineExpanded] = useState(false);

  // computePRTimeline recorre el historial completo reconstruyendo cada récord. Sin memoizar, se
  // rehacía entero en cada render — incluido al pulsar "ver más", que sólo cambia cuántas filas se
  // pintan y no tiene por qué recalcular nada.
  const { milestones, currentRecords } = useMemo(() => computePRTimeline(workouts), [workouts]);

  if (currentRecords.length === 0) {
    return (
      <StatSection title="Récords" isDark={isDark} isMobile={isMobile}>
        <EmptyState
          isDark={isDark}
          icon="award"
          title="Aún no hay récords registrados"
          description="Completa entrenamientos con peso y repeticiones para que aparezcan aquí tus marcas personales."
        />
      </StatSection>
    );
  }

  const visibleMilestones = timelineExpanded ? milestones : milestones.slice(0, TIMELINE_PAGE_SIZE);
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recentCount = milestones.filter((m) => m.tier !== "first" && new Date(m.date).getTime() >= monthAgo).length;
  const strongest = currentRecords.reduce((best, r) => (!best || r.oneRM > best.oneRM ? r : best), null);
  const line = tk.hairline;

  // Hitos agrupados por mes para leer el historial como una línea de tiempo, no como una pila.
  const groupedMilestones = [];
  for (const m of visibleMilestones) {
    const d = new Date(m.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let g = groupedMilestones[groupedMilestones.length - 1];
    if (!g || g.key !== key) {
      g = { key, label: d.toLocaleDateString("es-ES", { month: "long", year: "numeric" }), items: [] };
      groupedMilestones.push(g);
    }
    g.items.push(m);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Resumen de récords en una sola superficie */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", borderBottom: `1px solid ${line}`, marginBottom: 18 }}>
        {[
          { label: "Últimos 30 días", value: recentCount, sub: recentCount === 1 ? "récord" : "récords", accent: recentCount > 0 },
          { label: "Ejercicios", value: currentRecords.length, sub: "con marca" },
          { label: "Más fuerte", value: strongest ? `${formatWeight(strongest.oneRM)} kg` : "—", sub: strongest ? translateExerciseName(strongest.exerciseName, language) : "" },
        ].map((c, i) => (
          <div key={c.label} style={{ padding: `4px 10px 14px ${i ? 14 : 0}px`, borderLeft: i ? `1px solid ${line}` : "none", minWidth: 0 }}>
            <div style={{ fontSize: "0.7rem", color: tk.textMuted, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: c.accent ? tk.accent : tk.text, marginTop: 2, whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>{c.value}</div>
            <div style={{ fontSize: "0.68rem", color: tk.textFaint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <StatSection
        title="Récords actuales"
        meta={`${currentRecords.length} ${currentRecords.length === 1 ? "ejercicio" : "ejercicios"}`}
        isDark={isDark}
        isMobile={isMobile}
      >
        {/* Lista agrupada: una fila de ~60px por ejercicio (antes una tarjeta de ~90px), con la
            tendencia del 1RM estimado dibujada al lado del número para ver si sigue subiendo. */}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, borderTop: `1px solid ${line}`, borderBottom: `1px solid ${line}` }}>
          {currentRecords.map((rec, index) => {
            const trend = exerciseTrend(workouts, rec.exerciseName).slice(-10).map((p) => p.value);
            const historic = rec.tier === "historic";
            return (
              <motion.li
                key={rec.exerciseName}
                initial={prefersReducedMotion || index >= 12 ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: tk.motion.duration.base, delay: prefersReducedMotion ? 0 : Math.min(index, 12) * 0.03 }}
                style={{ borderTop: index ? `1px solid ${line}` : "none" }}
              >
                <Link
                  href={`/exercise-history?exercise=${encodeURIComponent(rec.exerciseName)}`}
                  className="feeg-press feeg-surface feeg-hover"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "11px 0",
                    textDecoration: "none",
                    "--feeg-bg": "transparent",
                    "--feeg-fg": tk.text,
                    "--feeg-hover-bg": "transparent",
                    "--feeg-border-width": "0px",
                    "--feeg-press-scale": 0.985,
                  }}
                >
                  <ExerciseThumb name={rec.exerciseName} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {translateExerciseName(rec.exerciseName, language)}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: tk.textMuted, marginTop: 2, whiteSpace: "nowrap" }}>
                      {formatWeight(rec.weight)} kg × {rec.reps} · {formatDate(rec.date)}
                      {historic && <span style={{ color: tk.warning, fontWeight: 700 }}> · histórico</span>}
                    </div>
                  </div>
                  <Sparkline values={trend} width={56} height={24} color={tk.accent} surface={tk.bg} />
                  <div style={{ textAlign: "right", minWidth: 58 }}>
                    <div style={{ fontSize: "1.08rem", fontWeight: 800, color: tk.text, lineHeight: 1.1 }}>{formatWeight(rec.oneRM)}</div>
                    <div style={{ fontSize: "0.64rem", color: tk.textFaint, fontWeight: 600 }}>kg 1RM est.</div>
                  </div>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </StatSection>

      <StatSection
        title="Historial de récords"
        meta={`${milestones.length} ${milestones.length === 1 ? "marca" : "marcas"}`}
        isDark={isDark}
        isMobile={isMobile}
      >
        <div>
          {groupedMilestones.map((g) => (
            <div key={g.key}>
              <div style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: tk.textMuted, padding: "10px 0 6px" }}>{g.label}</div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, position: "relative" }}>
                {/* Línea de tiempo: hairline vertical que une los puntos del mes */}
                <span aria-hidden style={{ position: "absolute", left: 5, top: 8, bottom: 8, width: 1, background: line }} />
                {g.items.map((m) => {
                  const color = tierColor(tk, m.tier);
                  const showBadge = m.tier === "major" || m.tier === "historic";
                  return (
                    <li key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0", position: "relative" }}>
                      <span aria-hidden style={{ width: 11, height: 11, borderRadius: 99, background: color, boxShadow: `0 0 0 2px ${tk.bg}`, flexShrink: 0, opacity: m.tier === "first" ? 0.5 : 1 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          <span style={{ fontWeight: 700, fontSize: "0.86rem", color: tk.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {translateExerciseName(m.exerciseName, language)}
                          </span>
                          {showBadge && <TierBadge tk={tk} tier={m.tier} />}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: tk.textMuted, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {m.tier === "first" ? "Primera marca · " : ""}
                          {formatWeight(m.weight)} kg × {m.reps} · 1RM {formatWeight(m.oneRM)} kg
                          {m.deltaOneRMPercent != null && <b style={{ color: tk.accent }}> +{Math.round(m.deltaOneRMPercent)}%</b>}
                        </div>
                      </div>
                      <span style={{ fontSize: "0.72rem", color: tk.textFaint, flexShrink: 0 }}>{formatDate(m.date)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {milestones.length > TIMELINE_PAGE_SIZE && (
          <button
            onClick={() => setTimelineExpanded((v) => !v)}
            aria-expanded={timelineExpanded}
            style={{
              display: "block",
              margin: `${tk.space.lg} auto 0`,
              padding: `${tk.space.sm} ${tk.space.xl}`,
              borderRadius: tk.radius.pill,
              border: "none",
              backgroundColor: tk.accentSoft,
              color: tk.accent,
              fontWeight: tk.weight.bold,
              fontSize: tk.fontSize.sm,
              cursor: "pointer",
              transition: tk.motion.css.fast,
            }}
          >
            {timelineExpanded ? "Ver menos" : `Ver ${milestones.length - TIMELINE_PAGE_SIZE} más`}
          </button>
        )}
      </StatSection>
    </div>
  );
}
