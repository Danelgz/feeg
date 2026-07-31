// Comprueba el arte de los rangos en public/ranks.
//
//   node scripts/check-rank-art.mjs
//
// Verifica tres cosas que, si fallan, no dan ningún error visible — simplemente el rango se queda
// con su dibujo SVG de respaldo o se ve mal, y averiguar por qué cuesta más de lo que debería:
//
//   1. Que estén los 30 archivos con el nombre exacto que espera components/ui/RankArt.tsx.
//   2. Que sean PNG con canal alfa. Un PNG sin transparencia se pinta como un cuadrado blanco
//      encima del disco de color de la insignia.
//   3. Que sean aproximadamente cuadrados. Se dibujan con `objectFit: contain`, así que una imagen
//      muy apaisada no se deforma pero deja huecos arriba y abajo.
//
// Además avisa de archivos sobrantes, que casi siempre son un nombre mal escrito (`élite-1.png`,
// `titan-I.png`, `novato-1.PNG`...).

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'public', 'ranks');
const SLUGS = [
  'principiante', 'novato', 'aprendiz', 'constante', 'disciplinado',
  'atleta', 'avanzado', 'elite', 'titan', 'leyenda',
];
const TIERS = [1, 2, 3];

/** Lee ancho, alto y tipo de color de la cabecera IHDR de un PNG, sin dependencias. */
function readPngHeader(path) {
  const buf = readFileSync(path);
  const isPng = buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47;
  if (!isPng) return null;
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    // 4 = gris+alfa, 6 = RGB+alfa, 3 = paleta (puede llevar alfa en un chunk tRNS aparte).
    colorType: buf.readUInt8(25),
    hasTrns: buf.includes(Buffer.from('tRNS')),
  };
}

if (!existsSync(DIR)) {
  console.error(`No existe ${DIR}`);
  process.exit(1);
}

const present = new Set(readdirSync(DIR).filter((f) => f.toLowerCase().endsWith('.png')));
const expected = SLUGS.flatMap((slug) => TIERS.map((tier) => `${slug}-${tier}.png`));

const missing = [];
const problems = [];
let ok = 0;

for (const name of expected) {
  if (!present.has(name)) {
    missing.push(name);
    continue;
  }
  const header = readPngHeader(join(DIR, name));
  if (!header) {
    problems.push(`${name}: no parece un PNG válido (¿es un JPG renombrado?)`);
    continue;
  }
  const transparent = header.colorType === 4 || header.colorType === 6 || header.hasTrns;
  const ratio = header.width / header.height;
  const square = ratio > 0.9 && ratio < 1.11;

  if (!transparent) problems.push(`${name}: sin canal alfa — se verá como un cuadrado opaco`);
  if (!square) problems.push(`${name}: no es cuadrada (${header.width}×${header.height})`);
  if (header.width < 128) problems.push(`${name}: pequeña (${header.width}px), se verá borrosa en retina`);
  if (transparent && square && header.width >= 128) ok++;
}

const extra = [...present].filter((f) => !expected.includes(f));

console.log(`\n  ${ok} de 30 correctas\n`);

if (missing.length) {
  console.log(`  FALTAN (${missing.length}):`);
  for (const name of missing) console.log(`    - ${name}`);
  console.log();
}

if (extra.length) {
  console.log(`  SOBRAN (${extra.length}) — probablemente un nombre mal escrito:`);
  for (const name of extra) console.log(`    ? ${name}`);
  console.log();
}

if (problems.length) {
  console.log(`  AVISOS (${problems.length}):`);
  for (const problem of problems) console.log(`    ! ${problem}`);
  console.log();
}

if (!missing.length && !extra.length && !problems.length) {
  console.log('  Todo correcto: las 30 insignias están listas.\n');
}

process.exit(missing.length || extra.length ? 1 : 0);
