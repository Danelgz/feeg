// Vectoriza la lámina anatómica (PNG: dos cuerpos, frontal y posterior) a los paths del mapa
// muscular.
//
// Por qué trazar un raster en vez de dibujar el SVG a mano: la lámina tiene unos treinta músculos
// por vista. Redibujarlos "a ojo" da una anatomía parecida pero no la misma, y el encargo era que el
// cuerpo fuese exactamente el de la lámina.
//
// La segmentación se apoya en cómo está pintada: fondo casi negro, silueta blanca, y cada músculo
// como una mancha de color plano separada de sus vecinas por un hueco blanco. Es decir, cada músculo
// ya es una componente conexa; no hace falta un trazador genérico tipo potrace, que además devolvería
// el dibujo entero como una maraña de curvas sin saber qué trozo es qué músculo.
//
// Y el color no es sólo relleno: en esta lámina cada grupo muscular tiene el suyo (pecho rojo,
// hombros naranja, abdomen verde...), así que el script puede PROPONER a qué grupo va cada pieza en
// vez de obligar a leer treinta números de una imagen a mano. Lo propuesto se revisa y se corrige en
// data/muscle-map-groups.json, que es lo que manda.
//
// Uso:
//   node scripts/trace-muscle-map.mjs <lamina.png> [outDir]
//
// Genera en outDir:
//   trace.json       piezas con su contorno normalizado, color medio, área y centroide
//   suggested.json   mapeo pieza -> grupo deducido del color, listo para copiar y corregir
//   debug.png        la segmentación numerada y etiquetada con el grupo propuesto
//
// El paso de pieza a grupo NO se decide aquí: vive en data/muscle-map-groups.json y lo aplica
// scripts/build-muscle-paths.mjs. Separar las dos etapas permite reajustar el mapeo sin volver a
// trazar, y volver a trazar sin perder el mapeo.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = process.argv[2];
const OUT_DIR = process.argv[3] ?? path.join(process.cwd(), '.muscle-trace');

if (!SRC) {
  console.error('uso: node scripts/trace-muscle-map.mjs <lamina.png> [outDir]');
  process.exit(1);
}

// --- Parámetros de segmentación ---------------------------------------------------------------
// Calibrados con el histograma de la lámina: fondo V≈26 · músculos V 140-235 con S 0.35-0.88 ·
// silueta blanca V≈235 S≈0.02 · cuello gris V≈129 S≈0.08.
//
// El fondo se separa por VALOR y no por color, que es lo único estable aquí: la lámina lo pinta con
// una textura oscura ligeramente azulada, no con un negro plano.
const BG_MAX_V = Number(process.env.BG_MAX_V ?? 80);
// Blanco de la silueta: los huecos entre músculos, la cara, las manos, los pies y las rótulas.
// Hace falta el tope de saturación además del suelo de valor porque el naranja y el ámbar de la
// lámina llegan a V 225-235, tan claros como el blanco.
const WHITE_MIN_V = Number(process.env.WHITE_MIN_V ?? 200);
const WHITE_MAX_S = Number(process.env.WHITE_MAX_S ?? 0.12);
// Erosión previa al etiquetado. Mata el halo de antialias de 1-2 px de cada borde, que sin esto
// aparece como un músculo larguísimo y finísimo bordeando cada forma.
const ERODE = Number(process.env.ERODE ?? 2);
// Semilla mínima (px, tras erosionar) para que una mancha cuente como músculo.
const MIN_SEED = Number(process.env.MIN_SEED ?? 90);
// Área mínima (px, ya reconstruida) para conservar la pieza.
const MIN_AREA = Number(process.env.MIN_AREA ?? 400);
// Simplificación Douglas-Peucker, en px de la lámina original.
const EPSILON = Number(process.env.EPSILON ?? 1.8);
// Altura del cuerpo más alto en unidades del viewBox de salida.
const TARGET_H = Number(process.env.TARGET_H ?? 1000);
// Margen arriba y abajo. Sin él la coronilla y los pies caen justo sobre el borde del viewBox, y
// como las curvas se suavizan con Catmull-Rom algún punto de control se sale por encima y el SVG lo
// recorta. Es poca cosa, pero es un recorte del dibujo, no un redondeo.
const INSET = Number(process.env.INSET ?? 0.012);
// Mitad de la lámina que se espeja sobre la otra: 'left', 'right' o 'none'.
const SYMMETRIZE = process.env.SYMMETRIZE ?? 'left';
// Engorde de cada músculo, en px de la lámina, antes de trazar. Los huecos blancos de la lámina son
// generosos y a tamaño de tarjeta se comen el músculo: el cuerpo se lee como una figura blanca con
// vetas de color en vez de como un cuerpo con músculos. Un píxel de engorde estrecha el hueco sin
// llegar a juntar dos vientres.
const GROW = Number(process.env.GROW ?? 2);

