import { describe, expect, it } from 'vitest';
import { diffRanks, type RankSnapshot } from './rankStorage';
import { getRankPosition } from '../data/ranks';

const rankOfLevel = (level: number) => getRankPosition(level).rank.index;

const snapshot = (overall: number, groups: Record<string, number> = {}): RankSnapshot => ({
  overall,
  groups,
  prestigeLevels: 0,
});

describe('diffRanks', () => {
  it('no anuncia nada sin foto previa', () => {
    // Estrenar la función no es haber subido de rango: sería volcar todo el historial de golpe.
    expect(diffRanks(null, snapshot(12, { Pecho: 14 }), rankOfLevel)).toEqual([]);
  });

  it('detecta la subida del nivel global', () => {
    const ups = diffRanks(snapshot(9), snapshot(10), rankOfLevel);
    expect(ups).toHaveLength(1);
    expect(ups[0].group).toBeNull();
    expect(ups[0].currentLevel).toBe(10);
  });

  it('ignora el avance decimal dentro del mismo nivel', () => {
    // Casi cualquier serie mueve el nivel un poco; anunciarlo sería ruido constante.
    expect(diffRanks(snapshot(9.1), snapshot(9.9), rankOfLevel)).toEqual([]);
  });

  it('anuncia al cruzar el entero aunque el salto sea mínimo', () => {
    expect(diffRanks(snapshot(9.99), snapshot(10.01), rankOfLevel)).toHaveLength(1);
  });

  it('marca isNewRank sólo cuando se cambia de rango, no de escalón', () => {
    // 3 → 4 cruza de Principiante a Novato; 1 → 2 se queda en Principiante.
    expect(diffRanks(snapshot(3), snapshot(4), rankOfLevel)[0].isNewRank).toBe(true);
    expect(diffRanks(snapshot(1), snapshot(2), rankOfLevel)[0].isNewRank).toBe(false);
  });

  it('detecta subidas por grupo además de la global', () => {
    const ups = diffRanks(
      snapshot(9, { Pecho: 12, Espalda: 8 }),
      snapshot(10, { Pecho: 13, Espalda: 8.5 }),
      rankOfLevel
    );
    expect(ups.map((u) => u.group)).toContain('Pecho');
    expect(ups.map((u) => u.group)).not.toContain('Espalda');
  });

  it('ignora grupos que no existían en la foto previa', () => {
    // Entrenar un grupo por primera vez no es "subir de rango" en ese grupo.
    const ups = diffRanks(snapshot(9), snapshot(9, { Gemelos: 7 }), rankOfLevel);
    expect(ups).toEqual([]);
  });

  it('nunca anuncia bajadas', () => {
    expect(diffRanks(snapshot(15, { Pecho: 20 }), snapshot(12, { Pecho: 14 }), rankOfLevel)).toEqual([]);
  });

  it('ordena los rangos nuevos por delante de los simples escalones', () => {
    const ups = diffRanks(
      snapshot(1, { Pecho: 1, Espalda: 3 }),
      snapshot(2, { Pecho: 2, Espalda: 4 }),
      rankOfLevel
    );
    expect(ups[0].group).toBe('Espalda');
    expect(ups[0].isNewRank).toBe(true);
    expect(ups.slice(1).every((u) => !u.isNewRank)).toBe(true);
  });
});
