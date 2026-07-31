import { describe, expect, it } from 'vitest';
import {
  GROUP_TOP_N,
  canComputeRanks,
  computeExerciseLevel,
  computeExerciseRanks,
  computeGroupRanks,
  computeOverallLevel,
  getRankableGroups,
  LEVEL_CURVE_EXPONENT,
  nextLevelTarget,
  nextRankMilestone,
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

  it('curva el camino: la mitad del baremo no es media escalera', () => {
    // 96 kg es el punto medio exacto entre el suelo (32) y el techo (160). Con reparto lineal eso
    // daba el nivel 15.5, que es la raíz de que casi cualquiera saliera por la mitad alta de la
    // escalera. Con la curva cae al 10.6: sigue siendo la mitad del baremo, pero ya no la mitad de
    // los rangos, porque la segunda mitad cuesta muchísimo más que la primera.
    const rank = computeExerciseLevel('Press de Banca (Barra)', { best1RM: 96 }, BW, 'male')!;
    expect(rank.ratio).toBeCloseTo(1.2, 5);
    expect(rank.level).toBeCloseTo(1 + 29 * Math.pow(0.5, LEVEL_CURVE_EXPONENT), 5);
    expect(rank.level).toBeLessThan(15.5);
  });

  it('deja los rangos altos fuera del alcance de un levantamiento intermedio', () => {
    // El síntoma que motivó la curva: gente de nivel intermedio con el rango máximo en todo.
    // Un press de banca de 1× el peso corporal es un levantamiento decente de alguien que lleva unos
    // meses entrenando, y tiene que salir en la primera mitad de la escalera, no en la segunda.
    const intermedio = computeExerciseLevel('Press de Banca (Barra)', { best1RM: BW }, BW, 'male')!;
    expect(intermedio.level).toBeLessThan(MAX_LEVEL / 2);

    // Y el nivel 30 sigue costando exactamente lo mismo que antes: el techo del baremo. La curva
    // reparte el camino, no mueve los anclajes.
    const techo = computeExerciseLevel('Press de Banca (Barra)', { best1RM: 160 }, BW, 'male')!;
    expect(techo.level).toBe(MAX_LEVEL);
  });

  it('nunca baja de nivel al levantar más', () => {
    let previo = 0;
    for (let kg = 32; kg <= 160; kg += 4) {
      const nivel = computeExerciseLevel('Press de Banca (Barra)', { best1RM: kg }, BW, 'male')!.level;
      expect(nivel, `${kg} kg`).toBeGreaterThanOrEqual(previo);
      previo = nivel;
    }
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
    const target = nextLevelTarget('Press de Banca (Barra)', current.level, current.best1RM, BW, 'male')!;
    expect(current.level).toBeGreaterThan(10);
    expect(current.level).toBeLessThan(11);
    expect(target.targetLevel).toBe(11);
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
    const inputs = {
      'Press de Banca (Barra)': { best1RM: 160 },              // techo del baremo -> nivel 30
      'Press de Banca Inclinado (Barra)': { best1RM: 132 },    // techo del baremo -> nivel 30
      'Press de Banca en Declive (Barra)': { best1RM: 96 },    // mitad del baremo
      'Press de Banca (Mancuerna)': { best1RM: 12 },           // suelo del baremo -> nivel 1
    };
    const ranks = computeGroupRanks(inputs, BW, 'male');
    // El nivel del tercero sale del propio motor y no de un número escrito a mano: así este test
    // comprueba cómo se agrega el grupo, no cómo está calibrada la curva (que tiene los suyos).
    const tercero = computeExerciseLevel('Press de Banca en Declive (Barra)', { best1RM: 96 }, BW, 'male')!;

    expect(ranks.Pecho.level).toBeCloseTo(30, 5);
    expect(ranks.Pecho.averageTopN).toBeCloseTo((30 + 30 + tercero.level) / 3, 5);
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
    const solo = computeExerciseLevel('Press de Banca (Barra)', { best1RM: 96 }, BW, 'male')!;
    const ranks = computeGroupRanks(bench(96), BW, 'male');
    expect(ranks.Pecho.countedExercises).toBe(1);
    expect(ranks.Pecho.level).toBeCloseTo(solo.level, 5);
    expect(ranks.Pecho.averageTopN).toBeCloseTo(solo.level, 5);
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

describe('getRankableGroups', () => {
  it('incluye los grupos con baremo y deja fuera los que no lo tienen', () => {
    const groups = getRankableGroups();
    expect(groups).toContain('Pecho');
    expect(groups).toContain('Abdomen');
    // Cuello no tiene ni un solo ejercicio puntuable: no es que falte entrenarlo, es que su rango
    // no existe. Enseñarlo como pendiente mandaría al usuario a perseguir algo inalcanzable.
    expect(groups).not.toContain('Cuello');
    expect(groups).not.toContain('Movilidad');
  });
});

describe('nextRankMilestone', () => {
  const milestoneFor = (inputs: Record<string, { best1RM: number }>) =>
    nextRankMilestone(
      computeExerciseRanks(inputs, BW, 'male'),
      computeGroupRanks(inputs, BW, 'male'),
      BW,
      'male'
    );

  it('no devuelve nada sin ejercicios puntuables', () => {
    expect(nextRankMilestone([], {}, BW, 'male')).toBeNull();
  });

  it('ignora los ejercicios que no mueven el nivel de su grupo', () => {
    // Las dos son Cuádriceps. La goblet está a un nivel muy inferior, así que subirla no cambia el
    // rango del grupo (que es su máximo) por barata que sea.
    const milestone = milestoneFor({
      'Sentadilla (Barra)': { best1RM: 170 },
      'Sentadilla Goblet (Mancuerna)': { best1RM: 20 },
    });

    expect(milestone?.exercise).toBe('Sentadilla (Barra)');
  });

  it('elige por esfuerzo relativo, no por kilos absolutos', () => {
    // Se colocan las dos marcas a una distancia conocida de su siguiente nivel, calculando el peso
    // objetivo con el propio motor en vez de escribirlo a mano: así el test sobrevive a un cambio de
    // calibración de la curva, que es exactamente lo que rompió la versión anterior.
    const justBelow = (exercise: string, targetLevel: number, deltaKg: number) => ({
      best1RM: weightForLevel(exercise, targetLevel, BW, 'male')! - deltaKg,
    });

    const inputs = {
      'Sentadilla (Barra)': justBelow('Sentadilla (Barra)', 12, 3),
      'Curl de Bíceps (Barra)': justBelow('Curl de Bíceps (Barra)', 17, 1.3),
    };

    // Premisa del test, comprobada y no supuesta: en kilos el curl está más cerca...
    const [squat, curl] = ['Sentadilla (Barra)', 'Curl de Bíceps (Barra)'].map((exercise) => {
      const rank = computeExerciseLevel(exercise, inputs[exercise as keyof typeof inputs], BW, 'male')!;
      return nextLevelTarget(exercise, rank.level, rank.best1RM, BW, 'male')!;
    });
    expect(curl.deltaKg).toBeLessThan(squat.deltaKg);
    // ...pero en porcentaje sobre la marca actual, el que de verdad está a un paso es la sentadilla.
    expect(curl.deltaKg / inputs['Curl de Bíceps (Barra)'].best1RM).toBeGreaterThan(
      squat.deltaKg / inputs['Sentadilla (Barra)'].best1RM
    );

    const milestone = milestoneFor(inputs);
    expect(milestone?.exercise).toBe('Sentadilla (Barra)');
    expect(milestone?.group).toBe('Cuádriceps');
    expect(milestone?.deltaKg).toBeCloseTo(3, 2);
    expect(milestone?.groupTargetLevel).toBe(12);
  });

  it('no devuelve nada cuando todo está al máximo', () => {
    expect(milestoneFor({ 'Sentadilla (Barra)': { best1RM: 250 } })).toBeNull();
  });
});
