import { useMemo } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { useRouter } from "next/router";
import { getTokens } from "../lib/tokens";
import { Spinner, PageHeader } from "../components/ui";

export default function Calendar() {
  const router = useRouter();
  const { completedWorkouts, isLoaded, isMobile, theme } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const workoutDays = useMemo(() => {
    const days = new Set();
    if (completedWorkouts) {
      completedWorkouts.forEach(w => {
        if (w.completedAt) {
          const date = new Date(w.completedAt);
          days.add(date.toISOString().split('T')[0]);
        }
      });
    }
    return days;
  }, [completedWorkouts]);

  const monthsToRender = useMemo(() => {
    const months = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Determinar fecha de inicio: primer entrenamiento o hace 6 meses
    let startYear = currentYear;
    let startMonth = currentMonth - 5;

    if (completedWorkouts && completedWorkouts.length > 0) {
      const dates = completedWorkouts.map(w => new Date(w.completedAt).getTime());
      const minDate = new Date(Math.min(...dates));
      startYear = minDate.getFullYear();
      startMonth = minDate.getMonth();
    } else if (startMonth < 0) {
      startYear--;
      startMonth += 12;
    }

    let iterYear = currentYear;
    let iterMonth = currentMonth;

    while (iterYear > startYear || (iterYear === startYear && iterMonth >= startMonth)) {
      months.push({ year: iterYear, month: iterMonth });
      iterMonth--;
      if (iterMonth < 0) {
        iterMonth = 11;
        iterYear--;
      }
    }
    return months;
  }, [completedWorkouts]);

  if (!isLoaded) return <Layout><Spinner isDark={isDark} fullPage label="Cargando..." /></Layout>;

  const spanishMonths = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const daysOfWeek = ["L", "M", "X", "J", "V", "S", "D"];

  const MonthView = ({ year, month }) => {
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon...
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Ajustar para que lunes sea el primer día (0)
    const emptyDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const days = [];
    for (let i = 0; i < emptyDays; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
      <div style={{ marginBottom: "40px" }}>
        <h2 style={{
          fontSize: "1.5rem",
          fontWeight: "bold",
          marginBottom: "15px",
          color: tk.text,
          display: "flex",
          alignItems: "baseline",
          gap: "10px"
        }}>
          {spanishMonths[month]}
          <span style={{ fontSize: "1rem", color: tk.textFaint }}>{year}</span>
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "10px",
          textAlign: "center"
        }}>
          {daysOfWeek.map(d => (
            <div key={d} style={{ color: tk.textFaint, fontSize: "0.75rem", fontWeight: "bold", paddingBottom: "5px" }}>
              {d}
            </div>
          ))}
          {days.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} />;

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasWorkout = workoutDays.has(dateStr);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            return (
              <div
                key={dateStr}
                style={{
                  aspectRatio: "1/1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  fontSize: "0.9rem",
                  fontWeight: hasWorkout ? "bold" : "normal",
                  color: hasWorkout ? tk.onAccent : (isToday ? tk.accent : tk.text),
                  backgroundColor: hasWorkout ? tk.accent : "transparent",
                  border: isToday && !hasWorkout ? `1px solid ${tk.accent}` : "none",
                  cursor: hasWorkout ? "pointer" : "default",
                  transition: tk.transition
                }}
                onClick={() => {
                  if (hasWorkout) {
                    router.push(`/profile?date=${dateStr}`);
                  }
                }}
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <PageHeader
        isDark={isDark}
        isMobile={isMobile}
        title="Calendario"
        subtitle="Tu constancia visualizada"
      />

      {/* Legend */}
      <div style={{
        display: "flex",
        gap: "20px",
        marginBottom: "30px",
        fontSize: "0.8rem",
        color: tk.textMuted,
        backgroundColor: tk.surface,
        border: `1px solid ${tk.border}`,
        padding: "12px 16px",
        borderRadius: tk.radius.md
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: tk.accent }} />
          Entrenado
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", border: `1px solid ${tk.accent}` }} />
          Hoy
        </div>
      </div>

      {/* Months List */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {monthsToRender.map(m => (
          <MonthView key={`${m.year}-${m.month}`} year={m.year} month={m.month} />
        ))}
      </div>
    </Layout>
  );
}
