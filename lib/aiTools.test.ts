import { describe, expect, it } from "vitest";
import { getBodyMetrics, getPersonalRecords, getStrengthRanks, getTrainingStatus, runAiTool, AI_TOOL_DECLARATIONS } from "./aiTools";
import { splitSuggestions, toolLabels } from "./aiReply";
import { compactWorkouts, smartPrompts } from "./aiContext";

const NOW = new Date("2026-09-25T12:00:00Z").getTime();
const day = 86400000;
const w = (daysAgo: number, name: string, group: string, weight: number, reps = 5) => ({
  completedAt: new Date(NOW - daysAgo * day).toISOString(),
  exerciseDetails: [{ name, muscleGroup: group, series: [{ reps, weight }, { reps, weight }] }],
});

const workouts = [
  w(20, "Press de Banca (Barra)", "Pecho", 80),
  w(10, "Press de Banca (Barra)", "Pecho", 85),
  w(9, "Sentadilla (Barra)", "Cuádriceps", 100),
  w(1, "Press de Banca (Barra)", "Pecho", 90),
];

describe("herramientas nuevas del Coach IA", () => {
  it("get_personal_records devuelve el récord vigente y los batidos en 30 días", () => {
    const r = getPersonalRecords({ workouts, routines: [], now: NOW }, {});
    expect(r.records[0].exercise).toBe("Sentadilla (Barra)");
    const bench = r.records.find((x) => x.exercise === "Press de Banca (Barra)")!;
    expect(bench.weight).toBe(90);
    // Dos subidas en banca dentro de la ventana; la primera marca no cuenta como récord batido.
    expect(r.recentPRs.filter((p) => p.exercise.startsWith("Press de Banca"))).toHaveLength(2);
    expect(r.recentPRs[0].improvementPercent).toBeGreaterThan(0);
  });

  it("get_training_status cuenta los días desde cada grupo y el último entreno", () => {
    const s = getTrainingStatus({ workouts, routines: [], now: NOW, weeklyGoal: 3 });
    expect(s.daysSinceLastWorkout).toBe(1);
    expect(s.muscleGroups).toEqual([
      { group: "Cuádriceps", daysSinceTrained: 9, seriesLast7Days: 0 },
      { group: "Pecho", daysSinceTrained: 1, seriesLast7Days: 2 },
    ]);
    expect(s.sessionsPerWeekLast4).toEqual([1, 2, 1, 0]);
    expect(s.weeklyGoal).toBe(3);
  });

  it("get_strength_ranks explica por qué no hay rangos en vez de inventarlos", () => {
    expect(getStrengthRanks({ workouts, routines: [] })).toMatchObject({ available: false });
    const ranks = { available: true, overall: { label: "Atleta I", level: 16 } };
    expect(getStrengthRanks({ workouts, routines: [], ranks })).toBe(ranks);
  });

  it("get_body_metrics ordena el peso y calcula el cambio", () => {
    const b = getBodyMetrics({
      workouts,
      routines: [],
      body: { weights: [{ date: "2026-09-01", weight: 80 }, { date: "2026-08-01", weight: 82 }], heightCm: 180 },
    });
    expect(b).toMatchObject({ available: true, latestWeight: { weight: 80 }, changeSinceFirst: -2, heightCm: 180 });
    expect(getBodyMetrics({ workouts, routines: [] })).toEqual({ available: false });
  });

  it("todas las herramientas declaradas tienen implementación", () => {
    for (const decl of AI_TOOL_DECLARATIONS) {
      const out = runAiTool(decl.name, {}, { workouts, routines: [], now: NOW }) as Record<string, unknown>;
      expect(String(out.error || ""), decl.name).not.toMatch(/desconocida/);
    }
  });
});

describe("respuesta del Coach IA", () => {
  it("separa la línea de sugerencias del texto", () => {
    const { text, suggestions } = splitSuggestions("Vas bien.\n\n[[sugerencias: ¿Qué entreno hoy? | Analiza mi semana | \"Sube mi banca\"]]");
    expect(text).toBe("Vas bien.");
    expect(suggestions).toEqual(["¿Qué entreno hoy?", "Analiza mi semana", "Sube mi banca"]);
  });

  it("deja el texto intacto si no hay sugerencias", () => {
    expect(splitSuggestions("Hola")).toEqual({ text: "Hola", suggestions: [] });
  });

  it("traduce herramientas a etiquetas sin repetir", () => {
    expect(toolLabels(["get_personal_records", "get_personal_records", "list_exercises", "nope"])).toEqual(["récords", "catálogo"]);
  });
});

describe("contexto del chat", () => {
  it("compacta el historial a lo que leen las herramientas, más reciente primero", () => {
    const c = compactWorkouts([{ ...w(3, "Remo", "Espalda", 60), notes: "x" } as never, w(1, "Remo", "Espalda", 62)]);
    expect(c).toHaveLength(2);
    expect(c[0].exerciseDetails![0].series![0]).toEqual({ reps: 5, weight: 62 });
    expect(Object.keys(c[1])).not.toContain("notes");
  });

  it("propone preguntas a partir de los datos reales", () => {
    const prompts = smartPrompts(workouts, null, NOW);
    expect(prompts[0].title).toBe("¿Qué entreno hoy?");
    expect(prompts.some((p) => p.title === "9 días sin cuádriceps")).toBe(true);
    expect(prompts.some((p) => p.title.includes("Press de Banca"))).toBe(true);
    expect(smartPrompts([], null, NOW)[0].title).toBe("Diséñame mi primera rutina");
  });
});
