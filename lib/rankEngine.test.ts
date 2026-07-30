import { describe, expect, it } from 'vitest';
import {
  GROUP_TOP_N,
  canComputeRanks,
  computeExerciseLevel,
  computeExerciseRanks,
  computeGroupRanks,
  computeOverallLevel,
  nextLevelTarget,
  resolveStandard,
  weightForLevel,
} from './rankEngine';
import { STRENGTH_STANDARDS } from '../data/strengthStandards';
import { MAX_LEVEL } from '../data/ranks';
import { getExerciseInfo } from './exerciseStats';

const BW = 80;
const bench = (kg: number) => ({ 'Press de Banca (Barra)': { best1RM: kg } });

describe('baremos', () => {
  it('todos los ejercicios con baremo existen en el catálogo', () => {
    const missing = Object.keys(STRENGTH_STANDARDS).filter((name) => getExerciseInfo(name) === null);
    expect(missing).toEqual([]);
  });

  it('ningún baremo tiene el techo por debajo del suelo', () => {
    for (const [name, s] of Object.entries(STRENGTH_STANDARDS)) {
      expect(s.ceiling, name).toBeGreaterThan(s.floor);
      expect(s.femaleFactor, name).toBeGreaterThan(0);
    }
  });
});

describe('resolveStandard', () => {
  const standard = { floor: 0.4, ceiling: 2.0, femaleFactor: 0.5 };

  it('deja la curva intacta para hombre', () => {
    expect(resolveStandard(standard, 'male')).toEqual({ floor: 0.4, ceiling: 2.0 });
  });

  it('aplica el factor completo para mujer', () => {
    expect(resolveStandard(standard, 'female')).toEqual({ floor: 0.2, ceiling: 1.0 });
  });

  it('usa el punto medio cuando no hay sexo declarado', () => {
    // 0.75 = (1 + 0.5) / 2 — ni la curva masculina ni la femenina.
    expect(resolveStandard(standard, null)).toEqual({ floor: 0.30000000000000004, ceiling: 1.5 });
  });
});

describe('computeExerciseLevel', () => {
  it('sitúa el suelo del baremo en el nivel 1 y el techo en el 30', () => {
    // Hombre, 80 kg: suelo 0.40×80 = 32 kg, techo 2.00×80 = 160 kg.
    expect(computeExerciseLevel('Press de Banca (Barra)', { best1RM: 32 }, BW, 'male')!.level).toBeCloseTo(1, 5);
    expect(computeExerciseLevel('Press de Banca (Barra)', { best1RM: 160 }, BW, 'male')!.level).toBeCloseTo(MAX_LEVEL, 5);
  });

  it('interpola linealmente entre suelo y techo', () => {
    // Punto medio: 96 kg -> nivel 15.5
    const rank = computeExerciseLevel('Press de Banca (Barra)', { best1RM: 96 }, BW, 'male')!;
    expect(rank.level).toBeCloseTo(15.5, 5);
    expect(rank.ratio).toBeCloseTo(1.2, 5);
  });

  it('acota en vez de desbordar la escalera', () => {
    expect(computeExerciseLevel('Press de Banca (Barra)', { best1RM: 5 }, BW, 'male')!.level).toBe(1);
    expect(computeExerciseLevel('Press de Banca (Barra)', { best1RM: 500 }, BW, 'male')!.level).toBe(MAX_LEVEL);
  });

  it('rankea más alto a una mujer que a un hombre con el mismo levantamiento', () => {
    const male = computeExerciseLevel('Press de Banca (Barra)', { best1RM: 70 }, BW, 'male')!;
    const female = computeExerciseLevel('Press de Banca (Barra)', { best1RM: 70 }, BW, 'female')!;
    expect(female.level).toBeGreaterThan(male.level);
  });

  it('devuelve null para ejercicios sin baremo', () => {
    // Ejercicios de peso corporal y de tiempo: no admiten 1RM, así que nunca serán puntuables.
    expect(computeExerciseLevel('Flexiones', { best1RM: 40 }, BW)).toBeNull();
    expect(computeExerciseLevel('Plancha', { best1RM: 0 }, BW)).toBeNull();
  });

  it('devuelve null sin peso corporal válido', () => {
    expect(computeExerciseLevel('Press de Banca (Barra)', { best1RM: 100 }, 0)).toBeNull();
    expect(computeExerciseLevel('Press de Banca (Barra)', { best1RM: 100 }, Number.NaN)).toBeNull();
  });

  it('etiqueta el ejercicio con su grupo del catálogo', () => {
    expect(computeExerciseLevel('Sentadilla (Barra)', { best1RM: 100 }, BW)!.group).toBe('Cuádriceps');
  });

  describe('ejercicios lastrados', () => {
    it('suma el peso corporal a la carga', () => {
      // Dominada con 0 kg de lastre a 1 rep = ratio 1.0 = suelo del baremo.
      const rank = computeExerciseLevel(
        'Dominada (Con Peso Añadido)',
        { best1RM: 0, bestSet: { weight: 0, reps: 1 } },
        BW,
        'male'
      )!;
      expect(rank.ratio).toBeCloseTo(1, 5);
      expect(rank.level).toBeCloseTo(1, 5);
    });

    it('rankea más alto cuantos más kilos se cuelgan', () => {
      const light = computeExerciseLevel('Dominada (Con Peso Añadido)', { best1RM: 0, bestSet: { weight: 10, reps: 1 } }, BW, 'male')!;
      const heavy = computeExerciseLevel('Dominada (Con Peso Añadido)', { best1RM: 0, bestSet: { weight: 40, reps: 1 } }, BW, 'male')!;
      expect(heavy.level).toBeGreaterThan(light.level);
    });

    it('cae a la aproximación cuando no llega la serie cruda', () => {
      const rank = computeExerciseLevel('Dominada (Con Peso Añadido)', { best1RM: 20 }, BW, 'male')!;
      expect(rank.ratio).toBeCloseTo((BW + 20) / BW, 5);
    });
  });
});

