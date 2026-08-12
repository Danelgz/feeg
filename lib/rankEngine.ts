// Motor de rangos: traduce lo que levantas a un nivel de la escalera de data/ranks.ts.
//
// Lógica pura, sin React ni DOM, igual que lib/exerciseStats.ts. La escalera (nombres, colores) y
// los baremos (cuánto hay que levantar) viven en data/; aquí sólo está el cálculo.

import { calculateOneRM, getExerciseInfo } from './exerciseStats';
import { exercisesList } from '../data/exercises';
import { STRENGTH_STANDARDS, type StrengthStandard } from '../data/strengthStandards';
import { MAX_LEVEL, UNRANKED_LEVEL } from '../data/ranks';

/** `null` = sin especificar en el perfil: se usa una curva intermedia. */
export type Sex = 'male' | 'female' | null;

/**
 * Cómo lee el motor lo que el usuario ha escrito en un ejercicio de mancuerna o de polea, porque
 * los baremos de STRENGTH_STANDARDS asumen una única convención y no toda la gente registra igual.
 *
 * - `dumbbellMode: 'combined'`: el usuario apunta la suma de las dos mancuernas (p. ej. "40" al
 *   entrenar con dos de 20 kg), no el peso de una sola. Los baremos de mancuerna están calibrados
 *   sobre el peso de UNA, así que sin corregir esto el motor ve el doble de carga de la que hay.
 * - `pulleyMode: 'assisted'`: sus máquinas de polea tienen un sistema que reduce el esfuerzo real
 *   por debajo del número marcado (una polea compuesta, no la redirección simple 1:1 de un cable
 *   normal). Sin corregirlo, un peso de polea que en realidad exige la mitad de fuerza puntúa como
 *   si exigiera toda.
 *
 * Ambos casos aplican el mismo factor (0.5) porque en ambos la carga real es la mitad de la
 * registrada; `null`/`undefined` en cualquier campo se trata como el valor por defecto (sin
 * corrección), que es el comportamiento de siempre.
 */
export interface EquipmentPrefs {
  dumbbellMode?: 'perHand' | 'combined' | null;
  pulleyMode?: 'asShown' | 'assisted' | null;
}

/** Factor sobre la carga registrada para llegar a la carga real, según cómo la registre el usuario. */
function equipmentMultiplier(exerciseName: string, prefs?: EquipmentPrefs): number {
  const equipment = getExerciseInfo(exerciseName)?.equipment;
  if (equipment === 'mancuerna' && prefs?.dumbbellMode === 'combined') return 0.5;
  if (equipment === 'polea' && prefs?.pulleyMode === 'assisted') return 0.5;
  return 1;
}

/** Cuántos ejercicios de un grupo entran en su media. */
export const GROUP_TOP_N = 3;

/**
 * Curvatura de la escalera. 1 sería lineal entre el suelo y el techo del baremo.
 *
 * La primera versión era lineal y el resultado fue que casi cualquiera con unos meses de gimnasio
 * salía por la mitad alta de la escalera, y con un par de aislamientos a repeticiones altas se
 * plantaba en el máximo de todos los grupos. El problema es que lo lineal reparte los treinta
 * niveles a partes iguales, cuando la dificultad real no se reparte así: pasar de 0.5× a 0.6× el
 * peso corporal en banca son unas semanas, y de 1.9× a 2.0× puede ser un año.
 *
 * Con exponente 1.6 la mitad del baremo deja de ser el nivel 15 y pasa a ser el nivel 10, mientras
 * que el techo sigue exigiendo exactamente lo mismo que antes. Es decir: no se han movido los
 * anclajes de la tabla de baremos, se ha repartido el camino entre ellos como cuesta recorrerlo.
 *
 * Subido a 2.4: con 1.6 los rangos altos se alcanzaban con un nivel de fuerza intermedio-avanzado,
 * no realmente excepcional. El techo del baremo (nivel 30) sigue costando lo mismo que costaba
 * — eso lo fija la propia tabla de baremos, no el exponente — pero ahora hace falta acercarse mucho
 * más a él para llegar a los rangos de arriba, en vez de sólo aproximarse.
 *
 * Calibrado sobre press de banca con 80 kg de peso corporal: ~98 kg → Aprendiz, ~129 kg → Atleta,
 * ~144 kg → Élite, ~156 kg → Leyenda (el techo exacto, 160 kg, sigue siendo el nivel 30).
 */
