import { EmptyState, MuscleGroupIcon } from "../ui";
import StatSection from "./StatSection";
import { getTokens } from "../../lib/tokens";

export default function DistributionChartSection({ isDark, isMobile, seriesByGroup, t }) {
  const tk = getTokens(isDark);
  const entries = Object.entries(seriesByGroup).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  const activeEntries = entries.filter(([, n]) => n > 0);
  const leader = activeEntries[0];
  let cursor = 0;
  const segmentStops = activeEntries.map(([group, value], index) => {
    const start = cursor;
    cursor += (value / total) * 100;
    const color = `color-mix(in srgb, ${tk.accent} ${Math.max(24, 94 - index * 7)}%, ${tk.bg})`;
    return { group, value, start, end: cursor, color };
  });
  const balanceLabel = leader && leader[1] / total > 0.45 ? "Un grupo concentra buena parte del trabajo" : activeEntries.length >= 4 ? "Reparto bastante equilibrado" : "Puedes ampliar la variedad de grupos";

  return (
    <StatSection
      title="Distribución muscular"
      meta={total > 0 ? `${total} series · ${activeEntries.length} grupos` : undefined}
      isDark={isDark}
      isMobile={isMobile}
    >
      {total === 0 ? (
        <EmptyState
          isDark={isDark}
          icon="barChart"
          title={t("stats_no_data")}
          description="Cuando registres series verás qué porcentaje del trabajo se lleva cada grupo."
        />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "190px 1fr", gap: isMobile ? tk.space.xl : tk.space.xxl, alignItems: "center", marginBottom: tk.space.xxl }}>
            <div style={{ position: "relative", width: isMobile ? 170 : 190, height: isMobile ? 170 : 190, margin: isMobile ? "0 auto" : 0, borderRadius: "50%", background: `conic-gradient(${segmentStops.map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`).join(", ")})`, boxShadow: `0 0 0 1px ${tk.border}, 0 16px 34px ${tk.shadow.float.replace("0 12px 32px ", "")}` }} role="img" aria-label={`Distribución de ${total} series por grupo muscular`}>
              <div style={{ position: "absolute", inset: "23%", borderRadius: "50%", backgroundColor: tk.surface, border: `1px solid ${tk.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <strong style={{ color: tk.text, fontSize: tk.fontSize.display, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{total}</strong>
                <span style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, marginTop: "6px" }}>series totales</span>
              </div>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: tk.weight.bold }}>Lectura rápida</div>
              <div style={{ display: "flex", alignItems: "center", gap: tk.space.md, marginTop: tk.space.md }}>
                {leader && <MuscleGroupIcon group={leader[0]} isDark={isDark} size={54} />}
                <div>
                  <div style={{ color: tk.text, fontSize: tk.fontSize.lg, fontWeight: tk.weight.bold }}>{leader ? t(leader[0]) || leader[0] : "—"}</div>
                  <div style={{ color: tk.accent, fontSize: tk.fontSize.sm, fontWeight: tk.weight.bold }}>{leader ? `${Math.round((leader[1] / total) * 100)}% de tu trabajo` : "Sin datos"}</div>
                </div>
              </div>
              <p style={{ color: tk.textMuted, fontSize: tk.fontSize.sm, lineHeight: 1.5, margin: `${tk.space.lg} 0 0` }}>{balanceLabel}. Usa esta vista para decidir dónde añadir o retirar volumen en tu próxima semana.</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: tk.space.sm }}>
            {entries.map(([group, value], index) => {
              const percent = Math.round((value / total) * 100);
              const segment = segmentStops.find((item) => item.group === group);
              return (
                <div key={group} style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", alignItems: "center", gap: tk.space.sm, padding: "10px 12px", borderRadius: tk.radius.md, backgroundColor: value > 0 ? tk.surfaceAlt : "transparent", border: `1px solid ${value > 0 ? tk.border : "transparent"}`, minWidth: 0 }}>
                  <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: tk.radius.full, backgroundColor: segment?.color || tk.border, boxShadow: value > 0 ? `0 0 0 3px ${tk.accentSoft}` : "none" }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: value > 0 ? tk.text : tk.textFaint, fontSize: tk.fontSize.sm, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t(group) || group}</div>
                    <div style={{ height: 4, backgroundColor: tk.border, borderRadius: tk.radius.pill, overflow: "hidden", marginTop: 5 }}><div style={{ width: `${percent}%`, height: "100%", backgroundColor: segment?.color || "transparent", borderRadius: tk.radius.pill }} /></div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 46 }}><strong style={{ color: value > 0 ? tk.text : tk.textFaint, fontSize: tk.fontSize.sm, fontVariantNumeric: "tabular-nums" }}>{percent}%</strong><div style={{ color: tk.textFaint, fontSize: tk.fontSize.xs, fontVariantNumeric: "tabular-nums" }}>{value} series</div></div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </StatSection>
  );
}
