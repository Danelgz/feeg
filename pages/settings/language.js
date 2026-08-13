import { useUser } from "../../context/UserContext";
import { getTokens } from "../../lib/tokens";
import SettingsSubpage from "../../components/settings/SettingsSubpage";

const LANGUAGES = [
  { code: 'es', name: 'Español' },
  { code: 'eu', name: 'Euskera' }
];

export default function SettingsLanguage() {
  const { theme, isMobile, language, updateLanguage, t } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  return (
    <SettingsSubpage isDark={isDark} isMobile={isMobile} title={t("language")}>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {LANGUAGES.map((lang) => {
          const active = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => updateLanguage(lang.code)}
              aria-pressed={active}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                borderRadius: tk.radius.md,
                border: `1.5px solid ${active ? tk.accent : tk.border}`,
                backgroundColor: active ? tk.accentSoft : "transparent",
                color: active ? tk.accent : tk.text,
                fontWeight: active ? 700 : 500,
                fontSize: "1rem",
                cursor: "pointer",
                transition: tk.transition,
              }}
            >
              {lang.name}
            </button>
          );
        })}
      </div>
    </SettingsSubpage>
  );
}
