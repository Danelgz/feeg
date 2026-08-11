// Herramientas (function calling) que el Coach IA puede invocar contra los datos REALES del
// usuario en vez de inventar respuestas. Puras y sin dependencias de red: reciben el historial
// ya cargado (AiToolContext) y devuelven JSON plano, que pages/api/ai-chat.js reenvía a Gemini
// como resultado de la función. Reutiliza los mismos cálculos que ya usa Estadísticas
// (lib/exerciseStats.ts) en vez de reimplementar volumen/1RM/rachas por segunda vez.

import {
  CompletedWorkout,
  CompletedExerciseDetail,
  calculateOneRM,
  computeSeriesByGroup,
  computeWeeklyStreak,
  computePRTimeline,
} from "./exerciseStats";
import { exercisesList } from "../data/exercises";

export interface RoutineExerciseLike {
  name: string;
  group?: string;
}

export interface RoutineLike {
  id?: string | number;
  name?: string;
  exercises?: RoutineExerciseLike[];
}

export interface AiToolContext {
  workouts: CompletedWorkout[];
  routines: RoutineLike[];
}

function detailsOf(w: CompletedWorkout): CompletedExerciseDetail[] {
  return w.exerciseDetails || w.details || [];
}

function toNum(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function sortedByDateDesc(workouts: CompletedWorkout[]): CompletedWorkout[] {
  return [...workouts]
    .filter((w) => w.completedAt)
    .sort((a, b) => new Date(b.completedAt as string).getTime() - new Date(a.completedAt as string).getTime());
}

// ---------------------------------------------------------------------------------------------
// Implementaciones

export function getWorkoutHistory(ctx: AiToolContext, args: { exerciseName?: string; limitSessions?: number }) {
  const limitSessions = Math.min(Math.max(args.limitSessions || 10, 1), 30);
  const name = args.exerciseName?.trim().toLowerCase();

  const sessions: any[] = [];
  for (const w of sortedByDateDesc(ctx.workouts)) {
    const matches = detailsOf(w).filter((d) => {
      const dName = d.name || d.exercise;
      return !!dName && (!name || dName.toLowerCase().includes(name));
    });
    if (matches.length === 0) continue;
    sessions.push({
      date: w.completedAt,
      exercises: matches.map((d) => ({
        name: d.name || d.exercise,
        series: (d.series || []).map((s) => ({ reps: toNum(s.reps), weight: toNum(s.weight) })),
      })),
    });
    if (sessions.length >= limitSessions) break;
  }

  return { sessions };
}

export function analyzeLastSession(ctx: AiToolContext) {
  const last = sortedByDateDesc(ctx.workouts)[0];
  if (!last) return { found: false };

  const details = detailsOf(last);
  let totalReps = 0;
  let totalVolume = 0;
  let totalSeries = 0;
  const groups = new Set<string>();

  details.forEach((d) => {
    if (d.muscleGroup) groups.add(d.muscleGroup);
    (d.series || []).forEach((s) => {
      const reps = toNum(s.reps);
      const weight = toNum(s.weight);
      totalReps += reps;
      totalVolume += reps * weight;
      totalSeries += 1;
    });
  });

  return {
    found: true,
    date: last.completedAt,
    exerciseCount: details.length,
    totalSeries,
    totalReps,
    totalVolume: Math.round(totalVolume),
    muscleGroups: Array.from(groups),
    exercises: details.map((d) => ({ name: d.name || d.exercise, sets: (d.series || []).length })),
  };
}

export function detectPlateau(ctx: AiToolContext, args: { exerciseName: string; sessionsToCheck?: number }) {
  const name = (args.exerciseName || "").trim().toLowerCase();
  if (!name) return { error: "exerciseName es obligatorio" };
  const n = Math.min(Math.max(args.sessionsToCheck || 4, 2), 12);

  const chronological = [...ctx.workouts]
    .filter((w) => w.completedAt)
    .sort((a, b) => new Date(a.completedAt as string).getTime() - new Date(b.completedAt as string).getTime());

  const points: { date: string; best1RM: number }[] = [];
  chronological.forEach((w) => {
    const d = detailsOf(w).find((d) => (d.name || d.exercise || "").toLowerCase().includes(name));
    if (!d || !d.series?.length) return;
    let best = 0;
    d.series.forEach((s) => {
      const reps = toNum(s.reps);
      const weight = toNum(s.weight);
      if (reps > 0 && weight > 0) best = Math.max(best, calculateOneRM(weight, reps));
    });
    if (best > 0) points.push({ date: w.completedAt as string, best1RM: Math.round(best * 10) / 10 });
  });

  const recent = points.slice(-n);
  if (recent.length < 3) return { enoughData: false, points: recent };

  const first = recent[0].best1RM;
  const last = recent[recent.length - 1].best1RM;
  const changePercent = first > 0 ? Math.round((((last - first) / first) * 100) * 10) / 10 : 0;

  return { enoughData: true, points: recent, changePercent, isPlateau: changePercent < 2 };
}

export function suggestProgression(ctx: AiToolContext, args: { exerciseName: string }) {
  const name = (args.exerciseName || "").trim().toLowerCase();
  if (!name) return { error: "exerciseName es obligatorio" };

  let lastSets: { reps: number; weight: number }[] | null = null;
  let lastDate: string | null = null;

  for (const w of sortedByDateDesc(ctx.workouts)) {
    const d = detailsOf(w).find((d) => (d.name || d.exercise || "").toLowerCase().includes(name));
    if (d && d.series?.length) {
      const sets = d.series
        .map((s) => ({ reps: toNum(s.reps), weight: toNum(s.weight) }))
        .filter((s) => s.reps > 0 && s.weight > 0);
      if (sets.length > 0) {
        lastSets = sets;
        lastDate = w.completedAt as string;
        break;
      }
    }
  }

  if (!lastSets) return { found: false };

  const bestSet = lastSets.reduce((a, b) => (calculateOneRM(b.weight, b.reps) > calculateOneRM(a.weight, a.reps) ? b : a));
  // Heurística simple de progresión doble: si ya llegó a 10+ reps, sube ~2.5% de peso y baja el
  // rango de reps; si no, intenta una rep más al mismo peso. No sustituye a un programa serio,
  // es una sugerencia de arranque para la conversación.
  const suggestedNext =
    bestSet.reps >= 10
      ? { weight: Math.round(bestSet.weight * 1.025 * 2) / 2, reps: Math.max(6, bestSet.reps - 2) }
      : { weight: bestSet.weight, reps: bestSet.reps + 1 };

  return { found: true, lastDate, lastBestSet: bestSet, suggestedNext };
}

export function comparePeriods(ctx: AiToolContext, args: { daysPerPeriod?: number }) {
  const days = Math.min(Math.max(args.daysPerPeriod || 30, 7), 180);
  const msDay = 86400000;
  const now = Date.now();
  const currentStart = now - days * msDay;
  const previousStart = now - 2 * days * msDay;

  const totalsInRange = (from: number, to: number) => {
    let sessions = 0;
    let series = 0;
    let volume = 0;
    ctx.workouts.forEach((w) => {
      if (!w.completedAt) return;
      const t = new Date(w.completedAt).getTime();
      if (t < from || t >= to) return;
      sessions += 1;
      detailsOf(w).forEach((d) =>
        (d.series || []).forEach((s) => {
          series += 1;
          volume += toNum(s.reps) * toNum(s.weight);
        })
      );
    });
    return { sessions, series, volume: Math.round(volume) };
  };

  return { days, current: totalsInRange(currentStart, now), previous: totalsInRange(previousStart, currentStart) };
}

export function analyzeVolumeByGroup(ctx: AiToolContext, args: { days?: number }) {
  const days = Math.min(Math.max(args.days || 7, 1), 90);
  const since = Date.now() - days * 86400000;
  const filtered = ctx.workouts.filter((w) => w.completedAt && new Date(w.completedAt).getTime() >= since);
  return { days, seriesByGroup: computeSeriesByGroup(filtered) };
}

// Umbral general recomendado de series semanales por grupo muscular para hipertrofia (rango
// habitual 10-20; 6 como suelo de "claramente insuficiente" para no generar falsos positivos).
const DEFAULT_MIN_SERIES_PER_WEEK = 6;

export function detectUndertrainedMuscles(ctx: AiToolContext, args: { days?: number; minSeriesPerWeek?: number }) {
  const days = Math.min(Math.max(args.days || 14, 7), 60);
  const minPerWeek = args.minSeriesPerWeek || DEFAULT_MIN_SERIES_PER_WEEK;
  const since = Date.now() - days * 86400000;
  const filtered = ctx.workouts.filter((w) => w.completedAt && new Date(w.completedAt).getTime() >= since);
  const counts = computeSeriesByGroup(filtered);
  const weeks = days / 7;

  const undertrained = Object.entries(counts)
    .map(([group, count]) => ({ group, series: count, seriesPerWeek: Math.round((count / weeks) * 10) / 10 }))
    .filter((g) => g.seriesPerWeek < minPerWeek)
    .sort((a, b) => a.seriesPerWeek - b.seriesPerWeek);

  return { days, minSeriesPerWeek: minPerWeek, undertrained };
}

export function weeklySummary(ctx: AiToolContext) {
  const since = Date.now() - 7 * 86400000;
  const weekWorkouts = ctx.workouts.filter((w) => w.completedAt && new Date(w.completedAt).getTime() >= since);
  const { streak, goal, goalMet } = computeWeeklyStreak(ctx.workouts);
  const { milestones } = computePRTimeline(ctx.workouts, 200);
  const prsThisWeek = milestones.filter((m) => new Date(m.date).getTime() >= since && m.tier !== "first");

  return {
    sessionsThisWeek: weekWorkouts.length,
    weeklyGoal: goal,
    goalMet,
    streakWeeks: streak,
    prsThisWeek: prsThisWeek.map((m) => ({ exercise: m.exerciseName, weight: m.weight, reps: m.reps, tier: m.tier })),
    seriesByGroup: computeSeriesByGroup(weekWorkouts),
  };
}

export function getRoutines(ctx: AiToolContext) {
  return {
    routines: (ctx.routines || []).map((r) => ({
      id: r.id,
      name: r.name,
      exercises: (r.exercises || []).map((e) => ({ name: e.name, group: (e as any).group })),
    })),
  };
}

/** Catálogo real de ejercicios (data/exercises.js), opcionalmente filtrado por grupo muscular y/o
 * equipamiento disponible. Es la fuente de la que deben salir los nombres que el modelo propone
 * en crear/modificar rutina, sustituir ejercicio o sesión rápida — así nunca inventa un ejercicio
 * que no exista en el catálogo ni ignora qué equipamiento hace falta para él. */
export function listExercises(args: { group?: string; equipment?: string; limit?: number }) {
  const group = args.group?.trim().toLowerCase();
  const equipment = args.equipment?.trim().toLowerCase();
  const limit = Math.min(Math.max(args.limit || 40, 1), 100);

  const results: { name: string; group: string; type: string; equipment?: string; unit?: string }[] = [];
  for (const [groupName, list] of Object.entries(exercisesList as Record<string, any[]>)) {
    if (group && groupName.toLowerCase() !== group) continue;
    for (const ex of list) {
      if (equipment && (ex.equipment || "").toLowerCase() !== equipment) continue;
      results.push({ name: ex.name, group: groupName, type: ex.type, equipment: ex.equipment, unit: ex.unit });
      if (results.length >= limit) break;
    }
    if (results.length >= limit) break;
  }

  return { availableGroups: Object.keys(exercisesList), exercises: results };
}

// ---------------------------------------------------------------------------------------------
// Declaraciones para Gemini (function calling, esquema OpenAPI simplificado) + dispatcher

export const AI_TOOL_DECLARATIONS = [
  {
    name: "get_workout_history",
    description:
      "Devuelve las sesiones de entrenamiento más recientes del usuario, opcionalmente filtradas por ejercicio (búsqueda parcial, sin distinguir mayúsculas).",
    parameters: {
      type: "OBJECT",
      properties: {
        exerciseName: { type: "STRING", description: 'Nombre o parte del nombre, ej. "peso muerto rumano". Omitir para ver todos.' },
        limitSessions: { type: "NUMBER", description: "Máximo de sesiones a devolver (por defecto 10, máximo 30)." },
      },
    },
  },
  {
    name: "analyze_last_session",
    description: "Analiza el último entrenamiento completado por el usuario: ejercicios, series, volumen y grupos musculares trabajados.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "detect_plateau",
    description: "Comprueba si el usuario está estancado en un ejercicio, comparando el 1RM estimado de sus últimas sesiones con ese ejercicio.",
    parameters: {
      type: "OBJECT",
      properties: {
        exerciseName: { type: "STRING", description: "Nombre del ejercicio a analizar." },
        sessionsToCheck: { type: "NUMBER", description: "Cuántas sesiones recientes de ese ejercicio comparar (por defecto 4)." },
      },
      required: ["exerciseName"],
    },
  },
  {
    name: "suggest_progression",
    description: "Sugiere el peso/repeticiones a intentar en la próxima sesión de un ejercicio concreto, a partir de su última sesión registrada.",
    parameters: {
      type: "OBJECT",
      properties: { exerciseName: { type: "STRING", description: "Nombre del ejercicio." } },
      required: ["exerciseName"],
    },
  },
  {
    name: "compare_periods",
    description: "Compara volumen, series y sesiones del periodo reciente frente al periodo anterior equivalente (por defecto este mes vs el mes pasado).",
    parameters: {
      type: "OBJECT",
      properties: { daysPerPeriod: { type: "NUMBER", description: "Tamaño de cada periodo en días (por defecto 30)." } },
    },
  },
  {
    name: "analyze_volume_by_group",
    description: "Series totales entrenadas por grupo muscular en los últimos N días.",
    parameters: { type: "OBJECT", properties: { days: { type: "NUMBER", description: "Ventana en días (por defecto 7)." } } },
  },
  {
    name: "detect_undertrained_muscles",
    description: "Detecta qué grupos musculares están recibiendo menos series por semana de las recomendadas para hipertrofia.",
    parameters: {
      type: "OBJECT",
      properties: {
        days: { type: "NUMBER", description: "Ventana en días (por defecto 14)." },
        minSeriesPerWeek: { type: "NUMBER", description: "Umbral mínimo de series/semana (por defecto 6)." },
      },
    },
  },
  {
    name: "weekly_summary",
    description: "Resumen de la semana en curso: sesiones realizadas, racha, récords personales conseguidos y series por grupo muscular.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "get_routines",
    description: "Devuelve las rutinas guardadas del usuario (con id, nombre y ejercicios) — imprescindible antes de proponer modificar o sustituir algo en una de ellas.",
    parameters: { type: "OBJECT", properties: {} },
  },
  {
    name: "list_exercises",
    description:
      "Busca en el catálogo real de ejercicios de la app, opcionalmente filtrando por grupo muscular y/o equipamiento disponible ('barra', 'mancuerna', 'maquina', 'polea', 'corporal'). Úsala SIEMPRE antes de proponer crear/modificar una rutina, sustituir un ejercicio o montar una sesión rápida, para no inventar ejercicios que no existen en la app.",
    parameters: {
      type: "OBJECT",
      properties: {
        group: { type: "STRING", description: "Grupo muscular exacto (ej. 'Pecho', 'Espalda', 'Piernas'). Omitir para buscar en todos." },
        equipment: { type: "STRING", description: "'barra' | 'mancuerna' | 'maquina' | 'polea' | 'corporal'. Omitir para no filtrar." },
        limit: { type: "NUMBER", description: "Máximo de resultados (por defecto 40)." },
      },
    },
  },
];

// Esquema reutilizado por las 3 herramientas de propuesta que envían una lista de ejercicios.
const PROPOSED_EXERCISE_ITEM_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING", description: "Nombre EXACTO tal y como aparece en list_exercises." },
    group: { type: "STRING", description: "Grupo muscular del ejercicio, tal y como lo devuelve list_exercises." },
    type: { type: "STRING", description: "'weight_reps', 'reps' o 'time', tal y como lo devuelve list_exercises." },
    sets: { type: "NUMBER", description: "Número de series." },
    reps: { type: "NUMBER", description: "Repeticiones objetivo por serie." },
    rest: { type: "NUMBER", description: "Descanso entre series en segundos (por defecto 90)." },
  },
  required: ["name", "group", "sets", "reps"],
};

