import { useId, type ReactNode } from 'react';
import type { RankIconKey } from '../../data/ranks';

interface RankIconProps {
  icon: RankIconKey;
  /** Color protagonista del rango (RankDefinition.color). */
  color: string;
  /** Segundo color: volumen del degradado, detalles rojos en Titán, barrido en Leyenda. */
  accent: string;
  /**
   * Escalón dentro del rango (1, 2 o 3). Añade ornamento: el 1 va limpio, el 2 gana laureles y el 3
   * alas. Ver la nota sobre la dirección del ornamento más abajo.
   */
  tier?: number;
  size?: number;
  /** Desactiva el brillo animado de Leyenda. Se respeta también `prefers-reduced-motion`. */
  animated?: boolean;
}

/**
 * Marca de cada rango. Diez dibujos originales sobre una rejilla de 24×24.
 *
 * No usa `components/ui/Icon` a propósito: aquel resuelve iconos de línea de un trazo uniforme desde
 * `data/icons.js`, y estas son insignias — necesitan relleno, degradado y un segundo color.
 *
 * ── El ornamento por escalón ──────────────────────────────────────────────────────────────────
 * Dentro de un mismo rango los tres escalones comparten la misma marca y se distinguen por lo que
 * la rodea: escalón 1 la marca sola, escalón 2 con laureles, escalón 3 con alas. Así un rango se
 * reconoce de un vistazo por su símbolo y su color, y el progreso dentro de él se lee sin tener que
 * descifrar un número romano diminuto.
 *
 * El ornamento crece con la FUERZA, no con el número: el escalón 3 es el más alto de su rango, así
 * que es el que lleva alas. Si algún día se invierte la numeración al estilo de los juegos
 * competitivos (III el más bajo, I el más alto), lo que hay que girar es la numeración en
 * `data/ranks.ts`, no esto — aquí «más ornamento» siempre significará «más fuerte».
 *
 * Al añadir ornamento la marca se encoge y se recentra en vez de salirse del lienzo: los tres
 * escalones ocupan exactamente el mismo cuadro, de modo que una fila de insignias no baila de
 * tamaño según el escalón de cada una.
 */