// Tono -> grupo muscular, por vista. Es la tabla que convierte "esta mancha es teal" en "esto es
// bíceps". Donde un mismo color sirve a dos grupos, `split` decide por posición dentro del cuerpo.
const COLOR_RULES = [
  { name: 'rojo', hue: [345, 15], front: 'Pecho', back: 'Glúteos' },
  {
    name: 'naranja',
    hue: [15, 33],
    // Deltoides y antebrazo comparten el naranja y sólo se distinguen a nueve grados de tono, que es
    // menos de lo que varía el propio degradado de una mancha. Se separan por altura: en la lámina el
    // hombro cae en cy 0.12 (frontal) y 0.22 (posterior), y el antebrazo en 0.28-0.41. El corte va en
    // 0.25, el punto más holgado entre los dos grupos — 0.03 por debajo del hombro más bajo.
    split: (c) => (c.cy < 0.25 ? 'Hombros' : 'Antebrazo'),
  },
  { name: 'ámbar', hue: [33, 60], front: 'Cuádriceps', back: 'Femoral' },
  { name: 'verde', hue: [70, 150], front: 'Abdomen', back: 'Abdomen' },
  {
    name: 'teal',
    hue: [170, 197],
    // En el tronco es dorsal; en los brazos, bíceps por delante y tríceps por detrás.
    split: (c) => (Math.abs(c.cx - 0.5) > 0.26 ? (c.view === 'front' ? 'Bíceps' : 'Tríceps') : 'Espalda'),
  },
  { name: 'azul', hue: [197, 235], front: 'Gemelos', back: 'Gemelos' },
  { name: 'morado', hue: [250, 310], front: 'Espalda', back: 'Espalda' },
];
// Lo que no tiene color: en esta lámina, sólo el cuello.
const GRAY_GROUP = 'Cuello';
const GRAY_MAX_S = 0.2;

// --- Utilidades de máscara ---------------------------------------------------------------------

/** @typedef {{w:number,h:number,data:Uint8Array}} Mask */

/** @returns {Mask} */
function mask(w, h) {
  return { w, h, data: new Uint8Array(w * h) };
}

function erode(m, times) {
  let cur = m;
  for (let t = 0; t < times; t++) {
    const next = mask(cur.w, cur.h);
    for (let y = 1; y < cur.h - 1; y++) {
      for (let x = 1; x < cur.w - 1; x++) {
        const i = y * cur.w + x;
        if (cur.data[i] && cur.data[i - 1] && cur.data[i + 1] && cur.data[i - cur.w] && cur.data[i + cur.w]) {
          next.data[i] = 1;
        }
      }
    }
    cur = next;
  }
  return cur;
}

/** Etiquetado de componentes conexas (4-conexión) sobre una máscara binaria. */
function label(m) {
  const labels = new Int32Array(m.w * m.h);
  const sizes = [0];
  const queue = new Int32Array(m.w * m.h);
  let next = 1;
  for (let s = 0; s < m.data.length; s++) {
    if (!m.data[s] || labels[s]) continue;
    const id = next++;
    let head = 0;
    let tail = 0;
    queue[tail++] = s;
    labels[s] = id;
    let count = 0;
    while (head < tail) {
      const p = queue[head++];
      count++;
      const x = p % m.w;
      const y = (p / m.w) | 0;
      if (x > 0 && m.data[p - 1] && !labels[p - 1]) (labels[p - 1] = id), (queue[tail++] = p - 1);
      if (x < m.w - 1 && m.data[p + 1] && !labels[p + 1]) (labels[p + 1] = id), (queue[tail++] = p + 1);
      if (y > 0 && m.data[p - m.w] && !labels[p - m.w]) (labels[p - m.w] = id), (queue[tail++] = p - m.w);
      if (y < m.h - 1 && m.data[p + m.w] && !labels[p + m.w]) (labels[p + m.w] = id), (queue[tail++] = p + m.w);
    }
    sizes[id] = count;
  }
  return { labels, sizes, count: next - 1 };
}

