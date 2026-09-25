// pages/exercises.js
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { exercisesList } from "../data/exercises";
import { useUser } from "../context/UserContext";
import { getTokens } from "../lib/tokens";
import { translateExerciseName } from "../lib/exerciseTranslation";
import { Icon, EmptyState, PageHeader, MuscleGroupIcon } from "../components/ui";
import { ExerciseThumb } from "../components/workout";

// Orden de la rejilla de grupos: el de data/exercises.js con Abductor y Cardio intercambiados de
// sitio (a petición expresa) — Abductor tiene foto de músculo real ahora (ver MuscleGroupIcon) y
// gana el hueco más visible; Cardio, que solo tiene icono genérico, pasa al suyo. Cualquier grupo
// que no esté en esta lista (por si se añade uno nuevo a exercisesList y se olvida aquí) cae al
// final en vez de desaparecer.
const GROUP_DISPLAY_ORDER = [
  "Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps", "Antebrazo", "Cuádriceps", "Femoral",
  "Glúteos", "Gemelos", "Cuello", "Abdomen", "Abductor", "Aductor", "Cardio", "Cuerpo Completo", "Movilidad",
];

function exerciseTypeLabel(exercise, t) {
  if (exercise.unit === "lastre") return t("exercise_type_lastre");
  if (exercise.type === "reps") return t("exercise_type_reps");
  if (exercise.type === "time") return t("exercise_type_time");
  return t("exercise_type_weight_reps");
}

