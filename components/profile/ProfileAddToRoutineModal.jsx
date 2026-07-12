/** Modal para crear una rutina nueva a partir de un entrenamiento completado. */
export default function ProfileAddToRoutineModal({ open, routineName, onChangeRoutineName, onConfirm, onClose }) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 3500, padding: "20px",
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "#1a1a1a", padding: "25px", borderRadius: "15px", width: "100%", maxWidth: "400px", textAlign: "center", border: "1px solid #333" }}>
        <h2 style={{ color: "#fff", marginBottom: "15px" }}>Crear Rutina desde Entrenamiento</h2>
        <p style={{ color: "#888", marginBottom: "20px", fontSize: "0.9rem" }}>Ingresa un nombre para la nueva rutina</p>
        <input
          type="text"
          placeholder="Nombre de la rutina"
          value={routineName}
          onChange={(e) => onChangeRoutineName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") onConfirm();
          }}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #333",
            backgroundColor: "#000",
            color: "#fff",
            marginBottom: "20px",
            fontSize: "1rem",
            boxSizing: "border-box",
          }}
          autoFocus
        />
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #333", backgroundColor: "transparent", color: "#fff", cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#1dd1a1", color: "#000", fontWeight: "bold", cursor: "pointer" }}>
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}
