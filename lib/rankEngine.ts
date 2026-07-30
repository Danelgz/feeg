// Motor de rangos: traduce lo que levantas a un nivel de la escalera de data/ranks.ts.
//
// Lógica pura, sin React ni DOM, igual que lib/exerciseStats.ts. La escalera (nombres, colores) y
// los baremos (cuánto hay que levantar) viven en data/; aquí sólo está el cálculo.

import { calculateOneRM, getExerciseInfo } from './exerciseStats';
import { STRENGTH_STANDARDS, type StrengthStandard } from '../data/strengthStandards';
import { MAX_LEVEL, UNRANKED_LEVEL } from '../data/ranks';

/** `null` = sin especificar en el perfil: se usa una curva intermedia. */
export type Sex = 'male' | 'female' | null;

/** Cuántos ejercicios de un grupo entran en su media. */
export const GROUP_TOP_N = 3;

export interface ExerciseInput {
  /** 1RM estimado sobre el peso registrado, tal como lo calcula computePersonalRecords. */
  best1RM: number;
  /**
   * Mejor serie en crudo. Sólo hace falta en ejercicios lastrados: ahí la carga real es el cuerpo
   * más el lastre, y aplicar Brzycki únicamente al lastre infravalora el esfuerzo (30 kg a 5 reps
   * no es lo mismo colgando de una barra que en una polea). Con la serie cruda el motor rehace el
   * 1RM sobre la carga completa.
   */
  bestSet?: { weight: number; reps: number };
}

export interface ExerciseRank {
  exercise: string;
  group: string;
  level: number;
  /** Carga relativa alcanzada, en múltiplos del peso corporal. Es lo que se enseña al usuario. */
  ratio: number;
  /** Marca que ha producido este nivel, en la unidad que el usuario registra. La necesita
   *  `nextLevelTarget` para poder decir cuántos kilos faltan. */
  best1RM: number;
}

export interface GroupRank {
  group: string;
  /** Nivel oficial del grupo: el de su mejor ejercicio. Ver computeGroupRanks. */
  level: number;
  /** Media de los GROUP_TOP_N mejores. Informativo — NO es el nivel del grupo. */
  averageTopN: number;
  /** Ejercicios que entran en `averageTopN` (como mucho GROUP_TOP_N). */
  countedExercises: number;
  /** Ejercicios del grupo con baremo y con marca registrada. */
  rankableExercises: number;
}

/**
 * Ajusta un baremo al sexo del perfil.
 *
 * Sin sexo declarado se usa el punto medio entre las dos curvas en vez de la masculina: elegir la
 * masculina por defecto haría que toda usuaria sin el campo relleno apareciera sistemáticamente por
 * debajo de su nivel real, que es peor que un poco de imprecisión en ambos sentidos.
 */
export function resolveStandard(standard: StrengthStandard, sex: Sex): { floor: number; ceiling: number } {
  const factor =
    sex === 'female' ? standard.femaleFactor : sex === 'male' ? 1 : (1 + standard.femaleFactor) / 2;
  return { floor: standard.floor * factor, ceiling: standard.ceiling * factor };
}

/**
 * Nivel de un ejercicio concreto, o `null` si no es puntuable.
 *
 * Es lineal entre el suelo y el techo del baremo. Lineal en múltiplos de peso corporal ya produce
 * por sí solo la desaceleración esperada — subir de 1.5× a 1.6× en banca cuesta mucho más que de
 * 0.5× a 0.6× —, así que no hace falta curvar nada encima.
 */
export function computeExerciseLevel(
  exerciseName: string,
  input: ExerciseInput,
  bodyweightKg: number,
  sex: Sex = null
): ExerciseRank | null {
  const standard = STRENGTH_STANDARDS[exerciseName];
  if (!standard) return null;
  if (!Number.isFinite(bodyweightKg) || bodyweightKg <= 0) return null;

  let effective1RM = input.best1RM;
  if (standard.bodyweightLoaded && input.bestSet) {
    effective1RM = calculateOneRM(bodyweightKg + Number(input.bestSet.weight || 0), Number(input.bestSet.reps || 0));
  } else if (standard.bodyweightLoaded) {
    // Sin la serie cruda queda la aproximación: cuerpo + 1RM del lastre.
    effective1RM = bodyweightKg + input.best1RM;
  }

  if (!Number.isFinite(effective1RM) || effective1RM <= 0) return null;

  const ratio = effective1RM / bodyweightKg;
  const { floor, ceiling } = resolveStandard(standard, sex);
  const span = ceiling - floor;
  if (span <= 0) return null;

  const raw = UNRANKED_LEVEL + (MAX_LEVEL - UNRANKED_LEVEL) * ((ratio - floor) / span);
  const level = Math.max(UNRANKED_LEVEL, Math.min(MAX_LEVEL, raw));

  const info = getExerciseInfo(exerciseName);
  return { exercise: exerciseName, group: info?.group || 'Otros', level, ratio, best1RM: input.best1RM };
}

export interface NextLevelTarget {
  /** Nivel al que se llega, ya acotado a MAX_LEVEL. */
  targetLevel: number;
  /** Marca necesaria, EN EL NÚMERO QUE SE REGISTRA EN FEEG (lastre en los lastrados, no carga total). */
  targetWeight: number;
  /** Kilos que faltan sobre la marca actual. 0 si ya se ha alcanzado. */
  deltaKg: number;
  /** `true` si ya está en el nivel máximo y no hay nada más que perseguir. */
  isMaxed: boolean;
}

