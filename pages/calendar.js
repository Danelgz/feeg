import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { getTokens } from "../lib/tokens";
import { tapFeedback } from "../lib/haptics";
import { Icon, PageHeader, SkeletonPage } from "../components/ui";
import ReadOnlyWorkoutModal from "../components/workout/ReadOnlyWorkoutModal";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

// Clave del día en hora LOCAL. Antes se usaba toISOString (UTC): un entreno a las 23:30 en
// España caía en el día siguiente del calendario.
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function minutesOf(w) {
  return w.elapsedTime !== undefined && w.elapsedTime !== null ? Math.round(Number(w.elapsedTime) / 60) : Number(w.totalTime || 0);
}

/**
 * Calendario de entrenos: un mes cada vez, con su resumen (entrenos, días, volumen, tiempo), los
 * días entrenados marcados y, al tocar uno, sus entrenos debajo para abrirlos. Antes era una
 * lista de todos los meses desde el primer entreno y tocar un día llevaba al perfil sin filtrar.
 */
export default function Calendar() {
  const { completedWorkouts, isLoaded, isMobile, theme, t, language } = useUser();
  const isDark = theme === "dark";
  const tk = getTokens(isDark);
  const reduceMotion = useReducedMotion();
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(dayKey(today));
  const [viewing, setViewing] = useState(null);

  const byDay = useMemo(() => {
    const map = new Map();
    (completedWorkouts || []).forEach((w) => {
      if (!w.completedAt) return;
      const k = dayKey(new Date(w.completedAt));
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(w);
    });
    return map;
  }, [completedWorkouts]);

  const first = useMemo(() => {
    const times = (completedWorkouts || []).map((w) => new Date(w.completedAt).getTime()).filter(Number.isFinite);
    return times.length ? new Date(Math.min(...times)) : new Date();
  }, [completedWorkouts]);

  if (!isLoaded) return <Layout gutter><SkeletonPage isDark={isDark} isMobile={isMobile} /></Layout>;

  const { year, month } = cursor;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const monthWorkouts = [];
  for (let d = 1; d <= daysInMonth; d++) monthWorkouts.push(...(byDay.get(dayKey(new Date(year, month, d))) || []));
  const trainedDays = new Set(monthWorkouts.map((w) => dayKey(new Date(w.completedAt)))).size;
  const volume = monthWorkouts.reduce((a, w) => a + (Number(w.totalVolume) || 0), 0);
  const minutes = monthWorkouts.reduce((a, w) => a + minutesOf(w), 0);

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const canPrev = year > first.getFullYear() || (year === first.getFullYear() && month > first.getMonth());
  const move = (delta) => {
    const d = new Date(year, month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    // Al cambiar de mes se selecciona el último día entrenado de ese mes (o nada).
    const last = [...Array(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())]
      .map((_, i) => dayKey(new Date(d.getFullYear(), d.getMonth(), i + 1)))
      .reverse()
      .find((k) => byDay.has(k));
    setSelected(last || null);
  };

  const selectedWorkouts = selected ? byDay.get(selected) || [] : [];
  const selectedDate = selected ? new Date(`${selected}T12:00:00`) : null;

  const navBtn = (enabled) => ({
    width: 38,
    height: 38,
    borderRadius: 12,
    border: "none",
    display: "grid",
    placeItems: "center",
    background: tk.hairline,
    color: enabled ? tk.text : tk.textFaint,
    cursor: enabled ? "pointer" : "default",
    opacity: enabled ? 1 : 0.5,
  });

  return (
    <Layout gutter>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <PageHeader isDark={isDark} isMobile={isMobile} title="Calendario" compact />

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <button type="button" onClick={() => canPrev && move(-1)} disabled={!canPrev} aria-label="Mes anterior" className="feeg-press" style={navBtn(canPrev)}>
            <Icon name="chevronLeft" size={18} />
          </button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: tk.text, letterSpacing: "-0.01em" }}>{MONTHS[month]}</div>
            <div style={{ fontSize: "0.74rem", color: tk.textMuted, fontWeight: 600 }}>{year}</div>
          </div>
          <button type="button" onClick={() => !isCurrentMonth && move(1)} disabled={isCurrentMonth} aria-label="Mes siguiente" className="feeg-press" style={navBtn(!isCurrentMonth)}>
            <Icon name="chevronRight" size={18} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", borderTop: `1px solid ${tk.hairline}`, borderBottom: `1px solid ${tk.hairline}`, marginBottom: 14 }}>
          {[
            { label: "Entrenos", value: monthWorkouts.length },
            { label: "Días", value: trainedDays },
            { label: "Volumen", value: volume >= 1000 ? `${(volume / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} t` : `${Math.round(volume)} kg` },
            { label: "Tiempo", value: minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60}` : `${minutes} min` },
          ].map((s, i) => (
            <div key={s.label} style={{ padding: "10px 0", textAlign: "center", borderLeft: i ? `1px solid ${tk.hairline}` : "none", minWidth: 0 }}>
              <div style={{ fontSize: "1.05rem", fontWeight: 900, color: tk.text, whiteSpace: "nowrap" }}>{s.value}</div>
              <div style={{ fontSize: "0.64rem", color: tk.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${year}-${month}`}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}
          >
            {WEEKDAYS.map((d) => (
              <div key={d} style={{ textAlign: "center", color: tk.textFaint, fontSize: "0.7rem", fontWeight: 800, paddingBottom: 2 }}>{d}</div>
            ))}
            {cells.map((day, idx) => {
              if (day === null) return <div key={`e${idx}`} />;
              const k = dayKey(new Date(year, month, day));
              const count = (byDay.get(k) || []).length;
              const isToday = k === dayKey(today);
              const isSel = k === selected;
              const future = new Date(year, month, day) > today;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => {
                    tapFeedback();
                    setSelected(k);
                  }}
                  disabled={future}
                  aria-label={`${day} de ${MONTHS[month]}${count ? `: ${count} ${count === 1 ? "entreno" : "entrenos"}` : ""}`}
                  aria-pressed={isSel}
                  className="feeg-press"
                  style={{
                    position: "relative",
                    aspectRatio: "1 / 1",
                    border: "none",
                    borderRadius: 12,
                    cursor: future ? "default" : "pointer",
                    fontSize: "0.9rem",
                    fontWeight: count ? 900 : 600,
                    fontVariantNumeric: "tabular-nums",
                    background: count ? tk.accent : isSel ? tk.hairline : "transparent",
                    color: count ? tk.onAccent : future ? tk.textFaint : isToday ? tk.accent : tk.text,
                    boxShadow: isSel ? `0 0 0 2px ${tk.bg}, 0 0 0 4px ${count ? tk.accent : tk.textMuted}` : isToday && !count ? `inset 0 0 0 1.5px ${tk.accent}` : "none",
                    opacity: future ? 0.4 : 1,
                  }}
                >
                  {day}
                  {count > 1 && (
                    <span style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 2 }}>
                      {Array.from({ length: Math.min(3, count) }).map((_, i) => (
                        <span key={i} style={{ width: 4, height: 4, borderRadius: 4, background: tk.onAccent }} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {selectedDate && (
          <section style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${tk.hairline}` }} aria-live="polite">
            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: tk.text, marginBottom: 8 }}>
              {(() => {
                const label = selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
                return label.charAt(0).toUpperCase() + label.slice(1);
              })()}
            </div>
            {selectedWorkouts.length === 0 ? (
              <div style={{ color: tk.textMuted, fontSize: "0.86rem", padding: "6px 0 12px" }}>Día de descanso.</div>
            ) : (
              selectedWorkouts.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setViewing(w)}
                  className="feeg-press"
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px", marginBottom: 8, border: "none", borderRadius: 16, background: isDark ? "rgba(255,255,255,0.05)" : "#fff", textAlign: "left", cursor: "pointer", color: tk.text }}
                >
                  {w.photoURL ? (
                    <img src={w.photoURL} alt="" style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <span style={{ width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", background: tk.accentSoft, color: tk.accent, flexShrink: 0 }}>
                      <Icon name="dumbbell" size={18} />
                    </span>
                  )}
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 800, fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.name || "Entreno"}</span>
                    <span style={{ display: "block", fontSize: "0.76rem", color: tk.textMuted, marginTop: 2 }}>
                      {new Date(w.completedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} · {minutesOf(w)} min · {Math.round(Number(w.totalVolume) || 0).toLocaleString("es-ES")} kg · {w.series || 0} series
                    </span>
                  </span>
                  <Icon name="chevronRight" size={16} color={tk.textFaint} />
                </button>
              ))
            )}
          </section>
        )}
      </div>

      {viewing && <ReadOnlyWorkoutModal workout={viewing} language={language} translate={t} onClose={() => setViewing(null)} />}
    </Layout>
  );
}
