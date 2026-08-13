import { useUser } from "../../context/UserContext";
import { getTokens } from "../../lib/tokens";
import { Switch } from "../../components/ui";
import SettingsSubpage from "../../components/settings/SettingsSubpage";

/**
 * Un par de opciones excluyentes con una línea de ejemplo cada una, en vez de un simple switch:
 * "peso de una o de las dos" no se entiende con un booleano sin nombre, y la línea de ejemplo es lo
 * que de verdad responde "¿y esto qué significa para mí" sin mandar a nadie a leer una nota aparte.
 */
function EquipmentChoiceGroup({ isDark, isMobile, tk, label, desc, value, onChange, options }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div>
        <div style={{ color: tk.text, fontSize: "0.95rem", fontWeight: 600 }}>{label}</div>
        <div style={{ color: tk.textMuted, fontSize: "0.82rem", marginTop: "2px" }}>{desc}</div>
      </div>
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "10px" }}>
        {options.map((opt) => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              aria-pressed={active}
              className="feeg-surface feeg-press feeg-hover"
              style={{
                flex: "1 1 0",
                textAlign: "left",
                padding: "12px 14px",
                borderRadius: tk.radius.md,
                cursor: "pointer",
                "--feeg-bg": active ? tk.accentSoft : tk.surfaceAlt,
                "--feeg-border": active ? tk.accent : tk.border,
                "--feeg-hover-bg": active ? tk.accentSoft : tk.surfaceHover,
                "--feeg-hover-border": tk.accent,
                "--feeg-border-width": "1.5px",
                "--feeg-press-scale": 0.98,
              }}
            >
              <div style={{ color: active ? tk.accent : tk.text, fontWeight: active ? 700 : 500, fontSize: "0.9rem" }}>
                {opt.label}
              </div>
              <div style={{ color: tk.textMuted, fontSize: "0.78rem", marginTop: "3px" }}>{opt.example}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SettingsEquipment() {
  const { theme, isMobile, t, user, saveUser } = useUser();
  const isDark = theme === 'dark';
  const tk = getTokens(isDark);
  const workoutPreferences = user?.workoutPreferences || {};
  const updateWorkoutPreferences = (changes) => saveUser({
    ...(user || {}),
    workoutPreferences: { ...workoutPreferences, ...changes },
  });

  return (
    <SettingsSubpage
      isDark={isDark}
      isMobile={isMobile}
      title={t("equipment_settings_title")}
      subtitle={t("equipment_settings_desc")}
    >
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: "12px" }}>
        <div>
          <div style={{ color: tk.text, fontSize: "0.95rem", fontWeight: 600 }}>{t("rir_button_label")}</div>
          <div style={{ color: tk.textMuted, fontSize: "0.82rem", marginTop: "2px" }}>{t("rir_button_desc")}</div>
        </div>
        <Switch
          isDark={isDark}
          checked={workoutPreferences.showRir !== false}
          onChange={(showRir) => updateWorkoutPreferences({ showRir })}
        />
      </div>

      <EquipmentChoiceGroup
        isDark={isDark}
        isMobile={isMobile}
        tk={tk}
        label={t("progression_mode_label")}
        desc={t("progression_mode_desc")}
        value={workoutPreferences.progressionMode || "all"}
        onChange={(progressionMode) => updateWorkoutPreferences({ progressionMode })}
        options={[
          { key: "off", label: t("progression_mode_off"), example: t("progression_mode_off_example") },
          { key: "increaseOnly", label: t("progression_mode_increase_only"), example: t("progression_mode_increase_only_example") },
          { key: "increaseMaintain", label: t("progression_mode_increase_maintain"), example: t("progression_mode_increase_maintain_example") },
          { key: "all", label: t("progression_mode_all"), example: t("progression_mode_all_example") },
        ]}
      />

      <div style={{ height: "1px", backgroundColor: tk.border }} />

      <EquipmentChoiceGroup
        isDark={isDark}
        isMobile={isMobile}
        tk={tk}
        label={t("dumbbell_mode_label")}
        desc={t("dumbbell_mode_desc")}
        value={user?.dumbbellMode === "combined" ? "combined" : "perHand"}
        onChange={(dumbbellMode) => saveUser({ ...(user || {}), dumbbellMode })}
        options={[
          { key: "perHand", label: t("dumbbell_mode_perhand"), example: t("dumbbell_mode_perhand_example") },
          { key: "combined", label: t("dumbbell_mode_combined"), example: t("dumbbell_mode_combined_example") },
        ]}
      />

      <EquipmentChoiceGroup
        isDark={isDark}
        isMobile={isMobile}
        tk={tk}
        label={t("pulley_mode_label")}
        desc={t("pulley_mode_desc")}
        value={user?.pulleyMode === "assisted" ? "assisted" : "asShown"}
        onChange={(pulleyMode) => saveUser({ ...(user || {}), pulleyMode })}
        options={[
          { key: "asShown", label: t("pulley_mode_asshown"), example: t("pulley_mode_asshown_example") },
          { key: "assisted", label: t("pulley_mode_assisted"), example: t("pulley_mode_assisted_example") },
        ]}
      />
    </SettingsSubpage>
  );
}
