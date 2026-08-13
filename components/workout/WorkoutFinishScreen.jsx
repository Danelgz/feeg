import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { getWorkoutTokens } from "../../lib/tokens";
import { Icon } from "../ui";
import DurationPickerModal from "./DurationPickerModal";

function formatDuration(totalMinutes) {
  const m = Math.round(totalMinutes || 0);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
}

/**
 * Cierre de sesión: reemplaza el antiguo par "¿Terminar? / Formulario" (dos pasos, borde grueso
 * de color, campos de formulario apilados) por un único paso. Compartido entre `routines/[id].js`
 * y `routines/empty.js` para que no vuelvan a divergir como estuvieron a punto de hacer con los
 * botones — `routineChanges`/`onUpdateOriginalRoutineChange` son opcionales porque un entreno
 * vacío no tiene rutina original que actualizar.
 */
export default function WorkoutFinishScreen({
  name,
  onNameChange,
  namePlaceholder,
  comments,
  onCommentsChange,
  totalMinutes,
  onTotalMinutesChange,
  elapsedSeconds,
  totals,
  exerciseCount,
  routineChanges,
  updateOriginalRoutine,
  onUpdateOriginalRoutineChange,
  savingWorkout,
  onCancel,
  onSave,
  t,
}) {
  const tk = getWorkoutTokens();
  const translate = t || ((s) => s);
  const prefersReducedMotion = useReducedMotion();
  const [notesOpen, setNotesOpen] = useState(!!comments);
  const [durationPickerOpen, setDurationPickerOpen] = useState(false);

  const hasRoutineChanges = !!routineChanges && (routineChanges.exercises > 0 || routineChanges.series > 0);
  const realTimeLabel = `${Math.floor((elapsedSeconds || 0) / 60)}m ${(elapsedSeconds || 0) % 60}s`;

  const stats = [
    { label: translate("exercises_count"), value: exerciseCount ?? 0 },
    { label: translate("series_label"), value: totals?.totalSeries ?? 0 },
    { label: translate("reps_label"), value: totals?.totalReps ?? 0 },
    { label: translate("total_volume"), value: `${(totals?.totalVolume ?? 0).toFixed(1)}kg` },
  ];

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      style={{ minHeight: "100dvh", background: tk.bg }}
    >
      <style>{`
        .finish-page { width: min(100%, 640px); margin: 0 auto; padding: clamp(16px, 5vw, 32px) clamp(16px, 5vw, 24px) 40px; box-sizing: border-box; }
        .finish-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .finish-eyebrow { color: ${tk.accent}; font-size: 0.68rem; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 800; }
        .finish-name-input { width: 100%; background: none; border: none; outline: none; color: ${tk.text}; font-size: clamp(1.5rem, 6vw, 2.1rem); font-weight: 800; letter-spacing: -0.02em; padding: 6px 0 12px; box-sizing: border-box; border-bottom: 1.5px solid ${tk.border}; transition: border-color 180ms ease; }
        .finish-name-input:focus { border-color: ${tk.accent}; }
        .finish-name-input::placeholder { color: ${tk.textFaint}; }
        .finish-row { display: flex; align-items: center; gap: 12px; width: 100%; background: ${tk.surface}; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 14px 16px; margin-top: 14px; box-sizing: border-box; text-align: left; cursor: pointer; }
        .finish-note-toggle { color: ${tk.accent}; background: none; border: none; font-weight: 700; font-size: 0.88rem; padding: 14px 2px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .finish-note-textarea { width: 100%; background: ${tk.surface}; border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; color: ${tk.text}; padding: 14px 16px; font-size: 0.92rem; min-height: 76px; box-sizing: border-box; resize: vertical; margin-top: 14px; font: inherit; }
        .finish-note-textarea::placeholder { color: ${tk.textFaint}; }
        .finish-improved { background: ${tk.accentSoft}; border: 1px solid rgba(46,230,197,0.35); border-radius: 14px; padding: 15px 16px; margin-top: 14px; }
        .finish-stats { display: grid; grid-template-columns: repeat(2, 1fr); border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08); margin-top: 22px; }
        .finish-stats > div { border-bottom: 1px solid rgba(255,255,255,0.08); }
        .finish-stats > div:nth-last-child(-n+2) { border-bottom: none; }
        .finish-stats > div:nth-child(odd) { border-right: 1px solid rgba(255,255,255,0.08); }
        .finish-save { width: 100%; margin-top: 24px; min-height: 52px; border-radius: 16px; border: none; background: ${tk.accent}; color: ${tk.onAccent}; font-weight: 800; font-size: 1rem; cursor: pointer; box-shadow: 0 10px 28px rgba(46,230,197,0.22); }
      `}</style>

      <div className="finish-page">
        <div className="finish-topbar">
          <button
            onClick={onCancel}
            aria-label={translate("cancel")}
            className="feeg-surface feeg-press feeg-hover"
            style={{
              width: "34px", height: "34px", borderRadius: "50%", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
              "--feeg-fg": tk.textMuted,
              "--feeg-hover-bg": tk.surfaceAlt,
              "--feeg-border-width": "0px",
            }}
          >
            <Icon name="close" size={17} />
          </button>
          <span className="finish-eyebrow">{translate("finish_workout")}</span>
          <span style={{ width: "34px" }} aria-hidden="true" />
        </div>

        <input
          type="text"
          className="finish-name-input"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={namePlaceholder}
        />

        <div className="finish-row" onClick={() => setDurationPickerOpen(true)}>
          <div style={{ width: "38px", height: "38px", borderRadius: "11px", background: tk.accentSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="clock" size={18} color={tk.accent} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: tk.text, fontWeight: 700, fontSize: "1rem" }}>{formatDuration(totalMinutes)}</div>
            <div style={{ color: tk.textFaint, fontSize: "0.76rem", marginTop: "2px" }}>
              {translate("duration_tap_to_edit")} · {translate("real_time")} {realTimeLabel}
            </div>
          </div>
          <Icon name="chevronRight" size={16} color={tk.textFaint} />
        </div>

        {notesOpen ? (
          <textarea
            className="finish-note-textarea"
            value={comments}
            onChange={(e) => onCommentsChange(e.target.value)}
            placeholder={translate("placeholder_comments")}
            autoFocus
          />
        ) : (
          <button type="button" className="finish-note-toggle feeg-press" onClick={() => setNotesOpen(true)}>
            <Icon name="plus" size={14} /> {translate("add_note_label")}
          </button>
        )}

        {hasRoutineChanges && (
          <div className="finish-improved">
            <p style={{ color: tk.accent, fontWeight: "bold", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "8px", fontSize: "0.92rem" }}>
              <span>✨</span> {translate("routine_improved_title")}
            </p>
            <p style={{ color: tk.textMuted, fontSize: "0.85rem", margin: "0 0 12px 0", lineHeight: "1.4" }}>
              {translate("routine_changes_prefix")}
              <strong>
                {" "}
                {routineChanges.exercises > 0 && `${routineChanges.exercises} ${translate("new_exercises_label")}`}
                {routineChanges.exercises > 0 && routineChanges.series > 0 && " y "}
                {routineChanges.series > 0 && `${routineChanges.series} ${translate("additional_series_label")}`}
              </strong>
              .
            </p>
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", color: tk.text, backgroundColor: tk.surface, padding: "10px", borderRadius: tk.radius.sm, border: `1px solid ${tk.border}` }}>
              <input
                type="checkbox"
                checked={updateOriginalRoutine}
                onChange={(e) => onUpdateOriginalRoutineChange(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: tk.accent, cursor: "pointer" }}
              />
              <span style={{ fontSize: "0.88rem" }}>{translate("update_original_routine_label")}</span>
            </label>
          </div>
        )}

        <div className="finish-stats">
          {stats.map((stat) => (
            <div key={stat.label} style={{ padding: "16px 4px", textAlign: "center" }}>
              <div style={{ color: tk.text, fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.03em" }}>{stat.value}</div>
              <div style={{ color: tk.accent, fontSize: "0.64rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "4px" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="finish-save feeg-press"
          onClick={onSave}
          disabled={savingWorkout}
          style={{ opacity: savingWorkout ? 0.7 : 1, cursor: savingWorkout ? "not-allowed" : "pointer" }}
        >
          {savingWorkout ? translate("saving") : translate("save_workout")}
        </button>
      </div>

      <DurationPickerModal
        open={durationPickerOpen}
        totalMinutes={totalMinutes}
        onChange={onTotalMinutesChange}
        onClose={() => setDurationPickerOpen(false)}
        t={t}
      />
    </motion.div>
  );
}
