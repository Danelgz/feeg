import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useUser } from "../../context/UserContext";
import { getTokens } from "../../lib/tokens";
import { computeWeeklyStreak, resolveWeeklyGoal, type CompletedWorkout } from "../../lib/exerciseStats";
import {
  calendarDaysSince,
  greetingKey,
  latestWorkout,
  routineMuscleGroups,
  suggestNextRoutine,
  weekActivity,
  weekVolumeComparison,
  type InsightRoutine,
  type InsightWorkout,
} from "../../lib/homeInsights";
import { tapFeedback } from "../../lib/haptics";
import { useCountUp } from "../../hooks/useCountUp";
import Icon from "../ui/Icon";
import ProgressRing from "../ui/ProgressRing";
import MuscleGroupIcon from "../ui/MuscleGroupIcon";

type Tokens = ReturnType<typeof getTokens>;

interface TodayPanelProps {
  isDark: boolean;
  onOpenWorkout: (workout: InsightWorkout) => void;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

function formatDuration(w: InsightWorkout): string {
  const totalSeconds = w.elapsedTime || (w.totalTime || 0) * 60;
  const m = Math.floor(totalSeconds / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}min` : `${m}min`;
}

/**
 * Panel "Hoy" de Inicio: lo primero que ve alguien al abrir la app.
 *
 * Inicio era solo el feed social, así que abrir FEEG para entrenar obligaba a ir a Rutinas, buscar
 * la del día y pulsar "Iniciar". Aquí la app ya sabe cuál toca (la que más tiempo lleva sin hacerse,
 * ver suggestNextRoutine) y la pone a un toque, junto con lo que motiva a volver: el objetivo de la
 * semana, la racha y cómo va el volumen frente a la semana pasada.
 */
export default function TodayPanel({ isDark, onOpenWorkout }: TodayPanelProps) {
  const { t, user, saveUser, completedWorkouts, routines, activeRoutine, endRoutine, authUser, unreadNotificationsCount } = useUser();
  const router = useRouter();
  const tk = getTokens(isDark);
  const reduceMotion = useReducedMotion();
  const [editingGoal, setEditingGoal] = useState(false);

  const langCode: string = t("lang_code") || "es-ES";
  const workouts: InsightWorkout[] = completedWorkouts || [];
  const now = useMemo(() => new Date(), []);

  const goal = resolveWeeklyGoal(user);
  const streak = useMemo(() => computeWeeklyStreak(workouts as CompletedWorkout[], goal, now), [workouts, goal, now]);
  const week = useMemo(() => weekActivity(workouts, now), [workouts, now]);
  const volume = useMemo(() => weekVolumeComparison(workouts, now), [workouts, now]);
  const last = useMemo(() => latestWorkout(workouts), [workouts]);
  const next = useMemo(() => suggestNextRoutine((routines || []) as InsightRoutine[], workouts), [routines, workouts]);

  const animatedCount = useCountUp(streak.thisWeek, 700);
  const animatedVolume = useCountUp(volume.current, 1000);

  const firstName: string = user?.firstName || authUser?.displayName?.split(" ")[0] || "";
  const dateLabel = new Intl.DateTimeFormat(langCode, { weekday: "long", day: "numeric", month: "long" }).format(now);
  const dayLetters = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(langCode, { weekday: "narrow" });
    // 5 de enero de 2026 es lunes.
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2026, 0, 5 + i)));
  }, [langCode]);

  const numberFmt = new Intl.NumberFormat(langCode, { maximumFractionDigits: 1 });
  const volumeLabel =
    animatedVolume >= 10000 ? `${numberFmt.format(animatedVolume / 1000)} t` : `${Math.round(animatedVolume).toLocaleString(langCode)} kg`;

  const remaining = Math.max(0, goal - streak.thisWeek);
  const goalLine = streak.goalMet
    ? t("weekly_goal_met")
    : remaining === 1
      ? t("weekly_goal_left_one")
      : t("weekly_goal_left_many").replace("{n}", String(remaining));

  const relativeDays = (iso: string | null | undefined) => {
    const days = calendarDaysSince(iso || undefined, now);
    if (days === null) return t("never_done");
    if (days === 0) return t("today_label");
    if (days === 1) return t("time_yesterday");
    return t("days_ago").replace("{n}", String(days));
  };

  const setGoal = (n: number) => {
    tapFeedback("success");
    setEditingGoal(false);
    if (user) saveUser({ ...user, weeklyGoal: n });
  };

  const startRoutine = (id: string | number) => {
    tapFeedback();
    endRoutine();
    router.push(`/routines/${id}`);
  };

  const activePath = activeRoutine ? (activeRoutine.id ? `/routines/${activeRoutine.id}` : activeRoutine.path) : null;

  return (
    <motion.section
      variants={container}
      initial={reduceMotion ? false : "hidden"}
      animate="show"
      style={{ display: "flex", flexDirection: "column", gap: 12, padding: "0 16px" }}
    >
      {/* Saludo */}
      <motion.div variants={item} style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, paddingTop: 18 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: tk.accent }}>
            {dateLabel}
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.65rem", fontWeight: 800, color: tk.text, lineHeight: 1.1 }}>
            {t(greetingKey(now))}
            {firstName ? <span style={{ color: tk.textMuted, fontWeight: 700 }}>, {firstName}</span> : null}
          </h1>
        </div>
        {authUser && (
          <Link
            href="/notifications"
            aria-label={t("notifications")}
            className="feeg-press"
            style={{ ...roundButton(tk, isDark), position: "relative" } as React.CSSProperties}
          >
            <Icon name="bell" size={19} strokeWidth={1.9} />
            {unreadNotificationsCount > 0 && (
              <span style={{ position: "absolute", top: 8, right: 9, width: 8, height: 8, borderRadius: 99, background: tk.danger, boxShadow: `0 0 0 2px ${tk.surface}` }} />
            )}
          </Link>
        )}
      </motion.div>

      {/* Semana: objetivo, racha, volumen y días entrenados */}
      <motion.div variants={item} style={glassCard(tk, isDark)}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -60,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${streak.goalMet ? "rgba(29,209,161,0.28)" : "rgba(29,209,161,0.14)"} 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 16 }}>
          <ProgressRing
            value={streak.thisWeek / goal}
            size={92}
            stroke={10}
            color={tk.accent}
            colorEnd="#7ef0cf"
            trackColor={isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}
          >
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: tk.text, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
              {Math.round(animatedCount)}
              <span style={{ fontSize: "0.9rem", color: tk.textFaint, fontWeight: 700 }}>/{goal}</span>
            </div>
            <div style={{ fontSize: "0.62rem", color: tk.textMuted, marginTop: 3, fontWeight: 600 }}>{t("this_week")}</div>
          </ProgressRing>

          <div style={{ flex: 1, minWidth: 0 }}>
            <button
              type="button"
              onClick={() => user && setEditingGoal((v) => !v)}
              className="feeg-press"
              aria-expanded={editingGoal}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: 0,
                border: "none",
                background: "none",
                color: tk.textMuted,
                fontSize: "0.72rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                cursor: user ? "pointer" : "default",
              }}
            >
              {t("weekly_goal_title")}
              {user && <Icon name={editingGoal ? "chevronUp" : "edit"} size={12} />}
            </button>
            <div style={{ fontSize: "1.08rem", fontWeight: 800, color: streak.goalMet ? tk.accent : tk.text, marginTop: 4, lineHeight: 1.2 }}>
              {goalLine}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              <span style={chip(tk, streak.streak > 0 ? tk.warning : tk.textMuted)}>
                <Icon name="flame" size={13} strokeWidth={2.2} />
                {t("streak_weeks_short").replace("{n}", String(streak.streak))}
              </span>
              <span style={chip(tk, tk.textMuted)}>
                <Icon name="activity" size={13} strokeWidth={2.2} />
                {volumeLabel}
                {volume.deltaPct !== null && (
                  <span style={{ color: volume.deltaPct >= 0 ? tk.accent : tk.danger, fontWeight: 800 }}>
                    {volume.deltaPct >= 0 ? "↑" : "↓"}
                    {Math.abs(Math.round(volume.deltaPct))}%
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {editingGoal && (
            <motion.div
              key="goal-picker"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden", position: "relative" }}
            >
              <div style={{ fontSize: "0.75rem", color: tk.textMuted, margin: "14px 0 8px" }}>{t("weekly_goal_pick")}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => {
                  const selected = n === goal;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setGoal(n)}
                      className="feeg-press"
                      aria-pressed={selected}
                      style={{
                        height: 38,
                        borderRadius: 12,
                        border: `1px solid ${selected ? tk.accent : tk.border}`,
                        background: selected ? tk.accent : "transparent",
                        color: selected ? tk.onAccent : tk.text,
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        cursor: "pointer",
                        "--feeg-press-scale": 0.9,
                      } as React.CSSProperties}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6, marginTop: 16 }}>
          {week.days.map((done, i) => {
            const isToday = i === week.todayIndex;
            const isFuture = i > week.todayIndex;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: "0.66rem", fontWeight: 700, color: isToday ? tk.text : tk.textFaint, textTransform: "uppercase" }}>
                  {dayLetters[i]}
                </span>
                <motion.span
                  initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.25 + i * 0.045, type: "spring", stiffness: 500, damping: 26 }}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 99,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: done ? tk.accent : "transparent",
                    color: tk.onAccent,
                    border: done ? "none" : `1.5px ${isFuture ? "dashed" : "solid"} ${isToday ? tk.accent : tk.border}`,
                    boxShadow: done ? "0 4px 12px rgba(29,209,161,0.35)" : "none",
                    opacity: isFuture && !done ? 0.6 : 1,
                  }}
                >
                  {done && <Icon name="check" size={14} strokeWidth={3} />}
                </motion.span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Siguiente acción: continuar, rutina sugerida o crear la primera */}
      <motion.div variants={item}>
        {activePath ? (
          <Link href={activePath} className="feeg-press" style={{ ...heroAction(tk, isDark), textDecoration: "none" } as React.CSSProperties}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={eyebrow(tk)}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: tk.accent, display: "inline-block" }} className="feeg-live-dot" />
                {t("active_routine_in_progress")}
              </div>
              <div style={heroTitle(tk)}>{activeRoutine?.name || t("continue_routine")}</div>
            </div>
            <span style={playButton(tk)}>
              <Icon name="play" size={22} />
            </span>
          </Link>
        ) : next ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => startRoutine(next.routine.id)}
            onKeyDown={(e) => e.key === "Enter" && startRoutine(next.routine.id)}
            className="feeg-press"
            style={heroAction(tk, isDark)}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={eyebrow(tk)}>{t("next_up")}</div>
              <div style={heroTitle(tk)}>{next.routine.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex" }}>
                  {routineMuscleGroups(next.routine, 3).map((g, i) => (
                    <span
                      key={g}
                      title={t(g)}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 99,
                        overflow: "hidden",
                        marginLeft: i === 0 ? 0 : -8,
                        border: `2px solid ${isDark ? "#141414" : "#fff"}`,
                        background: tk.surfaceAlt,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MuscleGroupIcon group={g} isDark={isDark} size={26} />
                    </span>
                  ))}
                </div>
                <span style={{ fontSize: "0.78rem", color: tk.textMuted }}>
                  {next.routine.exercises?.length || 0}{" "}
                  {(next.routine.exercises?.length || 0) === 1 ? t("exercise_singular") : t("exercises").toLowerCase()} · {relativeDays(next.lastDoneAt)}
                </span>
              </div>
            </div>
            <span style={playButton(tk)} aria-label={t("start_routine")}>
              <Icon name="play" size={22} />
            </span>
          </div>
        ) : (
          <div style={{ ...glassCard(tk, isDark), textAlign: "left" }}>
            <div style={eyebrow(tk)}>{t("next_up")}</div>
            <div style={heroTitle(tk)}>{t("first_routine_title")}</div>
            <p style={{ margin: "6px 0 14px", color: tk.textMuted, fontSize: "0.86rem", lineHeight: 1.4 }}>{t("first_routine_desc")}</p>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href="/routines/create" className="feeg-press" style={pillButton(tk, true)}>
                <Icon name="plus" size={16} />
                {t("create_new_routine")}
              </Link>
              <Link href="/ia?tab=training" className="feeg-press" style={pillButton(tk, false)}>
                <Icon name="sparkles" size={16} />
                {t("generate_with_ai")}
              </Link>
            </div>
          </div>
        )}
      </motion.div>

      {/* Accesos rápidos */}
      <motion.div variants={item} style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {[
          {
            key: "free",
            icon: "plus",
            label: t("quick_free_workout"),
            tint: tk.accent,
            onClick: () => {
              tapFeedback();
              endRoutine();
              router.push("/routines/empty");
            },
          },
          { key: "ia", icon: "sparkles", label: t("nav_short_ia"), tint: "#a78bfa", onClick: () => router.push("/ia") },
          { key: "calendar", icon: "calendar", label: t("calendar"), tint: "#60a5fa", onClick: () => router.push("/calendar") },
        ].map((q) => (
          <button
            key={q.key}
            type="button"
            onClick={q.onClick}
            className="feeg-press"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 10,
              padding: "12px",
              borderRadius: 18,
              border: `1px solid ${tk.border}`,
              background: tk.surface,
              color: tk.text,
              cursor: "pointer",
              minWidth: 0,
              "--feeg-press-scale": 0.94,
            } as React.CSSProperties}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: q.tint,
                background: `${q.tint}1f`,
              }}
            >
              <Icon name={q.icon} size={18} strokeWidth={2} />
            </span>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
              {q.label}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Último entreno */}
      {last && (
        <motion.button
          variants={item}
          type="button"
          onClick={() => onOpenWorkout(last)}
          className="feeg-press"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 18,
            border: `1px solid ${tk.border}`,
            background: tk.surface,
            color: tk.text,
            cursor: "pointer",
            textAlign: "left",
            "--feeg-press-scale": 0.98,
          } as React.CSSProperties}
        >
          <span style={{ width: 38, height: 38, borderRadius: 12, background: tk.accentSoft, color: tk.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="history" size={19} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: "0.7rem", color: tk.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {t("last_workout_label")} · {relativeDays(last.completedAt)}
            </span>
            <span style={{ display: "block", fontWeight: 800, fontSize: "0.98rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
              {last.name}
            </span>
            <span style={{ display: "block", fontSize: "0.78rem", color: tk.textMuted, marginTop: 2 }}>
              {formatDuration(last)} · {(last.totalVolume || 0).toLocaleString(langCode)} kg · {last.series || 0} {t("series_label").toLowerCase()}
            </span>
          </span>
          <Icon name="chevronRight" size={18} color={tk.textFaint} />
        </motion.button>
      )}
    </motion.section>
  );
}

function glassCard(tk: Tokens, isDark: boolean): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    padding: 16,
    borderRadius: 22,
    background: isDark ? "linear-gradient(160deg, #161816 0%, #0d0d0d 100%)" : "linear-gradient(160deg, #ffffff 0%, #f6faf8 100%)",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"}`,
    boxShadow: tk.shadow.card,
  };
}

