import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { getTokens } from "../../lib/tokens";
import { computePRTimeline } from "../../lib/exerciseStats";
import { translateExerciseName } from "../../lib/exerciseTranslation";
import { Icon, Card, EmptyState } from "../ui";
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: tk.space.lg }}>
      <StatSection
        title="Récords actuales"
        meta={`${currentRecords.length} ${currentRecords.length === 1 ? "ejercicio" : "ejercicios"}`}
        isDark={isDark}
        isMobile={isMobile}
      >
        <div
          style={{
            display: "grid",
            // `auto-fill` con un mínimo de 200px: a 375px cae a una columna sola y a partir de ahí
            // añade columnas según cabe, sin puntos de ruptura escritos a mano.
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: tk.space.md,
          }}
        >
          {currentRecords.map((rec, index) => {
            const color = tierColor(tk, rec.tier);
            return (
              <motion.div
                key={rec.exerciseName}
                initial={prefersReducedMotion || index >= 12 ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: tk.motion.duration.base,
                  ease: tk.motion.ease.out,
                  delay: prefersReducedMotion ? 0 : Math.min(index, 12) * tk.motion.stagger,
                }}
              >
                <Card isDark={isDark} padding="sm" interactive>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: tk.space.sm,
                      marginBottom: tk.space.md,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: tk.weight.bold,
                        fontSize: tk.fontSize.sm,
                        color: tk.text,
                        lineHeight: 1.3,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {translateExerciseName(rec.exerciseName, language)}
                    </div>
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: tk.radius.full,
                        backgroundColor: tierSoft(tk, rec.tier),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={rec.tier === "historic" ? "award" : "trendUp"} size={14} color={color} />
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", gap: tk.space.xs }}>
                    <span
                      style={{
                        fontSize: tk.fontSize.xl,
                        fontWeight: tk.weight.heavy,
                        color,
                        letterSpacing: "-0.02em",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatWeight(rec.oneRM)}
                    </span>
                    <span style={{ fontSize: tk.fontSize.xs, color: tk.textFaint, fontWeight: tk.weight.medium }}>
                      kg 1RM est.
                    </span>
                  </div>
                  <div style={{ fontSize: tk.fontSize.xs, color: tk.textMuted, marginTop: "2px" }}>
                    Mejor serie: {formatWeight(rec.weight)} kg × {rec.reps}
                  </div>
                  <div style={{ fontSize: tk.fontSize.xs, color: tk.textFaint, marginTop: tk.space.sm }}>
                    {formatDate(rec.date)}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </StatSection>

      <StatSection
        title="Historial de récords"
        meta={`${milestones.length} ${milestones.length === 1 ? "marca" : "marcas"}`}
        isDark={isDark}
        isMobile={isMobile}
      >
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: tk.space.sm }}>
          {visibleMilestones.map((m, index) => (
            <motion.li
              key={m.id}
              // Sólo se animan las filas nuevas al desplegar: reanimar las diez de arriba cada vez
              // que se pulsa "ver más" convierte una acción menor en un parpadeo de toda la lista.
              initial={prefersReducedMotion || index < TIMELINE_PAGE_SIZE ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: tk.motion.duration.base,
                ease: tk.motion.ease.out,
                delay: prefersReducedMotion ? 0 : Math.min(index - TIMELINE_PAGE_SIZE, 10) * tk.motion.stagger,
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: tk.space.md,
                backgroundColor: tk.surfaceAlt,
                border: `1px solid ${tk.border}`,
                borderRadius: tk.radius.md,
                padding: tk.space.md,
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: tk.radius.full,
                  backgroundColor: tierSoft(tk, m.tier),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name={TIER_META[m.tier]?.icon || "trendUp"} size={16} color={tierColor(tk, m.tier)} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: tk.space.sm, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: tk.weight.bold, fontSize: tk.fontSize.sm, color: tk.text }}>
                    {translateExerciseName(m.exerciseName, language)}
                  </span>
                  <TierBadge tk={tk} tier={m.tier} />
                </div>
                <div
                  style={{
                    fontSize: tk.fontSize.xs,
                    color: tk.textMuted,
                    marginTop: "3px",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatWeight(m.weight)} kg × {m.reps} · 1RM est. {formatWeight(m.oneRM)} kg
                  {m.deltaOneRMPercent != null && ` · +${Math.round(m.deltaOneRMPercent)}%`}
                </div>
              </div>

              <span
                style={{
                  fontSize: tk.fontSize.xs,
                  color: tk.textFaint,
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatDate(m.date)}
              </span>
            </motion.li>
          ))}
        </ul>

        {milestones.length > TIMELINE_PAGE_SIZE && (
          <button
            onClick={() => setTimelineExpanded((v) => !v)}
            aria-expanded={timelineExpanded}
            style={{
              display: "block",
              margin: `${tk.space.lg} auto 0`,
              padding: `${tk.space.sm} ${tk.space.xl}`,
              borderRadius: tk.radius.pill,
              border: `1px solid ${tk.border}`,
              backgroundColor: "transparent",
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
