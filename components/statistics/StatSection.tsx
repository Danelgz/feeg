import type { ReactNode } from "react";
import { getTokens } from "../../lib/tokens";

interface StatSectionProps {
  title: string;
  /** Dato de contexto a la derecha del título ("8 grupos activos", "124 registros"). */
  meta?: ReactNode;
  children: ReactNode;
  isDark: boolean;
  /** Se mantiene por compatibilidad: la sección ya es igual en móvil y escritorio. */
  isMobile?: boolean;
  /** Sin la línea superior (la primera sección tras un titular que ya separa). */
  first?: boolean;
  id?: string;
}

/**
 * Sección de Estadísticas: título, meta y contenido directamente sobre el fondo.
 *
 * Ya no es una tarjeta. Cada sección iba en una caja con borde de 1px y esquinas de 20px, y con
 * cinco o seis por pantalla la vista se leía como un montón de recuadros: bordes que no aportan
 * información y ~28px de padding por lado que en un móvil de 360px son casi un 16% del ancho
 * robado a las gráficas. Ahora las secciones se separan con una línea de 1px a todo el ancho y aire
 * vertical, como un informe — el contenido llega de borde a borde del margen de la página.
 */
export default function StatSection({ title, meta, children, isDark, first = false, id }: StatSectionProps) {
  const tk = getTokens(isDark);
  return (
    <section
      id={id}
      style={{
        paddingTop: first ? 0 : 18,
        marginBottom: 22,
        borderTop: first ? "none" : `1px solid ${tk.hairline}`,
        minWidth: 0,
      }}
    >
      <SectionHeader title={title} meta={meta} isDark={isDark} />
      {children}
    </section>
  );
}

/** Cabecera de sección reutilizable por los bloques que no usan StatSection entero. */
export function SectionHeader({ title, meta, isDark }: { title: string; meta?: ReactNode; isDark: boolean }) {
  const tk = getTokens(isDark);
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        // `baseline`: un título grande y una meta pequeña se leen como una sola fila.
        alignItems: "baseline",
        gap: tk.space.md,
        marginBottom: 12,
      }}
    >
      <h2 style={{ margin: 0, color: tk.text, fontSize: "1.05rem", fontWeight: 800, letterSpacing: "-0.01em" }}>{title}</h2>
      {meta && (
        <span style={{ fontSize: "0.75rem", color: tk.textMuted, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>{meta}</span>
      )}
    </header>
  );
}
