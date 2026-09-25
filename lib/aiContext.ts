// Lo que el chat del Coach IA manda al servidor junto a la pregunta, y las sugerencias de arranque
// que se calculan con los datos del usuario. Puro: sin React ni red, para poder testearlo.

import { computeSeriesByGroup, type CompletedWorkout, type CompletedExerciseDetail } from "./exerciseStats";
import { getRankPosition, formatRarity } from "../data/ranks";
import type { AiBodySnapshot, AiRankSnapshot } from "./aiTools";
import type { ExerciseRank, GroupRank, RankMilestone } from "./rankEngine";

interface WorkoutLike extends CompletedWorkout {
  name?: string;
  routineName?: string;
  elapsedTime?: number;
  totalTime?: number;
}

interface RanksLike {
  available: boolean;
  overallLevel: number;
  prestigeLevels?: number;
  groupRanks: Record<string, GroupRank>;
  exerciseRanks: ExerciseRank[];
  milestone: RankMilestone | null;
}

const MAX_WORKOUTS = 150;

/**
 * Historial compacto: sólo lo que leen las herramientas (fecha, nombre, duración y por ejercicio
 * nombre, grupo y series). Sin notas, fotos ni ids — 150 entrenos caben en ~150 KB.
 */
export function compactWorkouts(workouts: WorkoutLike[]): WorkoutLike[] {
  return [...(workouts || [])]
    .filter((w) => w && w.completedAt)
    .sort((a, b) => new Date(b.completedAt as string).getTime() - new Date(a.completedAt as string).getTime())
    .slice(0, MAX_WORKOUTS)
    .map((w) => ({
      completedAt: w.completedAt,
      name: w.name || w.routineName,
      elapsedTime: w.elapsedTime,
      totalTime: w.totalTime,
      exerciseDetails: ((w.exerciseDetails || w.details || []) as CompletedExerciseDetail[]).map((d) => ({
        name: d.name || d.exercise,
        muscleGroup: d.muscleGroup,
        series: (d.series || []).map((s) => ({ reps: Number(s.reps) || 0, weight: Number(s.weight) || 0 })),
      })),
    }));
}

export function rankSnapshot(ranks: RanksLike | null | undefined): AiRankSnapshot {
  if (!ranks || !ranks.available || Object.keys(ranks.groupRanks).length === 0) return { available: false };
  const overall = getRankPosition(ranks.overallLevel, ranks.prestigeLevels || 0);
  const m = ranks.milestone;
  return {
    available: true,
    overall: { label: overall.label, level: overall.level, rarity: formatRarity(overall.rank) },
    groups: Object.values(ranks.groupRanks)
      .sort((a, b) => b.level - a.level)
      .map((g) => ({ group: g.group, label: getRankPosition(g.level).label, level: Math.floor(g.level) })),
    exercises: ranks.exerciseRanks.slice(0, 25).map((e) => ({
      exercise: e.exercise,
      group: e.group,
      label: getRankPosition(e.level).label,
      level: Math.floor(e.level),
    })),
    nextMilestone: m
      ? { exercise: m.exercise, group: m.group, deltaKg: Math.round(m.deltaKg * 10) / 10, targetLabel: getRankPosition(m.groupTargetLevel).label }
      : null,
  };
}

