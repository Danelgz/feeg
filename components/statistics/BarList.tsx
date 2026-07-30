import { motion, useReducedMotion } from "motion/react";
import { getTokens } from "../../lib/tokens";

export interface BarListItem {
  key: string;
  label: string;
  value: number;
  /** Segunda línea a la derecha, más pequeña ("12 series" bajo un "42%"). */
  detail?: string;
}

interface BarListProps {
  items: BarListItem[];
  isDark: boolean;
  /**
   * Referencia del 100% de la barra. `max` compara cada grupo con el más entrenado (útil para ver
   * el reparto relativo); `total` reparte el 100% entre todos (útil para porcentajes que suman 100).
   */
  scale?: "max" | "total";
  /** Texto del número de la derecha. Recibe el total por si hay que calcular un porcentaje. */
  formatValue?: (value: number, total: number) => string;
}

/**
 * Lista de barras horizontales de las estadísticas.
 *
 * Unifica el gráfico que estaba escrito dos veces (SeriesByGroupSection y DistributionChartSection)
 * con la misma maquetación y tooltips casi idénticos pero normalizaciones distintas.
 *
 * Tres cosas que se han quitado o corregido a propósito respecto de aquellas dos copias:
 *
 * 1. **Fuera el tooltip.** Repetía información que ya estaba impresa a la derecha de la barra, y
 *    para conseguirlo cargaba con tres problemas: se posicionaba con `position: fixed` en las
 *    coordenadas del ratón sin acotar al viewport (en las filas de la derecha se salía de pantalla),
 *    dependía de `hover`, que en móvil no existe, y su cierre táctil era un `setTimeout` sin
 *    limpiar que seguía vivo si el componente se desmontaba antes. Lo que el tooltip aportaba de
 *    más en Distribución (el recuento además del %) ahora se imprime como `detail`.
 * 2. **La columna de etiquetas ya no mide 120px fijos.** A 375px eso dejaba menos de la mitad del
 *    ancho para la barra; ahora es una columna elástica con recorte por elipsis.
 * 3. **El dato no depende del color.** Etiqueta y valor son texto real, así que la barra es
 *    decorativa y va con `aria-hidden`; un lector de pantalla lee la lista como pares
 *    etiqueta/valor sin necesidad de describir el gráfico.
 *
 * Sobre animar `width` en vez de `transform`: sí, la guía general dice que se anime `transform`.
 * Aquí se anima `width` a conciencia — un `scaleX` sobre una barra con extremos redondeados
 * deforma visiblemente los bordes mientras dura la animación, y esto son 8 barras animándose una
 * sola vez al montar, no un bucle en caliente. La corrección visual gana a la micro-optimización.
 */
export default function BarList({
  items,
  isDark,
  scale = "max",
  formatValue = (value) => String(value),
}: BarListProps) {
  const tk = getTokens(isDark);
  const prefersReducedMotion = useReducedMotion();

  const total = items.reduce((sum, item) => sum + item.value, 0);
  const max = items.reduce((peak, item) => Math.max(peak, item.value), 0);
  // Sin datos el denominador sería 0; 1 evita el NaN y deja todas las barras a 0, que es lo correcto.
  const reference = (scale === "total" ? total : max) || 1;

  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: tk.space.md }}>
      {items.map((item, index) => {
        const pct = Math.min(100, (item.value / reference) * 100);

        return (
          <li
            key={item.key}
            style={{
              display: "grid",
              // La columna de etiqueta se encoge hasta 64px antes que robarle ancho a la barra.
              gridTemplateColumns: "minmax(64px, 116px) 1fr auto",
              alignItems: "center",
              gap: tk.space.md,
            }}
          >
            <span
              title={item.label}
              style={{
                color: item.value > 0 ? tk.text : tk.textFaint,
                fontSize: tk.fontSize.sm,
                fontWeight: tk.weight.body,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.label}
            </span>

            <div
              aria-hidden="true"
              style={{
                height: "10px",
                backgroundColor: tk.surfaceAlt,
                border: `1px solid ${tk.border}`,
                borderRadius: tk.radius.pill,
                overflow: "hidden",
              }}
            >
              {/* Un grupo sin series no pinta barra. Deja el hueco visible a propósito: ver un carril
                  vacío es justo la señal de "aquí no estás entrenando" que el usuario necesita. */}
              {item.value > 0 && (
                <motion.div
                  initial={prefersReducedMotion ? false : { width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{
                    duration: tk.motion.duration.slow,
                    ease: tk.motion.ease.out,
                    delay: prefersReducedMotion ? 0 : index * tk.motion.stagger,
                  }}
                  style={{
                    height: "100%",
                    background: `linear-gradient(90deg, ${tk.accent}, ${tk.accentHover})`,
                    borderRadius: tk.radius.pill,
                  }}
                />
              )}
            </div>

            <div style={{ textAlign: "right", minWidth: "56px" }}>
              <div
                style={{
                  color: item.value > 0 ? tk.text : tk.textFaint,
                  fontWeight: tk.weight.bold,
                  fontSize: tk.fontSize.md,
                  // Igual que en HeroMetricCard: evita que la columna baile al cambiar de periodo.
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1.2,
                }}
              >
                {formatValue(item.value, total)}
              </div>
              {item.detail && (
                <div style={{ color: tk.textFaint, fontSize: tk.fontSize.xs, fontVariantNumeric: "tabular-nums" }}>
                  {item.detail}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
