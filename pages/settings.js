import { useEffect } from "react";
import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { getTokens } from "../lib/tokens";
import { Icon, Button, Card, PageHeader } from "../components/ui";

export default function Settings() {
  const { theme, themePreference, setThemeMode, isMobile, language, updateLanguage, t, authUser, loginWithGoogle, logout, refreshData } = useUser();

  // Forzar refresco de datos al entrar a ajustes
  useEffect(() => {
    if (authUser) {
      refreshData();
    }
  }, [authUser]);

  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const languages = [
    { code: 'es', name: 'Español' },
    { code: 'eu', name: 'Euskera' }
  ];

  const themeOptions = [
    { key: 'light', label: t("light_mode"), icon: 'sun' },
    { key: 'dark', label: t("dark_mode"), icon: 'moon' },
    { key: 'system', label: 'Sistema', icon: 'monitor' }
  ];

  const handleSwitchAccount = async () => {
    await logout();
    await loginWithGoogle();
  };

  return (
    <Layout>
      <PageHeader isDark={isDark} isMobile={isMobile} title={t("settings")} />

      <Card isDark={isDark} padding={isMobile ? "sm" : "lg"} style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
        {/* Apartado de Cuenta */}
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <span style={{ color: tk.accent, fontSize: "1.1rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name="user" size={18} />
            {t("google_account")}
          </span>

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
        </div>

        <div style={{ height: "1px", backgroundColor: tk.border }} />

        {/* Apartado de Tema */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <span style={{ color: tk.text, fontSize: "1.1rem", fontWeight: 600 }}>
            Apariencia
          </span>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {themeOptions.map((opt) => {
              const active = themePreference === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setThemeMode(opt.key)}
                  style={{
                    flex: isMobile ? "1 1 auto" : "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "12px 18px",
                    borderRadius: tk.radius.md,
                    border: `1.5px solid ${active ? tk.accent : tk.border}`,
                    backgroundColor: active ? tk.accentSoft : "transparent",
                    color: active ? tk.accent : tk.text,
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    transition: tk.transition,
                    minWidth: isMobile ? undefined : "120px"
                  }}
                >
                  <Icon name={opt.icon} size={17} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ height: "1px", backgroundColor: tk.border }} />

        {/* Apartado de Idioma */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? "15px" : "0"
        }}>
          <span style={{ color: tk.text, fontSize: "1.1rem" }}>
            {t("language")}
          </span>
          <select
            value={language}
            onChange={(e) => updateLanguage(e.target.value)}
            style={{
              padding: "10px 16px",
              backgroundColor: tk.surfaceAlt,
              color: tk.text,
              border: `1.5px solid ${tk.border}`,
              borderRadius: tk.radius.sm,
              cursor: "pointer",
              fontSize: "1rem",
              width: isMobile ? "100%" : "200px",
              outline: "none",
              transition: tk.transition
            }}
            onFocus={(e) => e.target.style.borderColor = tk.accent}
            onBlur={(e) => e.target.style.borderColor = tk.border}
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </Card>
    </Layout>
  );
}
