import { describe, expect, it } from "vitest";
import {
  ALL_MUSCLE_GROUPS,
  buildPRRecordsFromExercises,
  calculateOneRM,
  checkForNewPR,
  checkWorkoutVolumePR,
  computeExerciseIndex,
  computePersonalRecords,
  computeSeriesByGroup,
  computeWorkoutTotals,
  pickPrimaryPRType,
  weightUnitFor,
  type CompletedWorkout,
} from "./exerciseStats";

describe("calculateOneRM", () => {
  it("returns 0 when weight or reps are missing", () => {
    expect(calculateOneRM(0, 8)).toBe(0);
    expect(calculateOneRM(80, 0)).toBe(0);
  });

  it("returns the weight itself for a single rep", () => {
    expect(calculateOneRM(100, 1)).toBe(100);
  });

  it("applies the Brzycki formula for typical rep ranges", () => {
    // 36 / (37 - 8) = 1.2413..., * 80 ~= 99.31
    expect(calculateOneRM(80, 8)).toBeCloseTo(80 * (36 / 29), 5);
  });

  it("falls back to the weight itself once reps reach the formula's degenerate range", () => {
    expect(calculateOneRM(50, 37)).toBe(50);
    expect(calculateOneRM(50, 50)).toBe(50);
  });
});

describe("weightUnitFor", () => {
  it("uses minutes for time-based exercises, ballast (L) for weighted-bodyweight, kg otherwise", () => {
    expect(weightUnitFor({ exerciseType: "time" })).toBe("m");
    expect(weightUnitFor({ unit: "lastre" })).toBe("L");
    expect(weightUnitFor({})).toBe("kg");
  });
});

describe("computeWorkoutTotals", () => {
  const exercises = [
    {
      series: [
        { reps: 10, weight: 50, type: "N", completed: true },
        { reps: 8, weight: 60, type: "W", completed: false },
      ],
    },
  ];

  it("sums reps, volume and series count across all series by default", () => {
    const totals = computeWorkoutTotals(exercises);
    expect(totals.totalSeries).toBe(2);
    expect(totals.totalReps).toBe(18);
    expect(totals.totalVolume).toBe(10 * 50 + 8 * 60);
  });

  it("respects excludeTypes", () => {
    const totals = computeWorkoutTotals(exercises, { excludeTypes: ["W"] });
    expect(totals.totalSeries).toBe(1);
    expect(totals.totalVolume).toBe(500);
  });

  it("respects onlyCompleted", () => {
    const totals = computeWorkoutTotals(exercises, { onlyCompleted: true });
    expect(totals.totalSeries).toBe(1);
    expect(totals.totalVolume).toBe(500);
  });

  it("treats non-numeric reps/weight as 0 instead of throwing or producing NaN", () => {
    const totals = computeWorkoutTotals([{ series: [{ reps: "", weight: "" }] }]);
    expect(totals.totalReps).toBe(0);
    expect(totals.totalVolume).toBe(0);
    expect(totals.totalSeries).toBe(1);
  });
});

describe("computePersonalRecords", () => {
  it("tracks the best weight per rep count and best reps per weight, across workouts", () => {
    const workouts: CompletedWorkout[] = [
      {
        exerciseDetails: [
          { name: "Sentadilla trasera con barra", series: [{ reps: 5, weight: 100 }] },
        ],
      },
      {
        // Formato alternativo: `details` en vez de `exerciseDetails`, `exercise` en vez de `name`.
        details: [{ exercise: "Sentadilla trasera con barra", series: [{ reps: 5, weight: 110 }] }],
      },
    ];

    const map = computePersonalRecords(workouts);
    const record = map["Sentadilla trasera con barra"];
    expect(record.byReps[5]).toBe(110);
    expect(record.byWeight[110]).toBe(5);
    expect(record.best1RM).toBeCloseTo(calculateOneRM(110, 5), 5);
  });

  it("ignores series with zero or missing weight/reps", () => {
    const map = computePersonalRecords([
      { exerciseDetails: [{ name: "X", series: [{ reps: 0, weight: 50 }, { reps: 5, weight: 0 }] }] },
    ]);
    expect(map["X"].best1RM).toBe(0);
  });
});

