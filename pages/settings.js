import Layout from "../components/Layout";
import { useUser } from "../context/UserContext";
import { getTokens } from "../lib/tokens";
import { PageHeader, Card } from "../components/ui";
import SettingsMenuRow from "../components/settings/SettingsMenuRow";
import { FACE_STYLES, DEFAULT_FACE_STYLE_ID } from "../data/faceStyles";

const THEME_LABELS = { light: "Claro", dark: "Oscuro", system: "Sistema" };
const LANGUAGE_LABELS = { es: "Español", eu: "Euskera" };

/**
 * Ajustes era una única tarjeta con los ocho apartados uno detrás de otro: cómodo de construir,
 * pero para tocar el último había que scrollear por los siete anteriores. Ahora es un menú — cada
 * fila lleva a su propia ruta bajo `/settings/*` (ver `components/settings/SettingsSubpage.jsx`),
 * agrupadas por lo que de verdad se busca cuando se abre cada una: quién eres, cómo se ve la app,
 * cómo se comporta durante el entreno, cómo suena.
 */
export default function Settings() {
  const { theme, isMobile, t, authUser, themePreference, language, soundEnabled, aiVoiceEnabled, user } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const faceStyleName = FACE_STYLES.find((s) => s.id === (user?.faceStyle || DEFAULT_FACE_STYLE_ID))?.name;

  const groups = [
    {
      title: "Cuenta",
      rows: [
        { icon: "user", label: t("google_account"), value: authUser ? authUser.email : "No has iniciado sesión", path: "/settings/account" },
        ...(user ? [{ icon: "trendUp", label: "Perfil y objetivo", value: user?.goal || "Peso, altura y objetivo", path: "/settings/profile" }] : []),
      ],
    },
    {
      title: "Preferencias",
      rows: [
        { icon: "monitor", label: "Apariencia", value: THEME_LABELS[themePreference] || THEME_LABELS.system, path: "/settings/appearance" },
        { icon: "globe", label: t("language"), value: LANGUAGE_LABELS[language] || LANGUAGE_LABELS.es, path: "/settings/language" },
        { icon: "smile", label: "Cara del modelo", value: faceStyleName, path: "/settings/face" },
      ],
    },
    {
      title: "Entrenamiento",
      rows: [
        { icon: "barbell", label: t("equipment_settings_title"), value: t("equipment_settings_desc"), path: "/settings/equipment" },
      ],
    },
    {
      title: "Sonido y voz",
      rows: [
        { icon: "volume2", label: t("sound_pr_label"), value: soundEnabled ? "Activado" : "Desactivado", path: "/settings/sound" },
        { icon: "mic", label: t("ai_voice_section_title"), value: aiVoiceEnabled ? "Activada" : "Desactivada", path: "/settings/ai-voice" },
      ],
    },
  ];

  return (
    <Layout>
      <PageHeader isDark={isDark} isMobile={isMobile} title={t("settings")} />

      <Card isDark={isDark} padding={isMobile ? "sm" : "lg"} style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
        {groups.map((group) => (
          <div key={group.title} style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: tk.textMuted, fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
              {group.title}
            </span>
            {group.rows.map((row) => (
              <SettingsMenuRow key={row.path} isDark={isDark} icon={row.icon} label={row.label} value={row.value} path={row.path} />
            ))}
          </div>
        ))}
      </Card>
    </Layout>
  );
}