export const LEVEL_CURVE_EXPONENT = 2.4;

/** Progreso [0,1] dentro del baremo → nivel 1-30, aplicando la curvatura. */
function levelFromProgress(progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  return UNRANKED_LEVEL + (MAX_LEVEL - UNRANKED_LEVEL) * Math.pow(p, LEVEL_CURVE_EXPONENT);
}

/** Inversa de `levelFromProgress`: qué progreso del baremo hace falta para un nivel dado. */
function progressForLevel(level: number): number {
  const clamped = Math.max(UNRANKED_LEVEL, Math.min(MAX_LEVEL, level));
  return Math.pow((clamped - UNRANKED_LEVEL) / (MAX_LEVEL - UNRANKED_LEVEL), 1 / LEVEL_CURVE_EXPONENT);
}

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
 * El progreso dentro del baremo se curva con LEVEL_CURVE_EXPONENT antes de convertirse en nivel: la
 * mitad de la tabla no vale media escalera, porque la segunda mitad cuesta muchísimo más que la
 * primera.
 */
export function computeExerciseLevel(
  exerciseName: string,
  input: ExerciseInput,
  bodyweightKg: number,
  sex: Sex = null,
  prefs?: EquipmentPrefs
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

  // El multiplicador corrige la carga registrada a la carga real (ver EquipmentPrefs); los
  // ejercicios lastrados son siempre de equipamiento "corporal", así que aquí vale 1 y no interfiere
  // con el cálculo de arriba.
  const ratio = (effective1RM * equipmentMultiplier(exerciseName, prefs)) / bodyweightKg;
  const { floor, ceiling } = resolveStandard(standard, sex);
  const span = ceiling - floor;
  if (span <= 0) return null;

  const level = levelFromProgress((ratio - floor) / span);

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
  sex: Sex = null,
  prefs?: EquipmentPrefs
): number | null {
  const standard = STRENGTH_STANDARDS[exerciseName];
  if (!standard || !Number.isFinite(bodyweightKg) || bodyweightKg <= 0) return null;

  const { floor, ceiling } = resolveStandard(standard, sex);
  const ratio = floor + progressForLevel(level) * (ceiling - floor);
  const totalLoad = ratio * bodyweightKg;

  if (standard.bodyweightLoaded) return totalLoad - bodyweightKg;

  // Inversa del multiplicador de computeExerciseLevel: `totalLoad` es la carga REAL que hace falta,
  // y lo que se enseña es lo que hay que escribir en FEEG para llegar a ella.
  return totalLoad / equipmentMultiplier(exerciseName, prefs);
}

