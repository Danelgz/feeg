import { motion, useReducedMotion } from "motion/react";
import { EmptyState, MuscleGroupIcon } from "../ui";
import { getTokens } from "../../lib/tokens";
import StatSection from "./StatSection";

export default function SeriesByGroupSection({ isDark, isMobile, seriesByGroup, t }) {
  const tk = getTokens(isDark);
  const prefersReducedMotion = useReducedMotion();
  const entries = Object.entries(seriesByGroup).sort((a, b) => b[1] - a[1]);
  const activeGroups = entries.filter(([, n]) => n > 0).length;
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  const max = entries[0]?.[1] || 0;
  const leader = entries[0];

  return (
    <StatSection
      title="Series por grupo muscular"
      meta={total > 0 ? `${total} series · ${activeGroups} grupos activos` : undefined}
      isDark={isDark}
      isMobile={isMobile}
    >
      {total === 0 ? (
        <EmptyState
          isDark={isDark}
          icon="barChart"
          title={t("stats_no_data")}
          description="Completa un entrenamiento y aquí verás cuántas series le dedicas a cada grupo."
        />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.35fr 1fr 1fr", gap: tk.space.md, marginBottom: tk.space.xxl }}>
            <div style={{ position: "relative", overflow: "hidden", borderRadius: tk.radius.lg, padding: isMobile ? tk.space.lg : tk.space.xl, background: `linear-gradient(135deg, ${tk.accentSoft}, ${tk.surfaceAlt})`, border: `1px solid ${tk.accent}` }}>
              <div style={{ position: "absolute", right: -18, top: -24, width: 110, height: 110, borderRadius: "50%", background: tk.accentSoft, filter: "blur(2px)" }} aria-hidden="true" />
              <div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: tk.weight.bold }}>Grupo con más trabajo</div>
              <div style={{ display: "flex", alignItems: "center", gap: tk.space.md, marginTop: tk.space.md, position: "relative" }}>
                <MuscleGroupIcon group={leader[0]} isDark={isDark} size={54} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: tk.text, fontSize: tk.fontSize.lg, fontWeight: tk.weight.bold, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t(leader[0]) || leader[0]}</div>
                  <div style={{ color: tk.accent, fontSize: tk.fontSize.sm, fontWeight: tk.weight.bold, fontVariantNumeric: "tabular-nums" }}>{leader[1]} series</div>
                </div>
              </div>
            </div>
            <div style={{ borderRadius: tk.radius.lg, padding: tk.space.lg, backgroundColor: tk.surfaceAlt, border: `1px solid ${tk.border}` }}>
              <div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, textTransform: "uppercase", letterSpacing: "0.06em" }}>Volumen total</div>
              <div style={{ color: tk.text, fontSize: tk.fontSize.display, fontWeight: tk.weight.heavy, marginTop: "8px", fontVariantNumeric: "tabular-nums" }}>{total}</div>
              <div style={{ color: tk.textFaint, fontSize: tk.fontSize.xs }}>series registradas</div>
            </div>
            <div style={{ borderRadius: tk.radius.lg, padding: tk.space.lg, backgroundColor: tk.surfaceAlt, border: `1px solid ${tk.border}` }}>
              <div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, textTransform: "uppercase", letterSpacing: "0.06em" }}>Cobertura</div>
              <div style={{ color: tk.text, fontSize: tk.fontSize.display, fontWeight: tk.weight.heavy, marginTop: "8px", fontVariantNumeric: "tabular-nums" }}>{activeGroups}<span style={{ color: tk.textFaint, fontSize: tk.fontSize.lg }}>/{entries.length}</span></div>
              <div style={{ color: tk.textFaint, fontSize: tk.fontSize.xs }}>grupos trabajados</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: tk.space.md }}>
            {entries.map(([group, value], index) => {
              const ratio = max ? value / max : 0;
              const status = value === 0 ? "Sin series" : ratio >= 0.75 ? "Muy trabajado" : ratio >= 0.35 ? "En progreso" : "Poco trabajado";
              const statusColor = value === 0 ? tk.textFaint : ratio >= 0.75 ? tk.accent : tk.textMuted;
              return (
                <motion.article
                  key={group}
                  className="feeg-surface feeg-hover"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: tk.motion.duration.base, ease: tk.motion.ease.out, delay: prefersReducedMotion ? 0 : index * tk.motion.stagger }}
                  style={{ padding: tk.space.md, borderRadius: tk.radius.lg, display: "flex", alignItems: "center", gap: tk.space.md, minWidth: 0, "--feeg-bg": tk.surfaceAlt, "--feeg-border": tk.border, "--feeg-hover-border": value > 0 ? tk.accent : tk.border }}
                >
                  <div style={{ width: 22, height: 22, borderRadius: tk.radius.full, display: "flex", alignItems: "center", justifyContent: "center", color: index < 3 && value > 0 ? tk.onAccent : tk.textFaint, backgroundColor: index < 3 && value > 0 ? tk.accent : tk.surface, fontSize: tk.fontSize.xs, fontWeight: tk.weight.bold, flexShrink: 0 }}>{index + 1}</div>
                  <MuscleGroupIcon group={group} isDark={isDark} size={46} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: tk.space.sm }}>
                      <strong style={{ color: value > 0 ? tk.text : tk.textFaint, fontSize: tk.fontSize.sm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t(group) || group}</strong>
                      <span style={{ color: value > 0 ? tk.text : tk.textFaint, fontSize: tk.fontSize.md, fontWeight: tk.weight.bold, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{value}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: tk.space.sm, marginTop: "7px" }}>
                      <div style={{ height: 5, flex: 1, minWidth: 0, borderRadius: tk.radius.pill, backgroundColor: tk.border, overflow: "hidden" }}><motion.div initial={prefersReducedMotion ? false : { width: 0 }} animate={{ width: `${ratio * 100}%` }} transition={{ duration: tk.motion.duration.slow, ease: tk.motion.ease.out, delay: prefersReducedMotion ? 0 : index * tk.motion.stagger }} style={{ height: "100%", borderRadius: tk.radius.pill, backgroundColor: value > 0 ? tk.accent : "transparent" }} /></div>
                      <span style={{ color: statusColor, fontSize: tk.fontSize.xs, whiteSpace: "nowrap" }}>{status}</span>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </>
      )}
    </StatSection>
  );
}
