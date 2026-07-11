import Layout from "../../components/Layout";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "../../context/UserContext";
import { getTokens } from "../../lib/tokens";
import { Icon, Button, EmptyState, PageHeader, ConfirmModal } from "../../components/ui";

export default function Routines() {
  const router = useRouter();
  const { routines, completedWorkouts, deleteRoutine, deleteCompletedWorkout, endRoutine, theme, t, authUser, refreshData, isMobile } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  // Forzar refresco de datos al entrar a rutinas
  useEffect(() => {
    if (authUser) {
      refreshData();
    }
  }, [authUser]);

  const [activeTab, setActiveTab] = useState("active"); // active, completed
  const [confirmDeleteRoutine, setConfirmDeleteRoutine] = useState(null);
  const [confirmDeleteWorkout, setConfirmDeleteWorkout] = useState(null);

  useEffect(() => {
    if (router.query.tab && router.query.tab !== activeTab) {
      setActiveTab(router.query.tab);
    }
  }, [router.query.tab, activeTab]);

  const formatElapsedTime = (seconds) => {
    if (!seconds && seconds !== 0) return null;
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    let parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);

    return parts.join(" ");
  };

  return (
    <Layout>
      <div style={{ maxWidth: isMobile ? "100%" : "1000px", margin: isMobile ? "0" : "0 auto" }}>
        <PageHeader isDark={isDark} isMobile={isMobile} title={t("routines_title")} />

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: "10px",
          marginBottom: "25px",
          borderBottom: `1px solid ${tk.border}`,
          paddingBottom: "10px",
          overflowX: "auto",
          whiteSpace: "nowrap"
        }}>
          <button
            onClick={() => setActiveTab("active")}
            style={{
              padding: "10px 20px",
              backgroundColor: activeTab === "active" ? tk.accent : "transparent",
              color: activeTab === "active" ? tk.onAccent : tk.textMuted,
              border: "none",
              borderRadius: tk.radius.sm,
              cursor: "pointer",
              fontWeight: "600",
              transition: tk.transition,
              flexShrink: 0
            }}
          >
            {t("active_routines")}
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            style={{
              padding: "10px 20px",
              backgroundColor: activeTab === "completed" ? tk.accent : "transparent",
              color: activeTab === "completed" ? tk.onAccent : tk.textMuted,
              border: "none",
              borderRadius: tk.radius.sm,
              cursor: "pointer",
              fontWeight: "600",
              transition: tk.transition,
              flexShrink: 0
            }}
          >
            {t("completed_workouts")} ({completedWorkouts.length})
          </button>
        </div>

        {activeTab === "active" ? (
          <>
            <div style={{ marginBottom: "25px" }}>
              <Button
                isDark={isDark}
                fullWidth
                size="lg"
                icon="plus"
                onClick={() => {
                  endRoutine();
                  router.push("/routines/empty");
                }}
              >
                {t("start_empty_workout")}
              </Button>
            </div>

            <p style={{ color: tk.textMuted, marginBottom: "20px" }}>
              {t("routines_description")}
            </p>

            {routines.length === 0 ? (
              <EmptyState
                isDark={isDark}
                icon="dumbbell"
                title={t("no_routines_yet")}
                action={
                  <Link href="/routines/create" style={{ textDecoration: "none" }}>
                    <Button isDark={isDark}>{t("create_new_routine")}</Button>
                  </Link>
                }
              />
            ) : (
              <div style={{ marginTop: isMobile ? "10px" : "20px" }}>
                {routines.map((routine) => (
                  <div
                    key={routine.id}
                    style={{
                      padding: isMobile ? "12px" : "15px",
                      backgroundColor: tk.surface,
                      border: `1px solid ${tk.border}`,
                      borderRadius: tk.radius.sm,
                      marginBottom: isMobile ? "10px" : "15px",
                      transition: tk.transition,
                      boxShadow: tk.shadow.card
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = tk.accent;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = tk.border;
                    }}
                  >
                    <h3 style={{ margin: "0 0 8px 0", color: tk.text }}>{routine.name}</h3>
                    <p style={{ margin: "0 0 12px 0", color: tk.textMuted }}>
                      {routine.exercises.length} {t("exercises").toLowerCase()} · {routine.exercises.reduce((sum, ex) => sum + ex.series.length, 0)} {t("series").toLowerCase()}
                    </p>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <Button
                        isDark={isDark}
                        size="sm"
                        onClick={() => {
                          endRoutine();
                          router.push(`/routines/${routine.id}`);
                        }}
                      >
                        {t("start_routine")}
                      </Button>
                      <Link href={`/routines/create?id=${routine.id}`} style={{ textDecoration: "none" }}>
                        <Button isDark={isDark} variant="secondary" size="sm" icon="edit">
                          {t("edit")}
                        </Button>
                      </Link>
                      <Button isDark={isDark} variant="danger" size="sm" icon="trash" onClick={() => setConfirmDeleteRoutine(routine.id)}>
                        {t("delete")}
                      </Button>
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: "20px" }}>
                  <Link href="/routines/create" style={{ textDecoration: "none" }}>
                    <Button isDark={isDark} variant="secondary" fullWidth size="lg" icon="plus">
                      {t("create_new_routine")}
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ marginTop: "20px" }}>
            {completedWorkouts.length === 0 ? (
              <EmptyState isDark={isDark} icon="clock" title={t("no_completed_workouts")} />
            ) : (
              <div>
                {completedWorkouts.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)).map(workout => (
                  <div key={workout.id} style={{
                    backgroundColor: tk.surface,
                    border: `1px solid ${tk.border}`,
                    borderRadius: tk.radius.md,
                    padding: isMobile ? "15px" : "20px",
                    marginBottom: isMobile ? "10px" : "15px",
                    transition: tk.transition,
                    boxShadow: tk.shadow.card
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = tk.accent;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = tk.border;
                  }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "15px" }}>
                      <div>
                        <h3 style={{ color: tk.accent, margin: "0 0 8px 0" }}>{workout.name}</h3>
                        <p style={{ color: tk.textMuted, fontSize: "0.85rem", margin: "0" }}>
                          {new Date(workout.completedAt).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => setConfirmDeleteWorkout(workout.id)}
                        style={{
                          padding: "6px 10px",
                          backgroundColor: tk.dangerSoft,
                          color: tk.danger,
                          border: "none",
                          borderRadius: tk.radius.sm,
                          cursor: "pointer",
                          display: "flex"
                        }}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </div>

                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                      marginBottom: "15px"
                    }}>
                      <div style={{ backgroundColor: tk.surfaceAlt, padding: "12px", borderRadius: tk.radius.sm }}>
                        <p style={{ color: tk.textMuted, margin: "0 0 5px 0", fontSize: "0.8rem" }}>{t("exercises_count")}</p>
                        <p style={{ color: tk.accent, margin: "0", fontSize: "1.1rem", fontWeight: "bold" }}>{workout.exercises}</p>
                      </div>
                      <div style={{ backgroundColor: tk.surfaceAlt, padding: "12px", borderRadius: tk.radius.sm }}>
                        <p style={{ color: tk.textMuted, margin: "0 0 5px 0", fontSize: "0.8rem" }}>{t("series_label")}</p>
                        <p style={{ color: tk.accent, margin: "0", fontSize: "1.1rem", fontWeight: "bold" }}>{workout.series}</p>
                      </div>
                    </div>

                    {workout.elapsedTime && (
                      <p style={{ color: tk.textMuted, fontSize: "0.9rem", margin: "0" }}>
                        {t("time_label")}: {formatElapsedTime(workout.elapsedTime)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
