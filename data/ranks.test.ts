import { describe, expect, it } from 'vitest';
import { LEVELS_PER_RANK, MAX_LEVEL, PRESTIGE_TIERS, RANKS, getRankPosition } from './ranks';

describe('escalera de rangos', () => {
  it('cubre 30 niveles con 10 rangos de 3 escalones', () => {
    expect(RANKS).toHaveLength(10);
    expect(RANKS.length * LEVELS_PER_RANK).toBe(MAX_LEVEL);
  });

  it('declara los minLevel en la frontera correcta y sin huecos', () => {
    RANKS.forEach((rank, i) => {
      expect(rank.minLevel).toBe(i * LEVELS_PER_RANK + 1);
      expect(rank.index).toBe(i);
    });
  });

  it('nombra los tres escalones de un rango en números romanos', () => {
    expect(getRankPosition(1).label).toBe('Principiante I');
    expect(getRankPosition(2).label).toBe('Principiante II');
    expect(getRankPosition(3).label).toBe('Principiante III');
  });

  it('cambia de rango exactamente al cruzar el múltiplo de 3', () => {
    expect(getRankPosition(3).rank.name).toBe('Principiante');
    expect(getRankPosition(4).rank.name).toBe('Novato');
    expect(getRankPosition(4).label).toBe('Novato I');
  });

  it('sitúa el último rango en los niveles 28-30', () => {
    expect(getRankPosition(28).label).toBe('Leyenda I');
    expect(getRankPosition(30).label).toBe('Leyenda III');
    expect(getRankPosition(30).rank.name).toBe('Leyenda');
  });

  it('usa la parte decimal como progreso al siguiente nivel', () => {
    const position = getRankPosition(7.25);
    expect(position.level).toBe(7);
    expect(position.rank.name).toBe('Aprendiz');
    expect(position.progressToNext).toBeCloseTo(0.25, 5);
  });

  it('deja la barra llena en el nivel máximo, que no tiene siguiente', () => {
    expect(getRankPosition(30).progressToNext).toBe(1);
    expect(getRankPosition(30.8).progressToNext).toBe(1);
  });

  it('acota niveles fuera de rango en vez de devolver un rango indefinido', () => {
    expect(getRankPosition(0).label).toBe('Principiante I');
    expect(getRankPosition(-5).rank.name).toBe('Principiante');
    expect(getRankPosition(999).rank.name).toBe('Leyenda');
    expect(getRankPosition(Number.NaN).level).toBe(1);
  });

  it('sustituye la etiqueta por el escalón de prestigio cuando lo hay', () => {
    expect(getRankPosition(30, 1).label).toBe('Leyenda ★');
    expect(getRankPosition(30, 3).label).toBe('Leyenda ★★★');
    expect(getRankPosition(30, 4).label).toBe('Leyenda Suprema');
    expect(getRankPosition(30, 1).prestige).toBe(PRESTIGE_TIERS[0]);
  });

  it('satura en el último prestigio en lugar de desbordar el array', () => {
    expect(getRankPosition(30, 99).label).toBe('Leyenda Suprema');
    expect(getRankPosition(30, 99).prestige).toBe('Leyenda Suprema');
  });

  it('no marca prestigio mientras no se haya ganado ninguno', () => {
    expect(getRankPosition(30).prestige).toBeNull();
    expect(getRankPosition(12).prestige).toBeNull();
  });
});
