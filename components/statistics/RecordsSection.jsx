import { useState } from "react";
import { getTokens } from "../../lib/tokens";
import { computePRTimeline } from "../../lib/exerciseStats";
import { translateExerciseName } from "../../lib/exerciseTranslation";
import { Icon, Card, EmptyState } from "../ui";

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

function TierBadge({ tk, tier }) {
  const meta = TIER_META[tier] || TIER_META.minor;
  const color = tierColor(tk, tier);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 9px",
        borderRadius: tk.radius.pill,
        backgroundColor: tierSoft(tk, tier),
        color,
        fontSize: "0.7rem",
        fontWeight: 700,
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
 * "Récords y Progresión": la única sección de Estadísticas que usa el motor de PRs/1RM de
 * lib/exerciseStats.ts (computePRTimeline) — hasta ahora ese motor solo alimentaba el toast
 * durante el entreno en vivo, y todo ese cálculo (tiers minor/major/historic, 1RM estimado) se
 * perdía en cuanto terminabas la sesión. Dos vistas: el récord VIGENTE de cada ejercicio (grid de
 * tarjetas) y un timeline de cuándo se batió cada uno, reconstruido retroactivamente porque los
 * completedWorkouts guardados no llevan esa marca.
 */
export default function RecordsSection({ isDark, workouts, t, language }) {
  const tk = getTokens(isDark);
  const [timelineExpanded, setTimelineExpanded] = useState(false);

  const { milestones, currentRecords } = computePRTimeline(workouts);

  if (currentRecords.length === 0) {
    return (
      <Card isDark={isDark}>
        <EmptyState
          isDark={isDark}
          icon="award"
          title="Aún no hay récords registrados"
          description="Completa entrenamientos con peso y repeticiones para que aparezcan aquí tus marcas personales."
        />
      </Card>
    );
  }

  const visibleMilestones = timelineExpanded ? milestones : milestones.slice(0, TIMELINE_PAGE_SIZE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14px" }}>
          <h2 style={{ margin: 0, color: tk.text, fontSize: "1.2rem", fontWeight: 800 }}>Récords actuales</h2>
          <span style={{ fontSize: "0.82rem", color: tk.textMuted, fontWeight: 600 }}>{currentRecords.length} ejercicios</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
          {currentRecords.map((rec) => {
            const color = tierColor(tk, rec.tier);
            return (
              <Card key={rec.exerciseName} isDark={isDark} padding="sm" interactive>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "10px" }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.92rem",
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

                <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
                  <span style={{ fontSize: "1.5rem", fontWeight: 800, color }}>{formatWeight(rec.oneRM)}</span>
                  <span style={{ fontSize: "0.78rem", color: tk.textFaint, fontWeight: 600 }}>kg 1RM est.</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: tk.textMuted, marginTop: "2px" }}>
                  Mejor serie: {formatWeight(rec.weight)}kg × {rec.reps}
                </div>
                <div style={{ fontSize: "0.72rem", color: tk.textFaint, marginTop: "8px" }}>{formatDate(rec.date)}</div>
              </Card>
            );
          })}
        </div>
      </section>

      <section>
        <h2 style={{ margin: "0 0 14px", color: tk.text, fontSize: "1.2rem", fontWeight: 800 }}>Historial de récords</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {visibleMilestones.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                backgroundColor: tk.surface,
                border: `1px solid ${tk.border}`,
                borderRadius: tk.radius.md,
                padding: "12px 14px",
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
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem", color: tk.text }}>
                    {translateExerciseName(m.exerciseName, language)}
                  </span>
                  <TierBadge tk={tk} tier={m.tier} />
                </div>
                <div style={{ fontSize: "0.8rem", color: tk.textMuted, marginTop: "3px" }}>
                  {formatWeight(m.weight)}kg × {m.reps} · 1RM est. {formatWeight(m.oneRM)}kg
                  {m.deltaOneRMPercent != null && ` · +${Math.round(m.deltaOneRMPercent)}%`}
                </div>
              </div>

              <span style={{ fontSize: "0.75rem", color: tk.textFaint, flexShrink: 0 }}>{formatDate(m.date)}</span>
            </div>
          ))}
        </div>

        {milestones.length > TIMELINE_PAGE_SIZE && (
          <button
            onClick={() => setTimelineExpanded((v) => !v)}
            style={{
              display: "block",
              margin: "14px auto 0",
              padding: "9px 20px",
              borderRadius: tk.radius.pill,
              border: `1px solid ${tk.border}`,
              backgroundColor: "transparent",
              color: tk.accent,
              fontWeight: 700,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: tk.transition,
            }}
          >
            {timelineExpanded ? "Ver menos" : `Ver ${milestones.length - TIMELINE_PAGE_SIZE} más`}
          </button>
        )}
      </section>
    </div>
  );
}
