import { useId, type ReactNode } from 'react';

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
 * El pelo PUEDE salirse de la caja (las puntas van por encima de y=0). Es intencionado y no hace
 * falta recortar nada: en la lámina la cabeza tiene aire de sobra por arriba.
 *
 * ── Cómo se dibuja una masa de pelo (importa, dos bugs reales ya pasaron aquí) ────────────────
 * Un casco de pelo se traza en UNA sola vuelta que no se cruza consigo misma: se sube por el borde
 * exterior desde la sien izquierda hasta la coronilla, se baja por el exterior hasta la sien
 * derecha, y se vuelve de derecha a izquierda por la LÍNEA DEL PELO (el borde de abajo).
 *
 * 1) Esa vuelta de vuelta (la línea del pelo) tiene que quedarse SIEMPRE por debajo de y≈44 y por
 *    encima de y≈58 en TODO su recorrido — nunca subir hacia la coronilla en el centro. La primera
 *    versión hacía justo eso (el control de la curva central subía a y≈28) y el resultado, con las
 *    cejas en y=66, era una frente enorme con pelo solo en las sienes: se leía como entradas de
 *    calvicie en vez de pelo. La línea del pelo casi plana (variación de ±8, no de ±25) es la que
 *    de verdad se lee como "esto tiene pelo".
 * 2) Bajar por fuera, subir por dentro y volver a bajar por fuera SE AUTO-INTERSECTA: la regla de
 *    relleno `nonzero` cancela el interior y el pelo sale como un aro fino en vez de una masa. Un
 *    agujero en el centro del peinado es siempre esto.
 *
 * ── Las orejas no se dibujan aquí ──────────────────────────────────────────────────────────────
 * Ya vienen en la silueta de `data/muscleMapPaths*.ts`, cada una en su sitio anatómico. Volver a
 * pintarlas aquí las duplicaría y, peor, las descolocaría en uno de los dos cuerpos.
 *
 * ── Color ─────────────────────────────────────────────────────────────────────────────────────
 * Tinta oscura fija, sin depender del tema: la cabeza SIEMPRE es clara (`silhouetteFill` en
 * MuscleMap es blanco en oscuro y casi blanco en claro), así que el contraste está garantizado en
 * los dos modos y un color reactivo al tema sólo podría empeorarlo.
 *
 * ── Por qué el pelo lleva un filtro de contorno (`HairMass`) ─────────────────────────────────
 * El pelo (`HAIR`, casi negro) sólo se lee bien contra la cabeza BLANCA. En cuanto una punta o un
 * mechón sobresale de la cabeza —Puntas, Flequillo— queda contra el fondo de la tarjeta, que en
 * tema oscuro es casi tan negro como el propio pelo: esa parte desaparece. `HairMass` envuelve las
 * formas de pelo (nunca `Features`, que ya tiene su propio contraste) en un filtro que dilata la
 * silueta y la rellena de `STRAND` por detrás, así el borde se ve SIEMPRE, sea cual sea el fondo.
 */

const INK = '#1b1b1b';
const HAIR = '#151515';
/** Mechones: el mismo negro no se distingue de la masa, un gris medio sí insinúa volumen. */
const STRAND = '#3d3d3d';

/**
 * Nuca vista desde detrás: cúpula rellena desde la coronilla hasta el nacimiento del pelo.
 * Se queda en y≈122 de 168 a propósito — por debajo empieza la mandíbula, que el pelo no tapa.
 */
const BACK_DOME = 'M2 54 C2 10 22 -8 50 -8 C78 -8 98 10 98 54 C98 84 94 106 88 122 L12 122 C6 106 2 84 2 54 Z';

/**
 * Envoltorio de toda forma de pelo (nunca de `Features`): dilata la silueta del contenido y la
 * rellena de `STRAND` por detrás, de modo que el pelo lleve siempre un borde visible, se recorte
 * sobre la cabeza blanca o sobre el fondo oscuro de la tarjeta.
 *
 * Un `id` único por instancia es obligatorio: sin él, dos peinados en la misma página (el frontal y
 * el posterior, o dos estilos en un selector) compartirían el primer filtro que se montara.
 */