/**
 * Reconstrucción geodésica: hace crecer las semillas etiquetadas dentro de la máscara original,
 * todas a la vez. Devuelve la forma original de cada músculo (la erosión sólo servía para separar y
 * para tirar el ruido, no queremos quedarnos con el músculo encogido) sin que dos músculos unidos
 * por un puente de un píxel acaben fusionados: el frente de onda se reparte el puente.
 *
 * Con `extra` rondas adicionales el crecimiento sigue más allá de la máscara, dentro de `limit`:
 * así se engorda cada músculo sobre el hueco blanco sin que dos vecinos se solapen, porque los dos
 * frentes se encuentran a mitad de camino y ahí se paran.
 */
function reconstruct(seedLabels, full, extra = 0, limit = null) {
  const out = new Int32Array(seedLabels);
  const W = full.w;
  let frontier = [];
  for (let i = 0; i < out.length; i++) if (out[i]) frontier.push(i);

  const grow = (allowed) => {
    let head = 0;
    const queue = frontier;
    while (head < queue.length) {
      const p = queue[head++];
      const id = out[p];
      const x = p % W;
      const y = (p / W) | 0;
      const push = (q) => {
        if (allowed(q) && !out[q]) {
          out[q] = id;
          queue.push(q);
        }
      };
      if (x > 0) push(p - 1);
      if (x < W - 1) push(p + 1);
      if (y > 0) push(p - W);
      if (y < full.h - 1) push(p + W);
    }
    return queue;
  };

  grow((q) => full.data[q] === 1);

  for (let round = 0; round < extra; round++) {
    // Una ronda de dilatación = un anillo de un píxel. Se recalcula el frente cada vez para que los
    // dos músculos que comparten un hueco avancen a la vez y se encuentren en el centro.
    const ring = [];
    for (let p = 0; p < out.length; p++) {
      if (out[p]) continue;
      if (limit && !limit.data[p]) continue;
      const x = p % W;
      const y = (p / W) | 0;
      const n =
        (x > 0 && out[p - 1]) || (x < W - 1 && out[p + 1]) || (y > 0 && out[p - W]) || (y < full.h - 1 && out[p + W]);
      if (n) ring.push(p);
    }
    for (const p of ring) {
      const x = p % W;
      const y = (p / W) | 0;
      out[p] =
        (x > 0 && out[p - 1]) || (x < W - 1 && out[p + 1]) || (y > 0 && out[p - W]) || (y < full.h - 1 && out[p + W]);
    }
  }

  return out;
}

/**
 * Contornos de una región, en coordenadas de esquina de píxel. Recorre los lados de píxel que dan al
 * exterior y los encadena en bucles cerrados: el contorno exterior sale en un sentido y los agujeros
 * en el contrario, que es lo que hace que un músculo con un hueco dentro se pinte con el hueco vacío
 * sin necesidad de `fill-rule`.
 */
function contours(isInside, w, h) {
  /** @type {Map<string, [number, number][]>} */
  const edges = new Map();
  const key = (x, y) => `${x},${y}`;
  const add = (ax, ay, bx, by) => {
    const k = key(ax, ay);
    const list = edges.get(k);
    if (list) list.push([bx, by]);
    else edges.set(k, [[bx, by]]);
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!isInside(x, y)) continue;
      if (y === 0 || !isInside(x, y - 1)) add(x, y, x + 1, y);
      if (x === w - 1 || !isInside(x + 1, y)) add(x + 1, y, x + 1, y + 1);
      if (y === h - 1 || !isInside(x, y + 1)) add(x + 1, y + 1, x, y + 1);
      if (x === 0 || !isInside(x - 1, y)) add(x, y + 1, x, y);
    }
  }

  const loops = [];
  for (const [start] of edges) {
    while (edges.get(start)?.length) {
      const loop = [];
      let cur = start;
      while (true) {
        const list = edges.get(cur);
        if (!list || !list.length) break;
        const [nx, ny] = list.pop();
        const [cx, cy] = cur.split(',').map(Number);
        loop.push([cx, cy]);
        cur = key(nx, ny);
        if (cur === start) break;
      }
      if (loop.length > 8) loops.push(loop);
    }
  }
  return loops;
}

