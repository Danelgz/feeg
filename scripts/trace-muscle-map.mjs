// Vectoriza una lámina anatómica (PNG: dos cuerpos, frontal y posterior) a los paths del mapa
// muscular. Reemplaza a scripts/gen-muscle-paths.py, que sólo reordenaba un SVG ya vectorial.
//
// Por qué trazar un raster en vez de dibujar el SVG a mano: la lámina de referencia tiene ~40
// músculos por vista. Redibujarlos "a ojo" da una anatomía parecida pero no la misma, y el encargo
// era que el cuerpo fuese exactamente el de la lámina.
//
// La segmentación se apoya en cómo está pintada la lámina: músculo = gris medio, separación entre
// músculos = blanco, contorno = negro. Es decir, cada músculo ya es una componente conexa; no hace
// falta ningún trazador genérico tipo potrace, que además devolvería el dibujo entero como una
// maraña de curvas sin saber qué trozo es qué músculo.
//
// Uso:
//   node scripts/trace-muscle-map.mjs <lamina.png> [outDir]
//
// Genera en outDir:
//   trace.json   componentes con su contorno normalizado, id estable e info (área, centroide)
//   debug.png    la segmentación coloreada y numerada — es lo que se mira para escribir el mapeo
//                componente -> grupo muscular en data/muscle-map-groups.json
//
// El paso de componente a grupo NO se adivina aquí: vive en data/muscle-map-groups.json y lo aplica
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

// --- Parámetros de segmentación -------------------------------------------------------------
// Umbrales sobre luminancia 0-255. La banda intermedia es "carne"; por encima, hueco o fondo; por
// debajo, línea de contorno.
const WHITE_MIN = Number(process.env.WHITE_MIN ?? 232);
const DARK_MAX = Number(process.env.DARK_MAX ?? 105);
// Erosión previa al etiquetado. Mata el halo de antialias de 1-2 px que hay a cada lado de cada
// línea negra y que, sin esto, aparece como un músculo largísimo y finísimo bordeando el cuerpo.
const ERODE = Number(process.env.ERODE ?? 2);
// Semilla mínima (px, tras erosionar) para que una mancha cuente como músculo.
const MIN_SEED = Number(process.env.MIN_SEED ?? 90);
// Área mínima (px, ya reconstruida) para conservar la componente.
const MIN_AREA = Number(process.env.MIN_AREA ?? 400);
// Simplificación Douglas-Peucker, en px de la lámina original.
const EPSILON = Number(process.env.EPSILON ?? 1.8);
// Altura del cuerpo más alto en unidades del viewBox de salida.
const TARGET_H = Number(process.env.TARGET_H ?? 1000);

// --- Utilidades de máscara -------------------------------------------------------------------

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
        if (
          cur.data[i] &&
          cur.data[i - 1] &&
          cur.data[i + 1] &&
          cur.data[i - cur.w] &&
          cur.data[i + cur.w]
        ) {
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
  const labels = new Int32Array(m.w * m.h).fill(0);
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
 * todas a la vez. Devuelve la forma original de cada músculo (la erosión sólo servía para separar
 * y para tirar el ruido, no queremos quedarnos con el músculo encogido) sin que dos músculos unidos
 * por un puente de un píxel acaben fusionados: el frente de onda se reparte el puente.
 */
function reconstruct(seedLabels, full) {
  const out = new Int32Array(seedLabels);
  const queue = new Int32Array(full.w * full.h);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < out.length; i++) if (out[i]) queue[tail++] = i;
  while (head < tail) {
    const p = queue[head++];
    const id = out[p];
    const x = p % full.w;
    const y = (p / full.w) | 0;
    const push = (q) => {
      if (full.data[q] && !out[q]) {
        out[q] = id;
        queue[tail++] = q;
      }
    };
    if (x > 0) push(p - 1);
    if (x < full.w - 1) push(p + 1);
    if (y > 0) push(p - full.w);
    if (y < full.h - 1) push(p + full.w);
  }
  return out;
}

/**
 * Contornos de una región, en coordenadas de esquina de píxel. Recorre los lados de píxel que dan
 * al exterior y los encadena en bucles cerrados: el contorno exterior sale en un sentido y los
 * agujeros en el contrario, que es justo lo que necesita `fill-rule: evenodd` para que un músculo
 * con un hueco dentro se pinte con el hueco vacío.
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

// --- Simplificación y suavizado ---------------------------------------------------------------

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

/** Catmull-Rom cerrada -> cúbicas de Bézier. Tensión < 1 para que no se pase de rosca en las
 *  curvas cerradas de los extremos del músculo. */
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

// --- Pipeline ----------------------------------------------------------------------------------

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const CH = info.channels;