describe('weightForLevel / nextLevelTarget', () => {
  it('es la inversa exacta de computeExerciseLevel', () => {
    // La propiedad que garantiza que "te faltan N kg" no miente: si levantas justo ese peso,
    // el motor tiene que devolverte justo ese nivel.
    for (const level of [1, 7, 15, 23, 30]) {
      const weight = weightForLevel('Press de Banca (Barra)', level, BW, 'male')!;
      const back = computeExerciseLevel('Press de Banca (Barra)', { best1RM: weight }, BW, 'male')!;
      expect(back.level, `nivel ${level}`).toBeCloseTo(level, 5);
    }
  });

  it('devuelve el suelo y el techo del baremo en los extremos', () => {
    expect(weightForLevel('Press de Banca (Barra)', 1, BW, 'male')).toBeCloseTo(32, 5);
    expect(weightForLevel('Press de Banca (Barra)', 30, BW, 'male')).toBeCloseTo(160, 5);
  });

  it('resta el peso corporal en los lastrados, porque el usuario registra el lastre', () => {
    // Nivel 1 de dominada = ratio 1.0 = mover el cuerpo, o sea 0 kg de lastre.
    expect(weightForLevel('Dominada (Con Peso Añadido)', 1, BW, 'male')).toBeCloseTo(0, 5);
  });

  it('apunta al siguiente entero, no al nivel actual más uno', () => {
    const current = computeExerciseLevel('Press de Banca (Barra)', { best1RM: 96 }, BW, 'male')!;
    expect(current.level).toBeCloseTo(15.5, 5);
    const target = nextLevelTarget('Press de Banca (Barra)', current.level, current.best1RM, BW, 'male')!;
    expect(target.targetLevel).toBe(16);
    expect(target.deltaKg).toBeGreaterThan(0);
  });

  it('marca isMaxed y no pide más kilos en el nivel máximo', () => {
    const target = nextLevelTarget('Press de Banca (Barra)', 30, 160, BW, 'male')!;
    expect(target.isMaxed).toBe(true);
    expect(target.deltaKg).toBe(0);
  });

  it('nunca devuelve un delta negativo si ya se superó el objetivo', () => {
    const target = nextLevelTarget('Press de Banca (Barra)', 15.5, 200, BW, 'male')!;
    expect(target.deltaKg).toBe(0);
  });

  it('devuelve null para ejercicios sin baremo', () => {
    expect(weightForLevel('Flexiones', 10, BW, 'male')).toBeNull();
  });
});

describe('cobertura de baremos', () => {
  it('cubre máquinas y poleas, no sólo peso libre', () => {
    expect(STRENGTH_STANDARDS['Prensa de Piernas']).toBeDefined();
    expect(STRENGTH_STANDARDS['Jalón al Pecho (Cable)']).toBeDefined();
    expect(STRENGTH_STANDARDS['Extensión de Tríceps (Cable)']).toBeDefined();
  });

  it('da por fin rango puntuable al Abdomen', () => {
    const ranks = computeGroupRanks({ 'Crunch Corto (Máquina)': { best1RM: 40 } }, BW, 'male');
    expect(ranks.Abdomen).toBeDefined();
  });

  it('la prensa tiene un techo muy por encima de la sentadilla libre', () => {
    // Si compartieran baremo, maxear la prensa sería trivial.
    expect(STRENGTH_STANDARDS['Prensa de Piernas'].ceiling).toBeGreaterThan(
      STRENGTH_STANDARDS['Sentadilla (Barra)'].ceiling
    );
  });
});