// --- Simplificación y suavizado ----------------------------------------------------------------

function rdp(points, eps) {
  if (points.length < 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let best = -1;
    let bestD = eps;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i];
      const d = Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best > 0) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Chaikin: redondea la escalera de píxeles antes de simplificar, para que el contorno no salga
 *  dentado. Dos pasadas bastan; más y el músculo empieza a encoger. */
function chaikin(points, passes) {
  let pts = points;
  for (let p = 0; p < passes; p++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      out.push([x1 * 0.75 + x2 * 0.25, y1 * 0.75 + y2 * 0.25]);
      out.push([x1 * 0.25 + x2 * 0.75, y1 * 0.25 + y2 * 0.75]);
    }
    pts = out;
  }
  return pts;
}

/** Catmull-Rom cerrada -> cúbicas de Bézier. Tensión < 1 para que no se pase de rosca en las curvas
 *  cerradas de los extremos del músculo. */
function toBezier(points, round) {
  const n = points.length;
  const r = (v) => Number(v.toFixed(round));
  const at = (i) => points[((i % n) + n) % n];
  let d = `M${r(at(0)[0])},${r(at(0)[1])}`;
  const T = 0.9;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * T, p1[1] + ((p2[1] - p0[1]) / 6) * T];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * T, p2[1] - ((p3[1] - p1[1]) / 6) * T];
    d += `C${r(c1[0])},${r(c1[1])} ${r(c2[0])},${r(c2[1])} ${r(p2[0])},${r(p2[1])}`;
  }
  return d + 'Z';
}

// --- Lectura de la lámina ----------------------------------------------------------------------

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const CH = info.channels;

let rgb = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  rgb[i * 3] = data[i * CH];
  rgb[i * 3 + 1] = data[i * CH + 1];
  rgb[i * 3 + 2] = data[i * CH + 2];
}

function hsvAt(source, i) {
  const r = source[i * 3];
  const g = source[i * 3 + 1];
  const b = source[i * 3 + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max ? d / max : 0, max];
}

function bbox(pred) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!pred(x, y)) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { x0, y0, x1, y1 };
}

/** Silueta: todo lo que no es fondo. Se queda con las dos manchas grandes — así se cae solo el
 *  rótulo "Frontal"/"Posterior" que la lámina lleva impreso debajo de cada figura. */
function segmentBodies(source) {
  const m = mask(W, H);
  for (let i = 0; i < W * H; i++) m.data[i] = hsvAt(source, i)[2] > BG_MAX_V ? 1 : 0;
  const bodies = label(m);
  const ids = [...bodies.sizes.keys()]
    .filter((id) => id > 0 && bodies.sizes[id] > (W * H) / 300)
    .sort((a, b) => bodies.sizes[b] - bodies.sizes[a])
    .slice(0, 2);
  if (ids.length < 2) console.error(`Se esperaban 2 cuerpos, encontrados ${ids.length}. Revisa BG_MAX_V.`);

  const bodyMask = mask(W, H);
  for (let i = 0; i < W * H; i++) if (ids.includes(bodies.labels[i])) bodyMask.data[i] = 1;

  const boxed = ids
    .map((id) => ({ id, box: bbox((x, y) => bodies.labels[y * W + x] === id) }))
    .sort((a, b) => a.box.x0 - b.box.x0);
  // La vista frontal es el cuerpo de la izquierda de la lámina.
  return { bodies, bodyMask, views: [{ view: 'front', ...boxed[0] }, { view: 'back', ...boxed[1] }] };
}

let { bodies, bodyMask, views: VIEWS } = segmentBodies(rgb);

