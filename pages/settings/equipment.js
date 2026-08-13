import { useUser } from "../../context/UserContext";
import { getTokens } from "../../lib/tokens";
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
              style={{
                flex: "1 1 0",
                textAlign: "left",
                padding: "12px 14px",
                borderRadius: tk.radius.md,
                border: `1.5px solid ${active ? tk.accent : tk.border}`,
                backgroundColor: active ? tk.accentSoft : tk.surfaceAlt,
                cursor: "pointer",
                transition: tk.transition,
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

  return (
    <SettingsSubpage
      isDark={isDark}
      isMobile={isMobile}
      title={t("equipment_settings_title")}
      subtitle={t("equipment_settings_desc")}
    >
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
