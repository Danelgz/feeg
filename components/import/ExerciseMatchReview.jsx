// components/import/ExerciseMatchReview.jsx
//
// Paso intermedio de la importación (pages/export-data.js): lib/exerciseMatcher.js ya conectó
// automáticamente todo lo que tenía un alias conocido o una coincidencia difusa muy segura — lo
// que llega aquí es solo lo ambiguo o desconocido. Por cada nombre "en bruto" el usuario puede
// confirmar la sugerencia (si la hay), buscar y conectar con otro ejercicio del catálogo
// (reutiliza ExerciseSelector), añadirlo como ejercicio nuevo (reutiliza CreateCustomExerciseModal
// prellenado con el nombre original) u omitirlo — omitir no bloquea la importación, simplemente
// deja ese ejercicio con su nombre/grupo original, igual que se comportaba antes de este feature.
import { useState } from "react";
import { useUser } from "../../context/UserContext";
import { getTokens } from "../../lib/tokens";
import { saveExerciseAlias } from "../../lib/exerciseMatcher";
import { Button, Badge } from "../ui";
import { ExerciseThumb } from "../workout";
import ExerciseSelector from "../ExerciseSelector";
import CreateCustomExerciseModal from "../CreateCustomExerciseModal";

export default function ExerciseMatchReview({ pending, onComplete, onCancel }) {
  const { theme } = useUser();
  const isDark = theme === "dark";
  const tk = getTokens(isDark);

  const [resolutions, setResolutions] = useState({});
  const [connectingFor, setConnectingFor] = useState(null);
  const [addingNewFor, setAddingNewFor] = useState(null);

  const resolvedCount = Object.keys(resolutions).length;
  const total = pending.length;

  const resolveWith = (foreignName, target) => {
    setResolutions((prev) => ({ ...prev, [foreignName]: target }));
    // Solo se recuerda para el futuro cuando se conecta con un ejercicio real — "omitir" no debe
    // aprenderse, o el usuario que omite por prisa se quedaría sin poder resolverlo más adelante.
    if (target) saveExerciseAlias(foreignName, target);
  };

  const handleSelectFromCatalog = (exercise) => {
    resolveWith(connectingFor, { name: exercise.name, group: exercise.muscleGroup || exercise.group });
    setConnectingFor(null);
  };

  const handleAddNew = (customExercise) => {
    // Igual que ExerciseSelector.handleCreateCustomExercise: sin esto, el ejercicio solo serviría
    // para resolver esta importación y no aparecería después al añadir ejercicios a una rutina.
    try {
      const saved = JSON.parse(localStorage.getItem("customExercises") || "{}");
      const group = customExercise.muscleGroup;
      saved[group] = [...(saved[group] || []), customExercise];
      localStorage.setItem("customExercises", JSON.stringify(saved));
    } catch (e) {
      console.error("Error guardando ejercicio personalizado", e);
    }
    resolveWith(addingNewFor, { name: customExercise.name, group: customExercise.muscleGroup });
    setAddingNewFor(null);
  };

  const handleFinish = () => {
    onComplete(resolutions);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: isDark ? "#0a0a0a" : "#f5f5f5",
        zIndex: 950,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "20px",
          borderBottom: `1px solid ${tk.border}`,
          backgroundColor: tk.surface,
        }}
      >
        <h2 style={{ margin: 0, fontSize: "1.2rem", color: tk.text }}>Conecta tus ejercicios</h2>
        <p style={{ margin: "6px 0 0", color: tk.textMuted, fontSize: "0.9rem", lineHeight: 1.5 }}>
          {total} ejercicio{total !== 1 ? "s" : ""} de tu importación no coincide claramente con el catálogo de
          FEEG. Conéctalo con uno existente, añádelo como nuevo, u omítelo para importarlo con su nombre original
          ({resolvedCount}/{total} resueltos).
        </p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          {pending.map(({ foreignName, suggestion, occurrences }) => {
            const resolution = resolutions[foreignName];
            const isSkipped = resolution === null;
            const isResolved = resolution !== undefined;

            return (
              <div
                key={foreignName}
                style={{
                  padding: "16px",
                  borderRadius: tk.radius.md,
                  border: `1.5px solid ${isResolved && !isSkipped ? tk.accent : tk.border}`,
                  backgroundColor: tk.surface,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: tk.text }}>{foreignName}</div>
                    {occurrences > 0 && (
                      <div style={{ fontSize: "0.78rem", color: tk.textFaint, marginTop: "2px" }}>
                        {occurrences} serie{occurrences !== 1 ? "s" : ""} en tu importación
                      </div>
                    )}
                  </div>
                  {isResolved && (
                    <Badge isDark={isDark} variant={isSkipped ? "neutral" : "accent"}>
                      {isSkipped ? "Se importará tal cual" : "Conectado"}
                    </Badge>
                  )}
                </div>

                {isResolved && !isSkipped && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}>
                    <ExerciseThumb name={resolution.name} size={32} />
                    <span style={{ color: tk.text, fontWeight: 500 }}>{resolution.name}</span>
                  </div>
                )}

                {!isResolved && suggestion && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      flexWrap: "wrap",
                      marginTop: "12px",
                      padding: "10px 12px",
                      borderRadius: tk.radius.sm,
                      backgroundColor: tk.accentSoft,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <ExerciseThumb name={suggestion.name} size={30} />
                      <span style={{ color: tk.text, fontSize: "0.9rem" }}>
                        ¿Es <strong>{suggestion.name}</strong>?
                      </span>
                    </div>
                    <Button
                      isDark={isDark}
                      size="sm"
                      onClick={() => resolveWith(foreignName, { name: suggestion.name, group: suggestion.group })}
                    >
                      Sí, es este
                    </Button>
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px", marginTop: "12px", flexWrap: "wrap" }}>
                  <Button isDark={isDark} variant="secondary" size="sm" onClick={() => setConnectingFor(foreignName)}>
                    {isResolved && !isSkipped ? "Cambiar" : "Conectar con otro"}
                  </Button>
                  <Button isDark={isDark} variant="secondary" size="sm" onClick={() => setAddingNewFor(foreignName)}>
                    Añadir como nuevo
                  </Button>
                  {!isSkipped && (
                    <Button isDark={isDark} variant="ghost" size="sm" onClick={() => resolveWith(foreignName, null)}>
                      Omitir
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          padding: "16px 20px",
          borderTop: `1px solid ${tk.border}`,
          backgroundColor: tk.surface,
          display: "flex",
          justifyContent: "center",
          gap: "12px",
        }}
      >
        <Button isDark={isDark} variant="secondary" onClick={onCancel}>
          Cancelar importación
        </Button>
        <Button isDark={isDark} icon="check" onClick={handleFinish}>
          Continuar importación
        </Button>
      </div>

      {connectingFor && (
        <ExerciseSelector onSelectExercise={handleSelectFromCatalog} onCancel={() => setConnectingFor(null)} />
      )}

      {addingNewFor && (
        <CreateCustomExerciseModal
          initialName={addingNewFor}
          onSave={handleAddNew}
          onCancel={() => setAddingNewFor(null)}
        />
      )}
    </div>
  );
}
