import { describe, expect, it } from "vitest";
import {
  calendarDaysSince,
  greetingKey,
  latestWorkout,
  routineMuscleGroups,
  startOfWeek,
  suggestNextRoutine,
  weekActivity,
  weekVolumeComparison,
} from "./homeInsights";

// Miércoles 23 de septiembre de 2026, 18:00 hora local.
const NOW = new Date(2026, 8, 23, 18, 0, 0);
const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).toISOString();

describe("startOfWeek", () => {
  it("devuelve el lunes a medianoche", () => {
    const s = startOfWeek(NOW);
    expect(s.getDay()).toBe(1);
    expect(s.getDate()).toBe(21);
    expect(s.getHours()).toBe(0);
  });

  it("un domingo pertenece a la semana que empezó el lunes anterior", () => {
    expect(startOfWeek(new Date(2026, 8, 27, 12)).getDate()).toBe(21);
  });
});

describe("weekActivity", () => {
  it("marca los días de la semana en curso con entreno e indica hoy", () => {
    const r = weekActivity([{ completedAt: at(2026, 9, 21) }, { completedAt: at(2026, 9, 23) }, { completedAt: at(2026, 9, 19) }], NOW);
    expect(r.days).toEqual([true, false, true, false, false, false, false]);
    expect(r.todayIndex).toBe(2);
  });

  it("ignora fechas inválidas", () => {
    expect(weekActivity([{ completedAt: "nope" }, {}], NOW).days.every((d) => !d)).toBe(true);
  });
});

describe("weekVolumeComparison", () => {
  it("compara contra el mismo tramo de la semana anterior, no contra la semana entera", () => {
    const r = weekVolumeComparison(
      [
        { completedAt: at(2026, 9, 21), totalVolume: 1000 },
        { completedAt: at(2026, 9, 14), totalVolume: 500 },
        // Jueves de la semana pasada: fuera del tramo lunes→miércoles 18:00.
        { completedAt: at(2026, 9, 17), totalVolume: 9999 },
      ],
      NOW
    );
    expect(r.current).toBe(1000);
    expect(r.previous).toBe(500);
    expect(r.deltaPct).toBeCloseTo(100);
  });

  it("sin referencia previa no inventa un porcentaje", () => {
    expect(weekVolumeComparison([{ completedAt: at(2026, 9, 22), totalVolume: 10 }], NOW).deltaPct).toBeNull();
  });
});

describe("latestWorkout / calendarDaysSince", () => {
  it("encuentra el más reciente aunque la lista no esté ordenada", () => {
    const w = latestWorkout([{ name: "a", completedAt: at(2026, 9, 1) }, { name: "b", completedAt: at(2026, 9, 20) }, { name: "c", completedAt: at(2026, 9, 5) }]);
    expect(w?.name).toBe("b");
  });

  it("cuenta días naturales", () => {
    expect(calendarDaysSince(new Date(2026, 8, 22, 23, 30).toISOString(), NOW)).toBe(1);
    expect(calendarDaysSince(at(2026, 9, 23, 1), NOW)).toBe(0);
    expect(calendarDaysSince(undefined, NOW)).toBeNull();
  });
});

describe("suggestNextRoutine", () => {
  const routines = [
    { id: 1, name: "Empuje", exercises: [{ muscleGroup: "Pecho" }] },
    { id: 2, name: "Tirón", exercises: [{ muscleGroup: "Espalda" }] },
    { id: 3, name: "Pierna", exercises: [{ muscleGroup: "Cuádriceps" }] },
  ];

  it("sigue la rotación: la que lleva más tiempo sin hacerse", () => {
    const r = suggestNextRoutine(routines, [
      { name: "Empuje", completedAt: at(2026, 9, 21) },
      { name: "tirón ", completedAt: at(2026, 9, 22) },
      { name: "Pierna", completedAt: at(2026, 9, 19) },
    ]);
    expect(r?.routine.name).toBe("Pierna");
    expect(r?.lastDoneAt).toBe(at(2026, 9, 19));
  });

  it("una rutina nunca hecha va primero", () => {
    const r = suggestNextRoutine(routines, [
      { name: "Empuje", completedAt: at(2026, 9, 21) },
      { name: "Pierna", completedAt: at(2026, 9, 1) },
    ]);
    expect(r?.routine.name).toBe("Tirón");
    expect(r?.lastDoneAt).toBeNull();
  });

  it("omite rutinas vacías y devuelve null sin rutinas", () => {
    expect(suggestNextRoutine([{ id: 9, name: "Vacía", exercises: [] }], [])).toBeNull();
    expect(suggestNextRoutine([], [])).toBeNull();
  });
});

describe("routineMuscleGroups / greetingKey", () => {
  it("deduplica grupos y respeta el límite", () => {
    expect(
      routineMuscleGroups({ id: 1, name: "x", exercises: [{ muscleGroup: "Pecho" }, { muscleGroup: "Pecho" }, { muscleGroup: "Tríceps" }, { muscleGroup: "Hombros" }, { muscleGroup: "Bíceps" }] }, 3)
    ).toEqual(["Pecho", "Tríceps", "Hombros"]);
  });

  it("saluda según la hora", () => {
    expect(greetingKey(new Date(2026, 0, 1, 8))).toBe("greet_morning");
    expect(greetingKey(new Date(2026, 0, 1, 15))).toBe("greet_afternoon");
    expect(greetingKey(new Date(2026, 0, 1, 23))).toBe("greet_evening");
  });
});
