import { useState } from "react";
import { useUser } from "../../context/UserContext";
import { getTokens } from "../../lib/tokens";
import { Button, Icon } from "../../components/ui";
import SettingsSubpage from "../../components/settings/SettingsSubpage";
import RegisterForm from "../../components/RegisterForm";

/**
 * Cuenta y Perfil comparten página: son las dos caras del "quién eres" en Ajustes (sesión de
 * Google, y las respuestas de la entrevista inicial), y separarlas en dos toques para algo que se
 * mira junto no compensa el ahorro de espacio en un menú ya de por sí corto.
 */
export default function SettingsAccount() {
  const { theme, isMobile, t, authUser, loginWithGoogle, user, saveUser, showNotification } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const [showInterview, setShowInterview] = useState(false);

  const handleSwitchAccount = async () => {
    // Ojo: signInWithPopup tiene que lanzarse de forma síncrona dentro del gesto del click
    // para que el navegador no lo bloquee — sobre todo en móvil, mucho más estricto que
    // escritorio con esto. No hace falta cerrar sesión antes: signInWithPopup con
    // prompt: 'select_account' ya fuerza el selector y sustituye la cuenta activa al elegir
    // una distinta.
    await loginWithGoogle();
  };

  // Repetir la entrevista fusiona sus respuestas SOBRE el perfil actual, no lo reemplaza: `RegisterForm`
  // sólo conoce nombre/apellidos/usuario/sexo/peso/altura/objetivo, y machacar el resto (cara del
  // mapa muscular, modo de mancuernas/polea...) sería borrar ajustes que no tienen nada que ver con
  // lo que se acaba de contestar. `registeredAt` tampoco se toca: es la fecha del alta real, no de
  // esta edición.
  const handleRedoInterview = (data) => {
    const { registeredAt: _ignored, ...answers } = data;
    saveUser({
      ...(user || {}),
      ...answers,
      email: authUser?.email || user?.email || null,
      uid: authUser?.uid || user?.uid,
      photoURL: user?.photoURL || authUser?.photoURL || null,
    });
    setShowInterview(false);
    showNotification("Perfil actualizado", "success");
  };

  if (showInterview) {
    return (
      <SettingsSubpage isDark={isDark} isMobile={isMobile} title="Repetir la entrevista">
        <RegisterForm
          title="Repite la entrevista"
          submitLabel="Guardar cambios"
          onCancel={() => setShowInterview(false)}
          onRegister={handleRedoInterview}
          initialData={{
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            username: user?.username || '',
            sex: user?.sex ?? null,
            weightValue: user?.weight ?? 70,
            weightUnit: user?.weightUnit || 'kg',
            heightValue: user?.height ?? 170,
            heightUnit: user?.heightUnit || 'cm',
            goal: user?.goal || '',
          }}
        />
      </SettingsSubpage>
    );
  }

  return (
    <SettingsSubpage isDark={isDark} isMobile={isMobile} title="Cuenta">
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <span style={{ color: tk.text, fontSize: "1.1rem", fontWeight: 600 }}>{t("google_account")}</span>
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

      {user && (
        <>
          <div style={{ height: "1px", backgroundColor: tk.border }} />

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "14px", padding: isMobile ? "16px 8px" : "24px 20px" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: tk.radius.full,
              backgroundColor: tk.accentSoft,
              color: tk.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <Icon name="edit" size={20} />
            </div>

            <div>
              <div style={{ color: tk.text, fontSize: "1.05rem", fontWeight: 700 }}>¿Te confundiste en algo del perfil?</div>
              <div style={{ color: tk.textMuted, fontSize: "0.85rem", marginTop: "6px", maxWidth: "360px", lineHeight: 1.5 }}>
                Repite la entrevista inicial (nombre, usuario, sexo, peso, altura y objetivo) con lo
                que ya respondiste precargado, y corrige sólo lo que haga falta.
              </div>
            </div>

            <Button isDark={isDark} variant="secondary" size="sm" onClick={() => setShowInterview(true)}>
              Repetir entrevista
            </Button>
          </div>
        </>
      )}
    </SettingsSubpage>
  );
}
