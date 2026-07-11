import { memo, useState } from "react";
import { getWorkoutTokens } from "../../lib/tokens";
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

function weightUnitFor(exercise) {
  if (exercise.exerciseType === "time") return "m";
  if (exercise.unit === "lastre") return "L";
  return "kg";
}

/**
 * Tarjeta de un ejercicio dentro de la sesión (plantilla o en vivo). Memoizada — con el estado
 * indexado por uid del reducer, solo se re-renderiza si SU propio `exercise` cambia de referencia.
 */
function ExerciseCard({
  exercise,
  mode = "live",
  previousSeries,
  onUpdateField,
  onToggleComplete,
  onSetSeriesType,
  onAddSeries,
  onRemoveSeries,
  onSetRest,
  onSetNotes,
  onSubstitute,
  onDeleteExercise,
  onOpenHistory,
}) {
  const tk = getWorkoutTokens();
  const [menuOpen, setMenuOpen] = useState(false);
  const [restPickerOpen, setRestPickerOpen] = useState(false);
  const [typeModalSerieUid, setTypeModalSerieUid] = useState(null);
  const [confirmDeleteExercise, setConfirmDeleteExercise] = useState(false);
  const [confirmDeleteSerieUid, setConfirmDeleteSerieUid] = useState(null);

  const weightUnit = weightUnitFor(exercise);
  const isTimeBased = exercise.exerciseType === "time";

  let normalCount = 0;
  const effectiveIndexes = exercise.series.map((s) => {
    if (s.type === "N" || !s.type) {
      normalCount += 1;
      return normalCount;
    }
    return normalCount;
  });

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
              {exercise.name}
            </h2>
            <span style={{ fontSize: "0.75rem", color: tk.textFaint, textTransform: "uppercase" }}>{exercise.muscleGroup}</span>
          </div>
        </div>

        <ExerciseActionsMenu
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
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", color: tk.accent, marginBottom: "16px", fontSize: "0.95rem" }}>
        <span onClick={() => setRestPickerOpen(true)} style={{ cursor: "pointer", fontWeight: 500 }}>
          Descanso: {formatRest(exercise.restSeconds)}
        </span>
      </div>

      {mode === "live" && (
        <input
          type="text"
          value={exercise.notes}
          onChange={(e) => onSetNotes(e.target.value)}
          placeholder="Añadir notas aquí..."
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

      <div style={{ marginBottom: "15px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "40px 1fr 70px 70px 45px",
            gap: "10px",
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
          <div />
        </div>

        {exercise.series.map((serie, idx) => (
          <SeriesRow
            key={serie.uid}
            serie={serie}
            effectiveIndex={effectiveIndexes[idx]}
            previous={previousSeries?.[idx] || null}
            mode={mode}
            weightUnit={weightUnit}
            onFieldChange={(field, value) => onUpdateField(serie.uid, field, value)}
            onToggleComplete={() => onToggleComplete(serie.uid)}
            onOpenType={() => setTypeModalSerieUid(serie.uid)}
          />
        ))}
      </div>

      <button
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
        <Icon name="plus" size={15} /> Agregar Serie
      </button>

      <RestTimePickerModal
        open={restPickerOpen}
        value={exercise.restSeconds}
        onChange={onSetRest}
        onClose={() => setRestPickerOpen(false)}
      />

      <SeriesTypeModal
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
      />

      <ConfirmModal
        isDark
        open={confirmDeleteExercise}
        title="¿Eliminar ejercicio?"
        description="Esta acción no se puede deshacer."
        danger
        onConfirm={() => {
          setConfirmDeleteExercise(false);
          onDeleteExercise();
        }}
        onCancel={() => setConfirmDeleteExercise(false)}
      />

      <ConfirmModal
        isDark
        open={!!confirmDeleteSerieUid}
        title="¿Eliminar esta serie?"
        description="Esta acción no se puede deshacer."
        danger
        onConfirm={() => {
          onRemoveSeries(confirmDeleteSerieUid);
          setConfirmDeleteSerieUid(null);
        }}
        onCancel={() => setConfirmDeleteSerieUid(null)}
      />
    </div>
  );
}

export default memo(ExerciseCard);
