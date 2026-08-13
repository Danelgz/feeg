import { useState } from "react";
import { useUser } from "../../context/UserContext";
import { getTokens } from "../../lib/tokens";
import { Button, Icon } from "../../components/ui";
import SettingsSubpage from "../../components/settings/SettingsSubpage";
import RegisterForm from "../../components/RegisterForm";

export default function SettingsProfile() {
  const { theme, isMobile, user, saveUser, authUser, showNotification } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const [showInterview, setShowInterview] = useState(false);

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
    <SettingsSubpage isDark={isDark} isMobile={isMobile} title="Perfil y objetivo">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "14px", padding: isMobile ? "20px 8px" : "32px 20px" }}>
        <div style={{
          width: "56px",
          height: "56px",
          borderRadius: tk.radius.full,
          backgroundColor: tk.accentSoft,
          color: tk.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Icon name="edit" size={24} />
        </div>

        <div>
          <div style={{ color: tk.text, fontSize: "1.15rem", fontWeight: 700 }}>¿Te confundiste en algo?</div>
          <div style={{ color: tk.textMuted, fontSize: "0.9rem", marginTop: "6px", maxWidth: "360px", lineHeight: 1.5 }}>
            Repite la entrevista inicial (nombre, usuario, sexo, peso, altura y objetivo) con lo que ya
            respondiste precargado, y corrige sólo lo que haga falta.
          </div>
        </div>

        <Button isDark={isDark} onClick={() => setShowInterview(true)} style={{ marginTop: "6px" }}>
          Repetir entrevista
        </Button>
      </div>
    </SettingsSubpage>
  );
}
