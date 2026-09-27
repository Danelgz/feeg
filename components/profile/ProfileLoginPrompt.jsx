import { getTokens } from "../../lib/tokens";
import { Icon } from "../ui";

const PERKS = [
  { icon: "globe", title: "Tus datos en todos tus dispositivos", text: "Entrenos, rutinas y medidas sincronizados en la nube." },
  { icon: "users", title: "Entrena con tus amigos", text: "Sigue a otros, mira sus entrenos y sus fotos." },
  { icon: "sparkles", title: "Coach con IA", text: "Rutinas a medida y respuestas sobre tu progreso." },
  { icon: "trophy", title: "Rangos y récords", text: "Compárate por grupo muscular y celebra cada PR." },
];

/**
 * Perfil sin sesión. Antes había dos botones ("Iniciar sesión" y "Registrarse") que hacían
 * exactamente lo mismo; con Google entrar y registrarse son el mismo paso, así que hay uno solo y
 * el espacio se usa para contar qué se gana con la cuenta.
 */
export default function ProfileLoginPrompt({ isDark, isMobile, t, loginWithGoogle, isLoggingIn }) {
  const tk = getTokens(isDark);

  return (
    <div style={{ padding: isMobile ? "0" : "20px", display: "flex", flexDirection: "column", maxWidth: 500 }}>
      <h1 style={{ fontSize: isMobile ? "1.8rem" : "2rem", margin: "0 0 18px", color: tk.text, fontWeight: 900, letterSpacing: "-0.02em" }}>{t("profile_title")}</h1>

      <div
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 24,
          padding: "26px 20px 20px",
          background: isDark
            ? "radial-gradient(120% 90% at 100% 0%, rgba(29,209,161,0.22) 0%, rgba(29,209,161,0) 60%), rgba(255,255,255,0.045)"
            : "radial-gradient(120% 90% at 100% 0%, rgba(29,209,161,0.2) 0%, rgba(29,209,161,0) 60%), #fff",
          boxShadow: isDark ? "none" : tk.shadow.card,
        }}
      >
        <img src="/logo2.png" alt="FEEG" height={44} style={{ display: "block", width: "auto", filter: isDark ? "invert(1)" : "none" }} />
        <div style={{ marginTop: 14, fontSize: "1.45rem", fontWeight: 900, color: tk.text, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
          Guarda tu progreso.
          <br />
          <span style={{ color: tk.accent }}>Entrena en compañía.</span>
        </div>
        <p style={{ margin: "8px 0 20px", color: tk.textMuted, fontSize: "0.9rem", lineHeight: 1.45 }}>
          Gratis. Con tu cuenta de Google entras o te registras en un toque.
        </p>

        <button
          type="button"
          onClick={loginWithGoogle}
          disabled={isLoggingIn}
          className="feeg-press"
          style={{
            width: "100%",
            height: 52,
            border: "none",
            borderRadius: 16,
            background: tk.accent,
            color: tk.onAccent,
            fontWeight: 800,
            fontSize: "0.98rem",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            cursor: isLoggingIn ? "default" : "pointer",
            opacity: isLoggingIn ? 0.7 : 1,
            boxShadow: "0 10px 26px rgba(29,209,161,0.3)",
          }}
        >
          <span style={{ width: 26, height: 26, borderRadius: 99, background: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <GoogleG />
          </span>
          {isLoggingIn ? "Conectando…" : "Continuar con Google"}
        </button>
      </div>

      <div style={{ marginTop: 22 }}>
        {PERKS.map((p, i) => (
          <div key={p.title} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 2px", borderTop: i ? `1px solid ${tk.hairline}` : "none" }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: tk.accentSoft, color: tk.accent, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon name={p.icon} size={18} />
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontWeight: 800, color: tk.text, fontSize: "0.92rem" }}>{p.title}</span>
              <span style={{ display: "block", color: tk.textMuted, fontSize: "0.8rem", marginTop: 2 }}>{p.text}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
