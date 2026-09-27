import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "../context/UserContext";
import { exercisesList } from "../data/exercises";
import { getTokens } from "../lib/tokens";
import { translateExerciseName } from "../lib/exerciseTranslation";
import CreateCustomExerciseModal from "./CreateCustomExerciseModal";
import { ExerciseThumb } from "./workout";
import { Icon, MuscleGroupIcon } from "./ui";

const TYPE_LABEL = { weight_reps: "Peso + reps", reps: "Solo reps", time: "Tiempo", weight_bodyweight: "Peso corporal + lastre" };
// Búsqueda sin tildes ni mayúsculas: "biceps" encuentra "Bíceps".
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Selector de ejercicios (añadir o sustituir en un entreno, crear rutina, importar).
 *
 * El buscador va arriba y busca en TODO el catálogo: antes había que adivinar el grupo muscular,
 * entrar y sólo entonces buscar dentro. Sin texto se ven los ejercicios recientes (lo más probable
 * que se quiera añadir) y los grupos con su silueta.
 */
export default function ExerciseSelector({ onSelectExercise, onCancel }) {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customExercises, setCustomExercises] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, completedWorkouts, language } = useUser();
  const isDark = theme === "dark";
  const tk = getTokens(isDark);
  const inputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("customExercises");
    if (saved) {
      try {
        setCustomExercises(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading custom exercises", e);
      }
    }
  }, []);

  // Catálogo + personalizados como una sola lista, cada uno con su grupo.
  const all = useMemo(() => {
    const out = [];
    Object.entries(exercisesList).forEach(([group, list]) => list.forEach((ex) => out.push({ ex, group, custom: false })));
    Object.entries(customExercises).forEach(([group, list]) => (list || []).forEach((ex) => out.push({ ex, group, custom: true })));
    return out;
  }, [customExercises]);

  const recents = useMemo(() => {
    const seen = new Set();
    const out = [];
    const sorted = [...(completedWorkouts || [])].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    for (const w of sorted) {
      for (const d of w.exerciseDetails || w.details || []) {
        const name = d.name || d.exercise;
        if (!name || seen.has(name)) continue;
        const hit = all.find((x) => x.ex.name === name);
        if (hit) {
          seen.add(name);
          out.push(hit);
        }
        if (out.length >= 8) return out;
      }
    }
    return out;
  }, [completedWorkouts, all]);

  const q = norm(searchQuery.trim());
  const results = useMemo(() => {
    if (q) return all.filter((x) => norm(x.ex.name).includes(q) || norm(translateExerciseName(x.ex.name, language)).includes(q) || norm(x.group).includes(q)).slice(0, 80);
    if (selectedGroup) return all.filter((x) => x.group === selectedGroup);
    return [];
  }, [q, selectedGroup, all, language]);

  const handleCreateCustomExercise = (customExercise) => {
    const group = customExercise.muscleGroup;
    const updated = { ...customExercises, [group]: [...(customExercises[group] || []), customExercise] };
    setCustomExercises(updated);
    localStorage.setItem("customExercises", JSON.stringify(updated));
    onSelectExercise(customExercise);
    setShowCreateModal(false);
  };

  // Los ejercicios del catálogo no llevan su grupo como campo propio (es la CLAVE de
  // exercisesList): se añade aquí porque quien llama espera `muscleGroup` (p.ej. la importación,
  // donde Firestore rechaza un campo undefined).
  const pick = ({ ex, group }) => onSelectExercise({ ...ex, muscleGroup: ex.muscleGroup || group });

  const row = (item, i) => (
    <button
      key={`${item.group}-${item.ex.name}-${i}`}
      type="button"
      onClick={() => pick(item)}
      className="feeg-press"
      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 0", border: "none", borderBottom: `1px solid ${tk.hairline}`, background: "none", textAlign: "left", cursor: "pointer", color: tk.text }}
    >
      <ExerciseThumb name={item.ex.name} size={40} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 700, fontSize: "0.94rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {translateExerciseName(item.ex.name, language)}
        </span>
        <span style={{ display: "block", fontSize: "0.74rem", color: tk.textMuted, marginTop: 2 }}>
          {item.group} · {TYPE_LABEL[item.ex.type] || "Peso + reps"}
          {item.ex.unit === "lastre" ? " (con lastre)" : ""}
          {item.custom && <span style={{ color: tk.accent, fontWeight: 700 }}> · personalizado</span>}
        </span>
      </span>
      <span style={{ width: 30, height: 30, borderRadius: 10, display: "grid", placeItems: "center", background: tk.accentSoft, color: tk.accent, flexShrink: 0 }}>
        <Icon name="plus" size={16} />
      </span>
    </button>
  );

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, backgroundColor: tk.bg, display: "flex", flexDirection: "column", zIndex: 3000, overflow: "hidden", fontFamily: "var(--font-feeg), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}
        role="dialog"
        aria-modal="true"
        aria-label="Elegir ejercicio"
      >
        <div style={{ padding: "14px 16px 10px", display: "flex", flexDirection: "column", gap: 12, borderBottom: `1px solid ${tk.hairline}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {selectedGroup && !q ? (
              <button type="button" onClick={() => setSelectedGroup(null)} aria-label="Volver a los grupos" className="feeg-press" style={iconBtn(tk)}>
                <Icon name="chevronLeft" size={18} />
              </button>
            ) : null}
            <h2 style={{ flex: 1, margin: 0, fontFamily: "inherit", fontSize: "1.25rem", fontWeight: 900, color: tk.text, letterSpacing: "-0.01em" }}>
              {selectedGroup && !q ? selectedGroup : "Añadir ejercicio"}
            </h2>
            <button type="button" onClick={onCancel} aria-label="Cerrar" className="feeg-press" style={iconBtn(tk)}>
              <Icon name="close" size={18} />
            </button>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 12px", height: 44, borderRadius: 14, background: isDark ? "rgba(255,255,255,0.07)" : "#fff" }}>
            <Icon name="search" size={17} color={tk.textFaint} />
            <input
              ref={inputRef}
              type="text"
              enterKeyHint="search"
              placeholder="Buscar en todos los ejercicios…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, minWidth: 0, background: "none", border: "none", outline: "none", color: tk.text, fontSize: "0.95rem", fontFamily: "inherit" }}
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")} aria-label="Borrar búsqueda" style={{ background: "none", border: "none", color: tk.textFaint, cursor: "pointer", display: "flex" }}>
                <Icon name="close" size={15} />
              </button>
            )}
          </label>
        </div>

        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", padding: "6px 16px 32px" }}>
          {q || selectedGroup ? (
            results.length ? (
              <div>
                {q && <div style={{ fontSize: "0.72rem", color: tk.textFaint, fontWeight: 700, padding: "8px 0 2px" }}>{results.length} resultados</div>}
                {results.map(row)}
              </div>
            ) : (
              <div style={{ padding: "40px 12px", textAlign: "center", color: tk.textMuted }}>
                <div style={{ fontWeight: 800, color: tk.text, marginBottom: 6 }}>Ningún ejercicio coincide</div>
                <button type="button" onClick={() => setShowCreateModal(true)} className="feeg-press" style={{ border: "none", background: tk.accentSoft, color: tk.accent, fontWeight: 800, borderRadius: 12, padding: "10px 14px", cursor: "pointer" }}>
                  Crear «{searchQuery.trim() || "nuevo"}» como personalizado
                </button>
              </div>
            )
          ) : (
            <>
              {recents.length > 0 && (
                <section style={{ marginTop: 8 }}>
                  <div style={sectionLabel(tk)}>
                    <Icon name="history" size={13} /> Recientes
                  </div>
                  {recents.map(row)}
                </section>
              )}

              <section style={{ marginTop: 18 }}>
                <div style={sectionLabel(tk)}>
                  <Icon name="grid" size={13} /> Grupos musculares
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginTop: 8 }}>
                  {Object.keys(exercisesList).map((group) => (
                    <button
                      key={group}
                      type="button"
                      onClick={() => setSelectedGroup(group)}
                      className="feeg-press"
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 4px 9px", border: "none", borderRadius: 16, background: isDark ? "rgba(255,255,255,0.045)" : "#fff", color: tk.text, cursor: "pointer", minWidth: 0 }}
                    >
                      <MuscleGroupIcon group={group} isDark={isDark} size={52} />
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group}</span>
                      <span style={{ fontSize: "0.66rem", color: tk.textFaint, fontWeight: 600 }}>
                        {(exercisesList[group]?.length || 0) + (customExercises[group]?.length || 0)}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="feeg-press"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", marginTop: 18, padding: 14, border: "none", borderRadius: 14, background: tk.accentSoft, color: tk.accent, fontWeight: 800, fontSize: "0.9rem", cursor: "pointer" }}
              >
                <Icon name="plus" size={16} /> Crear ejercicio personalizado
              </button>
            </>
          )}
        </div>
      </div>

      {showCreateModal && <CreateCustomExerciseModal onSave={handleCreateCustomExercise} onCancel={() => setShowCreateModal(false)} />}
    </>
  );
}

function iconBtn(tk) {
  return { width: 38, height: 38, borderRadius: 12, border: "none", display: "grid", placeItems: "center", background: tk.hairline, color: tk.text, cursor: "pointer", flexShrink: 0 };
}

function sectionLabel(tk) {
  return { display: "flex", alignItems: "center", gap: 6, fontSize: "0.7rem", fontWeight: 800, color: tk.textFaint, textTransform: "uppercase", letterSpacing: "0.08em", paddingTop: 8 };
}
