import { describe, expect, it } from 'vitest';

import * as MALE from './muscleMapPaths';
import * as FEMALE from './muscleMapPathsFemale';
import { MUSCLE_GROUPS } from './muscleMapRegions';
import MALE_MAP from './muscle-map-groups.json';
import FEMALE_MAP from './muscle-map-groups.female.json';

// Los dos módulos de geometría son GENERADOS: salen de vectorizar una lámina y de repartir las piezas
// entre grupos a mano en su muscle-map-groups. Ese reparto se hace mirando una imagen con decenas de
// números encima, y equivocarse de fila deja un músculo fuera del cuerpo — que en pantalla se ve como
// un hueco blanco donde debería haber un vientre, sin ningún error por medio que lo delate. Estas
// comprobaciones son la red para eso.
//
// El cruce contra el COLOR de cada mancha, que es lo que caza que una pieza esté en el grupo
// equivocado (y no sólo ausente), lo hace scripts/build-muscle-paths.mjs al generar: necesita el
// trazado en bruto, que no se versiona.

const BODIES = [
  { sex: 'masculino', body: MALE, mapping: MALE_MAP },
  { sex: 'femenino', body: FEMALE, mapping: FEMALE_MAP },
] as const;

const VIEWS = [
  { name: 'front', silhouette: 'FRONT_SILHOUETTE', muscles: 'FRONT_MUSCLES' },
  { name: 'back', silhouette: 'BACK_SILHOUETTE', muscles: 'BACK_MUSCLES' },
] as const;

describe.each(BODIES)('geometría del mapa muscular · cuerpo $sex', ({ body, mapping }) => {
  it('declara un viewBox de cuatro números', () => {
    expect(body.ANATOMY_VIEW_BOX.split(' ').map(Number).filter(Number.isFinite)).toHaveLength(4);
  });

  it('dibuja los doce grupos entre las dos vistas', () => {
    const drawn = new Set([...Object.keys(body.FRONT_MUSCLES), ...Object.keys(body.BACK_MUSCLES)]);
    expect([...MUSCLE_GROUPS].filter((g) => !drawn.has(g))).toEqual([]);
  });

  it('no inventa grupos que la app no conozca', () => {
    const known = new Set<string>(MUSCLE_GROUPS);
    for (const { name, muscles } of VIEWS) {
      expect(Object.keys(body[muscles]).filter((g) => !known.has(g)), name).toEqual([]);
    }
  });

  it('trae tantos paths por grupo como piezas le asigna el mapeo', () => {
    for (const { name, muscles } of VIEWS) {
      for (const [group, indices] of Object.entries(mapping[name])) {
        expect(body[muscles][group]?.length, `${name}/${group}`).toBe(indices.length);
      }
    }
  });

  it('declara sólo excepciones de piezas que existen', () => {
    for (const { name } of VIEWS) {
      const assigned = new Set(Object.values(mapping[name]).flat());
      for (const i of Object.keys(mapping.exceptions?.[name] ?? {})) {
        expect(assigned.has(Number(i)), `${name}: exceptions["${i}"]`).toBe(true);
      }
    }
  });

  it('cierra todos los paths y los mantiene dentro del viewBox', () => {
    const [, , vbW, vbH] = body.ANATOMY_VIEW_BOX.split(' ').map(Number);
    for (const { name, silhouette, muscles } of VIEWS) {
      const paths = [...body[silhouette], ...Object.values(body[muscles]).flat()];
      expect(paths.length, name).toBeGreaterThan(0);
      for (const p of paths) {
        expect(p.d.startsWith('M'), `${name}: empieza en M`).toBe(true);
        expect(p.d.endsWith('Z'), `${name}: cierra en Z`).toBe(true);
        // Un path que se sale del viewBox es una pieza mal transformada: se vería recortada por el
        // borde del SVG en vez de sobre el cuerpo.
        const coords = p.d.match(/-?\d+(\.\d+)?/g)!.map(Number);
        const xs = coords.filter((_, i) => i % 2 === 0);
        const ys = coords.filter((_, i) => i % 2 === 1);
        expect(Math.min(...xs), name).toBeGreaterThanOrEqual(-1);
        expect(Math.max(...xs), name).toBeLessThanOrEqual(vbW + 1);
        expect(Math.min(...ys), name).toBeGreaterThanOrEqual(-1);
        expect(Math.max(...ys), name).toBeLessThanOrEqual(vbH + 1);
      }
    }
  });
});

describe('los dos cuerpos son intercambiables', () => {
  it('exportan los mismos grupos en cada vista', () => {
    for (const { muscles } of VIEWS) {
      expect(Object.keys(MALE[muscles]).sort()).toEqual(Object.keys(FEMALE[muscles]).sort());
    }
  });
});
