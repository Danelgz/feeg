/** Pantalla de perfil cuando no hay sesión iniciada: opciones de login/registro con Google. */
export default function ProfileLoginPrompt({ isDark, isMobile, t, loginWithGoogle, isLoggingIn }) {
  return (
    <div style={{ padding: isMobile ? "0" : "20px", display: "flex", flexDirection: "column", gap: "20px", maxWidth: 500 }}>
      <h1 style={{ fontSize: isMobile ? "1.8rem" : "2rem", marginBottom: "0.5rem", color: isDark ? "#fff" : "#333" }}>{t("profile_title")}</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <button
          onClick={loginWithGoogle}
          disabled={isLoggingIn}
          style={{
            padding: "14px 16px",
            backgroundColor: isLoggingIn ? "#19b088" : "#1dd1a1",
            color: "#000",
            border: "none",
            borderRadius: 10,
            cursor: isLoggingIn ? "default" : "pointer",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transition: "all 0.2s ease",
            opacity: isLoggingIn ? 0.7 : 1,
          }}
          onMouseOver={(e) => !isLoggingIn && (e.currentTarget.style.backgroundColor = "#19b088")}
          onMouseOut={(e) => !isLoggingIn && (e.currentTarget.style.backgroundColor = "#1dd1a1")}
        >
          <img src="/logo2.png" alt="G" width={20} height={20} />
          {isLoggingIn ? "Cargando..." : "Iniciar Sesión con Google"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "10px 0" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: isDark ? "#333" : "#ddd" }} />
          <span style={{ fontSize: "0.8rem", color: isDark ? "#666" : "#999" }}>O</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: isDark ? "#333" : "#ddd" }} />
        </div>

        <button
          onClick={loginWithGoogle}
          style={{
            padding: "12px 16px",
            backgroundColor: "transparent",
            color: isDark ? "#fff" : "#333",
            border: `2px solid ${isDark ? "#333" : "#ddd"}`,
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transition: "all 0.2s ease",
          }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = "#1dd1a1")}
          onMouseOut={(e) => (e.currentTarget.style.borderColor = isDark ? "#333" : "#ddd")}
        >
          Registrarse con Google
        </button>
      </div>

      <p style={{ fontSize: "0.85rem", color: isDark ? "#888" : "#666", textAlign: "center" }}>
        Si ya tienes una cuenta, tus datos se sincronizarán automáticamente.
      </p>
    </div>
  );
}