describe("checkForNewPR", () => {
  it("flags isFirstEver (not isPR) when there is no prior record for the exercise", () => {
    const result = checkForNewPR("Nuevo ejercicio", 8, 50, {});
    expect(result.isFirstEver).toBe(true);
    expect(result.isPR).toBe(false);
    expect(result.tier).toBe("first");
  });

  it("detects a weight PR at the same rep count", () => {
    const prMap = computePersonalRecords([
      { exerciseDetails: [{ name: "Press militar con barra", series: [{ reps: 8, weight: 40 }] }] },
    ]);
    const result = checkForNewPR("Press militar con barra", 8, 45, prMap);
    expect(result.isPR).toBe(true);
    expect(result.types.map((t) => t.type)).toContain("weight");
  });

  it("returns no PR when the new series does not beat any prior record", () => {
    const prMap = computePersonalRecords([
      { exerciseDetails: [{ name: "Press militar con barra", series: [{ reps: 8, weight: 40 }] }] },
    ]);
    const result = checkForNewPR("Press militar con barra", 8, 40, prMap);
    expect(result.isPR).toBe(false);
    expect(result.isFirstEver).toBe(false);
    expect(result.types).toHaveLength(0);
  });

  it("assigns higher tiers as the estimated 1RM improvement grows", () => {
    const prMap = computePersonalRecords([
      { exerciseDetails: [{ name: "Peso muerto convencional", series: [{ reps: 5, weight: 100 }] }] },
    ]);

    const minor = checkForNewPR("Peso muerto convencional", 5, 101, prMap);
    expect(minor.tier).toBe("minor");

    const major = checkForNewPR("Peso muerto convencional", 5, 105, prMap);
    expect(major.tier).toBe("major");

    const historic = checkForNewPR("Peso muerto convencional", 5, 115, prMap);
    expect(historic.tier).toBe("historic");
  });
});

describe("checkWorkoutVolumePR", () => {
  it("returns null without prior history or without an improvement", () => {
    expect(checkWorkoutVolumePR(5000, [])).toBeNull();
    expect(checkWorkoutVolumePR(4000, [{ totalVolume: 5000 }])).toBeNull();
  });

  it("returns a PR result when the new session beats the historical best volume", () => {
    const pr = checkWorkoutVolumePR(6000, [{ totalVolume: 5000 }, { totalVolume: 4000 }]);
    expect(pr).not.toBeNull();
    expect(pr?.previousValue).toBe(5000);
    expect(pr?.newValue).toBe(6000);
  });
});

describe("pickPrimaryPRType", () => {
  it("prefers weight, then setVolume, then oneRM, then reps", () => {
    const types = [
      { type: "reps" as const, previousValue: 0, newValue: 0, deltaAbsolute: 0, deltaPercent: null },
      { type: "oneRM" as const, previousValue: 0, newValue: 0, deltaAbsolute: 0, deltaPercent: null },
      { type: "weight" as const, previousValue: 0, newValue: 0, deltaAbsolute: 0, deltaPercent: null },
    ];
    expect(pickPrimaryPRType(types)?.type).toBe("weight");
    expect(pickPrimaryPRType(types.slice(0, 2))?.type).toBe("oneRM");
    expect(pickPrimaryPRType([])).toBeNull();
  });
});

describe("buildPRRecordsFromExercises", () => {
  it("skips exercises with no completed PR/first-ever series", () => {
    const records = buildPRRecordsFromExercises([
      { name: "X", series: [{ completed: true, isPR: false, isFirstEver: false }] },
    ]);
    expect(records).toHaveLength(0);
  });

  it("picks the highest-tier series when an exercise has multiple PR series", () => {
    const records = buildPRRecordsFromExercises([
      {
        name: "Curl con barra recta",
        series: [
          { completed: true, isPR: true, prTier: "minor", prTypes: [], reps: 10, weight: 30 },
          { completed: true, isPR: true, prTier: "historic", prTypes: [], reps: 8, weight: 35 },
        ],
      },
    ]);
    expect(records).toHaveLength(1);
    expect(records[0].tier).toBe("historic");
    expect(records[0].weight).toBe(35);
  });
});

