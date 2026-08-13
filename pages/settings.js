import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { getTokens } from "../lib/tokens";
import { PageHeader, Card } from "../components/ui";
import SettingsMenuRow from "../components/settings/SettingsMenuRow";

/**
 * Ajustes es un menú de 4 categorías, no de 8 apartados sueltos: Cuenta, Preferencias,
 * Entrenamiento, Sonido y voz. Cada una lleva a su propia ruta bajo `/settings/*`, pero esa ruta
 * NO es otro menú — enseña el contenido de la categoría entera de golpe (ver
 * `components/settings/SettingsSubpage.jsx`), así que tocar una fila aquí es la única navegación
 * que hace falta para llegar a cualquier ajuste: nunca un menú dentro de otro menú.
 */
export default function Settings() {
  const { theme, isMobile, t, authUser, soundEnabled, aiVoiceEnabled } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const rows = [
    { icon: "user", label: "Cuenta", value: authUser ? authUser.email : "No has iniciado sesión", path: "/settings/account" },
    { icon: "smile", label: "Preferencias", value: "Apariencia, idioma y cara del modelo", path: "/settings/preferences" },
    { icon: "barbell", label: "Entrenamiento", value: t("equipment_settings_desc"), path: "/settings/equipment" },
    { icon: "volume2", label: "Sonido y voz", value: `${soundEnabled ? "Sonido activado" : "Sonido desactivado"} · ${aiVoiceEnabled ? "voz activada" : "voz desactivada"}`, path: "/settings/sound" },
  ];

  return (
    <Layout>
      <PageHeader isDark={isDark} isMobile={isMobile} title={t("settings")} />

      <Card isDark={isDark} padding={isMobile ? "sm" : "lg"} style={{ display: "flex", flexDirection: "column" }}>
        {rows.map((row) => (
          <SettingsMenuRow key={row.path} isDark={isDark} icon={row.icon} label={row.label} value={row.value} path={row.path} />
        ))}
      </Card>
    </Layout>
  );
}
