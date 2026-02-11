import { useMemo } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { useRouter } from "next/router";

export default function Calendar() {
  const router = useRouter();
  const { completedWorkouts, isLoaded, isMobile } = useUser();

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

  if (!isLoaded) return <Layout><div style={{ padding: "20px", color: "#fff" }}>Cargando...</div></Layout>;

  const spanishMonths = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const daysOfWeek = ["L", "M", "X", "J", "V", "S", "D"];

  const MonthView = ({ year, month }) => {
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon...
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Ajustar para que lunes sea el primer día (0)
    // getDay(): 0(D), 1(L), 2(M), 3(X), 4(J), 5(V), 6(S)
    // Target: 0(L), 1(M), 2(X), 3(J), 4(V), 5(S), 6(D)
    const emptyDays = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const days = [];
    for (let i = 0; i < emptyDays; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    return (
      <div style={{ marginBottom: "40px" }}>
        <h2 style={{ 
          fontSize: "1.8rem", 
          fontWeight: "bold", 
          marginBottom: "15px", 
          color: "#fff",
          display: "flex",
          alignItems: "baseline",
          gap: "10px"
        }}>
          {spanishMonths[month]} 
          <span style={{ fontSize: "1rem", color: "#444" }}>{year}</span>
        </h2>
        
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(7, 1fr)", 
          gap: "10px",
          textAlign: "center"
        }}>
          {daysOfWeek.map(d => (
            <div key={d} style={{ color: "#444", fontSize: "0.75rem", fontWeight: "bold", paddingBottom: "5px" }}>
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
                  color: hasWorkout ? "#000" : (isToday ? "#1dd1a1" : "#fff"),
                  backgroundColor: hasWorkout ? "#1dd1a1" : "transparent",
                  border: isToday && !hasWorkout ? "1px solid #1dd1a1" : "none",
                  cursor: hasWorkout ? "pointer" : "default"
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
      <div style={{
        backgroundColor: "#000",
        color: "#fff",
        minHeight: "100vh",
        padding: isMobile ? "20px 15px 100px 15px" : "30px",
        fontFamily: "Arial, sans-serif"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: "bold", margin: 0, color: "#1dd1a1" }}>Calendario</h1>
            <p style={{ color: "#666", margin: "5px 0 0 0" }}>Tu constancia visualizada</p>
          </div>
          <button 
            onClick={() => router.back()}
            style={{
              background: "#1a1a1a",
              border: "none",
              color: "#fff",
              padding: "10px",
              borderRadius: "50%",
              cursor: "pointer"
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
        </div>

        {/* Legend */}
        <div style={{ 
          display: "flex", 
          gap: "20px", 
          marginBottom: "30px", 
          fontSize: "0.8rem", 
          color: "#888",
          backgroundColor: "#1a1a1a",
          padding: "12px",
          borderRadius: "10px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#1dd1a1" }} />
            Entrenado
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", border: "1px solid #1dd1a1" }} />
            Hoy
          </div>
        </div>

        {/* Months List */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {monthsToRender.map(m => (
            <MonthView key={`${m.year}-${m.month}`} year={m.year} month={m.month} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
