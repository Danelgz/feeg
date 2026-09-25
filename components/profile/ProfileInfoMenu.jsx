import { useRouter } from "next/router";
import { getTokens } from "../../lib/tokens";
import { Icon } from "../ui";

const MENU_ITEMS = [
  { label: "Estadísticas", path: "/statistics", icon: "barChart" },
  { label: "Medidas", path: "/measures", icon: "ruler" },
  { label: "Calendario", path: "/calendar", icon: "calendar" },
  { label: "Ejercicios", path: "/exercises", icon: "dumbbell" },
];

/**
 * Accesos directos del perfil propio: cuatro botones en una fila, siempre visibles. Antes era un
 * desplegable "Información" que había que abrir para ver cuatro enlaces — un toque de más para
 * llegar a lo mismo, y una caja con borde de 60px de alto cuando estaba cerrado.
 *
 * `extraItems` añade entradas con `path` (navega) u `onClick` (acción directa).
 */
export default function ProfileInfoMenu({ isDark = true, extraItems = [] }) {
  const tk = getTokens(isDark);
  const router = useRouter();
  const items = [...MENU_ITEMS, ...extraItems];

  return (
    <nav aria-label="Accesos rápidos" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(items.length, 4)}, minmax(0, 1fr))`, gap: 8, marginBottom: 18 }}>
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => (item.onClick ? item.onClick() : router.push(item.path))}
          className="feeg-press"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            padding: "12px 4px 10px",
            border: "none",
            borderRadius: 14,
            background: isDark ? "rgba(255,255,255,0.05)" : "#fff",
            color: tk.text,
            fontSize: "0.72rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <span style={{ color: tk.accent, display: "flex" }}>
            {typeof item.icon === "string" ? <Icon name={item.icon} size={19} /> : item.icon}
          </span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
