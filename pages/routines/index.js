import Layout from "../../components/Layout";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useUser } from "../../context/UserContext";

export default function Routines() {
  const { routines, deleteRoutine, theme, t } = useUser();
  const isDark = theme === 'dark';

  return (
    <Layout>
      <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "10px", color: isDark ? "#fff" : "#333" }}>{t("my_routines")}</h1>
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
            <Link href="/routines/empty">
              <button
                style={{
                  padding: "10px 20px",
                  backgroundColor: isDark ? "#333" : "#eee",
                  color: isDark ? "#fff" : "#333",
                  border: `1px solid ${isDark ? "#444" : "#ddd"}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600"
                }}
              >
                {t("start_empty_workout")}
              </button>
            </Link>
          </div>
        ) : (
          <div style={{ marginTop: "20px" }}>
            {routines.map((routine, index) => (
              <div
                key={index}
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
                <div style={{ display: "flex", gap: "10px" }}>
                  <Link href={`/routines/${index}`}>
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

            <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
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
              <Link href="/routines/empty">
                <button
                  style={{
                    padding: "10px 20px",
                    backgroundColor: isDark ? "#333" : "#eee",
                    color: isDark ? "#fff" : "#333",
                    border: `1px solid ${isDark ? "#444" : "#ddd"}`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                >
                  {t("start_empty_workout")}
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
