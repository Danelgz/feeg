import { describe, expect, it } from 'vitest';

import {
  ANATOMY_VIEW_BOX,
  BACK_MUSCLES,
  BACK_SILHOUETTE,
  FRONT_MUSCLES,
  FRONT_SILHOUETTE,
} from './muscleMapPaths';
import { MUSCLE_GROUPS } from './muscleMapRegions';
import GROUP_MAP from './muscle-map-groups.json';

// muscleMapPaths.ts es un archivo GENERADO: sale de vectorizar una lámina y de repartir las piezas
// entre grupos a mano en muscle-map-groups.json. Ese reparto se hace mirando una imagen con setenta
// números encima, y equivocarse de fila deja un músculo fuera del cuerpo — que en pantalla se ve
// como un hueco blanco donde debería haber un vientre, sin ningún error por medio que lo delate.
// Estas comprobaciones son la red para eso.

const VIEWS = [
  { name: 'front', muscles: FRONT_MUSCLES, silhouette: FRONT_SILHOUETTE, mapping: GROUP_MAP.front },
  { name: 'back', muscles: BACK_MUSCLES, silhouette: BACK_SILHOUETTE, mapping: GROUP_MAP.back },
] as const;

describe('geometría del mapa muscular', () => {
  it('declara un viewBox de cuatro números', () => {
    expect(ANATOMY_VIEW_BOX.split(' ').map(Number).filter(Number.isFinite)).toHaveLength(4);
  });

  it('dibuja los doce grupos entre las dos vistas', () => {
    const drawn = new Set([...Object.keys(FRONT_MUSCLES), ...Object.keys(BACK_MUSCLES)]);
    expect([...MUSCLE_GROUPS].filter((g) => !drawn.has(g))).toEqual([]);
  });

  it('no inventa grupos que la app no conozca', () => {
    const known = new Set<string>(MUSCLE_GROUPS);
    for (const { name, muscles } of VIEWS) {
      expect(Object.keys(muscles).filter((g) => !known.has(g)), name).toEqual([]);
    }
  });

  it('trae tantos paths por grupo como piezas le asigna el mapeo', () => {
    for (const { name, muscles, mapping } of VIEWS) {
      for (const [group, indices] of Object.entries(mapping)) {
        expect(muscles[group]?.length, `${name}/${group}`).toBe(indices.length);
      }
    }
  });

  it('cierra todos los paths y los mantiene dentro del viewBox', () => {
    const [, , vbW, vbH] = ANATOMY_VIEW_BOX.split(' ').map(Number);
    for (const { name, muscles, silhouette } of VIEWS) {
      const paths = [...silhouette, ...Object.values(muscles).flat()];
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
