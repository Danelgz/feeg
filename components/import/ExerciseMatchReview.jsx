import { useState } from "react";
import { useUser } from "../../context/UserContext";
import { getTokens } from "../../lib/tokens";
import { saveExerciseAlias } from "../../lib/exerciseMatcher";
import { Button, Badge } from "../ui";
import { ExerciseThumb } from "../workout";
import ExerciseSelector from "../ExerciseSelector";
import CreateCustomExerciseModal from "../CreateCustomExerciseModal";

/** Revisión de coincidencias del importador, diseñada primero para pantallas táctiles. */
export default function ExerciseMatchReview({ pending, onComplete, onCancel }) {
  const { theme } = useUser();
  const isDark = theme === "dark";
  const tk = getTokens(isDark);
  const [resolutions, setResolutions] = useState({});
  const [connectingFor, setConnectingFor] = useState(null);
  const [addingNewFor, setAddingNewFor] = useState(null);

  const items = Array.isArray(pending) ? pending.filter((item) => item?.foreignName) : [];
  // Las conexiones automáticas también pasan por esta pantalla ya confirmadas. Así el usuario
  // tiene una única revisión obligatoria y puede corregir una elección antes de guardar el CSV.
  const initialResolutions = Object.fromEntries(
    items
      .filter((item) => item.resolution)
      .map((item) => [item.foreignName, item.resolution])
  );
  const effectiveResolutions = { ...initialResolutions, ...resolutions };
  const total = items.length;
  const resolvedCount = items.filter(({ foreignName }) => Boolean(effectiveResolutions[foreignName])).length;
  const allResolved = total > 0 && resolvedCount === total;
  const remaining = total - resolvedCount;
  const remainingLabel = remaining === 1 ? "conexión" : "conexiones";

  const resolveWith = (foreignName, target) => {
    if (!foreignName || !target) return;
    setResolutions((prev) => ({ ...prev, [foreignName]: target }));
    saveExerciseAlias(foreignName, target);
  };

  const handleSelectFromCatalog = (exercise) => {
    resolveWith(connectingFor, { name: exercise.name, group: exercise.muscleGroup || exercise.group });
    setConnectingFor(null);
  };

  const handleAddNew = (customExercise) => {
    try {
      const saved = JSON.parse(localStorage.getItem("customExercises") || "{}");
      const group = customExercise.muscleGroup;
      saved[group] = [...(saved[group] || []), customExercise];
      localStorage.setItem("customExercises", JSON.stringify(saved));
    } catch (error) {
      console.error("Error guardando ejercicio personalizado", error);
    }
    resolveWith(addingNewFor, { name: customExercise.name, group: customExercise.muscleGroup });
    setAddingNewFor(null);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        height: "100dvh",
        maxHeight: "100dvh",
        boxSizing: "border-box",
        backgroundColor: isDark ? "#0a0a0a" : "#f5f5f5",
        zIndex: 2800,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header style={{ flexShrink: 0, padding: "16px 20px", borderBottom: `1px solid ${tk.border}`, backgroundColor: tk.surface }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: "1.2rem", color: tk.text }}>Conecta tus ejercicios</h2>
            <div style={{ color: tk.accent, fontSize: "0.78rem", fontWeight: 700, marginTop: "8px" }}>
              {resolvedCount} de {total} confirmados
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar revisión de ejercicios"
            onClick={onCancel}
            style={{ flexShrink: 0, width: 36, height: 36, borderRadius: "50%", border: `1px solid ${tk.border}`, background: tk.surfaceAlt, color: tk.textMuted, fontSize: "1.2rem", cursor: "pointer" }}
          >
            ×
          </button>
        </div>
        <p style={{ margin: "6px 0 0", color: tk.textMuted, fontSize: "0.9rem", lineHeight: 1.5 }}>
          Confirma la propuesta, conecta con otro ejercicio o créalo como nuevo antes de importar.
        </p>
      </header>

      <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", padding: "16px 20px 28px" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          {items.map(({ foreignName, suggestion, occurrences }) => {
            const resolution = effectiveResolutions[foreignName];
            const isResolved = Boolean(resolution);
            const suggestionTarget = suggestion ? { name: suggestion.name, group: suggestion.group } : null;

            return (
              <article key={foreignName} style={{ padding: "16px", borderRadius: tk.radius.md, border: `1.5px solid ${isResolved ? tk.accent : tk.border}`, backgroundColor: tk.surface }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: tk.text, overflowWrap: "anywhere" }}>{foreignName}</div>
                    {occurrences > 0 && <div style={{ fontSize: "0.78rem", color: tk.textFaint, marginTop: "3px" }}>{occurrences} serie{occurrences !== 1 ? "s" : ""} en tu importación</div>}
                  </div>
                  {isResolved && <Badge isDark={isDark} variant="accent">Conectado</Badge>}
                </div>

                {isResolved && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}>
                    <ExerciseThumb name={resolution.name} size={32} />
                    <span style={{ color: tk.text, fontWeight: 500, overflowWrap: "anywhere" }}>{resolution.name}</span>
                  </div>
                )}

                {!isResolved && suggestionTarget && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "10px", marginTop: "12px", padding: "12px", borderRadius: tk.radius.sm, backgroundColor: tk.accentSoft }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <ExerciseThumb name={suggestionTarget.name} size={30} />
                      <span style={{ color: tk.text, fontSize: "0.9rem", lineHeight: 1.35 }}>FEEG propone <strong>{suggestionTarget.name}</strong></span>
                    </div>
                    <Button isDark={isDark} size="md" fullWidth icon="check" onClick={() => resolveWith(foreignName, suggestionTarget)}>
                      Confirmar esta conexión
                    </Button>
                  </div>
                )}

                {!isResolved && !suggestionTarget && (
                  <div style={{ marginTop: "12px", padding: "12px", borderRadius: tk.radius.sm, background: tk.surfaceAlt, color: tk.textMuted, fontSize: "0.82rem", lineHeight: 1.4 }}>
                    No hemos encontrado una coincidencia segura. Busca el ejercicio en el catálogo o créalo como nuevo.
                  </div>
                )}

                <div className="exercise-match-actions" style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                  <Button isDark={isDark} variant="secondary" size="sm" onClick={() => setConnectingFor(foreignName)}>{isResolved ? "Cambiar" : "Conectar con otro"}</Button>
                  <Button isDark={isDark} variant="secondary" size="sm" onClick={() => setAddingNewFor(foreignName)}>Añadir como nuevo</Button>
                </div>
              </article>
            );
          })}
          {items.length === 0 && <div style={{ padding: "24px", textAlign: "center", color: tk.textMuted }}>No hay ejercicios pendientes de revisar.</div>}
        </div>
      </div>

      <footer style={{ flexShrink: 0, padding: "12px 20px", paddingBottom: "calc(12px + env(safe-area-inset-bottom))", borderTop: `1px solid ${tk.border}`, backgroundColor: tk.surface, display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "10px", position: "sticky", bottom: 0, zIndex: 1, boxSizing: "border-box", boxShadow: "0 -10px 30px rgba(0,0,0,0.18)" }}>
        <Button isDark={isDark} variant="secondary" onClick={onCancel} style={{ flex: "1 1 140px", minWidth: 0 }}>Cancelar</Button>
        <Button isDark={isDark} icon="check" onClick={() => onComplete(effectiveResolutions)} disabled={!allResolved} style={{ flex: "1 1 180px", minWidth: 0 }}>
          {allResolved ? "Confirmar conexiones" : `Confirma ${remaining} ${remainingLabel}`}
        </Button>
      </footer>

      <style>{`
        @media (max-width: 520px) {
          .exercise-match-actions > button { flex: 1 1 100%; min-height: 42px; }
        }
      `}</style>

      {connectingFor && <ExerciseSelector onSelectExercise={handleSelectFromCatalog} onCancel={() => setConnectingFor(null)} />}
      {addingNewFor && <CreateCustomExerciseModal initialName={addingNewFor} onSave={handleAddNew} onCancel={() => setAddingNewFor(null)} />}
    </div>
  );
}
