import { getWorkoutTokens } from "../../lib/tokens";
import { Icon } from "../ui";

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
}

function formatDelta(n) {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(".", ",");
}

/** Línea de detalle larga, para la tarjeta "hero" de un único récord. */
function buildRecordDetail(record, t) {
  if (record.tier === "historic" && record.deltaOneRMPercent != null) {
    return t("pr_summary_historic_detail").replace("{pct}", String(Math.round(record.deltaOneRMPercent)));
  }
  if (record.deltaWeight != null && record.deltaWeight > 0) {
    if (record.previousWeight != null) {
      return t("pr_summary_weight_detail")
        .replace("{delta}", formatDelta(record.deltaWeight))
        .replace("{unit}", record.weightUnit)
        .replace("{prev}", formatDelta(record.previousWeight));
    }
    return `+${formatDelta(record.deltaWeight)}${record.weightUnit}`;
  }
  if (record.deltaOneRMPercent != null && record.deltaOneRMPercent > 0) {
    return t("pr_summary_percent_detail").replace("{pct}", String(Math.round(record.deltaOneRMPercent)));
  }
  return null;
}

/** Delta corto, para las filas de la lista compacta cuando hay varios récords. */
function buildRecordDeltaShort(record) {
  if (record.tier === "historic" && record.deltaOneRMPercent != null) {
    return `+${Math.round(record.deltaOneRMPercent)}%`;
  }
  if (record.deltaWeight != null && record.deltaWeight > 0) {
    return `+${formatDelta(record.deltaWeight)}${record.weightUnit}`;
  }
  if (record.deltaOneRMPercent != null && record.deltaOneRMPercent > 0) {
    return `+${Math.round(record.deltaOneRMPercent)}%`;
  }
  return "";
}

/**
 * Pantalla de finalización real, dentro del propio flujo (antes de navegar a otro sitio).
 * Sustituye el redirect inmediato + el bloque JSX muerto que existía en [id].js.
 *
 * `prRecords` (uno por ejercicio, ya deduplicado por el llamador) trae `tier: null` para los
 * ejercicios que solo tuvieron un "primer registro" — esos NO cuentan como récord real (no hay
 * nada que superar) y se muestran aparte, en una línea discreta, para no inflar la sensación de
 * cuántos récords se han batido de verdad.
 */
export default function WorkoutSummaryScreen({ workout, prRecords = [], onDone, t }) {
  const tk = getWorkoutTokens();
  const translate = t || ((s) => s);

  const realRecords = prRecords.filter((r) => r.tier);
  const firstEverOnly = prRecords.filter((r) => !r.tier && r.isFirstEver);
  const hasRealRecords = realRecords.length > 0;
  const hasAnyPRContent = hasRealRecords || firstEverOnly.length > 0;
  const hero = realRecords.length === 1 ? realRecords[0] : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        backgroundColor: tk.bg,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "84px",
          height: "84px",
          borderRadius: "50%",
          backgroundColor: tk.accentSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
          animation: "workout-summary-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        <Icon name="check" size={40} color={tk.accent} />
      </div>
      <style>{`
        @keyframes workout-summary-pop {
          0% { transform: scale(0.4); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes workout-summary-pr-rise {
          0% { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <h1 style={{ color: tk.text, fontSize: "1.6rem", fontWeight: 800, margin: "0 0 6px" }}>
        {translate("workout_completed_title")}
      </h1>
      <p style={{ color: tk.textMuted, margin: "0 0 32px", fontSize: "0.95rem" }}>{workout.name}</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "12px",
          width: "100%",
          maxWidth: "360px",
          marginBottom: hasAnyPRContent ? "24px" : "36px",
        }}
      >
        {[
          { key: "duration", label: translate("duration_label"), value: formatDuration(workout.elapsedTime || 0) },
          { key: "volume", label: translate("volume"), value: `${(workout.totalVolume || 0).toLocaleString()} kg` },
          { key: "series", label: translate("series_label"), value: workout.series || 0 },
        ].map((stat) => (
          <div key={stat.key} style={{ backgroundColor: tk.surface, border: `1px solid ${tk.border}`, borderRadius: tk.radius.md, padding: "14px 8px" }}>
            <div style={{ color: tk.accent, fontSize: "1.2rem", fontWeight: 700 }}>{stat.value}</div>
            <div style={{ color: tk.textFaint, fontSize: "0.7rem", textTransform: "uppercase", marginTop: "4px" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {hasRealRecords && (
        <div
          style={{
            width: "100%",
            maxWidth: "360px",
            marginBottom: firstEverOnly.length > 0 ? "14px" : "36px",
            animation: "workout-summary-pr-rise 340ms cubic-bezier(0.16,1,0.3,1) 180ms both",
          }}
        >
          {hero ? (
            <div
              style={{
                backgroundColor: tk.surface,
                border: `1px solid ${tk.accent}66`,
                borderRadius: tk.radius.lg,
                padding: "20px",
                textAlign: "left",
                display: "flex",
                gap: "14px",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: tk.radius.full,
                  backgroundColor: tk.accentSoft,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="trendUp" size={18} color={tk.accent} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: tk.accent, fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
                  {translate("pr_summary_eyebrow")}
                </div>
                <div style={{ color: tk.text, fontSize: "1.05rem", fontWeight: 700, marginBottom: "4px" }}>{hero.name}</div>
                {buildRecordDetail(hero, translate) && (
                  <div style={{ color: tk.textMuted, fontSize: "0.85rem" }}>{buildRecordDetail(hero, translate)}</div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: tk.surface, border: `1px solid ${tk.border}`, borderRadius: tk.radius.lg, padding: "18px 20px", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: tk.radius.full,
                    backgroundColor: tk.accentSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name="trendUp" size={15} color={tk.accent} />
                </div>
                <div style={{ color: tk.text, fontSize: "0.95rem", fontWeight: 700 }}>
                  {realRecords.length >= 4
                    ? translate("pr_summary_multi_title")
                    : `${realRecords.length} ${translate(realRecords.length === 1 ? "personal_record_label" : "personal_records_label")}`}
                </div>
              </div>
              {realRecords.map((record, idx) => (
                <div
                  key={record.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 0",
                    borderTop: idx === 0 ? "none" : `1px solid ${tk.border}`,
                  }}
                >
                  <span style={{ color: tk.text, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {record.name}
                  </span>
                  <span style={{ color: tk.accent, fontSize: "0.85rem", fontWeight: 600, flexShrink: 0 }}>
                    {buildRecordDeltaShort(record)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {firstEverOnly.length > 0 && (
        <p style={{ color: tk.textFaint, fontSize: "0.78rem", marginBottom: "36px", maxWidth: "360px", lineHeight: 1.5 }}>
          {translate("pr_summary_first_ever_prefix")} {firstEverOnly.map((r) => r.name).join(", ")}
        </p>
      )}

      <button
        onClick={onDone}
        style={{
          width: "100%",
          maxWidth: "360px",
          padding: "16px",
          backgroundColor: tk.accent,
          color: tk.onAccent,
          border: "none",
          borderRadius: tk.radius.md,
          fontSize: "1rem",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {translate("done_label")}
      </button>
    </div>
  );
}
