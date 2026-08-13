import type { ReactNode } from 'react';

/**
 * Caras del modelo del mapa muscular.
 *
 * ── El sistema de coordenadas ──────────────────────────────────────────────────────────────────
 * Cada cara se dibuja en una caja normalizada de 100 × 168 que representa EL CRÁNEO: (0,0) es la
 * coronilla por su lado izquierdo y (100,168) la barbilla por el derecho. `MuscleMap` la coloca
 * sobre la cabeza de la lámina que toque con un translate+scale (ver HEAD_BOX allí), así que estos
 * dibujos no saben nada de los dos cuerpos ni de sus viewBox distintos.
 *
 * 168 y no 140 de alto: es la relación intermedia entre las dos cabezas reales (la masculina es más
 * ancha y corta, la femenina más estrecha y larga). Repartir la diferencia deja a las dos con ~7%
 * de estiramiento en vez de cargárselo una sola, que a este tamaño no se ve.
 *
 * ── Todos calvos, a propósito ─────────────────────────────────────────────────────────────────
 * No hay pelo que dibujar ni distinguir por vista frontal/posterior: la única variable es la
 * EXPRESIÓN (cejas, ojos, boca). Eso simplifica de paso un problema real que tenía el pelo — se
 * volvía invisible contra el fondo oscuro de la tarjeta en cuanto sobresalía de la cabeza (ver el
 * historial de este archivo si hace falta el porqué) — quitando la causa en vez de parchearla.
 * La nuca ya la dibuja lisa la silueta de `data/muscleMapPaths*.ts`, así que no hay vista
 * posterior propia: `MuscleMap` sólo pide `front()`.
 *
 * ── Las orejas no se dibujan aquí ──────────────────────────────────────────────────────────────
 * Ya vienen en la silueta de `data/muscleMapPaths*.ts`, cada una en su sitio anatómico. Volver a
 * pintarlas aquí las duplicaría y, peor, las descolocaría en uno de los dos cuerpos.
 *
 * ── Color ─────────────────────────────────────────────────────────────────────────────────────
 * Tinta oscura fija, sin depender del tema: la cabeza SIEMPRE es clara (`silhouetteFill` en
 * MuscleMap es blanco en oscuro y casi blanco en claro), así que el contraste está garantizado en
 * los dos modos y un color reactivo al tema sólo podría empeorarlo.
 */

const INK = '#1b1b1b';

/** Nariz: igual en las cuatro expresiones — lo que cambia una cara es cejas, ojos y boca. */
function Nose(): ReactNode {
  return <path d="M50 88 L45 112 Q50 116 56 111" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />;
}

export interface FaceStyle {
  /** Se guarda en el perfil (`user.faceStyle`), así que no debe cambiar una vez publicado. */
  id: string;
  name: string;
  /** Único dibujo por estilo: cejas + ojos + nariz + boca sobre la cabeza calva. */
  front: () => ReactNode;
}

export const FACE_STYLES: FaceStyle[] = [
  {
    id: 'neutral',
    name: 'Neutro',
    front: () => (
      <g>
        <path d="M19 67 Q31 60 43 66" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
        <path d="M57 66 Q69 60 81 67" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />

        <circle cx="33" cy="81" r="5.4" fill={INK} />
        <circle cx="67" cy="81" r="5.4" fill={INK} />
        <circle cx="34.8" cy="78.8" r="1.6" fill="#ffffff" />
        <circle cx="68.8" cy="78.8" r="1.6" fill="#ffffff" />

        <Nose />

        <path d="M37 132 Q50 137 63 132" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
      </g>
    ),
  },
  {
    id: 'happy',
    name: 'Sonriente',
    front: () => (
      <g>
        {/* Cejas más arriba y arqueadas que en 'Neutro': es lo que lee como sorpresa/alegría en vez
            de un ceño normal levantado un par de unidades. */}
        <path d="M19 61 Q31 52 43 59" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
        <path d="M57 59 Q69 52 81 61" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />

        {/* Ojos en arco (^ ^), no círculos rellenos: es el atajo visual universal de "sonriendo con
            los ojos", y sin rellenar deja hueco a que se lea como entrecerrado por la sonrisa. */}
        <path d="M26 82 Q33 74 40 82" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M60 82 Q67 74 74 82" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />

        <Nose />

        {/* Boca bien abierta hacia abajo: la curva de 'Neutro' amplificada, no una forma nueva. */}
        <path d="M33 127 Q50 146 67 127" fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      </g>
    ),
  },
  {
    id: 'focused',
    name: 'Serio',
    front: () => (
      <g>
        {/* Cejas rectas en V hacia el entrecejo — fruncidas, no curvas — es lo que distingue
            "serio" de una cara simplemente neutra o triste: no bajan, convergen. */}
        <path d="M20 60 L42 70" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
        <path d="M80 60 L58 70" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />

        {/* Ojos entrecerrados: elipses achatadas en vez de círculos, sin brillo — la mirada fija
            de quien está concentrado no tiene el punto de luz "vivo" de las otras expresiones. */}
        <ellipse cx="33" cy="82" rx="6.2" ry="3.2" fill={INK} />
        <ellipse cx="67" cy="82" rx="6.2" ry="3.2" fill={INK} />

        <Nose />

        {/* Boca recta: ni sonrisa ni mueca, la línea plana de quien está a lo suyo. */}
        <path d="M39 133 L61 133" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
      </g>
    ),
  },
  {
    id: 'wink',
    name: 'Pícaro',
    front: () => (
      <g>
        {/* Asimetría deliberada: una ceja arriba, la otra en su sitio de 'Neutro' — es la que
            vende el guiño más que el propio ojo cerrado. */}
        <path d="M19 61 Q31 53 43 60" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
        <path d="M57 66 Q69 60 81 67" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />

        {/* Ojo izquierdo cerrado en un guiño, derecho abierto como en 'Neutro'. */}
        <path d="M26 81 Q33 85 40 81" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <circle cx="67" cy="81" r="5.4" fill={INK} />
        <circle cx="68.8" cy="78.8" r="1.6" fill="#ffffff" />

        <Nose />

        {/* Sonrisa torcida: sube más por el lado del ojo abierto, nunca simétrica. */}
        <path d="M37 130 Q52 141 66 127" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },
];

/** Cara por defecto de quien no ha elegido ninguna. */
export const DEFAULT_FACE_STYLE_ID = 'neutral';

/** La caja normalizada en la que están dibujadas todas las caras. La necesita quien las coloque. */
export const FACE_VIEW_BOX = { width: 100, height: 168 };

/**
 * Resuelve un id guardado a su estilo. Cae al de por defecto ante un id desconocido — un perfil
 * viejo (o uno con un estilo que se haya retirado, p.ej. los peinados de antes de que la cara
 * pasara a ser sólo expresión) tiene que seguir dibujando una cara, no un hueco.
 */
export function getFaceStyle(id?: string | null): FaceStyle {
  return FACE_STYLES.find((s) => s.id === id) ?? FACE_STYLES.find((s) => s.id === DEFAULT_FACE_STYLE_ID)!;
}
