import { getTokens } from "../../lib/tokens";

/** Modal de edición de perfil: foto, usuario, nombre y descripción. */
export default function ProfileEditModal({ isDark = true, open, editData, setEditData, isProcessingImage, saving, onFileSelected, onSave, onClose }) {
  const tk = getTokens(isDark);
  if (!open) return null;

  const inputStyle = { width: "100%", padding: "12px 15px", borderRadius: "12px", border: `1px solid ${tk.border}`, backgroundColor: tk.surfaceAlt, color: tk.text, outline: "none" };
  const labelStyle = { color: tk.textMuted, fontSize: "0.8rem", fontWeight: "600" };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 2000, padding: "20px",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: tk.surface,
          padding: "30px",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "400px",
          border: `1px solid ${tk.border}`,
          boxShadow: tk.shadow.float,
          position: "relative",
        }}
      >
        <h2 style={{ color: tk.text, marginBottom: "25px", textAlign: "center", fontSize: "1.4rem", fontWeight: "800" }}>Editar Perfil</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", width: "100%" }}>
            <div style={{ position: "relative" }}>
              <div
                style={{
                  width: "150px",
                  height: "150px",
                  borderRadius: "50%",
                  backgroundColor: "transparent",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {isProcessingImage ? (
                  <div style={{ color: tk.accent, fontSize: "0.8rem", fontWeight: "bold" }}>Subiendo...</div>
                ) : editData.photoURL ? (
                  <img src={editData.photoURL} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "3rem" }}>👤</span>
                )}
              </div>

              <label
                style={{
                  position: "absolute",
                  bottom: "5px",
                  right: "5px",
                  backgroundColor: tk.accent,
                  color: tk.onAccent,
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `3px solid ${tk.surface}`,
                  zIndex: 10,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  disabled={isProcessingImage}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) onFileSelected(file);
                  }}
                />
              </label>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={labelStyle}>URL de la foto (opcional)</label>
            <input
              value={editData.photoURL?.startsWith("blob:") ? "" : editData.photoURL}
              onChange={(e) => setEditData({ ...editData, photoURL: e.target.value, photoScale: 1, photoPosX: 0, photoPosY: 0 })}
              placeholder="https://ejemplo.com/mi-foto.png"
              style={{ ...inputStyle, fontSize: "0.85rem" }}
            />
            <span style={{ fontSize: "0.7rem", color: tk.textFaint }}>O selecciona una foto arriba para subirla automáticamente</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={labelStyle}>Usuario</label>
            <input
              value={editData.username}
              onChange={(e) => setEditData({ ...editData, username: e.target.value })}
              placeholder="Usuario"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={labelStyle}>Nombre</label>
            <input
              value={editData.firstName}
              onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
              placeholder="Nombre"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={labelStyle}>Descripción</label>
            <textarea
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              placeholder="Descripción"
              style={{ ...inputStyle, minHeight: "80px", resize: "none" }}
            />
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "10px" }}>
            <button
              onClick={onClose}
              disabled={saving}
              style={{ flex: 1, padding: "14px", borderRadius: "12px", border: `1px solid ${tk.border}`, backgroundColor: "transparent", color: tk.text, fontWeight: "600", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              style={{
                flex: 2,
                padding: "14px",
                borderRadius: "12px",
                border: "none",
                backgroundColor: tk.accent,
                color: tk.onAccent,
                fontWeight: "800",
                cursor: saving ? "default" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