describe("ALL_MUSCLE_GROUPS", () => {
  it("covers every group defined in the exercise catalog, including non-drawable ones", () => {
    expect(ALL_MUSCLE_GROUPS).toContain("Cardio");
    expect(ALL_MUSCLE_GROUPS).toContain("Aductor");
    expect(ALL_MUSCLE_GROUPS).toContain("Abductor");
    expect(ALL_MUSCLE_GROUPS).toContain("Cuerpo Completo");
    expect(ALL_MUSCLE_GROUPS).toContain("Antebrazo");
  });
});

describe("computeSeriesByGroup", () => {
  it("counts series from the real exerciseDetails shape (series is an array, not a count)", () => {
    const workouts: CompletedWorkout[] = [
      {
        exerciseDetails: [
          { name: "Press militar con barra", muscleGroup: "Hombros", series: [{ reps: 8, weight: 40 }, { reps: 8, weight: 40 }] },
          { name: "Sentadilla trasera con barra", muscleGroup: "Cuádriceps", series: [{ reps: 5, weight: 100 }] },
        ],
      },
    ];
    const counts = computeSeriesByGroup(workouts);
    expect(counts["Hombros"]).toBe(2);
    expect(counts["Cuádriceps"]).toBe(1);
    // Grupos sin actividad siguen presentes a 0, no desaparecen del objeto.
    expect(counts["Cardio"]).toBe(0);
  });

  it("ignores details with a muscleGroup outside the requested group list", () => {
    const workouts: CompletedWorkout[] = [
      { exerciseDetails: [{ name: "X", muscleGroup: "GrupoInventado", series: [{ reps: 1, weight: 1 }] }] },
    ];
    const counts = computeSeriesByGroup(workouts);
    expect(Object.values(counts).every((n) => n === 0)).toBe(true);
  });

  it("respects a custom group subset (used to scope the visual muscle map)", () => {
    const workouts: CompletedWorkout[] = [
      { exerciseDetails: [{ name: "Aerobic", muscleGroup: "Cardio", series: [{ reps: 1, weight: 0 }] }] },
    ];
    const counts = computeSeriesByGroup(workouts, ["Pecho", "Espalda"]);
    expect(counts).toEqual({ Pecho: 0, Espalda: 0 });
  });
});

describe("computeExerciseIndex", () => {
  it("aggregates sessions/series/reps/volume per exercise across workouts", () => {
    const workouts: CompletedWorkout[] = [
      { exerciseDetails: [{ name: "Curl con barra recta", muscleGroup: "Bíceps", series: [{ reps: 10, weight: 20 }] }] },
      { exerciseDetails: [{ name: "Curl con barra recta", muscleGroup: "Bíceps", series: [{ reps: 8, weight: 25 }, { reps: 8, weight: 25 }] }] },
    ];
    const index = computeExerciseIndex(workouts);
    const entry = index["Curl con barra recta"];
    expect(entry.sessions).toBe(2);
    expect(entry.series).toBe(3);
    expect(entry.reps).toBe(26);
    expect(entry.volume).toBe(10 * 20 + 8 * 25 + 8 * 25);
  });

  it("skips exercises with no completed series", () => {
    const workouts: CompletedWorkout[] = [{ exerciseDetails: [{ name: "X", series: [] }] }];
    expect(computeExerciseIndex(workouts)).toEqual({});
  });

  it("supports filtering (used to scope the exercise breakdown to one muscle group)", () => {
    const workouts: CompletedWorkout[] = [
      { exerciseDetails: [
        { name: "Curl con barra recta", muscleGroup: "Bíceps", series: [{ reps: 10, weight: 20 }] },
        { name: "Sentadilla trasera con barra", muscleGroup: "Cuádriceps", series: [{ reps: 5, weight: 100 }] },
      ] },
    ];
    const index = computeExerciseIndex(workouts, (d) => d.muscleGroup === "Bíceps");
    expect(Object.keys(index)).toEqual(["Curl con barra recta"]);
  });
});
