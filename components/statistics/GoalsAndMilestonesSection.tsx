import { useMemo, useState } from "react";
import { getTokens } from "../../lib/tokens";
import { Icon, Button, ProgressRing } from "../ui";
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

  // Filas planas con separador de 1px, cada una con su anillo de progreso: antes cada objetivo era
  // una tarjeta con borde dentro de la sección, y tres objetivos ocupaban media pantalla.
  const row = (key: string, ring: number, ringColor: string, icon: React.ReactNode, title: string, sub: string, right: React.ReactNode, action?: React.ReactNode) => (
    <li key={key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: `1px solid ${tk.hairline}` }}>
      <ProgressRing value={ring} size={40} stroke={4} color={ringColor} trackColor={tk.hairline}>
        <span style={{ color: ringColor, display: "flex" }}>{icon}</span>
      </ProgressRing>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: tk.text, fontWeight: 700, fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <div style={{ color: tk.textMuted, fontSize: "0.75rem", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
      </div>
      <div style={{ color: tk.text, fontWeight: 800, fontSize: "0.9rem", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{right}</div>
      {action}
    </li>
  );

  const fieldStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: `1px solid ${tk.hairline}`, backgroundColor: tk.surface, color: tk.text, font: "inherit" };

  return (
    <StatSection
      title="Objetivos y hitos"
      meta={
        !showForm && (
          <button type="button" onClick={() => setShowForm(true)} className="feeg-press" style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "none", background: "none", color: tk.accent, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer", padding: 0 }}>
            <Icon name="plus" size={14} /> Añadir objetivo
          </button>
        )
      }
      isDark={isDark}
      isMobile={isMobile}
    >
      <ul style={{ listStyle: "none", margin: 0, padding: 0, borderBottom: `1px solid ${tk.hairline}` }}>
        {row(
          "milestone",
          milestone.progress,
          tk.accent,
          <Icon name="award" size={16} />,
          "Hitos de entrenamiento",
          milestone.completed >= milestone.next ? "Has completado todos los hitos actuales" : `${milestone.next - milestone.completed} entrenos para tu siguiente hito`,
          <>
            {milestone.completed}
            <span style={{ color: tk.textFaint, fontWeight: 600 }}>/{milestone.next}</span>
          </>
        )}

        {goals.map((goal) => {
          const current = getCurrentValue(goal.type, workouts);
          const progress = Math.min(1, current / goal.target);
          const unit = goal.type === "sessions_week" ? "entrenos esta semana" : "kg este mes";
          return row(
            goal.id,
            progress,
            progress >= 1 ? tk.accent : tk.warning,
            <Icon name={goal.type === "sessions_week" ? "calendar" : "trendUp"} size={16} />,
            goal.title,
            `${Math.round(current).toLocaleString("es-ES")} / ${goal.target.toLocaleString("es-ES")} ${unit}`,
            `${Math.round(progress * 100)}%`,
            <button type="button" onClick={() => deleteTrainingGoal(goal.id)} aria-label="Eliminar objetivo" className="feeg-surface feeg-press feeg-hover" style={{ border: "none", background: "transparent", color: tk.textFaint, cursor: "pointer", padding: 4, display: "flex", "--feeg-hover-fg": tk.danger } as React.CSSProperties}><Icon name="trash" size={15} /></button>
          );
        })}
      </ul>

      {showForm && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: tk.space.sm, marginTop: 12 }}>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nombre del objetivo" aria-label="Nombre del objetivo" style={fieldStyle} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0, 1fr) 96px" : "1fr 120px", gap: tk.space.sm }}>
            <select value={type} onChange={(event) => setType(event.target.value as TrainingGoal["type"])} aria-label="Tipo de objetivo" style={fieldStyle}>
              <option value="sessions_week">Entrenos por semana</option>
              <option value="volume_month">Volumen mensual</option>
            </select>
            <input value={target} onChange={(event) => setTarget(event.target.value)} type="number" min="1" aria-label="Objetivo numérico" style={fieldStyle} />
          </div>
          <div style={{ display: "flex", gap: tk.space.sm }}><Button isDark={isDark} size="sm" onClick={submitGoal}>Guardar objetivo</Button><Button isDark={isDark} size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button></div>
        </div>
      )}
    </StatSection>
  );
}
