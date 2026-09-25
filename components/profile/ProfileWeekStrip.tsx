import { useMemo } from "react";
import { getTokens } from "../../lib/tokens";
import { computeWeeklyStreak } from "../../lib/exerciseStats";

interface WorkoutLike {
  completedAt?: string;
  totalVolume?: number | string;
}

interface ProfileWeekStripProps {
  workouts: WorkoutLike[];
  isDark: boolean;
  weeklyGoal?: number;
}

const DAYS = ["L", "M", "X", "J", "V", "S", "D"];

function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}

/**
 * La semana del perfil de un vistazo: siete puntos (días entrenados en verde, hoy con aro), la
 * racha de semanas y el volumen de los últimos 30 días. Es la respuesta a "¿esta persona entrena
 * de verdad?" sin abrir una gráfica.
 */
export default function ProfileWeekStrip({ workouts, isDark, weeklyGoal }: ProfileWeekStripProps) {
  const tk = getTokens(isDark);
  const data = useMemo(() => {
    const now = new Date();
    const monday = startOfWeek(now).getTime();
    const trained = new Set<number>();
    let volume30 = 0;
    let sessions30 = 0;
    workouts.forEach((w) => {
      if (!w.completedAt) return;
      const t = new Date(w.completedAt).getTime();
      if (t >= monday) trained.add((new Date(t).getDay() + 6) % 7);
      if (now.getTime() - t <= 30 * 86400000) {
        volume30 += Number(w.totalVolume) || 0;
        sessions30 += 1;
      }
    });
    const streak = computeWeeklyStreak(workouts, weeklyGoal || undefined);
    return { trained, today: (now.getDay() + 6) % 7, volume30, sessions30, streak };
  }, [workouts, weeklyGoal]);

  const cells = [
    { label: "sem. de racha", value: String(data.streak.streak) },
    { label: "entrenos 30 d", value: String(data.sessions30) },
    { label: "volumen 30 d", value: data.volume30 >= 1000 ? `${(data.volume30 / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} t` : `${Math.round(data.volume30)} kg` },
  ];

  return (
    <section aria-label="Esta semana" style={{ display: "flex", alignItems: "center", gap: 14, padding: "4px 0 16px" }}>
      <div style={{ display: "flex", gap: 5 }} role="img" aria-label={`${data.trained.size} días entrenados esta semana`}>
        {DAYS.map((d, i) => {
          const on = data.trained.has(i);
          const isToday = i === data.today;
          return (
            <div key={d} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 5,
                  background: on ? tk.accent : tk.hairline,
                  boxShadow: isToday ? `0 0 0 2px ${tk.bg}, 0 0 0 3.5px ${on ? tk.accent : tk.textFaint}` : "none",
                  opacity: i > data.today ? 0.45 : 1,
                }}
              />
              <span style={{ fontSize: "0.6rem", fontWeight: 700, color: isToday ? tk.text : tk.textFaint }}>{d}</span>
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
        {cells.map((c) => (
          <div key={c.label} style={{ minWidth: 0 }}>
            <div style={{ fontSize: "0.98rem", fontWeight: 900, color: tk.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.value}</div>
            <div style={{ fontSize: "0.64rem", fontWeight: 600, color: tk.textFaint, whiteSpace: "nowrap" }}>{c.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