// Herramientas que PROPONEN un cambio en vez de aplicarlo: pages/api/ai-chat.js las intercepta
// antes de ejecutar nada — su "resultado" nunca toca Firestore desde el servidor. Se devuelven en
// la respuesta HTTP como `pendingAction` y es pages/ia.js quien, solo si el usuario pulsa
// "Confirmar" en la tarjeta que se le muestra, llama a los mutators normales de UserContext
// (saveRoutine/updateRoutine/saveCompletedWorkout) — la misma vía que cualquier acción manual en
// la app. Coherente con la regla de no aplicar nunca una acción que modifica datos sin
// confirmación explícita del usuario.
export const AI_PROPOSAL_TOOL_DECLARATIONS = [
  {
    name: "propose_create_routine",
    description:
      "Propone crear una rutina nueva. No la guarda: el usuario debe confirmar en una tarjeta antes de que se cree. Llama antes a list_exercises para usar solo ejercicios reales del catálogo.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Nombre de la rutina, ej. 'Empuje - Hipertrofia'." },
        exercises: { type: "ARRAY", items: PROPOSED_EXERCISE_ITEM_SCHEMA },
      },
      required: ["name", "exercises"],
    },
  },
  {
    name: "propose_modify_routine",
    description:
      "Propone sustituir la lista completa de ejercicios de una rutina EXISTENTE del usuario (ej. reorganizarla, añadir o quitar ejercicios). Llama antes a get_routines para conocer su id/nombre actual y a list_exercises para los ejercicios nuevos.",
    parameters: {
      type: "OBJECT",
      properties: {
        routineId: { type: "STRING", description: "id de la rutina a modificar, tal y como lo devuelve get_routines." },
        routineName: { type: "STRING", description: "Nombre actual de la rutina (por si el id no está disponible)." },
        exercises: { type: "ARRAY", description: "Lista COMPLETA de ejercicios que tendrá la rutina tras el cambio.", items: PROPOSED_EXERCISE_ITEM_SCHEMA },
      },
      required: ["exercises"],
    },
  },
  {
    name: "propose_substitute_exercise",
    description:
      "Propone sustituir un único ejercicio dentro de una rutina existente por otro (ej. porque le molesta o no le gusta), manteniendo sus series/reps actuales. Llama antes a get_routines y a list_exercises (mismo grupo muscular) para elegir la alternativa.",
    parameters: {
      type: "OBJECT",
      properties: {
        routineId: { type: "STRING", description: "id de la rutina, tal y como lo devuelve get_routines." },
        routineName: { type: "STRING", description: "Nombre actual de la rutina (por si el id no está disponible)." },
        oldExerciseName: { type: "STRING", description: "Nombre exacto del ejercicio a sustituir." },
        newExerciseName: { type: "STRING", description: "Nombre exacto del ejercicio nuevo, tal y como lo devuelve list_exercises." },
        newExerciseGroup: { type: "STRING", description: "Grupo muscular del ejercicio nuevo." },
      },
      required: ["oldExerciseName", "newExerciseName", "newExerciseGroup"],
    },
  },
  {
    name: "propose_quick_workout",
    description:
      "Propone una sesión de entreno improvisada para ahora mismo, ajustada al tiempo y/o equipamiento disponible que indique el usuario (ej. 'tengo 45 minutos, hazme pecho y bíceps' o 'hoy solo tengo mancuernas'). Se guarda como una rutina nueva que el usuario puede iniciar al instante. Llama antes a list_exercises filtrando por el equipamiento disponible.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Nombre corto de la sesión, ej. 'Sesión rápida: Pecho y Bíceps'." },
        exercises: { type: "ARRAY", items: PROPOSED_EXERCISE_ITEM_SCHEMA },
      },
      required: ["name", "exercises"],
    },
  },
  {
    name: "propose_log_set",
    description:
      "Propone registrar una serie suelta que el usuario dicta por chat (ej. 'apunta 80 kg x 7 en jalón'). Se guarda como una entrada de historial una vez el usuario confirme.",
    parameters: {
      type: "OBJECT",
      properties: {
        exerciseName: { type: "STRING", description: "Nombre del ejercicio, a ser posible tal y como aparece en el catálogo (list_exercises)." },
        group: { type: "STRING", description: "Grupo muscular del ejercicio." },
        reps: { type: "NUMBER" },
        weight: { type: "NUMBER", description: "Peso en kg (0 si es solo peso corporal)." },
      },
      required: ["exerciseName", "reps"],
    },
  },
];

export const AI_PROPOSAL_TOOL_NAMES = new Set(AI_PROPOSAL_TOOL_DECLARATIONS.map((d) => d.name));

export function runAiTool(name: string, args: Record<string, unknown> | undefined, ctx: AiToolContext) {
  const a = args || {};
  switch (name) {
    case "get_workout_history":
      return getWorkoutHistory(ctx, a as any);
    case "analyze_last_session":
      return analyzeLastSession(ctx);
    case "detect_plateau":
      return detectPlateau(ctx, a as any);
    case "suggest_progression":
      return suggestProgression(ctx, a as any);
    case "compare_periods":
      return comparePeriods(ctx, a as any);
    case "analyze_volume_by_group":
      return analyzeVolumeByGroup(ctx, a as any);
    case "detect_undertrained_muscles":
      return detectUndertrainedMuscles(ctx, a as any);
    case "weekly_summary":
      return weeklySummary(ctx);
    case "get_routines":
      return getRoutines(ctx);
    case "list_exercises":
      return listExercises(a as any);
    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
}