/** Qué falta para el siguiente escalón de un ejercicio concreto. */
export function nextLevelTarget(
  exerciseName: string,
  currentLevel: number,
  currentBest1RM: number,
  bodyweightKg: number,
  sex: Sex = null,
  prefs?: EquipmentPrefs
): NextLevelTarget | null {
  if (currentLevel >= MAX_LEVEL) {
    return { targetLevel: MAX_LEVEL, targetWeight: currentBest1RM, deltaKg: 0, isMaxed: true };
  }

  // El siguiente ENTERO, no el nivel actual más uno: estando en 12.4 lo que falta es llegar a 13,
  // no a 13.4.
  const targetLevel = Math.min(MAX_LEVEL, Math.floor(currentLevel) + 1);
  const targetWeight = weightForLevel(exerciseName, targetLevel, bodyweightKg, sex, prefs);
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
  sex: Sex = null,
  prefs?: EquipmentPrefs
): ExerciseRank[] {
  return Object.entries(records)
    .map(([name, input]) => computeExerciseLevel(name, input, bodyweightKg, sex, prefs))
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
  sex: Sex = null,
  prefs?: EquipmentPrefs
): Record<string, GroupRank> {
  const byGroup: Record<string, number[]> = {};
  for (const rank of computeExerciseRanks(records, bodyweightKg, sex, prefs)) {
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

/**
 * Grupos musculares que PUEDEN tener rango: los que tienen al menos un ejercicio con baremo.
 *
 * Sirve para distinguir "este grupo aún no tiene rango porque no lo has entrenado" de "este grupo no
 * puede tenerlo nunca". Cuello es el segundo caso: sus ejercicios no se puntúan, así que enseñarlo
 * como pendiente sería mandar al usuario a perseguir algo que no existe.
 *
 * Se recorre el catálogo (que ya viene agrupado) y no las claves de STRENGTH_STANDARDS, porque eso
 * obligaría a un getExerciseInfo por baremo — una búsqueda lineal sobre los 429 ejercicios cada vez.
 * Así es un vistazo a una tabla hash por ejercicio.
 */
let rankableGroupsCache: string[] | null = null;

export function getRankableGroups(): string[] {
  if (rankableGroupsCache) return rankableGroupsCache;

  const groups: string[] = [];
  for (const [group, exercises] of Object.entries(exercisesList as Record<string, { name: string }[]>)) {
    if (exercises.some((ex) => STRENGTH_STANDARDS[ex.name])) groups.push(group);
  }

  rankableGroupsCache = groups;
  return groups;
}

export interface RankMilestone {
  exercise: string;
  group: string;
  /** Kilos que faltan sobre la marca actual, en el número que el usuario registra en FEEG. */
  deltaKg: number;
  /** Marca a batir. */
  targetWeight: number;
  /** Nivel al que sube el GRUPO si se consigue (no el del ejercicio, que puede ir por detrás). */
  groupTargetLevel: number;
}

/**
 * La subida de rango más cercana que tiene el usuario a mano.
 *
 * Deliberadamente NO promete el siguiente rango GLOBAL. El nivel global es la media de los grupos,
 * así que subir un grupo un escalón lo mueve 1/n: con ocho grupos puntuados, "te faltan 4 kg para
 * Atleta I" sería sencillamente falso. Lo que sí es cierto y además es accionable es el siguiente
 * peldaño concreto: qué levantamiento, cuántos kilos y qué grupo sube.
 *
 * Sólo entran los ejercicios que MUEVEN el nivel de su grupo. Mejorar un ejercicio que va por debajo
 * del mejor de su grupo no cambia ningún rango (el nivel del grupo es su máximo), y ofrecerlo como
 * objetivo sería mandar al usuario a hacer trabajo que no puntúa.
 *
 * Entre los candidatos gana el de menor esfuerzo RELATIVO, no el de menos kilos absolutos: 5 kg más
 * en peso muerto son un 3% y 5 kg más en un curl son un 12%, y quien decide qué está "más cerca" es
 * el porcentaje. Lo que se enseña siguen siendo los kilos, que es lo que se carga en la barra.
 */
export function nextRankMilestone(
  exerciseRanks: ExerciseRank[],
  groupRanks: Record<string, GroupRank>,
  bodyweightKg: number,
  sex: Sex = null,
  prefs?: EquipmentPrefs
): RankMilestone | null {
  let best: RankMilestone | null = null;
  let bestEffort = Infinity;

  for (const rank of exerciseRanks) {
    const target = nextLevelTarget(rank.exercise, rank.level, rank.best1RM, bodyweightKg, sex, prefs);
    if (!target || target.isMaxed) continue;

    const groupLevel = groupRanks[rank.group]?.level ?? UNRANKED_LEVEL;
    if (target.targetLevel <= groupLevel) continue;

    // Los lastrados registran el lastre, que puede ser 0: sin el suelo, dividir por la marca actual
    // daría Infinity y el candidato quedaría siempre el último aunque fuera el más cercano.
    const effort = target.deltaKg / Math.max(1, rank.best1RM);
    if (effort >= bestEffort) continue;

    bestEffort = effort;
    best = {
      exercise: rank.exercise,
      group: rank.group,
      deltaKg: target.deltaKg,
      targetWeight: target.targetWeight,
      groupTargetLevel: target.targetLevel,
    };
  }

  return best;
}
