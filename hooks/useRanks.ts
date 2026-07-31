import { useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { calculateOneRM, computePersonalRecords, type PersonalRecordsMap } from '../lib/exerciseStats';
import {
  canComputeRanks,
  computeExerciseRanks,
  computeGroupRanks,
  computeOverallLevel,
  nextRankMilestone,
  type ExerciseInput,
  type ExerciseRank,
  type GroupRank,
  type RankMilestone,
  type Sex,
} from '../lib/rankEngine';
import { STRENGTH_STANDARDS } from '../data/strengthStandards';
import { MAX_LEVEL, PRESTIGE_TIERS } from '../data/ranks';

const LB_TO_KG = 0.453592;

/** Cuántos EJERCICIOS al nivel máximo hacen falta para cada peldaño de prestigio. */
const PRESTIGE_THRESHOLDS = [3, 6, 12, 20];

/** Nivel a partir del cual se entra en Leyenda: por debajo, el prestigio ni se evalúa. */
const LEGEND_MIN_LEVEL = 28;

export interface RanksResult {
  /** `false` si falta el peso corporal: sin él el sistema no tiene referencia y no se calcula nada. */
  available: boolean;
  /** Peso corporal en kg ya convertido, o null si el usuario nunca ha registrado una medida. */
  bodyweightKg: number | null;
  sex: Sex;
  groupRanks: Record<string, GroupRank>;
  /** Todos los ejercicios puntuables, de mayor a menor nivel. Los consumidores filtran por grupo
   *  (detalle muscular) o por sesión (resumen de fin de entreno). */
  exerciseRanks: ExerciseRank[];
  overallLevel: number;
  prestigeLevels: number;
  /** Ejercicios puntuables con marca — para explicar al usuario por qué su rango es el que es. */
  rankedExerciseCount: number;
  /** La siguiente subida de rango al alcance, o null si no queda ninguna. */
  milestone: RankMilestone | null;
}

/**
 * Peso corporal más reciente, en kg.
 *
 * Las medidas se guardan en la unidad que el usuario tenga elegida (measures.js permite kg o lb),
 * pero los baremos están en múltiplos del peso corporal, así que la unidad se cancela... siempre que
 * numerador y denominador estén en la MISMA unidad. El peso levantado se registra siempre en kg, de
 * modo que un peso corporal en libras daría un ratio 2.2 veces menor y hundiría el rango. De ahí la
 * conversión explícita.
 */
function latestBodyweightKg(measures: any[], weightUnit?: string): number | null {
  const withWeight = (measures || [])
    .filter((m) => m && Number(m.weight) > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (withWeight.length === 0) return null;
  const raw = Number(withWeight[0].weight);
  return weightUnit === 'lb' ? raw * LB_TO_KG : raw;
}

/**
 * Convierte los récords personales al formato que espera el motor.
 *
 * Para los ejercicios lastrados se reconstruye la mejor serie real a partir de `byWeight` en vez de
 * pasar sólo el 1RM: la carga verdadera de una dominada es cuerpo + lastre, y aplicar Brzycki
 * únicamente al lastre infravalora mucho el esfuerzo. Se elige la serie que maximiza el 1RM ya
 * sumado el peso corporal, que no tiene por qué ser ni la más pesada ni la de más repeticiones.
 */
function toEngineInputs(records: PersonalRecordsMap, bodyweightKg: number): Record<string, ExerciseInput> {
  const inputs: Record<string, ExerciseInput> = {};

  for (const [name, record] of Object.entries(records)) {
    const standard = STRENGTH_STANDARDS[name];
    if (!standard) continue;

    if (standard.bodyweightLoaded) {
      let best: { weight: number; reps: number } | undefined;
      let bestScore = 0;
      for (const [weightKey, reps] of Object.entries(record.byWeight)) {
        const weight = Number(weightKey);
        // Brzycki penaliza por repeticiones, así que una serie ligera a muchas reps puede ganar a
        // una pesada a una sola; comparamos el resultado final, no la carga. Se usa la función
        // compartida y no una copia de la fórmula: la copia clampaba a 36 repeticiones, donde
        // Brzycki multiplica por 36, y elegía como "mejor serie" cualquier serie interminable.
        const score = calculateOneRM(bodyweightKg + weight, reps);
        if (score > bestScore) {
          bestScore = score;
          best = { weight, reps };
        }
      }
      inputs[name] = { best1RM: record.best1RM, bestSet: best };
    } else {
      inputs[name] = { best1RM: record.best1RM };
    }
  }

  return inputs;
}

/**
 * Rangos del usuario, derivados del historial.
 *
 * A propósito NO se persisten: son función pura de (entrenos completados, peso corporal, sexo), y
 * guardarlos crearía una segunda copia que se desincroniza en cuanto el usuario edita un entreno
 * antiguo o corrige su peso. Lo único que sí se guarda es la foto de los niveles anteriores
 * (lib/rankStorage), y sólo para poder detectar subidas al terminar un entrenamiento.
 */
export function useRanks(): RanksResult {
  const { completedWorkouts, measures, user } = useUser();

  const bodyweightKg = useMemo(
    () => latestBodyweightKg(measures, user?.weightUnit),
    [measures, user?.weightUnit]
  );

  const sex: Sex = user?.sex === 'male' || user?.sex === 'female' ? user.sex : null;

  return useMemo(() => {
    if (!canComputeRanks(bodyweightKg)) {
      return {
        available: false,
        bodyweightKg,
        sex,
        groupRanks: {},
        exerciseRanks: [],
        overallLevel: 1,
        prestigeLevels: 0,
        rankedExerciseCount: 0,
        milestone: null,
      };
    }

    const records = computePersonalRecords(completedWorkouts || []);
    const inputs = toEngineInputs(records, bodyweightKg as number);
    const exerciseRanks = computeExerciseRanks(inputs, bodyweightKg as number, sex);
    const groupRanks = computeGroupRanks(inputs, bodyweightKg as number, sex);
    const overallLevel = computeOverallLevel(groupRanks);

    // El prestigio sólo existe una vez dentro de Leyenda, y avanza según cuántos EJERCICIOS se
    // llevan al tope — no cuántos grupos. Contar grupos haría inalcanzables los dos últimos
    // peldaños, porque el catálogo sólo tiene doce grupos y los umbrales llegan a veinte.
    let prestigeLevels = 0;
    if (overallLevel >= LEGEND_MIN_LEVEL) {
      const maxedExercises = exerciseRanks.filter((r) => r.level >= MAX_LEVEL).length;
      prestigeLevels = Math.min(
        PRESTIGE_THRESHOLDS.filter((threshold) => maxedExercises >= threshold).length,
        PRESTIGE_TIERS.length
      );
    }

    return {
      available: true,
      bodyweightKg,
      sex,
      groupRanks,
      exerciseRanks,
      overallLevel,
      prestigeLevels,
      rankedExerciseCount: exerciseRanks.length,
      milestone: nextRankMilestone(exerciseRanks, groupRanks, bodyweightKg as number, sex),
    };
  }, [completedWorkouts, bodyweightKg, sex]);
}
