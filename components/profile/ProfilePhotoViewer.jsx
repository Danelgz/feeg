/** Visor de foto de perfil a pantalla completa. */
export default function ProfilePhotoViewer({ open, photoURL, onClose }) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center",
        justifyContent: "center", zIndex: 5000, padding: "20px", cursor: "pointer",
      }}
    >
      <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{ position: "absolute", top: "-40px", right: "0", background: "none", border: "none", color: "#fff", fontSize: "2rem", cursor: "pointer" }}
        >
          &times;
        </button>
        <img src={photoURL || "/logo2.png"} alt="Profile Full" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "10px" }} />
      </div>
    </div>
  );
}