export default function Exercises() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  // Un solo grupo activo, no un mapa de expandidos: tocar un grupo lleva directamente a sus
  // ejercicios (sustituyendo la rejilla), no los despliega debajo de ella.
  const [selectedGroup, setSelectedGroup] = useState(null);
  const { theme, isMobile, t, language, favoriteExercises, toggleFavoriteExercise, completedWorkouts } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const reduceMotion = useReducedMotion();
  const query = search.trim().toLowerCase();

  // Filtra ejercicios por búsqueda (nombre original Y traducido: quien usa la app en euskera o
  // inglés busca en su idioma) y los agrupa por grupo muscular.
  const filteredGroups = useMemo(
    () =>
      Object.entries(exercisesList).reduce((acc, [group, exercises]) => {
        const filtered = query
          ? exercises.filter(
              (ex) => ex.name.toLowerCase().includes(query) || translateExerciseName(ex.name, language).toLowerCase().includes(query)
            )
          : exercises;
        if (filtered.length > 0) {
          acc[group] = filtered;
        }
        return acc;
      }, {}),
    [query, language]
  );

  const hasResults = Object.keys(filteredGroups).length > 0;
  const favoriteFirst = (list) =>
    // Favoritos primero — Array.prototype.sort es estable, así que dentro de cada bloque
    // (favorito / no favorito) se conserva el orden original del catálogo.
    [...list].sort((a, b) => Number(favoriteExercises.includes(b.name)) - Number(favoriteExercises.includes(a.name)));
  const selectedExercises = selectedGroup ? favoriteFirst(filteredGroups[selectedGroup] || []) : null;
  const orderedGroups = [
    ...GROUP_DISPLAY_ORDER.filter((g) => filteredGroups[g]),
    ...Object.keys(filteredGroups).filter((g) => !GROUP_DISPLAY_ORDER.includes(g)),
  ];

  // Con texto de búsqueda y sin grupo elegido se muestran los ejercicios directamente: antes la
  // búsqueda solo filtraba la rejilla de grupos y había que adivinar en cuál estaba el resultado.
  const searchResults = useMemo(() => {
    if (!query) return [];
    return orderedGroups.flatMap((group) => filteredGroups[group].map((ex) => ({ ...ex, group })));
  }, [query, filteredGroups, orderedGroups]);

  // Ejercicios hechos recientemente (únicos, del más reciente al más antiguo): el atajo que más
  // se usa, porque casi siempre se consulta el historial de algo que se acaba de entrenar.
  const recentExercises = useMemo(() => {
    const sorted = [...(completedWorkouts || [])].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    const seen = [];
    for (const w of sorted) {
      for (const ex of w.exerciseDetails || w.details || []) {
        const name = ex.name || ex.exercise;
        if (name && !seen.includes(name)) seen.push(name);
        if (seen.length >= 12) return seen;
      }
    }
    return seen;
  }, [completedWorkouts]);

  const openHistory = (name) => router.push(`/exercise-history?exercise=${encodeURIComponent(name)}`);

  const renderExerciseRow = (exercise, index, showGroup = false) => {
    const isFavorite = favoriteExercises.includes(exercise.name);
    return (
      <li key={`${exercise.group || ""}-${exercise.id}`} style={{ borderTop: index === 0 ? "none" : `1px solid ${tk.border}` }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => openHistory(exercise.name)}
          onKeyDown={(e) => e.key === "Enter" && openHistory(exercise.name)}
          className="feeg-press feeg-surface feeg-hover"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 12px",
            cursor: "pointer",
            "--feeg-bg": "transparent",
            "--feeg-fg": tk.text,
            "--feeg-hover-bg": tk.surfaceHover,
            "--feeg-border-width": "0px",
            "--feeg-press-scale": 0.985,
          }}
        >
          <ExerciseThumb name={exercise.name} size={38} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 600, fontSize: "0.94rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {translateExerciseName(exercise.name, language)}
            </span>
            <span style={{ display: "block", fontSize: "0.74rem", color: tk.textMuted, marginTop: "2px" }}>
              {showGroup ? `${t(exercise.group) || exercise.group} · ` : ""}
              {exerciseTypeLabel(exercise, t)}
            </span>
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavoriteExercise(exercise.name);
            }}
            aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
            aria-pressed={isFavorite}
            className="feeg-press"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: isFavorite ? tk.danger : tk.textFaint,
              display: "flex",
              padding: "8px",
              margin: "-8px -4px -8px 0",
              "--feeg-press-scale": 0.8,
            }}
          >
            <Icon name="heart" size={18} style={{ fill: isFavorite ? "currentColor" : "none" }} />
          </button>
        </div>
      </li>
    );
  };

  const listStyle = {
    listStyle: "none",
    padding: 0,
    margin: 0,
    borderRadius: tk.radius.lg,
    overflow: "hidden",
    border: `1px solid ${tk.border}`,
    backgroundColor: tk.surface,
  };

  const shortcutRow = (label, icon, names) =>
    names.length > 0 && (
      <section style={{ marginBottom: "18px" }}>
        <h3 style={sectionTitle(tk)}>
          <Icon name={icon} size={14} color={tk.accent} />
          {label}
        </h3>
        <div style={{ display: "flex", gap: "8px", overflowX: "auto", scrollbarWidth: "none", margin: "0 -16px", padding: "0 16px 2px" }}>
          {names.map((name) => (
            <button
              key={name}
              onClick={() => openHistory(name)}
              className="feeg-press"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px 6px 6px",
                borderRadius: tk.radius.pill,
                border: `1px solid ${tk.border}`,
                backgroundColor: tk.surface,
                color: tk.text,
                cursor: "pointer",
                flexShrink: 0,
                maxWidth: "220px",
                "--feeg-press-scale": 0.95,
              }}
            >
              <ExerciseThumb name={name} size={28} />
              <span style={{ fontSize: "0.82rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {translateExerciseName(name, language)}
              </span>
            </button>
          ))}
        </div>
      </section>
    );

  return (
    <Layout gutter>
      <PageHeader isDark={isDark} isMobile={isMobile} compact title={t("exercises")} />

      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ position: "relative", marginBottom: "16px" }}>
          <Icon name="search" size={17} color={tk.textFaint} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            inputMode="search"
            enterKeyHint="search"
            placeholder={t("search_exercise")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "12px 40px 12px 40px",
              width: "100%",
              borderRadius: tk.radius.pill,
              border: `1.5px solid ${tk.border}`,
              backgroundColor: tk.surface,
              color: tk.text,
              fontSize: "1rem",
              transition: tk.transition,
              boxSizing: "border-box",
              outline: "none",
            }}
            onFocus={(e) => (e.target.style.borderColor = tk.accent)}
            onBlur={(e) => (e.target.style.borderColor = tk.border)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label={t("close")}
              className="feeg-press"
              style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", width: 30, height: 30, borderRadius: 99, border: "none", background: tk.surfaceHover, color: tk.textMuted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>

        {selectedGroup ? (
          <div>
            <button
              onClick={() => setSelectedGroup(null)}
              className="feeg-surface feeg-press feeg-hover"
              style={{
                border: "none",
                fontSize: "0.9rem",
                cursor: "pointer",
                fontWeight: "700",
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 0",
                "--feeg-fg": tk.accent,
                "--feeg-hover-fg": tk.accentHover,
                "--feeg-border-width": "0px",
                "--feeg-press-scale": 0.96,
              }}
            >
              <Icon name="chevronLeft" size={18} />
              {t("muscle_groups_label")}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
              <MuscleGroupIcon group={selectedGroup} isDark={isDark} size={56} />
              <div>
                <h2 style={{ margin: 0, color: tk.text, fontSize: "1.35rem", fontWeight: 800 }}>{t(selectedGroup) || selectedGroup}</h2>
                <div style={{ color: tk.textMuted, fontSize: "0.82rem", marginTop: "2px" }}>
                  {t("exercise_count_label").replace("{n}", String(selectedExercises?.length || 0))}
                </div>
              </div>
            </div>

            {!selectedExercises || selectedExercises.length === 0 ? (
              <EmptyState isDark={isDark} icon="search" title={t("no_exercises_found")} />
            ) : (
              <ul style={listStyle}>{selectedExercises.map((exercise, i) => renderExerciseRow(exercise, i))}</ul>
            )}
          </div>
        ) : query ? (
          searchResults.length === 0 ? (
            <EmptyState isDark={isDark} icon="search" title={t("no_exercises_found")} />
          ) : (
            <>
              <h3 style={sectionTitle(tk)}>
                {t("results_label")} · {searchResults.length}
              </h3>
              <ul style={listStyle}>{searchResults.slice(0, 60).map((exercise, i) => renderExerciseRow(exercise, i, true))}</ul>
            </>
          )
        ) : hasResults ? (
          <>
            {shortcutRow(t("recent_exercises"), "history", recentExercises)}
            {shortcutRow(t("favorites_label"), "heart", favoriteExercises || [])}

            <h3 style={sectionTitle(tk)}>
              <Icon name="grid" size={14} color={tk.accent} />
              {t("muscle_groups_label")}
            </h3>
            {/* Rejilla de grupos: icono del cuerpo con solo ese músculo marcado + nombre y cuántos
                ejercicios tiene. Tres por fila en móvil (antes dos, con tarjetas de 180px de alto:
                solo cabían seis grupos por pantalla). */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${isMobile ? 3 : 4}, minmax(0, 1fr))`, gap: isMobile ? "8px" : "14px" }}>
              {orderedGroups.map((group, i) => (
                <motion.button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: Math.min(i, 14) * 0.025, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="feeg-press feeg-hover"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    padding: isMobile ? "12px 6px 10px" : "20px 12px",
                    borderRadius: tk.radius.lg,
                    border: `1px solid ${tk.border}`,
                    backgroundColor: tk.surface,
                    cursor: "pointer",
                    minWidth: 0,
                    "--feeg-hover-border": tk.accent,
                    "--feeg-hover-bg": tk.surfaceHover,
                    "--feeg-press-scale": 0.95,
                  }}
                >
                  <MuscleGroupIcon group={group} isDark={isDark} size={isMobile ? 70 : 110} />
                  <span
                    style={{
                      color: tk.text,
                      fontSize: isMobile ? "0.78rem" : "0.92rem",
                      fontWeight: "800",
                      textAlign: "center",
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t(group) || group}
                  </span>
                  <span style={{ color: tk.textFaint, fontSize: "0.68rem", fontWeight: 600, marginTop: "-3px" }}>
                    {filteredGroups[group].length}
                  </span>
                </motion.button>
              ))}
            </div>
          </>
        ) : (
          <EmptyState isDark={isDark} icon="search" title={t("no_exercises_found")} />
        )}
      </div>
    </Layout>
  );
}

function sectionTitle(tk) {
  return {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    margin: "0 0 10px",
    fontSize: "0.74rem",
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: tk.textMuted,
  };
}