// --- Simetrización ------------------------------------------------------------------------------
// La lámina está generada por IA y los dos lados no son idénticos. En una ilustración no se nota; en
// el mapa sí, porque al teñir un grupo de un solo color lo único que queda visible de cada vientre es
// el hueco blanco que lo separa del vecino, y un lado acaba con un hueco que el otro no tiene. Se lee
// como defecto, no como estilo.
//
// Se espeja el ráster antes de trazar, no los paths después: así las dos mitades son el mismo píxel y
// no hay ninguna posibilidad de que dos músculos que deberían ser gemelos difieran.
if (SYMMETRIZE !== 'none') {
  const next = new Uint8Array(rgb);
  for (const v of VIEWS) {
    // Eje de simetría: el que hace coincidir mejor la silueta con su reflejo. Tomar el centro de la
    // caja daría un eje sesgado, porque los brazos de la lámina no están exactamente igual de
    // separados del tronco.
    const mid = (v.box.x0 + v.box.x1) / 2;
    let bestAxis = mid;
    let bestScore = -1;
    for (let a = mid - 24; a <= mid + 24; a += 0.5) {
      let hit = 0;
      let total = 0;
      for (let y = v.box.y0; y <= v.box.y1; y += 2) {
        for (let x = v.box.x0; x <= v.box.x1; x += 2) {
          const mx = Math.round(2 * a - x);
          if (mx < v.box.x0 || mx > v.box.x1) continue;
          const p = bodyMask.data[y * W + x];
          const q = bodyMask.data[y * W + mx];
          if (p || q) total++;
          if (p && q) hit++;
        }
      }
      const score = total ? hit / total : 0;
      if (score > bestScore) {
        bestScore = score;
        bestAxis = a;
      }
    }
    // Eje en media unidad: así el reflejo lleva píxeles enteros a píxeles enteros y no aparece una
    // costura de un píxel en la línea media.
    const axis = Math.round(bestAxis * 2) / 2;
    const keepLeft = SYMMETRIZE === 'left';
    for (let y = Math.max(0, v.box.y0 - 2); y <= Math.min(H - 1, v.box.y1 + 2); y++) {
      for (let x = Math.max(0, v.box.x0 - 2); x <= Math.min(W - 1, v.box.x1 + 2); x++) {
        if (keepLeft ? x <= axis : x >= axis) continue;
        const mx = Math.round(2 * axis - x);
        if (mx < 0 || mx >= W) continue;
        next[(y * W + x) * 3] = rgb[(y * W + mx) * 3];
        next[(y * W + x) * 3 + 1] = rgb[(y * W + mx) * 3 + 1];
        next[(y * W + x) * 3 + 2] = rgb[(y * W + mx) * 3 + 2];
      }
    }
    console.log(`${v.view}: eje x=${axis} (coincidencia ${(bestScore * 100).toFixed(1)}%)`);
  }
  rgb = next;
  ({ bodies, bodyMask, views: VIEWS } = segmentBodies(rgb));
}

// Carne: dentro del cuerpo y no blanco. Cubre tanto los músculos de color como el cuello, que la
// lámina pinta en gris. Se acota al cuerpo a propósito: fuera de él, el rótulo impreso pasaría este
// mismo umbral.
const flesh = mask(W, H);
for (let i = 0; i < W * H; i++) {
  if (!bodyMask.data[i]) continue;
  const [, s, v] = hsvAt(rgb, i);
  flesh.data[i] = v >= WHITE_MIN_V && s < WHITE_MAX_S ? 0 : 1;
}

// --- Normalización del viewBox ------------------------------------------------------------------
const scale = (TARGET_H * (1 - 2 * INSET)) / Math.max(...VIEWS.map((v) => v.box.y1 - v.box.y0 + 1));
const INSET_Y = TARGET_H * INSET;
const boxW = Math.max(...VIEWS.map((v) => (v.box.x1 - v.box.x0 + 1) * scale));
const VIEW_W = Math.round(boxW * 1.06);
const VIEW_BOX = `0 0 ${VIEW_W} ${TARGET_H}`;
const originX = (v) => v.box.x0 - (VIEW_W / scale - (v.box.x1 - v.box.x0 + 1)) / 2;

