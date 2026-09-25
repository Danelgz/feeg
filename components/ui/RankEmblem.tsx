import { useId, type ReactNode } from 'react';

/**
 * Insignias de rango de FEEG: una familia vectorial, no treinta ilustraciones sueltas.
 *
 * Todas se construyen igual sobre un lienzo de 64×64, y eso es lo que las hace leerse como un
 * sistema y no como un catálogo de pegatinas:
 *
 *   1. MARCO — la silueta. Es lo que identifica el rango incluso a 16px, así que cada rango tiene
 *      una distinta y su complejidad crece con la escalera: círculo → hexágono → escudo → octógono
 *      → rombo → medalla → sello → escudo alado → corona de pinchos → sol.
 *   2. CANTO — la misma silueta rellena de un degradado metálico en diagonal (luz arriba-izquierda).
 *   3. CARA — la silueta escalada al 80% sobre su centro, con el color profundo del rango y un
 *      brillo superior. Escalar la misma forma (en vez de dibujar una segunda) garantiza que el
 *      canto tenga el mismo grosor en todo el contorno.
 *   4. SÍMBOLO — un glifo de 24×24 sobre la cara, con una sombra de 1px para despegarlo.
 *   5. ESCALÓN — tres puntos bajo el símbolo; se encienden 1, 2 o 3. Se lee sin descifrar un
 *      número romano diminuto y dice a la vez "dónde estás" y "cuánto queda en este rango".
 *
 * Sin texto, sin trama y sin efectos que dependan de la resolución: se ve igual de nítida en una
 * fila de lista (18px) que como titular (120px). Por debajo de 22px los puntos de escalón se
 * omiten porque serían ruido de un píxel.
 */

type Shape =
  | 'circle'
  | 'hexagon'
  | 'shield'
  | 'octagon'
  | 'diamond'
  | 'medal'
  | 'seal'
  | 'wingedShield'
  | 'crest'
  | 'sun';

type Glyph = 'plate' | 'dumbbell' | 'kettlebell' | 'flame' | 'summit' | 'bolt' | 'crown' | 'gem' | 'helmet' | 'star';

interface EmblemSpec {
  shape: Shape;
  glyph: Glyph;
  /** Canto metálico: luz, medio, sombra. */
  rim: [string, string, string];
  /** Cara: arriba, abajo. */
  face: [string, string];
  /** Color del símbolo y de los puntos de escalón. */
  ink: string;
  /** Color de los adornos que quedan por detrás del marco (cintas, alas, rayos). */
  ornament?: [string, string];
}

// Índice = RankDefinition.index. Paletas elegidas para que el canto se lea como metal (tres tonos
// del mismo tinte) y la cara como esmalte (dos tonos profundos), no como neón.
const EMBLEMS: EmblemSpec[] = [
  { shape: 'circle', glyph: 'plate', rim: ['#f5f6f7', '#aeb3b9', '#555a61'], face: ['#50555c', '#24272b'], ink: '#eef0f2' },
  { shape: 'hexagon', glyph: 'dumbbell', rim: ['#dcfbe8', '#43cf88', '#136b40'], face: ['#1f8a55', '#0a3a23'], ink: '#eafff3' },
  { shape: 'shield', glyph: 'kettlebell', rim: ['#dfeeff', '#5ea4f2', '#1a4d94'], face: ['#2a6fd1', '#0e2d63'], ink: '#eef6ff' },
  { shape: 'octagon', glyph: 'flame', rim: ['#d8fbff', '#3fc8e0', '#0b5e6f'], face: ['#128ea6', '#063748'], ink: '#e9fdff' },
  { shape: 'diamond', glyph: 'summit', rim: ['#f0e4ff', '#ab7df3', '#48208c'], face: ['#6c35d2', '#280e5e'], ink: '#f6efff' },
  {
    shape: 'medal',
    glyph: 'bolt',
    rim: ['#fff2c6', '#e3b54a', '#8a6212'],
    face: ['#d6306b', '#63092b'],
    ink: '#fff3f7',
    ornament: ['#e0457c', '#7a0c35'],
  },
  { shape: 'seal', glyph: 'crown', rim: ['#ffe8c8', '#f19a3e', '#8a4309'], face: ['#d86a14', '#592302'], ink: '#fff5e8' },
  {
    shape: 'wingedShield',
    glyph: 'gem',
    rim: ['#fff7d2', '#f4c645', '#986808'],
    face: ['#2160c0', '#0a214f'],
    ink: '#fff8da',
    ornament: ['#fbe08a', '#b07f12'],
  },
  {
    shape: 'crest',
    glyph: 'helmet',
    rim: ['#9aa0aa', '#40444c', '#111215'],
    face: ['#2c0c10', '#0c0304'],
    ink: '#ff4d40',
    ornament: ['#ff4d40', '#8a1109'],
  },
  {
    shape: 'sun',
    glyph: 'star',
    rim: ['#ffffff', '#f4df98', '#ad872c'],
    face: ['#3a2b92', '#110a38'],
    ink: '#fff9e3',
    ornament: ['#fff1bf', '#d7ae45'],
  },
];

