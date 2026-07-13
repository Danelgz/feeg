import { describe, expect, it } from "vitest";
import {
  createEmptySession,
  createSeries,
  createSessionFromRoutine,
  workoutSessionReducer,
  type ExerciseSession,
  type WorkoutSessionState,
} from "./workoutSessionReducer";
import type { PRCheckResult } from "../lib/exerciseStats";

function exercise(overrides: Partial<ExerciseSession> = {}): ExerciseSession {
  return {
    uid: "ex-1",
    name: "Sentadilla trasera con barra",
    muscleGroup: "Cuádriceps",
    exerciseType: "weight_reps",
    restSeconds: 90,
    notes: "",
    series: [createSeries({ uid: "s-1" })],
    ...overrides,
  };
}

function withExercise(state: WorkoutSessionState, ex: ExerciseSession): WorkoutSessionState {
  return { ...state, exercises: [...state.exercises, ex] };
}

describe("createSessionFromRoutine", () => {
  it("hydrates exercises and series from a saved routine, defaulting missing fields", () => {
    const session = createSessionFromRoutine("w1", {
      id: "r1",
      name: "Empuje",
      exercises: [
        { name: "Press militar con barra", group: "Hombros", rest: 120, series: [{ type: "W", reps: 10, weight: 20 }] },
      ],
    });

    expect(session.workoutId).toBe("w1");
    expect(session.sourceRoutineId).toBe("r1");
    expect(session.status).toBe("preview");
    expect(session.exercises).toHaveLength(1);
    const [ex] = session.exercises;
    expect(ex.name).toBe("Press militar con barra");
    expect(ex.restSeconds).toBe(120);
    expect(ex.series).toHaveLength(1);
    expect(ex.series[0]).toMatchObject({ type: "W", reps: 10, weight: 20, completed: false });
    // uids deben generarse, no venir del payload de la rutina
    expect(ex.uid).toBeTruthy();
    expect(ex.series[0].uid).toBeTruthy();
  });
});

describe("workoutSessionReducer — START_WORKOUT", () => {
  it("marks the session ongoing and stamps startedAt once, idempotently", () => {
    const base = createEmptySession("w1");
    const started = workoutSessionReducer(base, { type: "START_WORKOUT" });
    expect(started.status).toBe("ongoing");
    expect(started.startedAt).toBeTypeOf("number");

    const startedAgain = workoutSessionReducer(started, { type: "START_WORKOUT" });
    expect(startedAgain.startedAt).toBe(started.startedAt);
  });
});

describe("workoutSessionReducer — ADD_EXERCISE", () => {
  it("appends a new exercise without touching existing ones", () => {
    const base = withExercise(createEmptySession("w1"), exercise({ uid: "ex-1" }));
    const next = workoutSessionReducer(base, { type: "ADD_EXERCISE", exercise: exercise({ uid: "ex-2", name: "Remo con barra" }) });
    expect(next.exercises.map((e) => e.uid)).toEqual(["ex-1", "ex-2"]);
  });

  it("substitutes only the targeted exercise, preserving order and the rest of the list", () => {
    let state = withExercise(createEmptySession("w1"), exercise({ uid: "ex-1" }));
    state = withExercise(state, exercise({ uid: "ex-2", name: "Remo con barra" }));

    const substitute = exercise({ uid: "ex-3", name: "Curl con barra recta" });
    const next = workoutSessionReducer(state, { type: "ADD_EXERCISE", exercise: substitute, substituteUid: "ex-1" });

    expect(next.exercises.map((e) => e.uid)).toEqual(["ex-3", "ex-2"]);
    expect(next.exercises[0].name).toBe("Curl con barra recta");
  });
});

describe("workoutSessionReducer — REMOVE_EXERCISE", () => {
  it("removes the exercise and cancels rest only if it belonged to that exercise", () => {
    let state = withExercise(createEmptySession("w1"), exercise({ uid: "ex-1" }));
    state = { ...state, restForExerciseUid: "ex-1", restEndsAt: 123 };

    const next = workoutSessionReducer(state, { type: "REMOVE_EXERCISE", exerciseUid: "ex-1" });
    expect(next.exercises).toHaveLength(0);
    expect(next.restForExerciseUid).toBeNull();
    expect(next.restEndsAt).toBeNull();
  });

  it("leaves an unrelated active rest untouched", () => {
    let state = withExercise(createEmptySession("w1"), exercise({ uid: "ex-1" }));
    state = withExercise(state, exercise({ uid: "ex-2" }));
    state = { ...state, restForExerciseUid: "ex-2", restEndsAt: 456 };

    const next = workoutSessionReducer(state, { type: "REMOVE_EXERCISE", exerciseUid: "ex-1" });
    expect(next.restForExerciseUid).toBe("ex-2");
    expect(next.restEndsAt).toBe(456);
  });
});