function heroAction(tk: Tokens, isDark: boolean): React.CSSProperties {
  return {
    ...glassCard(tk, isDark),
    display: "flex",
    alignItems: "center",
    gap: 14,
    cursor: "pointer",
    color: tk.text,
    background: isDark
      ? "linear-gradient(135deg, rgba(29,209,161,0.16) 0%, rgba(29,209,161,0.04) 55%, #0d0d0d 100%)"
      : "linear-gradient(135deg, rgba(29,209,161,0.18) 0%, rgba(29,209,161,0.05) 55%, #ffffff 100%)",
    border: `1px solid ${isDark ? "rgba(29,209,161,0.22)" : "rgba(29,209,161,0.3)"}`,
    ["--feeg-press-scale" as string]: 0.98,
  };
}

function eyebrow(tk: Tokens): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: "0.7rem",
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: tk.accent,
  };
}

function heroTitle(tk: Tokens): React.CSSProperties {
  return {
    fontSize: "1.35rem",
    fontWeight: 800,
    color: tk.text,
    marginTop: 4,
    letterSpacing: "-0.02em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
}

function playButton(tk: Tokens): React.CSSProperties {
  return {
    width: 56,
    height: 56,
    borderRadius: 99,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 3,
    boxSizing: "border-box",
    color: tk.onAccent,
    background: `linear-gradient(145deg, #3ee8b8 0%, ${tk.accent} 60%, #12a883 100%)`,
    boxShadow: "0 10px 26px rgba(29,209,161,0.4), inset 0 1px 0 rgba(255,255,255,0.35)",
  };
}

function chip(tk: Tokens, color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 9px",
    borderRadius: 99,
    fontSize: "0.74rem",
    fontWeight: 700,
    color,
    background: tk.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    whiteSpace: "nowrap",
  };
}

function roundButton(tk: Tokens, isDark: boolean): React.CSSProperties {
  return {
    width: 42,
    height: 42,
    borderRadius: 99,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: tk.text,
    background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    border: `1px solid ${tk.border}`,
    flexShrink: 0,
  };
}

function pillButton(tk: Tokens, primary: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 14px",
    borderRadius: 99,
    fontSize: "0.84rem",
    fontWeight: 700,
    textDecoration: "none",
    color: primary ? tk.onAccent : tk.text,
    background: primary ? tk.accent : "transparent",
    border: primary ? "none" : `1px solid ${tk.border}`,
    whiteSpace: "nowrap",
  };
}
