import Layout from "../../components/Layout";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useUser } from "../../context/UserContext";

export default function Routines() {
  const router = useRouter();
  const { routines, completedWorkouts, deleteRoutine, deleteCompletedWorkout, theme, t } = useUser();
  const [activeTab, setActiveTab] = useState("active"); // active, completed
  const isDark = theme === 'dark';

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
      <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "20px", color: isDark ? "#fff" : "#333" }}>{t("routines_title")}</h1>

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: "10px",
          marginBottom: "25px",
          borderBottom: `1px solid ${isDark ? "#333" : "#e0e0e0"}`,
          paddingBottom: "10px",
          overflowX: "auto",
          whiteSpace: "nowrap"
        }}>
          <button
            onClick={() => setActiveTab("active")}
            style={{
              padding: "10px 20px",
              backgroundColor: activeTab === "active" ? "#1dd1a1" : "transparent",
              color: activeTab === "active" ? "#000" : (isDark ? "#ccc" : "#666"),
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              transition: "all 0.3s ease",
              flexShrink: 0
            }}
          >
            {t("active_routines")}
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            style={{
              padding: "10px 20px",
              backgroundColor: activeTab === "completed" ? "#1dd1a1" : "transparent",
              color: activeTab === "completed" ? "#000" : (isDark ? "#ccc" : "#666"),
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
              transition: "all 0.3s ease",
              flexShrink: 0
            }}
          >
            {t("completed_workouts")} ({completedWorkouts.length})
          </button>
        </div>

        {activeTab === "active" ? (
          <>
            <div style={{ marginBottom: "25px" }}>
              <Link href="/routines/empty">
                <button
                  style={{
                    width: "100%",
                    padding: "15px",
                    backgroundColor: "#1dd1a1",
                    color: "#000",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    transition: "all 0.3s ease",
                    boxShadow: isDark ? "0 4px 10px rgba(0,0,0,0.3)" : "0 4px 10px rgba(0,0,0,0.1)"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#16a853";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "#1dd1a1";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {t("start_empty_workout")}
                </button>
              </Link>
            </div>

            <p style={{ color: isDark ? "#aaa" : "#666", marginBottom: "20px" }}>
              {t("routines_description")}
            </p>

            {routines.length === 0 ? (
              <div style={{ marginTop: "20px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <p style={{ color: isDark ? "#fff" : "#333", width: "100%", marginBottom: "10px" }}>{t("no_routines_yet")}</p>
                <Link href="/routines/create">
                  <button
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#1dd1a1",
                      color: "#000",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "600"
                    }}
                  >
                    {t("create_new_routine")}
                  </button>
                </Link>
              </div>
            ) : (
              <div style={{ marginTop: "20px" }}>
                {routines.map((routine) => (
                  <div
                    key={routine.id}
                    style={{
                      padding: "15px",
                      backgroundColor: isDark ? "#1a1a1a" : "#fff",
                      border: `1px solid ${isDark ? "#333" : "#eee"}`,
                      borderRadius: "8px",
                      marginBottom: "15px",
                      transition: "all 0.3s ease",
                      boxShadow: isDark ? "none" : "0 2px 8px rgba(0,0,0,0.05)"
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = "#1dd1a1";
                      e.currentTarget.style.boxShadow = isDark ? "0 4px 12px rgba(29, 209, 161, 0.2)" : "0 4px 12px rgba(29, 209, 161, 0.1)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = isDark ? "#333" : "#eee";
                      e.currentTarget.style.boxShadow = isDark ? "none" : "0 2px 8px rgba(0,0,0,0.05)";
                    }}
                  >
                    <h3 style={{ margin: "0 0 8px 0", color: isDark ? "#fff" : "#333" }}>{routine.name}</h3>
                    <p style={{ margin: "0 0 12px 0", color: isDark ? "#aaa" : "#666" }}>
                      {routine.exercises.length} {t("exercises").toLowerCase()} · {routine.exercises.reduce((sum, ex) => sum + ex.series.length, 0)} {t("series").toLowerCase()}
                    </p>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <Link href={`/routines/${routine.id}`}>
                        <button
                          style={{
                            padding: "8px 16px",
                            backgroundColor: "#1dd1a1",
                            color: "#000",
                            border: "none",
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.95rem",
                            fontWeight: "600",
                            transition: "all 0.3s ease"
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = "#16a853";
                            e.target.style.boxShadow = "0 4px 8px rgba(29, 209, 161, 0.3)";
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = "#1dd1a1";
                            e.target.style.boxShadow = "none";
                          }}
                        >
                          {t("start_routine")}
                        </button>
                      </Link>
                      <Link href={`/routines/create?id=${routine.id}`}>
                        <button
                          style={{
                            padding: "8px 16px",
                            backgroundColor: isDark ? "#333" : "#eee",
                            color: isDark ? "#fff" : "#333",
                            border: `1px solid ${isDark ? "#444" : "#ddd"}`,
                            borderRadius: "6px",
                            cursor: "pointer",
                            fontSize: "0.95rem",
                            fontWeight: "600",
                            transition: "all 0.3s ease"
                          }}
                        >
                          {t("edit")}
                        </button>
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm(t("confirm_delete_routine"))) {
                            deleteRoutine(routine.id);
                          }
                        }}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "#e74c3c",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "0.95rem",
                          fontWeight: "600",
                          transition: "all 0.3s ease"
                        }}
                        onMouseOver={(e) => {
                          e.target.style.backgroundColor = "#c0392b";
                        }}
                        onMouseOut={(e) => {
                          e.target.style.backgroundColor = "#e74c3c";
                        }}
                      >
                        {t("delete")}
                      </button>
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: "20px" }}>
                  <Link href="/routines/create">
                    <button
                      style={{
                        width: "100%",
                        padding: "15px",
                        backgroundColor: isDark ? "#333" : "#eee",
                        color: isDark ? "#fff" : "#333",
                        border: `1px solid ${isDark ? "#444" : "#ddd"}`,
                        borderRadius: "10px",
                        fontSize: "1.1rem",
                        fontWeight: "bold",
                        cursor: "pointer",
                        transition: "all 0.3s ease"
                      }}
                    >
                      {t("create_new_routine")}
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ marginTop: "20px" }}>
            {completedWorkouts.length === 0 ? (
              <p style={{ color: isDark ? "#ccc" : "#666", textAlign: "center", padding: "40px 20px" }}>
                {t("no_completed_workouts")}
              </p>
            ) : (
              <div>
                {completedWorkouts.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)).map(workout => (
                  <div key={workout.id} style={{
                    backgroundColor: isDark ? "#1a1a1a" : "#fff",
                    border: isDark ? "1px solid #333" : "1px solid #e0e0e0",
                    borderRadius: "10px",
                    padding: "20px",
                    marginBottom: "15px",
                    transition: "all 0.3s ease",
                    boxShadow: isDark ? "none" : "0 2px 8px rgba(0,0,0,0.05)"
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = "#1dd1a1";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = isDark ? "#333" : "#e0e0e0";
                  }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "15px" }}>
                      <div>
                        <h3 style={{ color: "#1dd1a1", margin: "0 0 8px 0" }}>{workout.name}</h3>
                        <p style={{ color: isDark ? "#999" : "#666", fontSize: "0.85rem", margin: "0" }}>
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
                        onClick={() => {
                          if (confirm(t("confirm_delete"))) {
                            deleteCompletedWorkout(workout.id);
                          }
                        }}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#e74c3c",
                          color: "#fff",
                          border: "none",
                          borderRadius: "5px",
                          cursor: "pointer",
                          fontSize: "0.85rem"
                        }}
                      >
                        {t("delete")}
                      </button>
                    </div>

                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                      marginBottom: "15px"
                    }}>
                      <div style={{ backgroundColor: isDark ? "#0f0f0f" : "#f5f5f5", padding: "12px", borderRadius: "6px" }}>
                        <p style={{ color: isDark ? "#999" : "#666", margin: "0 0 5px 0", fontSize: "0.8rem" }}>{t("exercises_count")}</p>
                        <p style={{ color: "#1dd1a1", margin: "0", fontSize: "1.1rem", fontWeight: "bold" }}>{workout.exercises}</p>
                      </div>
                      <div style={{ backgroundColor: isDark ? "#0f0f0f" : "#f5f5f5", padding: "12px", borderRadius: "6px" }}>
                        <p style={{ color: isDark ? "#999" : "#666", margin: "0 0 5px 0", fontSize: "0.8rem" }}>{t("series_label")}</p>
                        <p style={{ color: "#1dd1a1", margin: "0", fontSize: "1.1rem", fontWeight: "bold" }}>{workout.series}</p>
                      </div>
                    </div>

                    {workout.elapsedTime && (
                      <p style={{ color: isDark ? "#aaa" : "#666", fontSize: "0.9rem", margin: "0" }}>
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
    </Layout>
  );
}
