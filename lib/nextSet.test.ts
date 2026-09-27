import { describe, expect, it } from "vitest";
import { findNextSet, formatNextSetLoad } from "./nextSet";

const ex = (uid: string, done: boolean[], weight = 80, reps = 8) => ({
  uid,
  name: `Ejercicio ${uid}`,
  series: done.map((completed) => ({ completed, weight, reps, type: "N" })),
});

describe("findNextSet", () => {
  it("sigue con el ejercicio del descanso si le quedan series", () => {
    const next = findNextSet([ex("a", [true, false, false]), ex("b", [false])], "a");
    expect(next).toMatchObject({ exerciseUid: "a", setNumber: 2, totalSets: 3, changesExercise: false });
  });

  it("pasa al siguiente ejercicio cuando el actual está terminado", () => {
    const next = findNextSet([ex("a", [true, true]), ex("b", [true, false]), ex("c", [false])], "a");
    expect(next).toMatchObject({ exerciseUid: "b", setNumber: 2, changesExercise: true });
  });

  it("vuelve a uno anterior que se quedó a medias", () => {
    const next = findNextSet([ex("a", [false]), ex("b", [true])], "b");
    expect(next).toMatchObject({ exerciseUid: "a", setNumber: 1, changesExercise: true });
  });

  it("devuelve null si todo está completado o no hay ejercicios", () => {
    expect(findNextSet([ex("a", [true])], "a")).toBeNull();
    expect(findNextSet([], null)).toBeNull();
  });

  it("sin ejercicio de descanso empieza por el primero", () => {
    expect(findNextSet([ex("a", [true]), ex("b", [false])], null)).toMatchObject({ exerciseUid: "b", changesExercise: false });
  });
});

describe("formatNextSetLoad", () => {
  it("formatea peso y repeticiones con coma decimal", () => {
    expect(formatNextSetLoad({ weight: 82.5, reps: 8 })).toBe("82,5 kg × 8");
    expect(formatNextSetLoad({ weight: "", reps: 10 })).toBe("× 10");
    expect(formatNextSetLoad({ weight: 60, reps: null })).toBe("60 kg");
    expect(formatNextSetLoad({ weight: null, reps: "" })).toBe("");
  });
});
