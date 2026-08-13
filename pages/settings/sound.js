import { useUser } from "../../context/UserContext";
import { getTokens } from "../../lib/tokens";
import { Switch } from "../../components/ui";
import SettingsSubpage from "../../components/settings/SettingsSubpage";

export default function SettingsSound() {
  const { theme, isMobile, t, soundEnabled, setSoundEnabled } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  return (
    <SettingsSubpage isDark={isDark} isMobile={isMobile} title={t("sound_pr_label")}>
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        alignItems: isMobile ? "flex-start" : "center",
        gap: isMobile ? "12px" : "0"
      }}>
        <div>
          <div style={{ color: tk.text, fontSize: "1.1rem" }}>{t("sound_pr_label")}</div>
          <div style={{ color: tk.textMuted, fontSize: "0.85rem", marginTop: "2px" }}>{t("sound_pr_desc")}</div>
        </div>
        <Switch isDark={isDark} checked={soundEnabled} onChange={setSoundEnabled} />
      </div>
    </SettingsSubpage>
  );
}
