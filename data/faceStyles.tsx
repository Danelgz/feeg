import type { ReactNode } from 'react';

/**
 * Caras del modelo del mapa muscular.
 *
 * ── El sistema de coordenadas ──────────────────────────────────────────────────────────────────
 * Cada cara se dibuja en una caja normalizada de 100 × 126 que representa EL CRÁNEO: (0,0) es la
 * coronilla por su lado izquierdo y (100,126) la barbilla por el derecho. `MuscleMap` la coloca
 * sobre la cabeza de la lámina que toque con `lib/faceTransform.ts` (ver `HEAD_BOX` en
 * `components/MuscleMap.tsx`), así que estos dibujos no saben nada de los dos cuerpos ni de sus
 * viewBox distintos.
 *
 * 126 y no 168 (la versión anterior): la relación 100×168 venía de una medida de la cabeza femenina
 * que resultó estar mal — incluía el moño del peinado de la lámina, no sólo la cara (ver el
 * historial de `HEAD_BOX` en `MuscleMap.tsx`) — y encima `MuscleMap` encajaba esta caja estirando
 * x e y por SEPARADO para llenar el rectángulo exacto de cada cuerpo. Con dos cabezas de
 * proporciones bien distintas (masculina bastante más alta que ancha, femenina casi cuadrada una
 * vez medida bien), estirar por separado deformaba la cara — sobre todo en la femenina, ancha y
 * aplastada. Los dos problemas se arreglan juntos: `getFaceTransform` ahora escala con un único
 * factor (el menor de los dos, nunca estira un eje más que el otro) y esta caja pasa a 100×126,
 * la media geométrica de las dos cabezas ya bien medidas — dejando algo de aire a los lados o
 * arriba/abajo según el cuerpo, pero la cara nunca estirada.
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
  return <path d="M50 62 L45 84 Q50 88 56 83" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />;
}

/** Nariz femenina: más estrecha y baja que la versión masculina. */
function FemaleNose(): ReactNode {
  return <path d="M50 76 L47 90 Q50 93 54 90" fill="none" stroke={INK} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />;
}

export interface FaceStyle {
  /** Se guarda en el perfil (`user.faceStyle`), así que no debe cambiar una vez publicado. */
  id: string;
  name: string;
  /** Dibujo de la expresión masculina: cejas + ojos + nariz + boca sobre la cabeza calva. */
  front: () => ReactNode;
  /** Dibujo de la misma expresión para el cuerpo femenino, con geometría propia. */
  frontFemale: () => ReactNode;
}

