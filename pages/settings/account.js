import { useUser } from "../../context/UserContext";
import { getTokens } from "../../lib/tokens";
import { Button } from "../../components/ui";
import SettingsSubpage from "../../components/settings/SettingsSubpage";

export default function SettingsAccount() {
  const { theme, isMobile, t, authUser, loginWithGoogle } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const handleSwitchAccount = async () => {
    // Ojo: signInWithPopup tiene que lanzarse de forma síncrona dentro del gesto del click
    // para que el navegador no lo bloquee — sobre todo en móvil, mucho más estricto que
    // escritorio con esto. No hace falta cerrar sesión antes: signInWithPopup con
    // prompt: 'select_account' ya fuerza el selector y sustituye la cuenta activa al elegir
    // una distinta.
    await loginWithGoogle();
  };

  return (
    <SettingsSubpage isDark={isDark} isMobile={isMobile} title={t("google_account")}>
      {authUser ? (
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          gap: "15px",
          backgroundColor: tk.surfaceAlt,
          padding: "15px",
          borderRadius: tk.radius.md,
          border: `1px solid ${tk.border}`
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "45px", height: "45px", borderRadius: tk.radius.full, overflow: "hidden", border: `2px solid ${tk.accent}`, backgroundColor: tk.surfaceHover }}>
              {authUser.photoURL ? (
                <img src={authUser.photoURL} alt="pfp" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: tk.textMuted, fontSize: "0.7rem" }}>
                  {t("no_pfp")}
                </div>
              )}
            </div>
            <div>
              <div style={{ color: tk.text, fontWeight: "600" }}>{authUser.displayName || "Usuario"}</div>
              <div style={{ color: tk.textMuted, fontSize: "0.85rem" }}>{authUser.email}</div>
            </div>
          </div>
          <Button isDark={isDark} variant="secondary" size="sm" fullWidth={isMobile} onClick={handleSwitchAccount}>
            {t("change_account")}
          </Button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "12px" }}>
          <Button isDark={isDark} fullWidth onClick={loginWithGoogle}>
            {t("login_google")}
          </Button>
          <Button isDark={isDark} variant="secondary" fullWidth onClick={loginWithGoogle}>
            {t("register")}
          </Button>
        </div>
      )}
    </SettingsSubpage>
  );
}
