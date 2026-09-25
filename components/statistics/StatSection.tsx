import type { CSSProperties, ReactNode } from "react";
import { getTokens } from "../../lib/tokens";

interface StatSectionProps {
  title: string;
  /** Dato de contexto a la derecha del título ("8 grupos activos", "124 registros"). */
  meta?: ReactNode;
  children: ReactNode;
  isDark: boolean;
  isMobile?: boolean;
}

/**
 * Carcasa de tarjeta de las secciones de estadísticas.
 *
 * Existe porque el mismo bloque estaba copiado literalmente en seis archivos: fondo
 * `isDark ? '#1a1a1a' : '#fff'`, borde `'1px solid #333'`, `borderRadius: '16px'`,
 * `padding: '24px'`, un `h2` a `'1.3rem'` y una meta en `#1dd1a1`. Seis copias es seis sitios
 * donde tocar cualquier ajuste, y ya habían divergido entre sí en el `marginBottom` del header
 * (20px en unas, 16px en otras) — exactamente la deriva que `lib/tokens.js` vino a eliminar.
 *
 * Nota tipográfica: `1.3rem` no existía en la escala (el escalón es `xl`, 1.4rem). Al pasar a
 * tokens los títulos suben ese pelo; es intencional, no un descuido.
 */
export default function StatSection({ title, meta, children, isDark, isMobile = false }: StatSectionProps) {
  const tk = getTokens(isDark);

  // En móvil la sección NO es una tarjeta: el contenido de cada vista ya trae sus propias
  // superficies (filas, gráficas, listas) y envolverlo en otra tarjeta con 20px de padding por lado
  // metía tarjetas dentro de tarjetas y se comía ~40px de un ancho de 360. En escritorio, con aire
  // de sobra, la carcasa sigue ayudando a agrupar.
  const flat = isMobile;
  return (
    <section
      className={flat ? undefined : "feeg-surface"}
      style={
        flat
          ? { marginBottom: tk.space.xl }
          : ({
              borderRadius: tk.radius.lg,
              padding: tk.space.xxl,
              marginBottom: tk.space.xl,
              "--feeg-bg": tk.surface,
              "--feeg-border": tk.border,
              "--feeg-shadow": tk.shadow.card,
            } as CSSProperties)
      }
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          // `baseline` y no `center`: alinea las dos tipografías por su línea de escritura, que es
          // lo que hace que un título grande y una meta pequeña se lean como una sola fila.
          alignItems: "baseline",
          gap: tk.space.md,
          marginBottom: flat ? tk.space.md : tk.space.xl,
        }}
      >
        <h2
          style={{
            margin: 0,
            color: tk.text,
            fontSize: flat ? "1.1rem" : tk.fontSize.xl,
            fontWeight: 800,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h2>
        {meta && (
          <span
            style={{
              fontSize: tk.fontSize.xs,
              color: tk.textMuted,
              fontWeight: tk.weight.medium,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {meta}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}
