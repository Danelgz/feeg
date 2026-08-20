import { useMemo, useState } from "react";
import { getTokens } from "../../lib/tokens";
import { Icon, Button } from "../ui";
import StatSection from "./StatSection";

interface Workout {
  completedAt?: string;
  totalVolume?: number;
}

interface TrainingGoal {
  id: string;
  type: "sessions_week" | "volume_month";
  title: string;
  target: number;
}

const MILESTONES = [1, 3, 10, 25, 50, 100];

function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  return result;
}

function getCurrentValue(type: TrainingGoal["type"], workouts: Workout[]) {
  const now = new Date();
  if (type === "sessions_week") {
    const start = startOfWeek(now).getTime();
    return workouts.filter((workout) => workout.completedAt && new Date(workout.completedAt).getTime() >= start).length;
  }
  return workouts
    .filter((workout) => {
      if (!workout.completedAt) return false;
      const date = new Date(workout.completedAt);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    })
    .reduce((sum, workout) => sum + Number(workout.totalVolume || 0), 0);
}

export default function GoalsAndMilestonesSection({
  isDark,
  isMobile,
  workouts,
  goals,
  saveTrainingGoal,
  deleteTrainingGoal,
}: {
  isDark: boolean;
  isMobile: boolean;
  workouts: Workout[];
  goals: TrainingGoal[];
  saveTrainingGoal: (goal: Partial<TrainingGoal>) => Promise<void>;
  deleteTrainingGoal: (id: string) => Promise<void>;
}) {
  const tk = getTokens(isDark);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<TrainingGoal["type"]>("sessions_week");
  const [title, setTitle] = useState("Entrenar con constancia");
  const [target, setTarget] = useState("3");

  const milestone = useMemo(() => {
    const completed = workouts.length;
    const next = MILESTONES.find((value) => completed < value) || MILESTONES[MILESTONES.length - 1];
    return { completed, next, progress: Math.min(1, completed / next) };
  }, [workouts.length]);

  const submitGoal = async () => {
    const numericTarget = Number(target);
    if (!title.trim() || !Number.isFinite(numericTarget) || numericTarget <= 0) return;
    await saveTrainingGoal({ id: `goal_${Date.now()}`, type, title: title.trim(), target: numericTarget });
    setShowForm(false);
  };

  return (
    <StatSection title="Objetivos y hitos" meta="Tu siguiente paso" isDark={isDark} isMobile={isMobile}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: tk.space.md }}>
        <div className="feeg-surface" style={{ borderRadius: tk.radius.md, padding: tk.space.lg, "--feeg-bg": tk.surfaceAlt, "--feeg-border": tk.border } as React.CSSProperties}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: tk.space.md, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: 36, height: 36, borderRadius: tk.radius.md, backgroundColor: tk.accentSoft, color: tk.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="award" size={18} /></div>
              <div>
                <div style={{ color: tk.text, fontWeight: tk.weight.bold }}>Hitos de entrenamiento</div>
                <div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs }}>{milestone.completed >= milestone.next ? "Has completado todos los hitos actuales" : `${milestone.next - milestone.completed} entrenos para tu siguiente hito`}</div>
              </div>
            </div>
            <strong style={{ color: tk.accent, fontVariantNumeric: "tabular-nums" }}>{milestone.completed}/{milestone.next}</strong>
          </div>
          <div style={{ height: 6, backgroundColor: tk.border, borderRadius: tk.radius.pill, overflow: "hidden", marginTop: tk.space.md }}><div style={{ width: `${milestone.progress * 100}%`, height: "100%", backgroundColor: tk.accent, borderRadius: tk.radius.pill }} /></div>
        </div>

        {goals.map((goal) => {
          const current = getCurrentValue(goal.type, workouts);
          const progress = Math.min(1, current / goal.target);
          const unit = goal.type === "sessions_week" ? "entrenos esta semana" : "kg este mes";
          return (
            <div key={goal.id} className="feeg-surface" style={{ borderRadius: tk.radius.md, padding: tk.space.lg, "--feeg-bg": tk.surface, "--feeg-border": tk.border } as React.CSSProperties}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: tk.space.md }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: tk.text, fontWeight: tk.weight.bold }}>{goal.title}</div>
                  <div style={{ color: tk.textMuted, fontSize: tk.fontSize.xs, marginTop: "3px" }}>{Math.round(current).toLocaleString("es-ES")} / {goal.target.toLocaleString("es-ES")} {unit}</div>
                </div>
                <button type="button" onClick={() => deleteTrainingGoal(goal.id)} aria-label="Eliminar objetivo" className="feeg-surface feeg-press feeg-hover" style={{ border: "none", background: "transparent", color: tk.textFaint, cursor: "pointer", padding: 4, display: "flex", "--feeg-hover-fg": tk.danger } as React.CSSProperties}><Icon name="trash" size={15} /></button>
              </div>
              <div style={{ height: 6, backgroundColor: tk.border, borderRadius: tk.radius.pill, overflow: "hidden", marginTop: tk.space.md }}><div style={{ width: `${progress * 100}%`, height: "100%", backgroundColor: progress >= 1 ? tk.accent : tk.warning, borderRadius: tk.radius.pill }} /></div>
            </div>
          );
        })}

        {showForm ? (
          <div className="feeg-surface" style={{ borderRadius: tk.radius.md, padding: tk.space.lg, "--feeg-bg": tk.surfaceAlt, "--feeg-border": tk.accent } as React.CSSProperties}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: tk.space.sm }}>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nombre del objetivo" aria-label="Nombre del objetivo" style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: tk.radius.sm, border: `1px solid ${tk.border}`, backgroundColor: tk.surface, color: tk.text, font: "inherit" }} />
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 120px", gap: tk.space.sm }}>
                <select value={type} onChange={(event) => setType(event.target.value as TrainingGoal["type"])} aria-label="Tipo de objetivo" style={{ padding: "10px 12px", borderRadius: tk.radius.sm, border: `1px solid ${tk.border}`, backgroundColor: tk.surface, color: tk.text, font: "inherit" }}>
                  <option value="sessions_week">Entrenos por semana</option>
                  <option value="volume_month">Volumen mensual</option>
                </select>
                <input value={target} onChange={(event) => setTarget(event.target.value)} type="number" min="1" aria-label="Objetivo numérico" style={{ padding: "10px 12px", borderRadius: tk.radius.sm, border: `1px solid ${tk.border}`, backgroundColor: tk.surface, color: tk.text, font: "inherit" }} />
              </div>
              <div style={{ display: "flex", gap: tk.space.sm }}><Button isDark={isDark} size="sm" onClick={submitGoal}>Guardar objetivo</Button><Button isDark={isDark} size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button></div>
            </div>
          </div>
        ) : (
          <Button isDark={isDark} variant="secondary" icon="plus" onClick={() => setShowForm(true)}>Añadir objetivo</Button>
        )}
      </div>
    </StatSection>
  );
}