describe("workoutSessionReducer — series operations use stable uids, not indexes", () => {
  it("ADD_SERIES appends a blank series by default, or duplicates the last one's type/reps/weight", () => {
    const base = withExercise(
      createEmptySession("w1"),
      exercise({ series: [createSeries({ uid: "s-1", type: "N", reps: 8, weight: 60 })] })
    );

    const blank = workoutSessionReducer(base, { type: "ADD_SERIES", exerciseUid: "ex-1" });
    expect(blank.exercises[0].series).toHaveLength(2);
    expect(blank.exercises[0].series[1]).toMatchObject({ reps: "", weight: "" });

    const duplicated = workoutSessionReducer(base, { type: "ADD_SERIES", exerciseUid: "ex-1", duplicateLast: true });
    expect(duplicated.exercises[0].series[1]).toMatchObject({ type: "N", reps: 8, weight: 60 });
  });

  it("REMOVE_SERIES removes only the targeted series by uid, regardless of position", () => {
    const base = withExercise(
      createEmptySession("w1"),
      exercise({
        series: [
          createSeries({ uid: "s-1" }),
          createSeries({ uid: "s-2" }),
          createSeries({ uid: "s-3" }),
        ],
      })
    );

    const next = workoutSessionReducer(base, { type: "REMOVE_SERIES", exerciseUid: "ex-1", serieUid: "s-2" });
    expect(next.exercises[0].series.map((s) => s.uid)).toEqual(["s-1", "s-3"]);
  });

  it("UPDATE_SERIES_FIELD and SET_SERIES_TYPE only touch the targeted series", () => {
    const base = withExercise(
      createEmptySession("w1"),
      exercise({ series: [createSeries({ uid: "s-1", reps: 5 }), createSeries({ uid: "s-2", reps: 5 })] })
    );

    const updated = workoutSessionReducer(base, {
      type: "UPDATE_SERIES_FIELD",
      exerciseUid: "ex-1",
      serieUid: "s-1",
      field: "reps",
      value: 12,
    });
    expect(updated.exercises[0].series[0].reps).toBe(12);
    expect(updated.exercises[0].series[1].reps).toBe(5);

    const typed = workoutSessionReducer(updated, {
      type: "SET_SERIES_TYPE",
      exerciseUid: "ex-1",
      serieUid: "s-2",
      seriesType: "D",
    });
    expect(typed.exercises[0].series[1].type).toBe("D");
    expect(typed.exercises[0].series[0].type).toBe("N");
  });
});

describe("workoutSessionReducer — TOGGLE_SERIES_COMPLETE", () => {
  const prResult: PRCheckResult = {
    isPR: true,
    isFirstEver: false,
    types: [{ type: "weight", previousValue: 80, newValue: 90, deltaAbsolute: 10, deltaPercent: 12.5 }],
    tier: "major",
    deltaOneRMPercent: 6,
  };

  it("completing a series stamps PR info and starts the rest timer for its exercise", () => {
    const base = withExercise(
      createEmptySession("w1"),
      exercise({ uid: "ex-1", restSeconds: 90, series: [createSeries({ uid: "s-1" })] })
    );

    const completed = workoutSessionReducer(base, {
      type: "TOGGLE_SERIES_COMPLETE",
      exerciseUid: "ex-1",
      serieUid: "s-1",
      prResult,
    });

    const serie = completed.exercises[0].series[0];
    expect(serie.completed).toBe(true);
    expect(serie.isPR).toBe(true);
    expect(serie.prTier).toBe("major");
    expect(completed.restForExerciseUid).toBe("ex-1");
    expect(completed.restEndsAt).toBeGreaterThan(Date.now());
  });

  it("un-completing clears the PR flags and cancels rest only if it was resting for this exercise", () => {
    const base = withExercise(
      createEmptySession("w1"),
      exercise({ uid: "ex-1", series: [createSeries({ uid: "s-1", completed: true, isPR: true, prTier: "major" })] })
    );
    const resting = { ...base, restForExerciseUid: "ex-1", restEndsAt: 999 };

    const toggled = workoutSessionReducer(resting, {
      type: "TOGGLE_SERIES_COMPLETE",
      exerciseUid: "ex-1",
      serieUid: "s-1",
      prResult: null,
    });

    const serie = toggled.exercises[0].series[0];
    expect(serie.completed).toBe(false);
    expect(serie.isPR).toBe(false);
    expect(serie.prTier).toBeNull();
    expect(toggled.restForExerciseUid).toBeNull();
    expect(toggled.restEndsAt).toBeNull();
  });

  it("does nothing when the exercise uid does not exist in the session", () => {
    const base = createEmptySession("w1");
    const next = workoutSessionReducer(base, {
      type: "TOGGLE_SERIES_COMPLETE",
      exerciseUid: "missing",
      serieUid: "s-1",
      prResult: null,
    });
    expect(next).toBe(base);
  });
});

describe("workoutSessionReducer — rest timer controls", () => {
  it("ADJUST_REST is a no-op without an active rest, and never lets the timer go below now", () => {
    const base = createEmptySession("w1");
    expect(workoutSessionReducer(base, { type: "ADJUST_REST", deltaSeconds: 30 })).toBe(base);

    const resting = { ...base, restEndsAt: Date.now() + 5000 };
    const shortened = workoutSessionReducer(resting, { type: "ADJUST_REST", deltaSeconds: -3600 });
    expect(shortened.restEndsAt).toBeGreaterThanOrEqual(Date.now());
  });

  it("STOP_REST clears both the timer and its owning exercise", () => {
    const base = { ...createEmptySession("w1"), restEndsAt: 123, restForExerciseUid: "ex-1" };
    const stopped = workoutSessionReducer(base, { type: "STOP_REST" });
    expect(stopped.restEndsAt).toBeNull();
    expect(stopped.restForExerciseUid).toBeNull();
  });
});

describe("workoutSessionReducer — FINISH / REOPEN_PREVIEW", () => {
  it("FINISH marks the session finished; REOPEN_PREVIEW resets to preview and clears startedAt", () => {
    const ongoing = { ...createEmptySession("w1"), status: "ongoing" as const, startedAt: Date.now() };
    const finished = workoutSessionReducer(ongoing, { type: "FINISH" });
    expect(finished.status).toBe("finished");

    const reopened = workoutSessionReducer(finished, { type: "REOPEN_PREVIEW" });
    expect(reopened.status).toBe("preview");
    expect(reopened.startedAt).toBeNull();
  });
});
