import { getTokens } from "../../lib/tokens";

interface SkeletonProps {
  isDark: boolean;
  width?: string | number;
  height?: string | number;
  radius?: string;
  style?: React.CSSProperties;
}

/**
 * Bloque de carga con brillo. Sustituye al spinner centrado: un spinner no dice nada sobre lo que
 * está por llegar, mientras que un esqueleto con la forma del contenido hace que la aparición no se
 * sienta como un salto — la página ya estaba ahí, solo se rellena.
 */
export function Skeleton({ isDark, width = "100%", height = 16, radius, style }: SkeletonProps) {
  const tk = getTokens(isDark);
  return (
    <div
      className="feeg-skeleton"
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius: radius || tk.radius.sm,
        backgroundColor: isDark ? "#232323" : "#e6e8ec",
        ...style,
      }}
    />
  );
}

interface SkeletonPageProps {
  isDark: boolean;
  isMobile?: boolean;
  /** Cuántas tarjetas de contenido simular. */
  cards?: number;
  /** Texto para lectores de pantalla, que no ven la forma. */
  label?: string;
}

/**
 * Esqueleto para las pantallas de "cabecera + lista de tarjetas", que es la forma que tienen el
 * feed, medidas, calendario y recomendados.
 */
export function SkeletonPage({ isDark, isMobile = false, cards = 3, label = "Cargando" }: SkeletonPageProps) {
  const tk = getTokens(isDark);
  return (
    <div style={{ padding: isMobile ? tk.space.lg : tk.space.xl }} role="status" aria-label={label}>
      <Skeleton isDark={isDark} width={isMobile ? "60%" : "280px"} height={30} radius={tk.radius.sm} />
      <Skeleton isDark={isDark} width={isMobile ? "80%" : "420px"} height={14} style={{ marginTop: tk.space.md }} />

      <div style={{ marginTop: tk.space.huge, display: "flex", flexDirection: "column", gap: tk.space.lg }}>
        {Array.from({ length: cards }, (_, i) => (
          <div
            key={i}
            style={{
              backgroundColor: tk.surface,
              border: `1px solid ${tk.border}`,
              borderRadius: tk.radius.lg,
              padding: tk.space.xl,
              // Desvanecido progresivo: las tarjetas de abajo pesan menos, así el esqueleto no se
              // lee como una lista real de contenido vacío.
              opacity: 1 - i * 0.22,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: tk.space.md }}>
              <Skeleton isDark={isDark} width={40} height={40} radius={tk.radius.full} />
              <div style={{ flex: 1 }}>
                <Skeleton isDark={isDark} width="45%" height={14} />
                <Skeleton isDark={isDark} width="25%" height={11} style={{ marginTop: tk.space.sm }} />
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
                gap: tk.space.md,
                marginTop: tk.space.xl,
              }}
            >
              {Array.from({ length: 4 }, (_, j) => (
                <Skeleton key={j} isDark={isDark} height={48} radius={tk.radius.md} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
