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
  // La nota va plegada tras un botón: un campo de texto vacío en cada ejercicio ocupaba ~50px
  // de una pantalla donde lo que importa son las series. Si ya hay nota, se muestra abierta.
  const [notesOpen, setNotesOpen] = useState(!!exercise.notes);
  const doneCount = exercise.series.filter((s) => s.completed).length;
  const seriesRowRefs = useRef({});

  const weightUnit = weightUnitFor(exercise);
  const isTimeBased = exercise.exerciseType === "time";
  const hasRecordedRir = exercise.series.some((serie) => serie.rir !== "" && serie.rir !== undefined && serie.rir !== null);
  const showRir = mode === "live" && (readOnly ? hasRecordedRir : showRirPreference !== false);

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: 10 }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: "12px", cursor: onOpenHistory ? "pointer" : "default", minWidth: 0 }}
          onClick={onOpenHistory}
        >
          <ExerciseThumb name={exercise.name} />
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, color: tk.text, fontSize: "1.12rem", fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {tName(exercise.name)}
            </h2>
            <span style={{ fontSize: "0.74rem", color: tk.textFaint, fontWeight: 600 }}>
              {t(exercise.muscleGroup)}
              {mode === "live" && !readOnly && (
                <span style={{ color: doneCount === exercise.series.length && doneCount > 0 ? tk.accent : tk.textFaint }}>
                  {" "}· {doneCount}/{exercise.series.length} series
                </span>
              )}
            </span>
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

      {/* Descanso y nota como fichas en una sola fila, en vez de una línea de texto verde y un
          campo de texto siempre visible. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={readOnly ? undefined : () => setRestPickerOpen(true)}
          disabled={readOnly}
          className="feeg-press"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 99, border: "none", background: tk.accentSoft, color: tk.accent, fontSize: "0.8rem", fontWeight: 700, cursor: readOnly ? "default" : "pointer" }}
        >
          <Icon name="timer" size={14} /> {formatRest(exercise.restSeconds)}
        </button>
        {!readOnly && mode === "live" && !notesOpen && (
          <button
            type="button"
            onClick={() => setNotesOpen(true)}
            className="feeg-press"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 99, border: "none", background: tk.surfaceAlt, color: tk.textMuted, fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}
          >
            <Icon name="edit" size={13} /> Nota
          </button>
        )}
      </div>

      {!readOnly && mode === "live" && primaryRecommendation && primarySerie && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px",
            padding: "12px 14px",
            borderRadius: 14,
            background: `linear-gradient(100deg, ${tk.accentSoft}, rgba(26,26,26,0.6))`,
          }}
        >
          <div style={{ width: "34px", height: "34px", display: "grid", placeItems: "center", flexShrink: 0, borderRadius: "11px", background: tk.accent, color: tk.onAccent }}>
            <Icon name={primaryRecommendation.decision === "increase" ? "trendUp" : primaryRecommendation.decision === "decrease" ? "chevronLeft" : "arrowRight"} size={18} strokeWidth={2.4} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: tk.accent, fontSize: "0.67rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t("progression_title")}</div>
            {/* El dato accionable (peso/reps sugeridos) es lo único que importa decidir de un
                vistazo — se separa a su propia línea, notablemente más grande que el resto de la
                tarjeta, para que no compita en tamaño con el "· basado en" ni con el motivo. */}
            <div style={{ color: tk.text, fontSize: "1.15rem", fontWeight: 800, letterSpacing: "-0.02em", marginTop: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.15 }}>
              {primaryRecommendation.weight !== null && primaryRecommendation.weight !== undefined ? `${primaryRecommendation.weight}${weightUnit}` : ""} {primaryRecommendation.reps !== null && primaryRecommendation.reps !== undefined ? `× ${primaryRecommendation.reps}` : ""}
            </div>
            <div style={{ color: tk.textFaint, fontSize: "0.72rem", fontWeight: 600, marginTop: "3px" }}>
              {t(`recommendation_${primaryRecommendation.decision}`)} · {t("progression_based_on")} {previousSeries?.[firstRecommendationIndex]?.weight}{weightUnit} × {previousSeries?.[firstRecommendationIndex]?.reps}
            </div>
          </div>
          <button
            type="button"
            onClick={() => applyRecommendation(primarySerie, primaryRecommendation)}
            style={{ flexShrink: 0, border: "none", borderRadius: "10px", padding: "9px 12px", background: tk.accent, color: tk.onAccent, fontSize: "0.76rem", fontWeight: 800, cursor: "pointer" }}
          >
            {t("recommendation_apply")}
          </button>
        </div>
      )}

      {!readOnly && mode === "live" && notesOpen && (
        <input
          type="text"
          value={exercise.notes}
          onChange={(e) => onSetNotes(e.target.value)}
          placeholder={t("notes_placeholder")}
          autoFocus={!exercise.notes}
          style={{
            width: "100%",
            background: tk.surfaceAlt,
            border: "none",
            borderRadius: 10,
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
        <div style={{ marginBottom: "16px", padding: "9px 12px", background: tk.surfaceAlt, borderRadius: 10, color: tk.textMuted, fontSize: "0.85rem" }}>
          {exercise.notes}
        </div>
      )}

      <div style={{ marginBottom: "15px" }}>
        <div
          className={`feeg-series-grid ${readOnly ? (showRir ? "feeg-series-grid--readonly-rir" : "feeg-series-grid--readonly") : showRir ? "feeg-series-grid--rir" : "feeg-series-grid--no-rir"}`}
          style={{
            display: "grid",
            marginBottom: "4px",
            padding: "0 6px 6px",
            // Sin esto el 100% de ancho + 12px de padding desbordaba la tarjeta por la derecha.
            boxSizing: "border-box",
            color: tk.textFaint,
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {/* "SERIE" no cabe en la columna de 32px de móvil y se montaba sobre "ANTERIOR". */}
          <div><span className="feeg-series-h-long">SERIE</span><span className="feeg-series-h-short">#</span></div>
          {!readOnly && <div>ANTERIOR</div>}
          <div style={{ textAlign: "center" }}>{isTimeBased ? "TIEMPO" : weightUnit === "L" ? "LASTRE" : "KG"}</div>
          <div style={{ textAlign: "center" }}>{isTimeBased ? "KM/H" : "REPS"}</div>
          {showRir && <div style={{ textAlign: "center" }}>RIR</div>}
          {!readOnly && <div />}
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
              onToggleComplete={() => onToggleComplete(serie.uid, previousSeries?.[idx] || null)}
              onFillPrevious={() => {
                const prev = previousSeries?.[idx];
                if (!prev) return;
                if (prev.weight !== undefined && prev.weight !== "") onUpdateField(serie.uid, "weight", Number(prev.weight));
                if (prev.reps !== undefined && prev.reps !== "") onUpdateField(serie.uid, "reps", Number(prev.reps));
              }}
              onOpenType={() => setTypeModalSerieUid(serie.uid)}
            />
        ))}
      </div>

      {!readOnly && <button
        onClick={onAddSeries}
        style={{
          width: "100%",
          padding: "11px",
          backgroundColor: tk.accentSoft,
          color: tk.accent,
          border: "none",
          borderRadius: 12,
          fontSize: "0.9rem",
          fontWeight: 700,
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
          grid-template-columns: 40px minmax(0, 1fr) 70px 66px 56px 38px;
        }
        .feeg-series-grid--no-rir {
          grid-template-columns: 40px minmax(0, 1fr) 76px 72px 40px;
        }
        .feeg-series-grid--readonly-rir {
          grid-template-columns: 40px minmax(0, 1fr) 62px 62px 52px;
        }
        .feeg-series-grid--readonly {
          grid-template-columns: 40px minmax(0, 1fr) 70px 70px;
        }
        .feeg-series-grid > * {
          min-width: 0;
        }
        .feeg-series-h-short {
          display: none;
        }
        @media (max-width: 520px) {
          .feeg-series-h-long {
            display: none;
          }
          .feeg-series-h-short {
            display: inline;
            padding-left: 8px;
          }
          .feeg-series-grid {
            gap: 5px;
          }
          .feeg-series-grid--rir {
            grid-template-columns: 30px minmax(0, 1fr) 54px 50px 38px 34px;
          }
          .feeg-series-grid--no-rir {
            grid-template-columns: 30px minmax(0, 1fr) 60px 56px 34px;
          }
          .feeg-series-grid--readonly-rir {
            grid-template-columns: 32px minmax(0, 1fr) 50px 50px 38px;
          }
          .feeg-series-grid--readonly {
            grid-template-columns: 32px minmax(0, 1fr) 50px 50px;
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