function traceRegion(isInside, box) {
  const pad = 2 + GROW;
  const wx0 = Math.max(0, box.x0 - pad);
  const wy0 = Math.max(0, box.y0 - pad);
  const ww = Math.min(W, box.x1 + pad + 1) - wx0;
  const wh = Math.min(H, box.y1 + pad + 1) - wy0;
  return { loops: contours((x, y) => isInside(x + wx0, y + wy0), ww, wh), wx0, wy0 };
}

function toPath(loops, wx0, wy0, ox, oy) {
  return loops
    .map((loop) =>
      toBezier(
        rdp(
          chaikin(
            loop.map(([x, y]) => [x + wx0, y + wy0]),
            2
          ),
          EPSILON
        ).map(([x, y]) => [(x - ox) * scale, (y - oy) * scale + INSET_Y]),
        1
      )
    )
    .join('');
}

// --- Piezas musculares ---------------------------------------------------------------------------
// Erosionar para separar y quitar ruido, etiquetar semillas, reconstruir la forma original y, ya
// puestos, engordarla GROW píxeles sobre el hueco blanco sin invadir al vecino.
const seeds = label(erode(flesh, ERODE));
const seedKeep = new Int32Array(seeds.labels.length);
const remap = new Map();
for (let i = 0; i < seeds.labels.length; i++) {
  const id = seeds.labels[i];
  if (!id || seeds.sizes[id] < MIN_SEED) continue;
  if (!remap.has(id)) remap.set(id, remap.size + 1);
  seedKeep[i] = remap.get(id);
}
const muscleLabels = reconstruct(seedKeep, flesh, GROW, bodyMask);

const stats = new Map();
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const id = muscleLabels[i];
    if (!id) continue;
    let s = stats.get(id);
    if (!s) stats.set(id, (s = { id, area: 0, sx: 0, sy: 0, x0: W, y0: H, x1: 0, y1: 0, hues: [], sats: [] }));
    s.area++;
    s.sx += x;
    s.sy += y;
    if (x < s.x0) s.x0 = x;
    if (x > s.x1) s.x1 = x;
    if (y < s.y0) s.y0 = y;
    if (y > s.y1) s.y1 = y;
    // Se muestrea uno de cada nueve píxeles: la mediana de color no necesita más y así no se guardan
    // cien mil valores por músculo.
    if (i % 9 === 0) {
      const [h, sat] = hsvAt(rgb, i);
      s.hues.push(h);
      s.sats.push(sat);
    }
  }
}

const median = (arr) => {
  const a = [...arr].sort((x, y) => x - y);
  return a.length ? a[a.length >> 1] : 0;
};
/** Mediana circular del tono: la lineal partiría el rojo por la mitad (tonos cerca de 0 y de 360). */
const medianHue = (hues) => {
  if (!hues.length) return 0;
  const x = hues.reduce((n, h) => n + Math.cos((h * Math.PI) / 180), 0);
  const y = hues.reduce((n, h) => n + Math.sin((h * Math.PI) / 180), 0);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return deg < 0 ? deg + 360 : deg;
};
const inRange = (h, [lo, hi]) => (lo <= hi ? h >= lo && h < hi : h >= lo || h < hi);

const components = [];
for (const s of stats.values()) {
  if (s.area < MIN_AREA) continue;
  const cxPx = s.sx / s.area;
  const cyPx = s.sy / s.area;
  const view = VIEWS.find((v) => cxPx >= v.box.x0 - 4 && cxPx <= v.box.x1 + 4);
  if (!view) continue;

  const ox = originX(view);
  const oy = view.box.y0;
  const { loops, wx0, wy0 } = traceRegion((x, y) => muscleLabels[y * W + x] === s.id, s);

  const hue = medianHue(s.hues);
  const sat = median(s.sats);
  const c = {
    view: view.view,
    area: s.area,
    hue: Math.round(hue),
    sat: Number(sat.toFixed(2)),
    cx: Number((((cxPx - ox) * scale) / VIEW_W).toFixed(3)),
    cy: Number((((cyPx - oy) * scale + INSET_Y) / TARGET_H).toFixed(3)),
    d: toPath(loops, wx0, wy0, ox, oy),
  };

  const rule = sat < GRAY_MAX_S ? null : COLOR_RULES.find((r) => inRange(hue, r.hue));
  c.color = sat < GRAY_MAX_S ? 'gris' : (rule?.name ?? '?');
  c.suggested = sat < GRAY_MAX_S ? GRAY_GROUP : rule ? (rule.split ? rule.split(c) : rule[c.view]) : null;
  components.push(c);
}

