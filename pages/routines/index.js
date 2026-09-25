import Layout from "../../components/Layout";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import { motion, useReducedMotion } from "motion/react";
import { useUser } from "../../context/UserContext";
import { getTokens } from "../../lib/tokens";
import { calendarDaysSince, suggestNextRoutine } from "../../lib/homeInsights";
import { tapFeedback } from "../../lib/haptics";
import { Icon, EmptyState, PageHeader, ConfirmModal, ActionSheet, SegmentedControl } from "../../components/ui";
import RoutineCard from "../../components/routines/RoutineCard";
import ReadOnlyWorkoutModal from "../../components/workout/ReadOnlyWorkoutModal";

function formatDuration(seconds) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export default function Routines() {
  const router = useRouter();
  const {
    routines,
    completedWorkouts,
    deleteRoutine,
    updateRoutine,
    saveRoutine,
    deleteCompletedWorkout,
    endRoutine,
    theme,
    t,
    language,
    authUser,
    refreshData,
    isMobile,
  } = useUser();
  const isDark = theme === "dark";
  const tk = getTokens(isDark);
  const reduceMotion = useReducedMotion();
  const langCode = t("lang_code") || "es-ES";

  // Forzar refresco de datos al entrar a rutinas
  useEffect(() => {
    if (authUser) {
      refreshData();
    }
  }, [authUser]);

  const [activeTab, setActiveTab] = useState("active"); // active, completed
  const [confirmDeleteRoutine, setConfirmDeleteRoutine] = useState(null);
  const [confirmDeleteWorkout, setConfirmDeleteWorkout] = useState(null);
  const [menuRoutine, setMenuRoutine] = useState(null);
  const [menuWorkout, setMenuWorkout] = useState(null);
  const [viewWorkout, setViewWorkout] = useState(null);

  useEffect(() => {
    if (router.query.tab && router.query.tab !== activeTab) {
      setActiveTab(router.query.tab);
    }
    // Solo reacciona a cambios en la URL; el tab local manda mientras no cambie la query.
  }, [router.query.tab]);

  const changeTab = (tab) => {
    setActiveTab(tab);
    router.replace({ pathname: router.pathname, query: tab === "active" ? {} : { tab } }, undefined, { shallow: true });
  };

  const next = useMemo(() => suggestNextRoutine(routines || [], completedWorkouts || []), [routines, completedWorkouts]);

  // Última vez que se hizo cada rutina (por nombre, igual que suggestNextRoutine).
  const lastDoneByName = useMemo(() => {
    const map = new Map();
    for (const w of completedWorkouts || []) {
      const key = (w.name || "").trim().toLocaleLowerCase();
      const prev = map.get(key);
      if (!prev || new Date(w.completedAt) > new Date(prev)) map.set(key, w.completedAt);
    }
    return map;
  }, [completedWorkouts]);

  const lastDoneLabel = (routine) => {
    const iso = lastDoneByName.get((routine.name || "").trim().toLocaleLowerCase());
    const days = calendarDaysSince(iso);
    if (days === null) return t("never_done");
    if (days === 0) return t("today_label");
    if (days === 1) return t("time_yesterday").toLowerCase();
    return t("days_ago").replace("{n}", String(days));
  };

  // Historial agrupado por mes: con decenas de entrenos, una lista plana no deja ver cuándo pasó qué.
  const historyByMonth = useMemo(() => {
    const sorted = [...(completedWorkouts || [])].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    const fmt = new Intl.DateTimeFormat(langCode, { month: "long", year: "numeric" });
    const groups = [];
    for (const w of sorted) {
      const d = new Date(w.completedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      let group = groups[groups.length - 1];
      if (!group || group.key !== key) {
        group = { key, label: fmt.format(d), items: [], volume: 0 };
        groups.push(group);
      }
      group.items.push(w);
      group.volume += Number(w.totalVolume) || 0;
    }
    return groups;
  }, [completedWorkouts, langCode]);

  const startRoutine = (routine) => {
    tapFeedback();
    endRoutine();
    router.push(`/routines/${routine.id}`);
  };

  const startEmpty = () => {
    tapFeedback();
    endRoutine();
    router.push("/routines/empty");
  };

  const duplicateRoutine = (routine) => {
    const copy = JSON.parse(JSON.stringify(routine));
    saveRoutine({ ...copy, id: Date.now(), name: `${routine.name} ${t("copy_suffix")}` });
  };

  const routineMenuItems = menuRoutine
    ? [
        { key: "edit", label: t("edit"), icon: "edit", onSelect: () => router.push(`/routines/create?id=${menuRoutine.id}`) },
        { key: "duplicate", label: t("duplicate"), icon: "copy", onSelect: () => duplicateRoutine(menuRoutine) },
        {
          key: "visibility",
          label: menuRoutine.public === false ? t("make_public") : t("make_private"),
          icon: menuRoutine.public === false ? "eye" : "eyeOff",
          onSelect: () => updateRoutine({ ...menuRoutine, public: menuRoutine.public === false }),
        },
        { key: "delete", label: t("delete"), icon: "trash", danger: true, onSelect: () => setConfirmDeleteRoutine(menuRoutine.id) },
      ]
    : [];

  const workoutMenuItems = menuWorkout
    ? [
        { key: "view", label: t("view_details"), icon: "eye", onSelect: () => setViewWorkout(menuWorkout) },
        { key: "delete", label: t("delete"), icon: "trash", danger: true, onSelect: () => setConfirmDeleteWorkout(menuWorkout.id) },
      ]
    : [];

  return (
    <Layout gutter>
      <div style={{ maxWidth: isMobile ? "100%" : "760px", margin: isMobile ? "0" : "0 auto" }}>
        <PageHeader
          isDark={isDark}
          isMobile={isMobile}
          compact
          title={t("routines_title")}
          actions={
            <Link
              href="/routines/create"
              aria-label={t("create_new_routine")}
              className="feeg-press"
              style={{
                width: 40,
                height: 40,
                borderRadius: 99,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: tk.onAccent,
                background: tk.accent,
                boxShadow: tk.shadow.accent,
              }}
            >
              <Icon name="plus" size={20} strokeWidth={2.4} />
            </Link>
          }
        />

        <SegmentedControl
          isDark={isDark}
          ariaLabel={t("routines_title")}
          value={activeTab}
          onChange={changeTab}
          segments={[
            { key: "active", label: t("routines_tab"), badge: routines.length },
            { key: "completed", label: t("history_tab"), badge: completedWorkouts.length },
          ]}
        />

        {activeTab === "active" ? (
          <div style={{ marginTop: 14 }}>
            {/* Dos formas rápidas de empezar sin rutina: libre o generada por IA. */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, marginBottom: 16 }}>
              <button type="button" onClick={startEmpty} className="feeg-press" style={quickStyle(tk, isDark, true)}>
                <span style={quickIcon("rgba(0,0,0,0.14)", tk.onAccent)}>
                  <Icon name="play" size={16} />
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t("quick_free_workout")}</span>
              </button>
              <Link href="/ia?tab=training" className="feeg-press" style={quickStyle(tk, isDark, false)}>
                <span style={quickIcon("rgba(167,139,250,0.16)", "#a78bfa")}>
                  <Icon name="sparkles" size={16} />
                </span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t("generate_with_ai")}</span>
              </Link>
            </div>

            {routines.length === 0 ? (
              <EmptyState
                isDark={isDark}
                icon="dumbbell"
                title={t("no_routines_yet")}
                description={t("routines_empty_desc")}
                action={
                  <Link href="/routines/create" className="feeg-press" style={{ ...quickStyle(tk, isDark, true), display: "inline-flex", width: "auto", padding: "12px 18px" }}>
                    <Icon name="plus" size={18} />
                    {t("create_new_routine")}
                  </Link>
                }
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {routines.map((routine, i) => (
                  <RoutineCard
                    key={routine.id}
                    routine={routine}
                    index={i}
                    isDark={isDark}
                    language={language}
                    t={t}
                    isNext={next?.routine.id === routine.id && routines.length > 1}
                    lastDoneLabel={lastDoneLabel(routine)}
                    onStart={() => startRoutine(routine)}
                    onEdit={() => router.push(`/routines/create?id=${routine.id}`)}
                    onMore={() => setMenuRoutine(routine)}
                  />
                ))}

                <Link
                  href="/routines/create"
                  className="feeg-press"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "16px",
                    borderRadius: 20,
                    border: `1.5px dashed ${tk.borderStrong}`,
                    color: tk.textMuted,
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: "0.92rem",
                  }}
                >
                  <Icon name="plus" size={18} />
                  {t("new_routine_short")}
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            {historyByMonth.length === 0 ? (
              <EmptyState isDark={isDark} icon="history" title={t("no_completed_workouts")} />
            ) : (
              historyByMonth.map((group) => (
                <section key={group.key} style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      padding: "0 4px 8px",
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: "0.8rem", fontWeight: 800, color: tk.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      {group.label}
                    </h3>
                    <span style={{ fontSize: "0.74rem", color: tk.textFaint, fontWeight: 600 }}>
                      {group.items.length} · {Math.round(group.volume).toLocaleString(langCode)} kg
                    </span>
                  </div>
                  <div style={{ borderRadius: 20, overflow: "hidden", border: `1px solid ${tk.border}`, background: tk.surface }}>
                    {group.items.map((workout, i) => {
                      const d = new Date(workout.completedAt);
                      return (
                        <motion.div
                          key={workout.id}
                          initial={reduceMotion ? false : { opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(i, 10) * 0.025 }}
                          style={{ display: "flex", alignItems: "center", borderTop: i === 0 ? "none" : `1px solid ${tk.border}` }}
                        >
                          <button
                            type="button"
                            onClick={() => setViewWorkout(workout)}
                            className="feeg-press feeg-surface feeg-hover"
                            style={{
                              flex: 1,
                              minWidth: 0,
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              padding: "12px 4px 12px 14px",
                              border: "none",
                              textAlign: "left",
                              cursor: "pointer",
                              "--feeg-bg": "transparent",
                              "--feeg-fg": tk.text,
                              "--feeg-hover-bg": tk.surfaceHover,
                              "--feeg-border-width": "0px",
                              "--feeg-press-scale": 0.985,
                            }}
                          >
                            <span
                              style={{
                                width: 44,
                                height: 46,
                                borderRadius: 12,
                                flexShrink: 0,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                background: tk.accentSoft,
                                color: tk.accent,
                                lineHeight: 1,
                              }}
                            >
                              <span style={{ fontSize: "1.1rem", fontWeight: 800 }}>{d.getDate()}</span>
                              <span style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", marginTop: 3 }}>
                                {new Intl.DateTimeFormat(langCode, { weekday: "short" }).format(d).replace(".", "")}
                              </span>
                            </span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: "block", fontWeight: 800, fontSize: "0.96rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {workout.name}
                              </span>
                              <span style={{ display: "block", fontSize: "0.78rem", color: tk.textMuted, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {[
                                  formatDuration(workout.elapsedTime || (workout.totalTime || 0) * 60),
                                  `${(workout.totalVolume || 0).toLocaleString(langCode)} kg`,
                                  `${workout.series || 0} ${t("series_short")}`,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMenuWorkout(workout)}
                            aria-label={t("routine_options")}
                            className="feeg-press"
                            style={{ width: 44, height: 44, border: "none", background: "transparent", color: tk.textFaint, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                          >
                            <Icon name="moreVertical" size={18} />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        )}
      </div>

      <ActionSheet
        isDark={isDark}
        open={!!menuRoutine}
        title={menuRoutine?.name}
        items={routineMenuItems}
        cancelLabel={t("cancel")}
        onClose={() => setMenuRoutine(null)}
      />
      <ActionSheet
        isDark={isDark}
        open={!!menuWorkout}
        title={menuWorkout?.name}
        items={workoutMenuItems}
        cancelLabel={t("cancel")}
        onClose={() => setMenuWorkout(null)}
      />

      <ReadOnlyWorkoutModal workout={viewWorkout} language={language} translate={t} onClose={() => setViewWorkout(null)} />

      <ConfirmModal
        isDark={isDark}
        open={!!confirmDeleteRoutine}
        title={t("confirm_delete_routine")}
        danger
        onConfirm={() => { deleteRoutine(confirmDeleteRoutine); setConfirmDeleteRoutine(null); }}
        onCancel={() => setConfirmDeleteRoutine(null)}
      />
      <ConfirmModal
        isDark={isDark}
        open={!!confirmDeleteWorkout}
        title={t("confirm_delete")}
        danger
        onConfirm={() => { deleteCompletedWorkout(confirmDeleteWorkout); setConfirmDeleteWorkout(null); }}
        onCancel={() => setConfirmDeleteWorkout(null)}
      />
    </Layout>
  );
}

function quickStyle(tk, isDark, primary) {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px",
    borderRadius: 16,
    border: primary ? "none" : `1px solid ${tk.border}`,
    background: primary ? `linear-gradient(135deg, ${tk.accent} 0%, #12b38a 100%)` : tk.surface,
    color: primary ? tk.onAccent : tk.text,
    fontWeight: 800,
    fontSize: "0.86rem",
    cursor: "pointer",
    textDecoration: "none",
    boxShadow: primary ? tk.shadow.accent : "none",
    minWidth: 0,
    "--feeg-press-scale": 0.96,
  };
}

function quickIcon(bg, color) {
  return {
    width: 28,
    height: 28,
    borderRadius: 10,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: bg,
    color,
  };
}