export function bodySnapshot(
  measures: { date: string; weight?: number | string }[] | undefined,
  user: { height?: number | string; sex?: string; weightUnit?: string } | null | undefined
): AiBodySnapshot {
  return {
    weights: (measures || [])
      .filter((m) => m && Number(m.weight) > 0)
      .map((m) => ({ date: m.date, weight: Number(m.weight) }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-24),
    heightCm: Number(user?.height) || null,
    sex: user?.sex || null,
    weightUnit: user?.weightUnit,
  };
}

export interface SmartPrompt {
  key: string;
  icon: string;
  title: string;
  /** Lo que se envía al pulsarla. */
  prompt: string;
}

const DAY = 86400000;

/**
 * Sugerencias de arranque calculadas con los datos reales, en vez de cuatro frases fijas: si hace
 * nueve días que no entrenas pierna, eso es lo que el coach te propone preguntar. Siempre devuelve
 * entre 4 y 6, con relleno genérico cuando faltan datos (usuario nuevo).
 */
export function smartPrompts(workouts: WorkoutLike[], ranks: RanksLike | null | undefined, now = Date.now()): SmartPrompt[] {
  const list: SmartPrompt[] = [];
  const done = (workouts || []).filter((w) => w.completedAt);

  if (done.length === 0) {
    return [
      { key: "start", icon: "sparkles", title: "Diséñame mi primera rutina", prompt: "Soy nuevo en FEEG. Diséñame una rutina de cuerpo completo para empezar, 3 días por semana." },
      { key: "plan", icon: "calendar", title: "¿Cuántos días debería entrenar?", prompt: "¿Cuántos días por semana debería entrenar para ganar músculo si estoy empezando?" },
      { key: "tech", icon: "target", title: "Técnica de sentadilla", prompt: "Explícame la técnica correcta de la sentadilla con barra y los errores más comunes." },
      { key: "warm", icon: "flame", title: "Cómo calentar bien", prompt: "¿Cómo debería calentar antes de un entreno de fuerza?" },
    ];
  }

  list.push({ key: "today", icon: "zap", title: "¿Qué entreno hoy?", prompt: "¿Qué me toca entrenar hoy según lo que he hecho estos días? Si quieres, móntame la sesión." });

  // Grupo grande más abandonado.
  const lastByGroup: Record<string, number> = {};
  done.forEach((w) => {
    const t = new Date(w.completedAt as string).getTime();
    (w.exerciseDetails || w.details || []).forEach((d) => {
      if (d.muscleGroup && (lastByGroup[d.muscleGroup] ?? 0) < t) lastByGroup[d.muscleGroup] = t;
    });
  });
  const stale = Object.entries(lastByGroup)
    .map(([g, t]) => ({ g, days: Math.floor((now - t) / DAY) }))
    .filter((x) => x.days >= 6 && !["Cardio", "Movilidad", "Cuello"].includes(x.g))
    .sort((a, b) => b.days - a.days)[0];
  if (stale) {
    list.push({ key: "stale", icon: "alertCircle", title: `${stale.days} días sin ${stale.g.toLowerCase()}`, prompt: `Llevo ${stale.days} días sin entrenar ${stale.g.toLowerCase()}. ¿Cómo lo recupero esta semana sin pasarme?` });
  }

  // Ejercicio más frecuente → ¿estancado?
  const freq: Record<string, number> = {};
  done.slice(-40).forEach((w) => (w.exerciseDetails || w.details || []).forEach((d) => {
    const n = d.name || d.exercise;
    if (n) freq[n] = (freq[n] || 0) + 1;
  }));
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (top) {
    list.push({ key: "plateau", icon: "trendUp", title: `¿Estoy estancado en ${top.replace(/\s*\(.*\)$/, "")}?`, prompt: `¿Estoy estancado en ${top}? ¿Qué peso y repeticiones debería intentar la próxima vez?` });
  }

  if (ranks?.available && ranks.milestone) {
    list.push({ key: "rank", icon: "award", title: "¿Cómo subo de rango?", prompt: "¿Qué me falta para subir de rango y cómo lo consigo en las próximas semanas?" });
  }

  const week = done.filter((w) => now - new Date(w.completedAt as string).getTime() <= 7 * DAY);
  const series = computeSeriesByGroup(week);
  if (Object.keys(series).length > 0) {
    list.push({ key: "week", icon: "barChart", title: "Analiza mi semana", prompt: "Hazme un resumen de mi semana: volumen, récords y qué grupos he descuidado." });
  }
  list.push({ key: "month", icon: "activity", title: "Mi progreso este mes", prompt: "¿Cómo va mi progreso este mes comparado con el anterior?" });

  return list.slice(0, 6);
}