components.sort((a, b) => (a.view === b.view ? a.cy - b.cy || a.cx - b.cx : a.view === 'front' ? -1 : 1));

// --- Siluetas -------------------------------------------------------------------------------------
const silhouettes = {};
for (const v of VIEWS) {
  const { loops, wx0, wy0 } = traceRegion((x, y) => bodies.labels[y * W + x] === v.id, v.box);
  silhouettes[v.view] = toPath(loops, wx0, wy0, originX(v), v.box.y0);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, 'trace.json'),
  JSON.stringify({ viewBox: VIEW_BOX, viewWidth: VIEW_W, viewHeight: TARGET_H, silhouettes, components }, null, 1)
);

// Mapeo propuesto, en el formato exacto de data/muscle-map-groups.json: se revisa contra debug.png y
// se corrige lo que haga falta antes de copiarlo.
const suggested = { front: {}, back: {} };
for (const view of ['front', 'back']) {
  components
    .filter((c) => c.view === view)
    .forEach((c, i) => {
      const key = c.suggested ?? `SIN_GRUPO_(${c.color})`;
      (suggested[view][key] ??= []).push(i);
    });
}
fs.writeFileSync(path.join(OUT_DIR, 'suggested.json'), JSON.stringify(suggested, null, 2));

// Debug: cada pieza de un color y con su índice y grupo propuesto encima.
const PALETTE = ['#e6194b','#3cb44b','#4363d8','#f58231','#911eb4','#42d4f4','#f032e6','#bfef45','#fabed4','#469990','#dcbeff','#9a6324','#800000','#808000','#000075','#a9a9a9'];
let debug = `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEW_W * 2}" height="${TARGET_H}" viewBox="0 0 ${VIEW_W * 2} ${TARGET_H}"><rect width="${VIEW_W * 2}" height="${TARGET_H}" fill="#fff"/>`;
for (const v of VIEWS) {
  debug += `<g transform="translate(${v.view === 'front' ? 0 : VIEW_W},0)"><path d="${silhouettes[v.view]}" fill="#f0f0f0" stroke="#333" stroke-width="2"/>`;
  components
    .filter((c) => c.view === v.view)
    .forEach((c, i) => {
      debug += `<path d="${c.d}" fill="${PALETTE[i % PALETTE.length]}" fill-opacity="0.75" stroke="#111" stroke-width="1"/>`;
      debug += `<text x="${c.cx * VIEW_W}" y="${c.cy * TARGET_H}" font-family="Arial" font-size="15" font-weight="bold" fill="#000" text-anchor="middle" stroke="#fff" stroke-width="3" paint-order="stroke">${i}</text>`;
      debug += `<text x="${c.cx * VIEW_W}" y="${c.cy * TARGET_H + 14}" font-family="Arial" font-size="11" fill="#111" text-anchor="middle" stroke="#fff" stroke-width="3" paint-order="stroke">${c.suggested ?? '?' + c.color}</text>`;
    });
  debug += '</g>';
}
debug += '</svg>';
fs.writeFileSync(path.join(OUT_DIR, 'debug.svg'), debug);
await sharp(Buffer.from(debug)).png().toFile(path.join(OUT_DIR, 'debug.png'));

for (const view of ['front', 'back']) {
  const n = components.filter((c) => c.view === view).length;
  const counts = Object.entries(suggested[view]).map(([g, ids]) => `${g}:${ids.length}`);
  console.log(`${view}: ${n} piezas — ${counts.join('  ')}`);
}
console.log(`\nviewBox ${VIEW_BOX}`);
console.log(`peso de los paths: ${(components.reduce((n, c) => n + c.d.length, 0) / 1024).toFixed(1)} KB`);
console.log(`escrito ${OUT_DIR}`);