describe('computeGroupRanks', () => {
  it('toma el nivel del mejor ejercicio, y expone la media de los N mejores aparte', () => {
    const ranks = computeGroupRanks(
      {
        'Press de Banca (Barra)': { best1RM: 160 },              // nivel 30
        'Press de Banca Inclinado (Barra)': { best1RM: 132 },    // nivel 30
        'Press de Banca en Declive (Barra)': { best1RM: 96 },    // nivel ~15.5
        'Press de Banca (Mancuerna)': { best1RM: 12 },           // nivel 1
      },
      BW,
      'male'
    );
    expect(ranks.Pecho.level).toBeCloseTo(30, 5);
    expect(ranks.Pecho.averageTopN).toBeCloseTo((30 + 30 + 15.5) / 3, 5);
    expect(ranks.Pecho.countedExercises).toBe(GROUP_TOP_N);
    expect(ranks.Pecho.rankableExercises).toBe(4);
  });

  it('añadir un aislamiento flojo no baja el rango del grupo', () => {
    const strong = { 'Press de Banca (Barra)': { best1RM: 160 } };
    const before = computeGroupRanks(strong, BW, 'male').Pecho.level;
    const after = computeGroupRanks(
      { ...strong, 'Press de Banca (Mancuerna)': { best1RM: 12 } },
      BW,
      'male'
    ).Pecho.level;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('es monótono: ningún grupo baja al ir sumando ejercicios uno a uno', () => {
    // La propiedad que define el sistema — nadie puede perder rango por ampliar su rutina.
    const additions: [string, number][] = [
      ['Press de Banca (Barra)', 160],
      ['Press de Banca (Mancuerna)', 12],
      ['Press de Banca Inclinado (Barra)', 40],
      ['Press de Banca en Declive (Barra)', 150],
      ['Press de Suelo (Barra)', 30],
    ];
    const records: Record<string, { best1RM: number }> = {};
    let previous = 0;
    for (const [name, best1RM] of additions) {
      records[name] = { best1RM };
      const level = computeGroupRanks(records, BW, 'male').Pecho.level;
      expect(level, `tras añadir ${name}`).toBeGreaterThanOrEqual(previous);
      previous = level;
    }
  });

  it('usa el único ejercicio disponible cuando el grupo tiene uno solo', () => {
    const ranks = computeGroupRanks(bench(96), BW, 'male');
    expect(ranks.Pecho.countedExercises).toBe(1);
    expect(ranks.Pecho.level).toBeCloseTo(15.5, 5);
    expect(ranks.Pecho.averageTopN).toBeCloseTo(15.5, 5);
  });

  it('ignora por completo los ejercicios sin baremo', () => {
    const ranks = computeGroupRanks(
      { ...bench(96), Flexiones: { best1RM: 40 } },
      BW,
      'male'
    );
    expect(ranks.Pecho.rankableExercises).toBe(1);
  });

  it('devuelve un objeto vacío si nada es puntuable', () => {
    expect(computeGroupRanks({ Plancha: { best1RM: 0 } }, BW)).toEqual({});
  });
});

describe('computeOverallLevel', () => {
  it('promedia los grupos, no los ejercicios sueltos', () => {
    const ranks = computeGroupRanks(
      {
        'Press de Banca (Barra)': { best1RM: 160 }, // Pecho, nivel 30
        'Sentadilla (Barra)': { best1RM: 40 },      // Cuádriceps, nivel 1
      },
      BW,
      'male'
    );
    expect(computeOverallLevel(ranks)).toBeCloseTo(15.5, 5);
  });

  it('cae al nivel mínimo sin ningún grupo puntuado', () => {
    expect(computeOverallLevel({})).toBe(1);
  });
});

describe('computeExerciseRanks', () => {
  it('ordena de mayor a menor nivel', () => {
    const ranks = computeExerciseRanks(
      { 'Press de Banca (Barra)': { best1RM: 60 }, 'Sentadilla (Barra)': { best1RM: 190 } },
      BW,
      'male'
    );
    expect(ranks.map((r) => r.exercise)).toEqual(['Sentadilla (Barra)', 'Press de Banca (Barra)']);
  });
});

describe('canComputeRanks', () => {
  it('exige un peso corporal positivo', () => {
    expect(canComputeRanks(75)).toBe(true);
    expect(canComputeRanks(0)).toBe(false);
    expect(canComputeRanks(null)).toBe(false);
    expect(canComputeRanks(undefined)).toBe(false);
  });
});
