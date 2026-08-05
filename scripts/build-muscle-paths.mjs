// Une el trazado (scripts/trace-muscle-map.mjs) con el mapeo pieza -> grupo
// (data/muscle-map-groups.json) y escribe data/muscleMapPaths.ts.
//
// Uso:
//   node scripts/build-muscle-paths.mjs [traceDir]
//
// Valida antes de escribir: que todo grupo del JSON exista en MUSCLE_GROUPS, que ningún índice se
// asigne dos veces y que ninguna pieza se quede sin asignar. Una pieza suelta es un músculo que
// desaparecería del cuerpo sin que nadie se entere hasta verlo en pantalla.

import fs from 'node:fs';
import path from 'node:path';

const TRACE_DIR = process.argv[2] ?? path.join(process.cwd(), '.muscle-trace');
const ROOT = process.cwd();
const OUT = path.join(ROOT, 'data', 'muscleMapPaths.ts');

const trace = JSON.parse(fs.readFileSync(path.join(TRACE_DIR, 'trace.json'), 'utf8'));
const groups = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'muscle-map-groups.json'), 'utf8'));

const KNOWN = new Set(
  fs
    .readFileSync(path.join(ROOT, 'data', 'muscleMapRegions.ts'), 'utf8')
    .match(/MUSCLE_GROUPS = \[([\s\S]*?)\]/)[1]
    .match(/'([^']+)'/g)
    .map((s) => s.slice(1, -1))
);

const problems = [];
const byView = {};

for (const view of ['front', 'back']) {
  const components = trace.components.filter((c) => c.view === view);
  const mapping = groups[view];
  const seen = new Map();
  const out = {};

  for (const [group, indices] of Object.entries(mapping)) {
    if (!KNOWN.has(group)) {
      problems.push(`${view}: "${group}" no está en MUSCLE_GROUPS`);
      continue;
    }
    for (const i of indices) {
      if (!components[i]) {
        problems.push(`${view}: la pieza ${i} no existe (hay ${components.length})`);
        continue;
      }
      if (seen.has(i)) problems.push(`${view}: la pieza ${i} está en "${seen.get(i)}" y en "${group}"`);
      seen.set(i, group);
      (out[group] ??= []).push(components[i].d);
    }
  }

  const orphans = components.map((_, i) => i).filter((i) => !seen.has(i));
  if (orphans.length) problems.push(`${view}: piezas sin grupo: ${orphans.join(', ')}`);

  byView[view] = out;
}

if (problems.length) {
  console.error('El mapeo no cuadra:\n' + problems.map((p) => '  - ' + p).join('\n'));
  process.exit(1);
}

const lines = [];
const q = (s) => JSON.stringify(s);

lines.push('// GENERADO — no editar a mano.');
lines.push('// Vectorizado de public/MUSCLE MAP REFERENCE.png con scripts/trace-muscle-map.mjs y agrupado');
lines.push('// con data/muscle-map-groups.json por scripts/build-muscle-paths.mjs. Para rehacerlo:');
lines.push('//');
lines.push('//   node scripts/trace-muscle-map.mjs "public/MUSCLE MAP REFERENCE.png" .muscle-trace');
lines.push('//   node scripts/build-muscle-paths.mjs .muscle-trace');
lines.push('//');
lines.push('// Geometría anatómica del mapa muscular: silueta + regiones por grupo, en vista frontal y');
lines.push('// posterior. La lámina se simetriza antes de trazar, así que cada músculo y su pareja del otro');
lines.push('// lado son el mismo dibujo reflejado: al teñir un grupo, los dos lados salen idénticos.');
lines.push('//');
lines.push('// Los huecos entre músculos no son trazo, son la silueta asomando por debajo. Por eso el color');
lines.push('// de silueta y el de músculo en reposo tienen que ser distintos de verdad en MuscleMap: si se');
lines.push('// acercan, la definición anatómica desaparece y el cuerpo se lee como una mancha.');
lines.push('');
lines.push('export interface MusclePath {');
lines.push('  d: string;');
lines.push('  fill?: string;');
lines.push('  stroke?: string;');
lines.push('  strokeWidth?: string;');
lines.push('}');
lines.push('');
lines.push(`export const ANATOMY_VIEW_BOX = ${q(trace.viewBox)};`);
lines.push('');

for (const view of ['front', 'back']) {
  const label = view === 'front' ? 'frontal' : 'posterior';
  lines.push(`/** Contorno del cuerpo de la vista ${label}. Debajo de los músculos: lo que se ve entre ellos. */`);
  lines.push(`export const ${view.toUpperCase()}_SILHOUETTE: MusclePath[] = [`);
  lines.push(`  { d: ${q(trace.silhouettes[view])} },`);
  lines.push('];');
  lines.push('');
  lines.push(`export const ${view.toUpperCase()}_MUSCLES: Record<string, MusclePath[]> = {`);
  for (const [group, ds] of Object.entries(byView[view])) {
    lines.push(`  ${q(group)}: [`);
    for (const d of ds) lines.push(`    { d: ${q(d)} },`);
    lines.push('  ],');
  }
  lines.push('};');
  lines.push('');
}

const text = lines.join('\n');
fs.writeFileSync(OUT, text);

for (const view of ['front', 'back']) {
  const counts = Object.entries(byView[view]).map(([g, ds]) => `${g}:${ds.length}`);
  console.log(`${view}: ${counts.join('  ')}`);
}
console.log(`\nEscrito ${path.relative(ROOT, OUT)} (${(text.length / 1024).toFixed(1)} KB)`);