type Pt = [number, number];

/** Polígono con esquinas redondeadas: cada vértice se sustituye por una curva de radio `r`. */
function roundedPolygon(points: Pt[], r: number): string {
  const n = points.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const [px, py] = points[(i - 1 + n) % n];
    const [cx, cy] = points[i];
    const [nx, ny] = points[(i + 1) % n];
    const toward = (ax: number, ay: number): Pt => {
      const len = Math.hypot(ax - cx, ay - cy);
      const k = Math.min(r, len / 2) / len;
      return [cx + (ax - cx) * k, cy + (ay - cy) * k];
    };
    const a = toward(px, py);
    const b = toward(nx, ny);
    d += `${i === 0 ? 'M' : 'L'}${a[0].toFixed(2)} ${a[1].toFixed(2)}Q${cx} ${cy} ${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
  }
  return `${d}Z`;
}

function regular(n: number, radius: number, cx: number, cy: number, startDeg: number): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = ((startDeg + (360 / n) * i) * Math.PI) / 180;
    return [+(cx + radius * Math.cos(a)).toFixed(2), +(cy + radius * Math.sin(a)).toFixed(2)] as Pt;
  });
}

function starPoints(n: number, outer: number, inner: number, cx: number, cy: number, startDeg = -90): Pt[] {
  return Array.from({ length: n * 2 }, (_, i) => {
    const a = ((startDeg + (180 / n) * i) * Math.PI) / 180;
    const r = i % 2 ? inner : outer;
    return [+(cx + r * Math.cos(a)).toFixed(2), +(cy + r * Math.sin(a)).toFixed(2)] as Pt;
  });
}

const circle = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r}a${r} ${r} 0 1 1 0 ${2 * r}a${r} ${r} 0 1 1 0 ${-2 * r}Z`;

const HERALDIC_SHIELD = 'M32 5L52 10.6Q55 11.5 55 14.6V30C55 44.5 45.5 53.8 32 60 18.5 53.8 9 44.5 9 30V14.6Q9 11.5 12 10.6Z';

interface ShapeGeometry {
  /** Silueta del marco. */
  path: string;
  /** Centro sobre el que se escala la cara. */
  origin: Pt;
  /** Escala de la cara respecto al marco. */
  faceScale: number;
  /** Escala del conjunto marco+cara (los que llevan adornos por fuera se encogen para caber). */
  bodyScale: number;
  /** Centro vertical del símbolo y altura de los puntos de escalón, en coordenadas del lienzo. */
  glyphY: number;
  glyphSize: number;
  pipsY: number;
}

// Calculado una vez: las siluetas no dependen de ninguna prop.
const GEOMETRY: Record<Shape, ShapeGeometry> = {
  circle: { path: circle(32, 32, 27), origin: [32, 32], faceScale: 0.8, bodyScale: 1, glyphY: 29, glyphSize: 25, pipsY: 46 },
  hexagon: {
    path: roundedPolygon(regular(6, 29, 32, 32, -90), 5),
    origin: [32, 32],
    faceScale: 0.8,
    bodyScale: 1,
    glyphY: 29,
    glyphSize: 25,
    pipsY: 45,
  },
  shield: { path: HERALDIC_SHIELD, origin: [32, 31], faceScale: 0.8, bodyScale: 1, glyphY: 27.5, glyphSize: 23, pipsY: 43.5 },
  octagon: {
    path: roundedPolygon(regular(8, 29, 32, 32, -67.5), 4),
    origin: [32, 32],
    faceScale: 0.8,
    bodyScale: 1,
    glyphY: 29,
    glyphSize: 24,
    pipsY: 45,
  },
  diamond: {
    path: roundedPolygon([[32, 2.5], [61.5, 32], [32, 61.5], [2.5, 32]], 7),
    origin: [32, 32],
    faceScale: 0.8,
    bodyScale: 1,
    glyphY: 29.5,
    glyphSize: 21,
    pipsY: 42.5,
  },
  medal: { path: circle(32, 37, 23.5), origin: [32, 37], faceScale: 0.8, bodyScale: 1, glyphY: 34.5, glyphSize: 21, pipsY: 49 },
  seal: {
    path: roundedPolygon(starPoints(12, 30, 26.2, 32, 32, -90), 1.6),
    origin: [32, 32],
    faceScale: 0.78,
    bodyScale: 1,
    glyphY: 29,
    glyphSize: 23,
    pipsY: 45,
  },
  wingedShield: { path: HERALDIC_SHIELD, origin: [32, 31], faceScale: 0.8, bodyScale: 0.8, glyphY: 29, glyphSize: 18.5, pipsY: 41.5 },
  crest: {
    // Hexágono con seis puntas: agresivo sin ser una estrella de videojuego.
    path: roundedPolygon(starPoints(6, 31, 23.5, 32, 32, -90), 1.4),
    origin: [32, 32],
    faceScale: 0.76,
    bodyScale: 1,
    glyphY: 30,
    glyphSize: 21,
    pipsY: 44.5,
  },
  sun: { path: circle(32, 32, 21), origin: [32, 32], faceScale: 0.8, bodyScale: 1, glyphY: 30, glyphSize: 19, pipsY: 43 },
};

/** Símbolos sobre una rejilla de 24×24. `cut` es el color de la cara, para vaciar detalles. */
function renderGlyph(glyph: Glyph, ink: string, cut: string): ReactNode {
  switch (glyph) {
    case 'plate':
      return (
        <>
          <circle cx="12" cy="12" r="9" fill="none" stroke={ink} strokeWidth="2.6" />
          <circle cx="12" cy="12" r="4.4" fill="none" stroke={ink} strokeWidth="1.5" />
          <circle cx="12" cy="12" r="1.7" fill={ink} />
        </>
      );
    case 'dumbbell':
      return (
        <>
          <rect x="6.5" y="10.9" width="11" height="2.2" rx="1.1" fill={ink} />
          <rect x="3.6" y="6.4" width="3.4" height="11.2" rx="1.3" fill={ink} />
          <rect x="17" y="6.4" width="3.4" height="11.2" rx="1.3" fill={ink} />
          <rect x="1.2" y="8.8" width="2.8" height="6.4" rx="1" fill={ink} />
          <rect x="20" y="8.8" width="2.8" height="6.4" rx="1" fill={ink} />
        </>
      );
    case 'kettlebell':
      return (
        <>
          {/* El asa más ancha que el cuerpo es lo que la separa de un candado. */}
          <path d="M6.6 11.2C5.2 4.6 7.6 2.6 12 2.6s6.8 2 5.4 8.6" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
          <path d="M12 8.4c4.1 0 7.3 3 7.3 6.9 0 2.4-1 4.4-2.7 5.6H7.4c-1.7-1.2-2.7-3.2-2.7-5.6 0-3.9 3.2-6.9 7.3-6.9z" fill={ink} />
          <path d="M9.4 13.2a3.4 3.4 0 0 1 2.6-1.4" fill="none" stroke={cut} strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
        </>
      );
    case 'flame':
      return (
        <>
          <path
            d="M12 1.8c1.4 3.8 6.6 6.3 6.6 12a6.6 6.6 0 0 1-13.2 0c0-2.9 1.5-5 3.1-6.7.3 1.7 1.1 2.8 2.3 3.4C10.4 7.4 10.9 4.6 12 1.8z"
            fill={ink}
          />
          <path d="M12 12.4c1 1.4 2.6 2.4 2.6 4.3a2.6 2.6 0 0 1-5.2 0c0-1.1.6-2 1.3-2.7.2.6.6.9 1 1.1 0-1.1.1-1.9.3-2.7z" fill={cut} />
        </>
      );
    case 'summit':
      return (
        <>
          <path d="M1.8 20.5L9.6 7.6l3.6 5.6 2.4-3.3 6.6 10.6z" fill={ink} />
          <path d="M9.6 7.6l-2.3 3.8 1.4-.7 1 .9 1-.9 1 .6z" fill={cut} opacity="0.55" />
          <path d="M9.6 7.8V2.6l4.6 1.7-4.6 1.7" fill="none" stroke={ink} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        </>
      );
    case 'bolt':
      return <path d="M13.6 1.8L4.4 13.6h6.3l-1.5 8.6 10.4-12.6h-6.4l.4-7.8z" fill={ink} strokeLinejoin="round" />;
    case 'crown':
      return (
        <>
          <path d="M2.6 7.2l5 4.3L12 4l4.4 7.5 5-4.3-2 10.6H4.6z" fill={ink} strokeLinejoin="round" />
          <rect x="4.6" y="18.9" width="14.8" height="2.6" rx="1.1" fill={ink} />
          <circle cx="12" cy="13.8" r="1.6" fill={cut} opacity="0.6" />
        </>
      );
    case 'gem':
      return (
        <>
          <path d="M6.6 3.4h10.8l4.6 6.2L12 21.4 2 9.6z" fill={ink} />
          <path d="M2 9.6h20M9.2 3.4L7.6 9.6 12 21.4l4.4-11.8-1.6-6.2" fill="none" stroke={cut} strokeWidth="1.1" strokeLinejoin="round" opacity="0.55" />
        </>
      );
    case 'helmet':
      return (
        <>
          {/* Casco corintio: la ranura en T es lo que lo hace reconocible a cualquier tamaño. */}
          <path d="M12 2.4c-5 0-8.4 3.7-8.4 8.8v9.3l4.2 1.8v-6.4h8.4v6.4l4.2-1.8v-9.3c0-5.1-3.4-8.8-8.4-8.8z" fill={ink} />
          <path d="M6.2 10.4h11.6v2.4h-4.5v5.6h-2.6v-5.6H6.2z" fill={cut} />
        </>
      );
    case 'star':
      return <path d={roundedPolygon(starPoints(5, 11, 4.6, 12, 12.6), 0.9)} fill={ink} />;
  }
}

/** Adornos por detrás del marco. Se definen del lado izquierdo y el derecho es su espejo. */
function renderOrnament(shape: Shape, fill: string): ReactNode {
  switch (shape) {
    case 'medal':
      return (
        <>
          <path d="M17.5 1.5h10.2l6.2 16.6H23.7z" fill={fill} />
          <path d="M46.5 1.5H36.3l-6.2 16.6h10.2z" fill={fill} />
          <path d="M17.5 1.5h10.2l1.3 3.4H18.8z" fill="#000" opacity="0.18" />
        </>
      );
    case 'wingedShield': {
      const wing = 'M17 14.5C10 11.6 4.4 12.4.8 16.6c4.2-.5 7.6 0 10.3 1.4-4.9 1-8.4 3.6-10.5 7.2 4.1-1 7.6-1 10.6 0-4 2-6.7 5.2-7.8 9.2 3.7-2.2 7.6-3.3 11.8-3.2C14 36 15.5 39.2 18 41.5z';
      return (
        <>
          <path d={wing} fill={fill} />
          <path d={wing} fill={fill} transform="translate(64 0) scale(-1 1)" />
        </>
      );
    }
    case 'sun':
      return <path d={roundedPolygon(starPoints(16, 31.5, 22, 32, 32, -90), 0.8)} fill={fill} />;
    default:
      return null;
  }
}

interface RankEmblemProps {
  /** RankDefinition.index (0 = Principiante … 9 = Leyenda). */
  rankIndex: number;
  /** Escalón 1-3 dentro del rango. */
  tier?: number;
  size?: number;
  /** Sin brillo animado (Leyenda). También respeta `prefers-reduced-motion` desde fuera. */
  animated?: boolean;
  /** Apagada: para rangos aún no alcanzados en la escalera. */
  locked?: boolean;
  title?: string;
}

export default function RankEmblem({ rankIndex, tier = 1, size = 24, animated = false, locked = false, title }: RankEmblemProps) {
  const uid = useId().replace(/:/g, '');
  const spec = EMBLEMS[Math.max(0, Math.min(EMBLEMS.length - 1, rankIndex))];
  const geo = GEOMETRY[spec.shape];
  const [ox, oy] = geo.origin;
  const ids = {
    rim: `re-rim-${uid}`,
    face: `re-face-${uid}`,
    gloss: `re-gloss-${uid}`,
    orn: `re-orn-${uid}`,
    shine: `re-shine-${uid}`,
    clip: `re-clip-${uid}`,
  };
  const faceTransform = `translate(${ox} ${oy}) scale(${geo.faceScale}) translate(${-ox} ${-oy})`;
  const bodyTransform = geo.bodyScale === 1 ? undefined : `translate(32 32) scale(${geo.bodyScale}) translate(-32 -32)`;
  const g = geo.glyphSize;
  const showPips = size >= 22;
  const clampedTier = Math.max(1, Math.min(3, tier));

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      style={{ display: 'block', flexShrink: 0, filter: locked ? 'grayscale(1)' : undefined, opacity: locked ? 0.38 : 1 }}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={ids.rim} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor={spec.rim[0]} />
          <stop offset="0.45" stopColor={spec.rim[1]} />
          <stop offset="1" stopColor={spec.rim[2]} />
        </linearGradient>
        <linearGradient id={ids.face} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={spec.face[0]} />
          <stop offset="1" stopColor={spec.face[1]} />
        </linearGradient>
        <linearGradient id={ids.gloss} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.48" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {spec.ornament && (
          <linearGradient id={ids.orn} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={spec.ornament[0]} />
            <stop offset="1" stopColor={spec.ornament[1]} />
          </linearGradient>
        )}
        {animated && (
          <linearGradient id={ids.shine} x1="-1" y1="0" x2="0" y2="0.4">
            <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="0.65" stopColor="#fff" stopOpacity="0" />
            <animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="2 0" dur="3.2s" repeatCount="indefinite" />
          </linearGradient>
        )}
        <clipPath id={ids.clip}>
          <path d={geo.path} />
        </clipPath>
      </defs>

      {spec.ornament && (
        <g>
          {renderOrnament(spec.shape, `url(#${ids.orn})`)}
        </g>
      )}

      <g transform={bodyTransform}>
        {/* Canto con un contorno fino del tono de sombra: sobre fondo claro la silueta no se diluye. */}
        <path d={geo.path} fill={`url(#${ids.rim})`} stroke={spec.rim[2]} strokeWidth="0.8" />
        <g transform={faceTransform}>
          <path d={geo.path} fill={`url(#${ids.face})`} stroke="#000" strokeOpacity="0.35" strokeWidth="1.2" />
          {spec.shape === 'crest' && <path d={geo.path} fill="none" stroke={spec.ink} strokeOpacity="0.55" strokeWidth="1" />}
          <path d={geo.path} fill={`url(#${ids.gloss})`} />
        </g>

        {/* Símbolo con sombra de 1px: sin ella un glifo claro sobre una cara oscura se queda plano. */}
        <g transform={`translate(${32 - g / 2} ${geo.glyphY - g / 2}) scale(${g / 24})`}>
          <g transform="translate(0 0.9)" opacity="0.35">
            {renderGlyph(spec.glyph, '#000', '#000')}
          </g>
          {renderGlyph(spec.glyph, spec.ink, spec.face[1])}
        </g>

        {showPips &&
          [0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={32 + (i - 1) * (geo.glyphSize < 18 ? 5 : 6)}
              cy={geo.pipsY}
              r={geo.glyphSize < 18 ? 1.6 : 1.9}
              fill={spec.ink}
              opacity={i < clampedTier ? 1 : 0.25}
            />
          ))}

        {animated && <path d={geo.path} fill={`url(#${ids.shine})`} clipPath={`url(#${ids.clip})`} />}
      </g>
    </svg>
  );
}
