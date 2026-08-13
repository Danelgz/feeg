import { useEffect, useState } from "react";
import { useUser } from "../../context/UserContext";
import { getTokens } from "../../lib/tokens";
import { Switch } from "../../components/ui";
import SettingsSubpage from "../../components/settings/SettingsSubpage";

/**
 * Sonido y voz del Coach IA comparten página: las dos son "cómo suena la app", y la de voz sólo
 * tiene sentido si primero se sabe que el sonido de PRs existe — separarlas en dos toques distintos
 * no aportaba nada que un divisor entre las dos secciones no resuelva igual de claro.
 */
export default function SettingsSound() {
  const {
    theme, isMobile, t, soundEnabled, setSoundEnabled,
    aiVoiceEnabled, setAiVoiceEnabled, aiVoiceURI, setAiVoiceURI, aiVoiceRate, setAiVoiceRate, aiVoicePitch, setAiVoicePitch,
  } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);

  // Las voces de SpeechSynthesis solo están disponibles en cliente y a veces llegan async
  // (evento voiceschanged) — sin ese evento, en algunos navegadores getVoices() devuelve [] la
  // primera vez que se llama.
  const [availableVoices, setAvailableVoices] = useState([]);
  const ttsSupported = typeof window !== "undefined" && !!window.speechSynthesis;

  useEffect(() => {
    if (!ttsSupported) return;
    const loadVoices = () => setAvailableVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [ttsSupported]);

  return (
    <SettingsSubpage isDark={isDark} isMobile={isMobile} title="Sonido y voz">
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

      <div style={{ height: "1px", backgroundColor: tk.border }} />

      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        <span style={{ color: tk.text, fontSize: "1.1rem", fontWeight: 600 }}>
          {t("ai_voice_section_title")}
        </span>

        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? "12px" : "0",
        }}>
          <div>
            <div style={{ color: tk.text, fontSize: "1.1rem" }}>{t("ai_voice_enable_label")}</div>
            <div style={{ color: tk.textMuted, fontSize: "0.85rem", marginTop: "2px" }}>{t("ai_voice_enable_desc")}</div>
          </div>
          <Switch isDark={isDark} checked={aiVoiceEnabled} onChange={setAiVoiceEnabled} disabled={!ttsSupported} />
        </div>

        {!ttsSupported && (
          <div style={{ color: tk.textMuted, fontSize: "0.85rem" }}>{t("ai_voice_unsupported")}</div>
        )}

        {ttsSupported && aiVoiceEnabled && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", backgroundColor: tk.surfaceAlt, borderRadius: tk.radius.md, padding: "15px", border: `1px solid ${tk.border}` }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ color: tk.textMuted, fontSize: "0.85rem" }}>{t("ai_voice_select_label")}</span>
              <select
                value={aiVoiceURI || ""}
                onChange={(e) => setAiVoiceURI(e.target.value || null)}
                style={{
                  padding: "10px 14px",
                  backgroundColor: tk.surface,
                  color: tk.text,
                  border: `1.5px solid ${tk.border}`,
                  borderRadius: tk.radius.sm,
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  outline: "none",
                }}
              >
                <option value="">{t("ai_voice_default_option")}</option>
                {availableVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ color: tk.textMuted, fontSize: "0.85rem" }}>{t("ai_voice_rate_label")}: {aiVoiceRate.toFixed(1)}x</span>
              <input type="range" min="0.5" max="2" step="0.1" value={aiVoiceRate} onChange={(e) => setAiVoiceRate(parseFloat(e.target.value))} style={{ accentColor: tk.accent }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ color: tk.textMuted, fontSize: "0.85rem" }}>{t("ai_voice_pitch_label")}: {aiVoicePitch.toFixed(1)}</span>
              <input type="range" min="0.5" max="2" step="0.1" value={aiVoicePitch} onChange={(e) => setAiVoicePitch(parseFloat(e.target.value))} style={{ accentColor: tk.accent }} />
            </div>
          </div>
        )}
      </div>
    </SettingsSubpage>
  );
}