/**
 * Marca necesaria para alcanzar un nivel: la fórmula del nivel, despejada.
 *
 * Es lo que convierte el rango en un objetivo accionable. "Estás en Atleta II" es una etiqueta;
 * "te faltan 4 kg en press de banca para Atleta III" es algo que se puede intentar el jueves.
 *
 * El peso devuelto está en la misma unidad que el usuario escribe en la app — en los ejercicios
 * lastrados se resta el peso corporal, porque lo que teclea es el lastre, no la carga total.
 */
export function weightForLevel(
  exerciseName: string,
  level: number,
  bodyweightKg: number,
  sex: Sex = null
): number | null {
  const standard = STRENGTH_STANDARDS[exerciseName];
  if (!standard || !Number.isFinite(bodyweightKg) || bodyweightKg <= 0) return null;

  const { floor, ceiling } = resolveStandard(standard, sex);
  const clamped = Math.max(UNRANKED_LEVEL, Math.min(MAX_LEVEL, level));
  const ratio = floor + ((clamped - UNRANKED_LEVEL) / (MAX_LEVEL - UNRANKED_LEVEL)) * (ceiling - floor);
  const totalLoad = ratio * bodyweightKg;

  return standard.bodyweightLoaded ? totalLoad - bodyweightKg : totalLoad;
}

/** Qué falta para el siguiente escalón de un ejercicio concreto. */
export function nextLevelTarget(
  exerciseName: string,
  currentLevel: number,
  currentBest1RM: number,
  bodyweightKg: number,
  sex: Sex = null
): NextLevelTarget | null {
  if (currentLevel >= MAX_LEVEL) {
    return { targetLevel: MAX_LEVEL, targetWeight: currentBest1RM, deltaKg: 0, isMaxed: true };
  }

  // El siguiente ENTERO, no el nivel actual más uno: estando en 12.4 lo que falta es llegar a 13,
  // no a 13.4.
  const targetLevel = Math.min(MAX_LEVEL, Math.floor(currentLevel) + 1);
  const targetWeight = weightForLevel(exerciseName, targetLevel, bodyweightKg, sex);
  if (targetWeight === null) return null;

  return {
    targetLevel,
    targetWeight,
    deltaKg: Math.max(0, targetWeight - currentBest1RM),
    isMaxed: false,
  };
}

/** Todos los ejercicios puntuables del historial, de mayor a menor nivel. */
export function computeExerciseRanks(
  records: Record<string, ExerciseInput>,
  bodyweightKg: number,
  sex: Sex = null
): ExerciseRank[] {
  return Object.entries(records)
    .map(([name, input]) => computeExerciseLevel(name, input, bodyweightKg, sex))
    .filter((r): r is ExerciseRank => r !== null)
    .sort((a, b) => b.level - a.level);
}

/**
 * Nivel por grupo muscular: el de su mejor ejercicio puntuable.
 *
 * La primera versión promediaba los tres mejores, para que un aislamiento flojo no hundiera el
 * grupo. No funciona, y el test `añadir un aislamiento flojo no baja el rango del grupo` lo
 * demuestra: con un solo ejercicio a nivel 30 la media es 30, y al añadir uno de nivel 1 pasa a
 * 15.5. Recortar a los tres mejores no arregla nada, porque una media SIEMPRE baja al incorporar un
 * valor menor. El problema no era cuántos se promedian, sino promediar.
 *
 * Un máximo sí es monótono: añadir ejercicios nunca puede bajar el rango, que era justo el
 * requisito — nadie debe perder rango por ampliar su rutina. La media de los mejores se sigue
 * calculando y se expone como `averageTopN`, porque es un dato interesante para enseñar al lado
 * (indica si el grupo está sostenido por un solo levantamiento o por varios), pero no manda.
 */
export function computeGroupRanks(
  records: Record<string, ExerciseInput>,
  bodyweightKg: number,
  sex: Sex = null
): Record<string, GroupRank> {
  const byGroup: Record<string, number[]> = {};
  for (const rank of computeExerciseRanks(records, bodyweightKg, sex)) {
    (byGroup[rank.group] ||= []).push(rank.level);
  }

  const result: Record<string, GroupRank> = {};
  for (const [group, levels] of Object.entries(byGroup)) {
    // computeExerciseRanks ya viene ordenado descendente, así que los primeros son los mejores.
    const top = levels.slice(0, GROUP_TOP_N);
    result[group] = {
      group,
      level: levels[0],
      averageTopN: top.reduce((sum, l) => sum + l, 0) / top.length,
      countedExercises: top.length,
      rankableExercises: levels.length,
    };
  }
  return result;
}

/**
 * Nivel global del perfil: media de los niveles de grupo.
 *
 * Se promedian los GRUPOS y no los ejercicios sueltos para que alguien que sólo entrena press banca
 * no aparezca como Élite global: con un único grupo puntuado, ese grupo es todo su nivel, pero en
 * cuanto entrena piernas la media refleja el desequilibrio.
 */
export function computeOverallLevel(groupRanks: Record<string, GroupRank>): number {
  const levels = Object.values(groupRanks).map((g) => g.level);
  if (levels.length === 0) return UNRANKED_LEVEL;
  return levels.reduce((sum, l) => sum + l, 0) / levels.length;
}

/** ¿Se puede calcular algún rango? Sin peso corporal el sistema entero no tiene referencia. */
export function canComputeRanks(bodyweightKg: number | null | undefined): boolean {
  return Number.isFinite(Number(bodyweightKg)) && Number(bodyweightKg) > 0;
}