export default function RankIcon({
  icon,
  color,
  accent,
  tier = 1,
  size = 24,
  animated = true,
}: RankIconProps) {
  // Los degradados viven en <defs> y se referencian por id: sin un id único por instancia, dos
  // insignias distintas en la misma página comparten el primer degradado que se monte.
  const uid = useId().replace(/:/g, '');
  const gradId = `rank-grad-${uid}`;
  const shineId = `rank-shine-${uid}`;

  const fill = `url(#${gradId})`;
  const hasLaurels = tier === 2;
  const hasWings = tier >= 3;
  // El ala ocupa más ancho que el laurel, así que la marca se encoge un punto más.
  const coreScale = hasWings ? 0.66 : hasLaurels ? 0.76 : 1;
  const coreOffset = (24 * (1 - coreScale)) / 2;

  const marks: Record<RankIconKey, ReactNode> = {
    plate: (
      <>
        {/* Principiante: la barra desnuda, sin discos. El rango donde todavía no hay carga. */}
        <rect x="9.5" y="10.8" width="5" height="2.4" rx="1.2" fill={fill} />
        <rect x="2" y="10.4" width="2" height="3.2" rx="1" fill={fill} />
        <rect x="20" y="10.4" width="2" height="3.2" rx="1" fill={fill} />
        <circle cx="7" cy="12" r="3.4" stroke={fill} strokeWidth="1.8" />
        <circle cx="17" cy="12" r="3.4" stroke={fill} strokeWidth="1.8" />
      </>
    ),
    dumbbell: (
      <>
        <rect x="8.5" y="10.9" width="7" height="2.2" rx="1.1" fill={fill} />
        <rect x="4.6" y="7.6" width="3.4" height="8.8" rx="1.4" fill={fill} />
        <rect x="16" y="7.6" width="3.4" height="8.8" rx="1.4" fill={fill} />
        <rect x="1.8" y="9.8" width="2.2" height="4.4" rx="1.1" fill={accent} />
        <rect x="20" y="9.8" width="2.2" height="4.4" rx="1.1" fill={accent} />
      </>
    ),
    arm: (
      <>
        {/* Brazo flexionado: antebrazo vertical, brazo horizontal y el bulto del bíceps. */}
        <rect x="3.4" y="12.6" width="10.5" height="4.6" rx="2.3" fill={fill} />
        <rect x="13.2" y="5.4" width="4.8" height="11.8" rx="2.4" fill={fill} />
        <circle cx="8.6" cy="11.4" r="3.9" fill={fill} />
        <circle cx="8.6" cy="11.1" r="1.5" fill={accent} opacity="0.55" />
      </>
    ),
    flame: (
      <>
        <path
          d="M12 2.4c.7 3.5 4 5.2 4 8.9a5.4 5.4 0 1 1-10.8 0c0-2.4 1.4-4 2.6-5.6.2 1.1.7 1.9 1.4 2.3C9.8 6 11 4.4 12 2.4z"
          fill={fill}
        />
        <path
          d="M12 12.3c.9 1 1.7 1.9 1.7 3.1a2.7 2.7 0 0 1-5.4 0c0-1 .5-1.8 1.2-2.5.1.6.4 1 .8 1.3.3-.9.9-1.5 1.7-1.9z"
          fill={accent}
          opacity="0.75"
        />
      </>
    ),
    shield: (
      <>
        <path d="M12 2.2l7.6 2.8v5.9c0 4.7-3.1 8.8-7.6 10.3-4.5-1.5-7.6-5.6-7.6-10.3V5l7.6-2.8z" fill={fill} />
        <path d="M12 6.1l4 1.5v3.4c0 2.6-1.6 4.9-4 5.8-2.4-.9-4-3.2-4-5.8V7.6l4-1.5z" fill={accent} opacity="0.5" />
      </>
    ),
    medal: (
      <>
        <path d="M6.6 2h3.6l2.1 5.6-3.5 1.6L6.6 2z" fill={accent} />
        <path d="M17.4 2h-3.6l-2.1 5.6 3.5 1.6L17.4 2z" fill={accent} />
        <circle cx="12" cy="15.4" r="6.2" fill={fill} />
        <path
          d="M12 11.4l1.2 2.5 2.7.4-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.4L12 11.4z"
          fill={accent}
          opacity="0.85"
        />
      </>
    ),
    crown: (
      <>
        <path d="M2.6 7.4l4.7 3.3L12 4l4.7 6.7 4.7-3.3-1.8 10.1H4.4L2.6 7.4z" fill={fill} />
        <rect x="4.4" y="18.8" width="15.2" height="2.6" rx="1.1" fill={accent} />
      </>
    ),
    diamond: (
      <>
        <path d="M12 21.6L2.4 9.2 6.3 3h11.4l3.9 6.2L12 21.6z" fill={fill} />
        <path d="M6.3 3l2.4 6.2h6.6L17.7 3M2.4 9.2h19.2M8.7 9.2L12 21.6l3.3-12.4" stroke={accent} strokeWidth="1.1" opacity="0.7" />
      </>
    ),
    helmet: (
      <>
        {/* Titán: el casco es casi negro, así que la lectura la dan la cresta y las ranuras. */}
        <path d="M9.6 1.6c3.4 0 5.2 1.9 5.2 4.3v1.6h-2.6V6.1c0-1.1-.9-1.9-2.6-1.9V1.6z" fill={accent} />
        <path
          d="M5.4 11a6.6 6.6 0 0 1 13.2 0v3.4a6.6 6.6 0 0 1-2.2 4.9v3.1h-2.6v-2.2h-3.6v2.2H7.6v-3.1a6.6 6.6 0 0 1-2.2-4.9V11z"
          fill={fill}
        />
        <rect x="7.4" y="10.6" width="3.4" height="2.2" rx="1.1" fill={accent} />
        <rect x="13.2" y="10.6" width="3.4" height="2.2" rx="1.1" fill={accent} />
      </>
    ),
    legendCrown: (
      <>
        <path
          d="M1.8 6.6l4.4 3.5L9.2 3l2.8 4.6L14.8 3l3 7.1 4.4-3.5-2 11.2H3.8L1.8 6.6z"
          fill={animated ? `url(#${shineId})` : fill}
        />
        <rect x="3.4" y="19.1" width="17.2" height="2.7" rx="1.2" fill={accent} />
        <circle cx="12" cy="13.4" r="1.7" fill={accent} />
        <circle cx="7" cy="14.2" r="1.1" fill={accent} opacity="0.8" />
        <circle cx="17" cy="14.2" r="1.1" fill={accent} opacity="0.8" />
      </>
    ),
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={accent} />
        </linearGradient>

        {icon === 'legendCrown' && (
          <linearGradient id={shineId} x1="-1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor={color} />
            <stop offset="45%" stopColor="#ffffff" />
            <stop offset="100%" stopColor={accent} />
            {animated && (
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                from="0 0"
                to="2 0"
                dur="2.6s"
                repeatCount="indefinite"
              />
            )}
          </linearGradient>
        )}
      </defs>

      {/* El ornamento se dibuja primero para que quede por detrás de la marca. Se define sólo el
          lado izquierdo y el derecho es su espejo: así las dos mitades no pueden divergir al
          retocarlas. */}
      {(hasLaurels || hasWings) && (
        <g opacity="0.9">
          {[false, true].map((mirrored) => (
            <g
              key={String(mirrored)}
              transform={mirrored ? 'translate(24 0) scale(-1 1)' : undefined}
              fill={color}
            >
              {hasWings ? (
                <path d="M6.4 8.1c-2.7.5-4.5 1.8-5.3 3.4 1.1-.6 2.2-.8 3.3-.6-1.9 1-3.1 2.2-3.6 3.7 1.3-.8 2.5-1.2 3.7-1.1-1.6 1.1-2.5 2.4-2.7 3.9 1.7-1.4 3.5-2.2 5.4-2.5z" />
              ) : (
                <>
                  <path
                    d="M5.1 7.6c-1.7 2.3-1.9 5.6-.4 8.2"
                    stroke={color}
                    strokeWidth="1.1"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <ellipse cx="3.5" cy="9.3" rx="1.5" ry="0.85" transform="rotate(-42 3.5 9.3)" />
                  <ellipse cx="3.1" cy="11.9" rx="1.5" ry="0.85" transform="rotate(-12 3.1 11.9)" />
                  <ellipse cx="3.6" cy="14.4" rx="1.5" ry="0.85" transform="rotate(18 3.6 14.4)" />
                </>
              )}
            </g>
          ))}
        </g>
      )}

      <g transform={coreScale === 1 ? undefined : `translate(${coreOffset} ${coreOffset}) scale(${coreScale})`}>
        {marks[icon]}
      </g>
    </svg>
  );
}