const lum = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) {
  const o = i * CH;
  lum[i] = (data[o] * 299 + data[o + 1] * 587 + data[o + 2] * 114) / 1000;
}

// Carne: ni hueco ni línea.
const flesh = mask(W, H);
for (let i = 0; i < W * H; i++) flesh.data[i] = lum[i] < WHITE_MIN && lum[i] > DARK_MAX ? 1 : 0;

// Silueta: todo lo que el fondo no alcanza. El fondo es blanco y toca el borde de la lámina, así
// que se propaga desde el borde por los píxeles claros; lo que queda sin visitar es cuerpo, incluidos
// los huecos blancos entre músculos y el interior blanco de manos, pies y cara.
const outside = mask(W, H);
{
  const queue = new Int32Array(W * H);
  let head = 0;
  let tail = 0;
  const push = (i) => {
    if (!outside.data[i] && lum[i] >= WHITE_MIN) {
      outside.data[i] = 1;
      queue[tail++] = i;
    }
  };
  for (let x = 0; x < W; x++) (push(x), push((H - 1) * W + x));
  for (let y = 0; y < H; y++) (push(y * W), push(y * W + W - 1));
  while (head < tail) {
    const p = queue[head++];
    const x = p % W;
    const y = (p / W) | 0;
    if (x > 0) push(p - 1);
    if (x < W - 1) push(p + 1);
    if (y > 0) push(p - W);
    if (y < H - 1) push(p + W);
  }
}
const bodyMask = mask(W, H);
for (let i = 0; i < W * H; i++) bodyMask.data[i] = outside.data[i] ? 0 : 1;

// Cuerpos: las dos componentes grandes de la silueta.
const bodies = label(bodyMask);
const bodyIds = [...bodies.sizes.keys()]
  .filter((id) => id > 0 && bodies.sizes[id] > (W * H) / 200)
  .sort((a, b) => bodies.sizes[b] - bodies.sizes[a])
  .slice(0, 2);
if (bodyIds.length < 2) {
  console.error(`Se esperaban 2 cuerpos, encontrados ${bodyIds.length}. Revisa WHITE_MIN.`);
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

const bodyBoxes = bodyIds.map((id) => bbox((x, y) => bodies.labels[y * W + x] === id));
// La vista frontal es el cuerpo de la izquierda de la lámina.
const order = bodyIds.map((id, i) => ({ id, box: bodyBoxes[i] })).sort((a, b) => a.box.x0 - b.box.x0);
const VIEWS = [
  { view: 'front', ...order[0] },
  { view: 'back', ...order[1] },
];

// Escala común a las dos vistas: si cada cuerpo se normalizase a su propia caja, el más bajo se
// estiraría y las dos figuras dejarían de medir lo mismo puestas una al lado de la otra.
const scale = TARGET_H / Math.max(...VIEWS.map((v) => v.box.y1 - v.box.y0 + 1));
const boxW = Math.max(...VIEWS.map((v) => (v.box.x1 - v.box.x0 + 1) * scale));
const VIEW_W = Math.round(boxW * 1.06);
const VIEW_BOX = `0 0 ${VIEW_W} ${TARGET_H}`;

// Músculos: erosionar, etiquetar semillas, reconstruir.
const seeds = label(erode(flesh, ERODE));
const seedKeep = new Int32Array(seeds.labels.length);
const remap = new Map();
for (let i = 0; i < seeds.labels.length; i++) {
  const id = seeds.labels[i];
  if (!id || seeds.sizes[id] < MIN_SEED) continue;
  if (!remap.has(id)) remap.set(id, remap.size + 1);
  seedKeep[i] = remap.get(id);
}
const muscleLabels = reconstruct(seedKeep, flesh);

const stats = new Map();
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const id = muscleLabels[y * W + x];
    if (!id) continue;
    let s = stats.get(id);
    if (!s) stats.set(id, (s = { id, area: 0, sx: 0, sy: 0, x0: W, y0: H, x1: 0, y1: 0 }));
    s.area++;
    s.sx += x;
    s.sy += y;
    if (x < s.x0) s.x0 = x;
    if (x > s.x1) s.x1 = x;
    if (y < s.y0) s.y0 = y;
    if (y > s.y1) s.y1 = y;
  }
}

