import { useRouter } from "next/router";
import { getTokens } from "../../lib/tokens";
import { Icon } from "../ui";

/**
 * Una fila del menú de Ajustes: icono + etiqueta (+ un valor actual opcional) + flecha, que navega
 * a la subpágina correspondiente al pulsarla. Antes Ajustes era una única tarjeta larguísima con
 * los ocho apartados uno detrás de otro — cómodo de construir, pero exigía scrollear por todo lo
 * demás para llegar al que de verdad se quería tocar. Cada apartado vive ahora en su propia ruta
 * bajo `/settings/*`; `Layout` ya pinta la flecha de "atrás" sola en cualquier ruta que no esté en
 * su lista de nivel superior, así que las subpáginas no necesitan reimplementarla.
 */
export default function SettingsMenuRow({ isDark, icon, label, value, path }) {
  const tk = getTokens(isDark);
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(path)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        width: "100%",
        padding: "14px 4px",
        background: "none",
        border: "none",
        borderBottom: `1px solid ${tk.border}`,
        cursor: "pointer",
        textAlign: "left",
        transition: tk.transition,
      }}
    >
      <div
        style={{
          width: "38px",
          height: "38px",
          borderRadius: tk.radius.md,
          backgroundColor: tk.accentSoft,
          color: tk.accent,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: tk.text, fontSize: "1rem", fontWeight: 600 }}>{label}</div>
        {value && (
          <div style={{ color: tk.textMuted, fontSize: "0.82rem", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {value}
          </div>
        )}
      </div>
      <Icon name="chevronRight" size={18} color={tk.textFaint} />
    </button>
  );
}
