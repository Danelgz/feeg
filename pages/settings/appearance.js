import { useUser } from "../../context/UserContext";
import { getTokens } from "../../lib/tokens";
import { Icon } from "../../components/ui";
import SettingsSubpage from "../../components/settings/SettingsSubpage";

export default function SettingsAppearance() {
  const { theme, themePreference, setThemeMode, isMobile, t } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  const themeOptions = [
    { key: 'light', label: t("light_mode"), icon: 'sun' },
    { key: 'dark', label: t("dark_mode"), icon: 'moon' },
    { key: 'system', label: 'Sistema', icon: 'monitor' }
  ];

  return (
    <SettingsSubpage isDark={isDark} isMobile={isMobile} title="Apariencia">
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
    </SettingsSubpage>
  );
}