const components = [];
for (const s of stats.values()) {
  if (s.area < MIN_AREA) continue;
  const cx = s.sx / s.area;
  const cy = s.sy / s.area;
  const view = VIEWS.find((v) => cx >= v.box.x0 - 4 && cx <= v.box.x1 + 4);
  if (!view) continue;

  // Traza en una ventana ajustada a la componente: recorrer la lámina entera por músculo sería
  // ~40x más trabajo del necesario.
  const pad = 2;
  const wx0 = Math.max(0, s.x0 - pad);
  const wy0 = Math.max(0, s.y0 - pad);
  const ww = Math.min(W, s.x1 + pad + 1) - wx0;
  const wh = Math.min(H, s.y1 + pad + 1) - wy0;
  const loops = contours((x, y) => muscleLabels[(y + wy0) * W + (x + wx0)] === s.id, ww, wh);

  const ox = view.box.x0 - ((VIEW_W / scale - (view.box.x1 - view.box.x0 + 1)) / 2);
  const oy = view.box.y0;
  const d = loops
    .map((loop) =>
      toBezier(
        rdp(chaikin(loop.map(([x, y]) => [x + wx0, y + wy0]), 2), EPSILON).map(([x, y]) => [
          (x - ox) * scale,
          (y - oy) * scale,
        ]),
        1
      )
    )
    .join('');

  components.push({
    key: `${view.view}-${Math.round(cy)}-${Math.round(cx)}`,
    view: view.view,
    area: s.area,
    cx: Number((((cx - ox) * scale) / VIEW_W).toFixed(3)),
    cy: Number((((cy - oy) * scale) / TARGET_H).toFixed(3)),
    d,
  });
}

components.sort((a, b) => (a.view === b.view ? a.cy - b.cy || a.cx - b.cx : a.view === 'front' ? -1 : 1));

// Siluetas.
const silhouettes = {};
for (const v of VIEWS) {
  const pad = 2;
  const wx0 = Math.max(0, v.box.x0 - pad);
  const wy0 = Math.max(0, v.box.y0 - pad);
  const ww = Math.min(W, v.box.x1 + pad + 1) - wx0;
  const wh = Math.min(H, v.box.y1 + pad + 1) - wy0;
  const loops = contours((x, y) => bodies.labels[(y + wy0) * W + (x + wx0)] === v.id, ww, wh);
  const ox = v.box.x0 - ((VIEW_W / scale - (v.box.x1 - v.box.x0 + 1)) / 2);
  const oy = v.box.y0;
  silhouettes[v.view] = loops
    .map((loop) =>
      toBezier(
        rdp(chaikin(loop.map(([x, y]) => [x + wx0, y + wy0]), 2), EPSILON).map(([x, y]) => [
          (x - ox) * scale,
          (y - oy) * scale,
        ]),
        1
      )
    )
    .join('');
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, 'trace.json'),
  JSON.stringify({ viewBox: VIEW_BOX, viewWidth: VIEW_W, viewHeight: TARGET_H, silhouettes, components }, null, 1)
);

// Debug: cada componente de un color y con su índice encima. Es la imagen que se mira para escribir
// data/muscle-map-groups.json.
const PALETTE = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990', '#dcbeff', '#9a6324', '#800000', '#808000', '#000075', '#a9a9a9'];
let debug = `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEW_W * 2}" height="${TARGET_H}" viewBox="0 0 ${VIEW_W * 2} ${TARGET_H}">`;
debug += `<rect width="${VIEW_W * 2}" height="${TARGET_H}" fill="#fff"/>`;
for (const v of VIEWS) {
  const dx = v.view === 'front' ? 0 : VIEW_W;
  debug += `<g transform="translate(${dx},0)"><path d="${silhouettes[v.view]}" fill="#f0f0f0" stroke="#333" stroke-width="2" fill-rule="evenodd"/>`;
  components
    .filter((c) => c.view === v.view)
    .forEach((c, i) => {
      debug += `<path d="${c.d}" fill="${PALETTE[i % PALETTE.length]}" fill-opacity="0.75" stroke="#111" stroke-width="1" fill-rule="evenodd"/>`;
      debug += `<text x="${c.cx * VIEW_W}" y="${c.cy * TARGET_H}" font-family="Arial" font-size="16" font-weight="bold" fill="#000" text-anchor="middle" stroke="#fff" stroke-width="3" paint-order="stroke">${i}</text>`;
    });
  debug += '</g>';
}
debug += '</svg>';
fs.writeFileSync(path.join(OUT_DIR, 'debug.svg'), debug);
await sharp(Buffer.from(debug)).png().toFile(path.join(OUT_DIR, 'debug.png'));

const byView = {};
for (const c of components) byView[c.view] = (byView[c.view] ?? 0) + 1;
console.log(`viewBox ${VIEW_BOX}`);
console.log(`componentes: ${JSON.stringify(byView)}`);
console.log(`peso de los paths: ${(components.reduce((n, c) => n + c.d.length, 0) / 1024).toFixed(1)} KB`);
console.log(`escrito ${OUT_DIR}`);