function HairMass({ children }: { children: ReactNode }): ReactNode {
  const id = useId().replace(/:/g, '');
  const filterId = `hair-outline-${id}`;
  return (
    <>
      <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
        <feMorphology operator="dilate" radius="1.6" in="SourceAlpha" result="dilated" />
        <feFlood floodColor={STRAND} result="strandColor" />
        <feComposite in="strandColor" in2="dilated" operator="in" result="outline" />
        <feMerge>
          <feMergeNode in="outline" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <g filter={`url(#${filterId})`}>{children}</g>
    </>
  );
}

/** Rasgos comunes a todas las caras: cejas, ojos, nariz y boca. El pelo es lo único que cambia. */
function Features(): ReactNode {
  return (
    <g>
      <path d="M19 67 Q31 60 43 66" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M57 66 Q69 60 81 67" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />

      <circle cx="33" cy="81" r="5.4" fill={INK} />
      <circle cx="67" cy="81" r="5.4" fill={INK} />
      <circle cx="34.8" cy="78.8" r="1.6" fill="#ffffff" />
      <circle cx="68.8" cy="78.8" r="1.6" fill="#ffffff" />

      <path d="M50 88 L45 112 Q50 116 56 111" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />

      <path d="M37 132 Q50 137 63 132" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
    </g>
  );
}

export interface FaceStyle {
  /** Se guarda en el perfil (`user.faceStyle`), así que no debe cambiar una vez publicado. */
  id: string;
  name: string;
  /** Vista frontal: pelo + rasgos. */
  front: () => ReactNode;
  /** Vista posterior: sólo pelo, visto desde detrás. Vacío en el rapado. */
  back: () => ReactNode;
}