export const FACE_STYLES: FaceStyle[] = [
  {
    id: 'neutral',
    name: 'Neutro',
    front: () => (
      <g>
        <path d="M18 50 Q31 44 44 49" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M56 49 Q69 44 82 50" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />

        <circle cx="33" cy="58" r="5.6" fill={INK} />
        <circle cx="67" cy="58" r="5.6" fill={INK} />
        <circle cx="34.7" cy="55.9" r="1.6" fill="#ffffff" />
        <circle cx="68.7" cy="55.9" r="1.6" fill="#ffffff" />

        <Nose />

        <path d="M36 96 Q50 100 64 96" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      </g>
    ),
    frontFemale: () => (
      <g>
        <path d="M21 57 Q31 52 42 56" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M58 56 Q69 52 79 57" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />

        <path d="M25 69 Q33 64 41 69 Q33 73 25 69" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M59 69 Q67 64 75 69 Q67 73 59 69" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="33" cy="68.5" r="2.3" fill={INK} />
        <circle cx="67" cy="68.5" r="2.3" fill={INK} />

        <FemaleNose />

        <path d="M43 104 Q50 106 57 104" fill="none" stroke={INK} strokeWidth="2.1" strokeLinecap="round" />
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
        <path d="M18 44 Q31 36 44 42" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M56 42 Q69 36 82 44" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />

        {/* Ojos en arco (^ ^), no círculos rellenos: es el atajo visual universal de "sonriendo con
            los ojos", y sin rellenar deja hueco a que se lea como entrecerrado por la sonrisa. */}
        <path d="M25 59 Q33 51 41 59" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M59 59 Q67 51 75 59" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />

        <Nose />

        {/* Boca bien abierta hacia abajo: la curva de 'Neutro' amplificada, no una forma nueva. */}
        <path d="M31 92 Q50 111 69 92" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      </g>
    ),
    frontFemale: () => (
      <g>
        <path d="M21 54 Q31 48 42 54" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M58 54 Q69 48 79 54" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />

        <path d="M25 70 Q33 64 41 70" fill="none" stroke={INK} strokeWidth="2.3" strokeLinecap="round" />
        <path d="M59 70 Q67 64 75 70" fill="none" stroke={INK} strokeWidth="2.3" strokeLinecap="round" />

        <FemaleNose />

        <path d="M40 103 Q50 111 60 103 Q57 109 50 111 Q43 109 40 103" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
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
        <path d="M19 42 L43 51" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M81 42 L57 51" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />

        {/* Ojos entrecerrados: elipses achatadas en vez de círculos, sin brillo — la mirada fija
            de quien está concentrado no tiene el punto de luz "vivo" de las otras expresiones. */}
        <ellipse cx="33" cy="59" rx="6.2" ry="3.2" fill={INK} />
        <ellipse cx="67" cy="59" rx="6.2" ry="3.2" fill={INK} />

        <Nose />

        {/* Boca recta: ni sonrisa ni mueca, la línea plana de quien está a lo suyo. */}
        <path d="M38 98 L62 98" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
      </g>
    ),
    frontFemale: () => (
      <g>
        <path d="M21 57 L42 63" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M79 57 L58 63" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />

        <path d="M25 70 Q33 67 41 70" fill="none" stroke={INK} strokeWidth="2.3" strokeLinecap="round" />
        <path d="M59 70 Q67 67 75 70" fill="none" stroke={INK} strokeWidth="2.3" strokeLinecap="round" />

        <FemaleNose />

        <path d="M43 106 L57 106" fill="none" stroke={INK} strokeWidth="2.1" strokeLinecap="round" />
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
        <path d="M18 43 Q31 35 44 41" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
        <path d="M56 49 Q69 44 82 50" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />

        {/* Ojo izquierdo cerrado en un guiño, derecho abierto como en 'Neutro'. */}
        <path d="M25 58 Q33 62 41 58" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
        <circle cx="67" cy="58" r="5.6" fill={INK} />
        <circle cx="68.7" cy="55.9" r="1.6" fill="#ffffff" />

        <Nose />

        {/* Sonrisa torcida: sube más por el lado del ojo abierto, nunca simétrica. */}
        <path d="M34 95 Q51 106 65 91" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
    frontFemale: () => (
      <g>
        <path d="M21 53 Q31 47 42 53" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M58 56 Q69 52 79 57" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />

        <path d="M25 69 Q33 73 41 69" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
        <path d="M59 69 Q67 64 75 69 Q67 73 59 69" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="67" cy="68.5" r="2.3" fill={INK} />

        <FemaleNose />

        <path d="M42 104 Q51 111 59 102" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    ),
  },
];

/** Cara por defecto de quien no ha elegido ninguna. */
export const DEFAULT_FACE_STYLE_ID = 'neutral';

/** La caja normalizada en la que están dibujadas todas las caras. La necesita quien las coloque. */
export const FACE_VIEW_BOX = { width: 100, height: 126 };

/** Devuelve la geometría adecuada para el cuerpo sin duplicar el selector de expresiones. */
export function renderFace(style: FaceStyle, bodySex: 'male' | 'female'): ReactNode {
  return bodySex === 'female' ? style.frontFemale() : style.front();
}

/**
 * Resuelve un id guardado a su estilo. Cae al de por defecto ante un id desconocido — un perfil
 * viejo (o uno con un estilo que se haya retirado, p.ej. los peinados de antes de que la cara
 * pasara a ser sólo expresión) tiene que seguir dibujando una cara, no un hueco.
 */
export function getFaceStyle(id?: string | null): FaceStyle {
  return FACE_STYLES.find((s) => s.id === id) ?? FACE_STYLES.find((s) => s.id === DEFAULT_FACE_STYLE_ID)!;
}
