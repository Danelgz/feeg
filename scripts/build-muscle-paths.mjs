// Une el trazado (scripts/trace-muscle-map.mjs) con el mapeo pieza -> grupo y escribe el módulo de
// geometría correspondiente.
//
// Hay dos cuerpos, uno por sexo, cada uno con su lámina, su mapeo y su archivo generado: el mapa se
// elige en MuscleMap según el perfil. Son dos láminas distintas y no una escalada, así que no
// comparten ni número de piezas ni viewBox.
//
// Uso:
//   node scripts/build-muscle-paths.mjs            # reconstruye los dos cuerpos
//   node scripts/build-muscle-paths.mjs female     # sólo uno
//
// Valida antes de escribir: que todo grupo del JSON exista en MUSCLE_GROUPS, que ningún índice se
// asigne dos veces y que ninguna pieza se quede sin asignar. Una pieza suelta es un músculo que
// desaparecería del cuerpo sin que nadie se entere hasta verlo en pantalla.
//
// Y sobre todo: que cada asignación cuadre con el COLOR de la mancha en la lámina. El color es
// evidencia independiente de la lista escrita a mano, y es lo único que detecta el error de verdad
// peligroso aquí — los índices van ordenados por altura, así que dos grupos que comparten fila
// quedan intercalados y basta con leer un número de más para meter un oblicuo en el antebrazo. Eso
// pasó: no rompe nada, no falla ningún test y sólo se ve entrenando ese grupo concreto y mirando el
// cuerpo. Lo que discrepa a propósito se declara en `exceptions` con su motivo.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const PLATES = {
  male: {
    plate: 'public/Referencia2.png',
    traceDir: '.muscle-trace',
    groups: 'data/muscle-map-groups.json',
    out: 'data/muscleMapPaths.ts',
  },
  female: {
    plate: 'public/Ejemplochica.png',
    traceDir: '.muscle-trace-female',
    groups: 'data/muscle-map-groups.female.json',
    out: 'data/muscleMapPathsFemale.ts',
  },
};

const KNOWN = new Set(
  fs
    .readFileSync(path.join(ROOT, 'data', 'muscleMapRegions.ts'), 'utf8')
    .match(/MUSCLE_GROUPS = \[([\s\S]*?)\]/)[1]
    .match(/'([^']+)'/g)
    .map((s) => s.slice(1, -1))
);

function build(variant) {
  const cfg = PLATES[variant];
  const trace = JSON.parse(fs.readFileSync(path.join(ROOT, cfg.traceDir, 'trace.json'), 'utf8'));
  const groups = JSON.parse(fs.readFileSync(path.join(ROOT, cfg.groups), 'utf8'));

  const problems = [];
  const byView = {};

  for (const view of ['front', 'back']) {
    const components = trace.components.filter((c) => c.view === view);
    const mapping = groups[view];
    const exceptions = groups.exceptions?.[view] ?? {};
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

    // El color manda salvo excepción declarada.
    for (const [i, group] of seen) {
      const byColor = components[i]?.suggested;
      if (!byColor || byColor === group) continue;
      const declared = exceptions[String(i)];
      if (declared?.group === group) continue;
      problems.push(
        `${view}: la pieza ${i} está en "${group}" pero su color (${components[i].color}, tono ${components[i].hue}°) dice "${byColor}". ` +
          `Si es a propósito, declárala en exceptions.${view}["${i}"] = { "group": "${group}", "why": "..." }`
      );
    }
    for (const i of Object.keys(exceptions)) {
      if (!seen.has(Number(i))) {
        problems.push(`${view}: exceptions["${i}"] sobra, esa pieza no existe o no está asignada`);
      } else if (components[Number(i)]?.suggested === seen.get(Number(i))) {
        problems.push(`${view}: exceptions["${i}"] sobra, el color ya coincide con el grupo asignado`);
      }
    }

    byView[view] = out;
  }

  if (problems.length) {
    console.error(`[${variant}] El mapeo no cuadra:\n` + problems.map((p) => '  - ' + p).join('\n'));
    return false;
  }

  const lines = [];
  const q = (s) => JSON.stringify(s);

  lines.push('// GENERADO — no editar a mano.');
  lines.push(`// Vectorizado de ${cfg.plate} con scripts/trace-muscle-map.mjs y agrupado`);
  lines.push(`// con ${cfg.groups} por scripts/build-muscle-paths.mjs. Para rehacerlo:`);
  lines.push('//');
  lines.push(`//   node scripts/trace-muscle-map.mjs ${cfg.plate} ${cfg.traceDir}`);
  lines.push(`//   node scripts/build-muscle-paths.mjs ${variant}`);
  lines.push('//');
  lines.push('// Geometría anatómica del mapa muscular: silueta + regiones por grupo, en vista frontal y');
  lines.push('// posterior. La lámina se simetriza antes de trazar, así que cada músculo y su pareja del otro');
  lines.push('// lado son el mismo dibujo reflejado: al teñir un grupo, los dos lados salen idénticos.');
  lines.push('//');
  lines.push('// Los huecos entre músculos no son trazo, son la silueta asomando por debajo. Por eso el color');
  lines.push('// de silueta y el de músculo en reposo tienen que ser distintos de verdad en MuscleMap: si se');
  lines.push('// acercan, la definición anatómica desaparece y el cuerpo se lee como una mancha.');
  lines.push('//');
  lines.push('// Los dos cuerpos (masculino y femenino) exportan exactamente estos mismos nombres, para que');
  lines.push('// MuscleMap pueda intercambiarlos sin más que elegir el módulo. No comparten viewBox: cada');
  lines.push('// lámina tiene sus proporciones y forzarlas a una caja común deformaría una de las dos.');
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
  fs.writeFileSync(path.join(ROOT, cfg.out), text);

  console.log(`[${variant}]`);
  for (const view of ['front', 'back']) {
    const counts = Object.entries(byView[view]).map(([g, ds]) => `${g}:${ds.length}`);
    console.log(`  ${view}: ${counts.join('  ')}`);
  }
  console.log(`  -> ${cfg.out} (${(text.length / 1024).toFixed(1)} KB)\n`);
  return true;
}

const requested = process.argv.slice(2).filter((a) => a in PLATES);
const variants = requested.length ? requested : Object.keys(PLATES);
const unknown = process.argv.slice(2).filter((a) => !(a in PLATES));
if (unknown.length) {
  console.error(`Variantes desconocidas: ${unknown.join(', ')}. Válidas: ${Object.keys(PLATES).join(', ')}`);
  process.exit(1);
}

let ok = true;
for (const v of variants) ok = build(v) && ok;
process.exit(ok ? 0 : 1);
