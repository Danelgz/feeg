import { memo, useRef, useState } from "react";
import { getWorkoutTokens } from "../../lib/tokens";
import { weightUnitFor } from "../../lib/exerciseStats";
import { getSetRecommendation } from "../../lib/workoutRecommendations";
import { Icon, ConfirmModal } from "../ui";
import ExerciseThumb from "./ExerciseThumb";
import ExerciseActionsMenu from "./ExerciseActionsMenu";
import SeriesRow from "./SeriesRow";
import SeriesTypeModal from "./SeriesTypeModal";
import RestTimePickerModal from "./RestTimePickerModal";

function formatRest(totalSeconds) {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return s === 0 ? `${m}min` : `${m}min ${s}s`;
}

/**
 * Tarjeta de un ejercicio dentro de la sesión (plantilla o en vivo). Memoizada — con el estado
 * indexado por uid del reducer, solo se re-renderiza si SU propio `exercise` cambia de referencia.
 */
function ExerciseCard({
  exercise,
  mode = "live",
  previousSeries,
  translate,
  translateExerciseName,
  onUpdateField,
  onRirChange,
  onToggleComplete,
  onSetSeriesType,
  onAddSeries,
  onRemoveSeries,
  onSetRest,
  onSetNotes,
  onSubstitute,
  onDeleteExercise,
  onOpenHistory,
  showRirPreference = true,
  progressionMode = "all",
  readOnly = false,
}) {
  const t = translate || ((s) => s);
  const tName = translateExerciseName || ((s) => s);
  const tk = getWorkoutTokens();
  const [menuOpen, setMenuOpen] = useState(false);
  const [restPickerOpen, setRestPickerOpen] = useState(false);
  const [typeModalSerieUid, setTypeModalSerieUid] = useState(null);
  const [confirmDeleteExercise, setConfirmDeleteExercise] = useState(false);
  const [confirmDeleteSerieUid, setConfirmDeleteSerieUid] = useState(null);
  const [appliedRecommendationUids, setAppliedRecommendationUids] = useState(() => new Set());
  const seriesRowRefs = useRef({});

  const weightUnit = weightUnitFor(exercise);
  const isTimeBased = exercise.exerciseType === "time";
  const showRir = mode === "live" && showRirPreference !== false;

  let normalCount = 0;
  const effectiveIndexes = exercise.series.map((s) => {
    if (s.type === "N" || !s.type) {
      normalCount += 1;
      return normalCount;
    }
    return normalCount;
  });
  const recommendations = exercise.series.map((serie, idx) => {
    const isNormalSeries = serie.type === "N" || !serie.type;
    if (readOnly || !isNormalSeries || serie.completed || appliedRecommendationUids.has(serie.uid) || progressionMode === "off") return null;
    const recommendation = getSetRecommendation(previousSeries?.[idx], serie.reps, exercise.exerciseType);
    if (!recommendation) return null;
    if (progressionMode === "increaseOnly" && recommendation.decision !== "increase") return null;
    if (progressionMode === "increaseMaintain" && recommendation.decision === "decrease") return null;
    return recommendation;
  });
  const firstRecommendationIndex = recommendations.findIndex(Boolean);
  const primaryRecommendation = firstRecommendationIndex >= 0 ? recommendations[firstRecommendationIndex] : null;
  const primarySerie = firstRecommendationIndex >= 0 ? exercise.series[firstRecommendationIndex] : null;
  const applyRecommendation = (serie, recommendation) => {
    if (!serie || !recommendation) return;
    if (serie.type && serie.type !== "N") return;
    if (recommendation.weight !== null && recommendation.weight !== undefined) onUpdateField(serie.uid, "weight", recommendation.weight);
    if (recommendation.reps !== null && recommendation.reps !== undefined) onUpdateField(serie.uid, "reps", recommendation.reps);
    setAppliedRecommendationUids((previous) => {
      const next = new Set(previous);
      next.add(serie.uid);
      return next;
    });

    const currentIndex = exercise.series.findIndex((candidate) => candidate.uid === serie.uid);
    const nextSerie = exercise.series.slice(currentIndex + 1).find((candidate) => {
      const isNormalSeries = candidate.type === "N" || !candidate.type;
      return isNormalSeries && !candidate.completed;
    });
    if (nextSerie && typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        seriesRowRefs.current[nextSerie.uid]?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      });
    }
  };

  return (
    <div style={{ marginBottom: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: "15px", cursor: onOpenHistory ? "pointer" : "default", minWidth: 0 }}
          onClick={onOpenHistory}
        >
          <ExerciseThumb name={exercise.name} />
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, color: tk.accent, fontSize: "1.15rem", fontWeight: 500, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {tName(exercise.name)}
            </h2>
            <span style={{ fontSize: "0.75rem", color: tk.textFaint, textTransform: "uppercase" }}>{t(exercise.muscleGroup)}</span>
          </div>
        </div>

        {!readOnly && <ExerciseActionsMenu
          open={menuOpen}
          onToggle={() => setMenuOpen((v) => !v)}
          onSubstitute={() => {
            setMenuOpen(false);
            onSubstitute();
          }}
          onDelete={() => {
            setMenuOpen(false);
            setConfirmDeleteExercise(true);
          }}
          t={t}
        />}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", color: tk.accent, marginBottom: "16px", fontSize: "0.95rem" }}>
        <span onClick={readOnly ? undefined : () => setRestPickerOpen(true)} style={{ cursor: readOnly ? "default" : "pointer", fontWeight: 500 }}>
          {t("rest_prefix")}: {formatRest(exercise.restSeconds)}
        </span>
      </div>

      {!readOnly && mode === "live" && primaryRecommendation && primarySerie && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px",
            padding: "12px 14px",
            borderRadius: tk.radius.md,
            background: `linear-gradient(100deg, ${tk.accentSoft}, rgba(26,26,26,0.75))`,
            border: `1px solid ${tk.accent}55`,
            boxShadow: `0 8px 24px rgba(0, 18, 15, 0.24)`,
          }}
        >
          <div style={{ width: "34px", height: "34px", display: "grid", placeItems: "center", flexShrink: 0, borderRadius: "11px", background: tk.accent, color: tk.onAccent }}>
            <Icon name={primaryRecommendation.decision === "increase" ? "trendUp" : primaryRecommendation.decision === "decrease" ? "chevronLeft" : "arrowRight"} size={18} strokeWidth={2.4} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: tk.accent, fontSize: "0.67rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t("progression_title")}</div>
            <div style={{ color: tk.text, fontSize: "0.84rem", fontWeight: 700, marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {primaryRecommendation.weight !== null && primaryRecommendation.weight !== undefined ? `${primaryRecommendation.weight}${weightUnit}` : ""} {primaryRecommendation.reps !== null && primaryRecommendation.reps !== undefined ? `× ${primaryRecommendation.reps}` : ""}
              <span style={{ color: tk.textFaint, fontWeight: 500 }}> · {t(`recommendation_${primaryRecommendation.decision}`)}</span>
            </div>
            <div style={{ color: tk.textMuted, fontSize: "0.72rem", marginTop: "3px" }}>
              {t("progression_based_on")} {previousSeries?.[firstRecommendationIndex]?.weight}{weightUnit} × {previousSeries?.[firstRecommendationIndex]?.reps}
            </div>
          </div>
          <button
            type="button"
            onClick={() => applyRecommendation(primarySerie, primaryRecommendation)}
            style={{ flexShrink: 0, border: `1px solid ${tk.accent}88`, borderRadius: "9px", padding: "8px 10px", background: "transparent", color: tk.accent, fontSize: "0.72rem", fontWeight: 800, cursor: "pointer" }}
          >
            {t("recommendation_apply")}
          </button>
        </div>
      )}

      {!readOnly && mode === "live" && (
        <input
          type="text"
          value={exercise.notes}
          onChange={(e) => onSetNotes(e.target.value)}
          placeholder={t("notes_placeholder")}
          style={{
            width: "100%",
            background: tk.surfaceAlt,
            border: `1px solid ${tk.border}`,
            borderRadius: tk.radius.sm,
            color: tk.text,
            padding: "8px 12px",
            fontSize: "0.85rem",
            marginBottom: "16px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      )}

      {readOnly && exercise.notes && (
        <div style={{ marginBottom: "16px", padding: "9px 12px", background: tk.surfaceAlt, border: `1px solid ${tk.border}`, borderRadius: tk.radius.sm, color: tk.textMuted, fontSize: "0.85rem" }}>
          {exercise.notes}
        </div>
      )}

      <div style={{ marginBottom: "15px" }}>
        <div
          className={`feeg-series-grid ${showRir ? "feeg-series-grid--rir" : "feeg-series-grid--no-rir"}`}
          style={{
            display: "grid",
            marginBottom: "10px",
            color: tk.textFaint,
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          <div>SERIE</div>
          <div>ANTERIOR</div>
          <div style={{ textAlign: "center" }}>{isTimeBased ? "TIEMPO" : weightUnit === "L" ? "LASTRE" : "KG"}</div>
          <div style={{ textAlign: "center" }}>{isTimeBased ? "KM/H" : "REPS"}</div>
          {showRir && <div style={{ textAlign: "center" }}>RIR</div>}
          <div />
        </div>

        {exercise.series.map((serie, idx) => (
            <SeriesRow
              key={serie.uid}
              rowRef={(node) => {
                if (node) seriesRowRefs.current[serie.uid] = node;
                else delete seriesRowRefs.current[serie.uid];
              }}
              serie={serie}
              effectiveIndex={effectiveIndexes[idx]}
              previous={previousSeries?.[idx] || null}
              mode={mode}
              readOnly={readOnly}
              showRir={showRir}
              weightUnit={weightUnit}
              onFieldChange={(field, value) => onUpdateField(serie.uid, field, value)}
              onRirChange={(value) => onRirChange?.(serie.uid, value)}
              onToggleComplete={() => onToggleComplete(serie.uid)}
              onOpenType={() => setTypeModalSerieUid(serie.uid)}
            />
        ))}
      </div>

      {!readOnly && <button
        onClick={onAddSeries}
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: tk.surfaceAlt,
          color: tk.text,
          border: "none",
          borderRadius: tk.radius.sm,
          fontSize: "0.9rem",
          fontWeight: 500,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
        }}
      >
        <Icon name="plus" size={15} /> {t("add_series")}
      </button>}

      <style>{`
        .feeg-series-grid {
          width: 100%;
          min-width: 0;
          gap: 10px;
        }
        .feeg-series-grid--rir {
          grid-template-columns: 40px minmax(0, 1fr) 62px 62px 52px 38px;
        }
        .feeg-series-grid--no-rir {
          grid-template-columns: 40px minmax(0, 1fr) 70px 70px 45px;
        }
        .feeg-series-grid > * {
          min-width: 0;
        }
        @media (max-width: 520px) {
          .feeg-series-grid {
            gap: 5px;
          }
          .feeg-series-grid--rir {
            grid-template-columns: 32px minmax(0, 1fr) 50px 50px 38px 32px;
          }
          .feeg-series-grid--no-rir {
            grid-template-columns: 32px minmax(0, 1fr) 50px 50px 34px;
          }
        }
      `}</style>

      {!readOnly && <RestTimePickerModal
        open={restPickerOpen}
        value={exercise.restSeconds}
        onChange={onSetRest}
        onClose={() => setRestPickerOpen(false)}
        t={t}
      />}

      {!readOnly && <SeriesTypeModal
        open={!!typeModalSerieUid}
        currentType={exercise.series.find((s) => s.uid === typeModalSerieUid)?.type || "N"}
        onSelectType={(type) => {
          onSetSeriesType(typeModalSerieUid, type);
          setTypeModalSerieUid(null);
        }}
        onRequestDelete={
          exercise.series.length > 1
            ? () => {
                setConfirmDeleteSerieUid(typeModalSerieUid);
                setTypeModalSerieUid(null);
              }
            : undefined
        }
        onClose={() => setTypeModalSerieUid(null)}
        t={t}
      />}

      {!readOnly && <ConfirmModal
        isDark
        open={confirmDeleteExercise}
        title={t("delete_exercise_title")}
        description={t("action_irreversible")}
        danger
        onConfirm={() => {
          setConfirmDeleteExercise(false);
          onDeleteExercise();
        }}
        onCancel={() => setConfirmDeleteExercise(false)}
      />}

      {!readOnly && <ConfirmModal
        isDark
        open={!!confirmDeleteSerieUid}
        title={t("delete_series_title")}
        description={t("action_irreversible")}
        danger
        onConfirm={() => {
          onRemoveSeries(confirmDeleteSerieUid);
          setConfirmDeleteSerieUid(null);
        }}
        onCancel={() => setConfirmDeleteSerieUid(null)}
      />}
    </div>
  );
}

export default memo(ExerciseCard);