export const FACE_STYLES: FaceStyle[] = [
  {
    id: 'bald',
    name: 'Rapado',
    front: () => <Features />,
    // Nuca lisa: la silueta de la lámina ya la dibuja. Sin pelo no hay nada que añadir, y una
    // sombra inventada aquí sería un adorno que el resto del cuerpo no tiene.
    back: () => null,
  },
  {
    id: 'combed',
    name: 'Peinado',
    front: () => (
      <g>
        {/* Línea del pelo casi plana en y48-56, con un pico de raya a la derecha (x≈64) donde sube
            un poco más y un seno a la izquierda (x≈30) donde baja: la asimetría es lo que lee como
            "peinado hacia un lado" en vez de un casco genérico. */}
        <HairMass>
          <path
            d="M2 56 C2 12 22 -8 50 -8 C78 -8 98 12 98 56
               C92 50 82 44 70 44 C64 44 66 50 60 52
               C54 54 52 48 46 47 C36 46 26 48 18 54
               C10 58 4 60 2 56 Z"
            fill={HAIR}
          />
        </HairMass>
        <path d="M22 40 Q46 22 68 32" fill="none" stroke={STRAND} strokeWidth="3" strokeLinecap="round" opacity="0.75" />
        <path d="M16 48 Q42 30 74 40" fill="none" stroke={STRAND} strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
        <Features />
      </g>
    ),
    back: () => (
      <g>
        <HairMass>
          <path d={BACK_DOME} fill={HAIR} />
        </HairMass>
        <path d="M50 2 Q26 40 16 114" fill="none" stroke={STRAND} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
        <path d="M52 2 Q46 44 42 120" fill="none" stroke={STRAND} strokeWidth="2.6" strokeLinecap="round" opacity="0.5" />
        <path d="M54 2 Q68 42 78 116" fill="none" stroke={STRAND} strokeWidth="2.6" strokeLinecap="round" opacity="0.5" />
        <path d="M56 4 Q84 40 90 108" fill="none" stroke={STRAND} strokeWidth="2.2" strokeLinecap="round" opacity="0.45" />
      </g>
    ),
  },
  {
    id: 'curly',
    name: 'Rizado',
    front: () => (
      <g>
        {/* Base plana igual que las demás (misma línea del pelo en y48-56); el rizo es sólo textura
            de círculos ENCIMA del borde, nunca el borde en sí — así no puede romper la silueta.
            Los círculos se centran DENTRO de la masa ya sólida (no flotando por encima de ella) y
            con radio generoso: sólo así el bulto sobresale de un borde continuo en vez de dejar un
            hueco entre "la base" y "las bolas". Un radio corto centrado en el borde exacto es lo
            que causó el hueco de la primera versión — de sobra vale más que de menos aquí. */}
        <HairMass>
          <path
            d="M2 54 C2 10 22 -8 50 -8 C78 -8 98 10 98 54
               C92 46 80 40 66 40 C58 40 52 44 50 50
               C48 44 42 40 34 40 C20 40 8 46 2 54 Z"
            fill={HAIR}
          />
          <circle cx="50" cy="8" r="17" fill={HAIR} />
          <circle cx="25" cy="16" r="14" fill={HAIR} />
          <circle cx="75" cy="16" r="14" fill={HAIR} />
          <circle cx="9" cy="30" r="12" fill={HAIR} />
          <circle cx="91" cy="30" r="12" fill={HAIR} />
          <circle cx="38" cy="5" r="13" fill={HAIR} />
          <circle cx="62" cy="5" r="13" fill={HAIR} />
        </HairMass>
        {/* Textura de rizo arriba, en la coronilla — lejos de la banda y75-85 de los ojos. Centrada
            y no espejada en x33/x67 (las posiciones de los ojos) para que no se lea como una
            segunda mirada. */}
        <circle cx="50" cy="2" r="7" fill={STRAND} opacity="0.28" />
        <circle cx="34" cy="8" r="6" fill={STRAND} opacity="0.24" />
        <circle cx="66" cy="8" r="6" fill={STRAND} opacity="0.24" />
        <Features />
      </g>
    ),
    back: () => (
      <g>
        <HairMass>
          <path d={BACK_DOME} fill={HAIR} />
          <circle cx="50" cy="6" r="18" fill={HAIR} />
          <circle cx="24" cy="14" r="15" fill={HAIR} />
          <circle cx="76" cy="14" r="15" fill={HAIR} />
          <circle cx="7" cy="32" r="13" fill={HAIR} />
          <circle cx="93" cy="32" r="13" fill={HAIR} />
          <circle cx="10" cy="60" r="11" fill={HAIR} />
          <circle cx="90" cy="60" r="11" fill={HAIR} />
          <circle cx="16" cy="88" r="10" fill={HAIR} />
          <circle cx="84" cy="88" r="10" fill={HAIR} />
        </HairMass>
        <circle cx="50" cy="0" r="8" fill={STRAND} opacity="0.24" />
        <circle cx="30" cy="10" r="7" fill={STRAND} opacity="0.2" />
        <circle cx="70" cy="10" r="7" fill={STRAND} opacity="0.2" />
      </g>
    ),
  },
  {
    id: 'fringe',
    name: 'Flequillo',
    front: () => (
      <g>
        {/* La línea del pelo sigue en la misma banda y48-56; el flequillo son dientes CORTOS (8-10
            unidades) colgando de ella, no un borde nuevo — el diente más largo no baja de y58. */}
        <HairMass>
          <path
            d="M2 54 C2 10 22 -8 50 -8 C78 -8 98 10 98 54 L98 50
               L91 58 L84 49 L77 58 L70 49 L63 58 L56 49 L50 58 L44 49 L37 58 L30 49 L23 58 L16 49 L9 56 L2 50 Z"
            fill={HAIR}
          />
        </HairMass>
        <path d="M20 20 Q44 6 74 16" fill="none" stroke={STRAND} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
        <Features />
      </g>
    ),
    back: () => (
      <g>
        <HairMass>
          <path
            d="M2 52 C2 10 22 -8 50 -8 C78 -8 98 10 98 52 C98 84 94 106 88 122
               L81 112 L74 123 L67 112 L60 124 L53 112 L46 124 L39 112 L32 123 L25 112 L18 122
               C10 106 2 84 2 52 Z"
            fill={HAIR}
          />
        </HairMass>
        <path d="M50 4 Q26 42 16 108" fill="none" stroke={STRAND} strokeWidth="2.8" strokeLinecap="round" opacity="0.45" />
        <path d="M52 4 Q50 48 46 116" fill="none" stroke={STRAND} strokeWidth="2.4" strokeLinecap="round" opacity="0.4" />
        <path d="M54 4 Q74 44 84 108" fill="none" stroke={STRAND} strokeWidth="2.4" strokeLinecap="round" opacity="0.4" />
      </g>
    ),
  },
  {
    id: 'spiky',
    name: 'Puntas',
    front: () => (
      <g>
        {/* Cada punta es un TRIÁNGULO con base ancha (12 de ancho), no una línea en zigzag: un
            zigzag de picos da vértices agudos que a este tamaño se ven como una hebra, casi
            invisibles. La base de cada triángulo se planta bien dentro del casco (y=6, muy por
            debajo de su borde superior en y≈-8) para que se solape de sobra y no deje hueco. */}
        <HairMass>
          <path
            d="M2 54 C2 10 22 -8 50 -8 C78 -8 98 10 98 54
               C92 46 80 40 66 40 C58 40 52 44 50 50
               C48 44 42 40 34 40 C20 40 8 46 2 54 Z"
            fill={HAIR}
          />
          <path d="M20 6 L26 -22 L32 6 Z" fill={HAIR} />
          <path d="M36 6 L41 -28 L47 6 Z" fill={HAIR} />
          <path d="M44 6 L50 -24 L56 6 Z" fill={HAIR} />
          <path d="M53 6 L59 -28 L65 6 Z" fill={HAIR} />
          <path d="M68 6 L74 -22 L80 6 Z" fill={HAIR} />
        </HairMass>
        <path d="M24 4 L26 -14 L29 4 Z" fill={STRAND} opacity="0.4" />
        <path d="M56 4 L59 -16 L62 4 Z" fill={STRAND} opacity="0.36" />
        <Features />
      </g>
    ),
    back: () => (
      <g>
        <HairMass>
          <path d={BACK_DOME} fill={HAIR} />
          <path d="M20 6 L26 -22 L32 6 Z" fill={HAIR} />
          <path d="M36 6 L41 -28 L47 6 Z" fill={HAIR} />
          <path d="M44 6 L50 -24 L56 6 Z" fill={HAIR} />
          <path d="M53 6 L59 -28 L65 6 Z" fill={HAIR} />
          <path d="M68 6 L74 -22 L80 6 Z" fill={HAIR} />
        </HairMass>
        <path d="M30 8 Q26 62 20 114" fill="none" stroke={STRAND} strokeWidth="2.8" strokeLinecap="round" opacity="0.4" />
        <path d="M52 6 Q50 62 48 120" fill="none" stroke={STRAND} strokeWidth="2.4" strokeLinecap="round" opacity="0.36" />
        <path d="M72 8 Q78 62 82 114" fill="none" stroke={STRAND} strokeWidth="2.4" strokeLinecap="round" opacity="0.36" />
      </g>
    ),
  },
];

/** Cara por defecto de quien no ha elegido ninguna. Es la más neutra: sin pelo que insinúe nada. */
export const DEFAULT_FACE_STYLE_ID = 'bald';

/** La caja normalizada en la que están dibujadas todas las caras. La necesita quien las coloque. */
export const FACE_VIEW_BOX = { width: 100, height: 168 };

/**
 * Resuelve un id guardado a su estilo. Cae al de por defecto ante un id desconocido — un perfil
 * viejo (o uno con un estilo que se haya retirado) tiene que seguir dibujando una cabeza, no un
 * hueco.
 */
export function getFaceStyle(id?: string | null): FaceStyle {
  return FACE_STYLES.find((s) => s.id === id) ?? FACE_STYLES.find((s) => s.id === DEFAULT_FACE_STYLE_ID)!;
}
