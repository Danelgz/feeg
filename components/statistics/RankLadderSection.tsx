import { getTokens } from '../../lib/tokens';
import { RANKS, formatRarity, type RankDefinition } from '../../data/ranks';
import { RankArt } from '../ui';
import StatSection from './StatSection';

interface RankLadderSectionProps {
  /** Rango en el que está el usuario ahora mismo, para resaltar su fila en la escalera. */
  currentRank: RankDefinition;
  isDark: boolean;
  isMobile?: boolean;
}

/**
 * La escalera completa: los diez rangos, de Principiante a Leyenda, con cuánta gente llega a cada
 * uno.
 *
 * Antes la única referencia a "qué rangos existen" era la tira de degradado de la leyenda del mapa
 * — diez colores sin nombre ni contexto. Esta sección es la explicación de esa tira: cada peldaño
 * con su insignia, su nombre y una cifra de rareza que convierte "Élite" de una palabra bonita en
 * "llega un 0,7% de la gente", que es lo que engancha a seguir subiendo.
 *
 * El % es una curva diseñada a mano, no un dato en vivo de usuarios de FEEG — ver el comentario en
 * data/ranks.ts sobre por qué montar esa infraestructura ahora sería prematuro (y con pocos
 * usuarios reales, engañoso).
 */
export default function RankLadderSection({ currentRank, isDark, isMobile = false }: RankLadderSectionProps) {
  const tk = getTokens(isDark);

  return (
    <StatSection title="Escalera de rangos" meta={`Estás en ${currentRank.name}`} isDark={isDark} isMobile={isMobile}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: tk.space.sm }}>
        {RANKS.slice()
          .reverse()
          .map((rank) => {
            const isCurrent = rank.index === currentRank.index;
            return (
              <div
                key={rank.slug}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tk.space.md,
                  padding: tk.space.md,
                  borderRadius: tk.radius.md,
                  backgroundColor: isCurrent ? `${rank.color}1a` : 'transparent',
                  border: `1px solid ${isCurrent ? `${rank.color}55` : tk.border}`,
                }}
              >
                <RankArt rank={rank} tier={3} size={36} animated={false} />

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: tk.space.sm, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: tk.fontSize.md, fontWeight: tk.weight.bold, color: rank.color }}>
                      {rank.name}
                    </span>
                    {isCurrent && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: tk.weight.bold,
                          color: tk.onAccent,
                          backgroundColor: tk.accent,
                          borderRadius: tk.radius.pill,
                          padding: '2px 8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Tú
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: tk.fontSize.xs, color: tk.textFaint }}>
                    Nivel {rank.minLevel}–{rank.minLevel + 2}
                  </span>
                </div>

                {/* Bloque de dos líneas y no un solo texto pequeño: una etiqueta suelta a la derecha
                    de un icono de 36px dejaba un hueco enorme en el medio de la fila, sobre todo en
                    móvil donde la fila ocupa todo el ancho. Con etiqueta + valor el lado derecho
                    pesa visualmente como el izquierdo (icono + nombre + nivel) y la fila deja de
                    leerse como "texto metido en un extremo con la mitad de la tarjeta vacía". */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: tk.fontSize.xs,
                      color: tk.textFaint,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Rareza
                  </div>
                  <div
                    style={{
                      fontSize: tk.fontSize.md,
                      fontWeight: tk.weight.bold,
                      color: rank.color,
                      whiteSpace: 'nowrap',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatRarity(rank)}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <p style={{ margin: `${tk.space.lg} 0 0`, fontSize: tk.fontSize.xs, color: tk.textFaint, lineHeight: 1.6 }}>
        Estimación orientativa según lo exigente que es cada tramo del baremo, no un recuento de
        usuarios de FEEG.
      </p>
    </StatSection>
  );
}
