import { describe, expect, it } from "vitest";
import { activityGrid, bucketWorkouts, exerciseTrend, heatLevels, trendDelta } from "./statsSeries";

// Miércoles 23 de septiembre de 2026, 18:00 hora local.
const NOW = new Date(2026, 8, 23, 18);
const at = (m: number, d: number, extra: Record<string, unknown> = {}) => ({
  completedAt: new Date(2026, m - 1, d, 10).toISOString(),
  totalVolume: 1000,
  series: 10,
  elapsedTime: 3600,
  ...extra,
});

describe("bucketWorkouts", () => {
  it("agrupa por semanas lunes→domingo, incluye las vacías y marca la actual", () => {
    const b = bucketWorkouts([at(9, 21), at(9, 22), at(9, 8), at(1, 1)], "week", 4, NOW);
    expect(b).toHaveLength(4);
    expect(b.map((x) => x.sessions)).toEqual([0, 1, 0, 2]);
    expect(b[3].current).toBe(true);
    expect(b[3].volume).toBe(2000);
    expect(b[3].minutes).toBe(120);
    expect(b[0].start.getDate()).toBe(31); // lunes 31 de agosto
  });

  it("agrupa por meses naturales", () => {
    const b = bucketWorkouts([at(9, 1), at(8, 31), at(8, 1), at(7, 15, { totalVolume: 50 })], "month", 3, NOW);
    expect(b.map((x) => x.sessions)).toEqual([1, 2, 1]);
    expect(b[0].volume).toBe(50);
  });

  it("ignora entrenos futuros o sin fecha", () => {
    const b = bucketWorkouts([at(9, 30), { totalVolume: 5 }], "week", 1, NOW);
    expect(b[0].sessions).toBe(0);
  });
});

describe("activityGrid / heatLevels", () => {
  it("devuelve columnas de 7 días terminando en la semana actual y marca los futuros", () => {
    const g = activityGrid([at(9, 22), at(9, 22), at(9, 14)], 3, NOW);
    expect(g).toHaveLength(3);
    expect(g.every((c) => c.length === 7)).toBe(true);
    const tue = g[2][1];
    expect(tue.sessions).toBe(2);
    expect(tue.volume).toBe(2000);
    expect(g[2][3].future).toBe(true); // jueves 24
    expect(g[2][2].future).toBe(false); // hoy
    expect(g[1][0].sessions).toBe(1); // lunes 14
  });

  it("reparte niveles por cuartiles y deja a 0 los días sin entreno", () => {
    const g = activityGrid(
      [at(9, 21, { totalVolume: 100 }), at(9, 22, { totalVolume: 200 }), at(9, 23, { totalVolume: 300 }), at(9, 15, { totalVolume: 400 })],
      2,
      NOW
    );
    const level = heatLevels(g);
    expect(level(g[1][0])).toBe(1);
    expect(level(g[0][1])).toBe(4);
    expect(level(g[0][0])).toBe(0);
  });
});

describe("exerciseTrend", () => {
  it("toma el mejor 1RM estimado por sesión, en orden cronológico", () => {
    const w = (d: number, weight: number) => ({
      completedAt: new Date(2026, 8, d).toISOString(),
      exerciseDetails: [{ name: "Press", series: [{ reps: 1, weight }, { reps: 1, weight: weight - 10 }] }, { name: "Otro", series: [{ reps: 1, weight: 999 }] }],
    });
    const t = exerciseTrend([w(10, 110), w(3, 100), { completedAt: new Date(2026, 8, 5).toISOString(), exerciseDetails: [] }], "Press");
    expect(t.map((p) => p.value)).toEqual([100, 110]);
    expect(trendDelta(t)).toBeCloseTo(10);
    expect(trendDelta(t.slice(0, 1))).toBeNull();
  });
});
